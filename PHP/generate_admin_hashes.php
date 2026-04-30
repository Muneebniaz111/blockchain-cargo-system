<?php
/**
 * Bcrypt Hash Generator
 * Generates secure bcrypt hashes for the default admin passwords
 * Use this to verify the hashes in the database
 */

// Default admin passwords
$passwords = [
    'Muneeb Niaz' => 'Admin@Muneeb2024',
    'Rana M. Muzammil' => 'Admin@Rana2024',
    'Mohsin Akhtar' => 'Admin@Mohsin2024'
];

echo "\n" . str_repeat("=", 70) . "\n";
echo "BCRYPT HASH GENERATOR FOR DEFAULT ADMIN PASSWORDS\n";
echo str_repeat("=", 70) . "\n\n";

foreach ($passwords as $name => $password) {
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    
    echo "Admin: $name\n";
    echo "Password: $password\n";
    echo "Bcrypt Hash:\n";
    echo "$hash\n";
    echo "\nVerification Test: " . (password_verify($password, $hash) ? "✅ PASS" : "❌ FAIL") . "\n";
    echo str_repeat("-", 70) . "\n\n";
}

echo "\nUse these hashes in the database_schema.sql file for the INSERT statements.\n";
echo "The seed_admins.php script automatically generates and uses these hashes.\n";
?>
