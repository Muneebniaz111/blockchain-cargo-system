<?php
/**
 * Admin Account Seeding Script
 * This script creates three default admin accounts in the Shipyard Cargo Management System
 * Run this script once to seed the database with admin accounts
 */

// Admin accounts to seed
$admins = [
    [
        'full_name' => 'Muneeb Niaz',
        'email' => 'muneeb@shipyard.pk',
        'contact_number' => '+923001234567',
        'cnic' => '35201-1234567-1',
        'password' => 'Admin@Muneeb2024',
        'user_role' => 'admin'
    ],
    [
        'full_name' => 'Rana M. Muzammil',
        'email' => 'rana@shipyard.pk',
        'contact_number' => '+923001234568',
        'cnic' => '35201-1234568-1',
        'password' => 'Admin@Rana2024',
        'user_role' => 'admin'
    ],
    [
        'full_name' => 'Mohsin Akhtar',
        'email' => 'mohsin@shipyard.pk',
        'contact_number' => '+923001234569',
        'cnic' => '35201-1234569-1',
        'password' => 'Admin@Mohsin2024',
        'user_role' => 'admin'
    ]
];

if (isset($_GET['action']) && $_GET['action'] === 'list_admins') {
    header('Content-Type: application/json');
    $publicAdmins = array_map(function($admin) {
        return [
            'full_name' => $admin['full_name'],
            'email' => $admin['email'],
            'contact_number' => $admin['contact_number'],
            'cnic' => $admin['cnic'],
            'user_role' => $admin['user_role']
        ];
    }, $admins);

    echo json_encode([
        'success' => true,
        'admins' => $publicAdmins
    ]);
    exit;
}

// Include database configuration
require_once 'config.php';

// Function to seed admins
function seedAdminAccounts($mysqli, $admins) {
    $successCount = 0;
    $errorCount = 0;
    $existingCount = 0;

    foreach ($admins as $admin) {
        // Check if admin already exists by email
        $checkQuery = "SELECT id FROM users WHERE email = ?";
        $stmt = $mysqli->prepare($checkQuery);
        
        if (!$stmt) {
            echo "❌ Prepare error: " . $mysqli->error . "\n";
            $errorCount++;
            continue;
        }

        $stmt->bind_param("s", $admin['email']);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            echo "⚠️  Admin '{$admin['full_name']}' ({$admin['email']}) already exists. Skipping...\n";
            $existingCount++;
            $stmt->close();
            continue;
        }

        $stmt->close();

        // Hash the password using bcrypt
        $hashedPassword = password_hash($admin['password'], PASSWORD_BCRYPT, ['cost' => 10]);

        // Prepare insert statement
        $insertQuery = "INSERT INTO users (full_name, email, contact_number, cnic, password, user_role, is_verified, is_active, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE, NOW(), NOW())";
        
        $stmt = $mysqli->prepare($insertQuery);
        
        if (!$stmt) {
            echo "❌ Prepare error: " . $mysqli->error . "\n";
            $errorCount++;
            continue;
        }

        $stmt->bind_param(
            "ssssss",
            $admin['full_name'],
            $admin['email'],
            $admin['contact_number'],
            $admin['cnic'],
            $hashedPassword,
            $admin['user_role']
        );

        if ($stmt->execute()) {
            echo "✅ Admin '{$admin['full_name']}' ({$admin['email']}) created successfully.\n";
            echo "   📧 Email: {$admin['email']}\n";
            echo "   🔐 Default Password: {$admin['password']}\n";
            echo "   ☎️  Contact: {$admin['contact_number']}\n";
            echo "   🆔 CNIC: {$admin['cnic']}\n";
            echo "   👤 Role: {$admin['user_role']}\n\n";
            $successCount++;
        } else {
            echo "❌ Error creating admin '{$admin['full_name']}': " . $stmt->error . "\n";
            $errorCount++;
        }

        $stmt->close();
    }

    // Summary
    echo "\n" . str_repeat("=", 60) . "\n";
    echo "SEEDING SUMMARY\n";
    echo str_repeat("=", 60) . "\n";
    echo "✅ Successfully Created: {$successCount}\n";
    echo "⚠️  Already Existing: {$existingCount}\n";
    echo "❌ Errors: {$errorCount}\n";
    echo str_repeat("=", 60) . "\n";

    if ($successCount > 0) {
        echo "\n✅ Admin accounts have been successfully seeded!\n";
        echo "\n📋 DEFAULT ADMIN LOGIN CREDENTIALS:\n";
        echo str_repeat("-", 60) . "\n";
        foreach ($admins as $index => $admin) {
            echo "\nAdmin " . ($index + 1) . ":\n";
            echo "Email: {$admin['email']}\n";
            echo "Password: {$admin['password']}\n";
        }
        echo "\n" . str_repeat("-", 60) . "\n";
        echo "\n⚠️  IMPORTANT: Please change these default passwords after first login!\n";
    }

    return $successCount > 0;
}

// Check database connection
if ($mysqli->connect_error) {
    die("❌ Database connection failed: " . $mysqli->connect_error);
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "SHIPYARD ADMIN ACCOUNT SEEDING\n";
echo str_repeat("=", 60) . "\n\n";

// Seed admin accounts
$result = seedAdminAccounts($mysqli, $admins);

$mysqli->close();

// Exit with appropriate code
exit($result ? 0 : 1);
?>
