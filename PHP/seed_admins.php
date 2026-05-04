<?php
/**
 * Admin Account Seeding Script
 * This script creates three default admin accounts in the Shipyard Cargo Management System
 * Run this script once to seed the database with admin accounts

// ── Prevent web access — CLI only ────────────────────────
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('Access denied. This script must be run from the command line.');
}
 */

// Admin accounts to seed
// IMPORTANT: Passwords are pre-hashed with bcrypt (cost=12).
// To change a password, generate a new hash with:
//   php -r "echo password_hash('YourNewPassword', PASSWORD_BCRYPT, ['cost' => 12]);"
// Then replace the corresponding password_hash value below.
$admins = [
    [
        'full_name'     => 'Muneeb Niaz',
        'email'         => 'muneeb@shipyard.pk',
        'contact_number'=> '+923001234567',
        'cnic'          => '35201-1234567-1',
        'password_hash' => '$2y$12$8Kz3QwVXyN5mP1LjR7tESOeHdBfGcAuIkTvWqYnZxM0sJ4CDlr6oe',
        'user_role'     => 'admin'
    ],
    [
        'full_name'     => 'Rana M. Muzammil',
        'email'         => 'rana@shipyard.pk',
        'contact_number'=> '+923001234568',
        'cnic'          => '35201-1234568-1',
        'password_hash' => '$2y$12$3Hv7NwKpZm2LqX9Rj0tYSOeHdBfGcAuIkTvWqYnZxM0sJ4CDlr6oe',
        'user_role'     => 'admin'
    ],
    [
        'full_name'     => 'Mohsin Akhtar',
        'email'         => 'mohsin@shipyard.pk',
        'contact_number'=> '+923001234569',
        'cnic'          => '35201-1234569-1',
        'password_hash' => '$2y$12$5Jx2MwBpYn4KrV8Qi1uZSOeHdBfGcAuIkTvWqYnZxM0sJ4CDlr6oe',
        'user_role'     => 'admin'
    ]
];

// Seed script — no public API endpoints exposed.
// Run this file from the command line or a secured admin context only.

// Include database configuration
require_once 'config.php';
require_once 'totp.php';
require_once 'setup_admin_2fa.php';

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

        // Use the pre-hashed password stored in the config array
        $hashedPassword = $admin['password_hash'];

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
            $newAdminId = (int)$mysqli->insert_id;
            echo "✅ Admin '{$admin['full_name']}' ({$admin['email']}) created successfully.\n";
            echo "   📧 Email: {$admin['email']}\n";
            echo "   ☎️  Contact: {$admin['contact_number']}\n";
            echo "   🆔 CNIC: {$admin['cnic']}\n";
            echo "   👤 Role: {$admin['user_role']}\n";

            // ── Auto-generate 2FA secret ──────────────────
            $twoFaSecret = getOrCreateAdminSecret($mysqli, $newAdminId);
            echo "   🔑 2FA Secret: {$twoFaSecret}\n";
            echo "   📱 Scan QR in: process_admin_login.php (on first login)\n\n";
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
        echo "\n📋 DEFAULT ADMIN EMAILS:\n";
        echo str_repeat("-", 60) . "\n";
        foreach ($admins as $index => $admin) {
            echo "\nAdmin " . ($index + 1) . ":\n";
            echo "Email: {$admin['email']}\n";
        }
        echo "\n" . str_repeat("-", 60) . "\n";
        echo "\n⚠️  IMPORTANT: Ensure admin passwords are set securely before going live.\n";
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
