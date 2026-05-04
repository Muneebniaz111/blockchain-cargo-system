<?php
/* ===================================
   ADMIN 2FA SETUP
   Generates a TOTP secret for admins
   who don't have one yet.
   Called by: process_admin_login.php (automatically)
              and seed_admins.php (during seeding)
   =================================== */

require_once __DIR__ . '/totp.php';
require_once __DIR__ . '/config.php';

/**
 * Ensure the users table has the totp_secret column.
 * Safe to call multiple times (idempotent).
 */
function ensureTotpColumn(mysqli $db): void
{
    // Check if column already exists
    $check = $db->query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'users'
           AND COLUMN_NAME  = 'totp_secret'
         LIMIT 1"
    );
    if ($check && $check->num_rows === 0) {
        $db->query(
            "ALTER TABLE users
             ADD COLUMN totp_secret VARCHAR(512) NULL
                 COMMENT 'AES-256-CBC encrypted TOTP secret (Base32)'
             AFTER password"
        );
    }
}

/**
 * Get or create a 2FA secret for a given admin user.
 * Returns the PLAIN (unencrypted) secret for QR code generation.
 * The DB always stores the encrypted version.
 */
function getOrCreateAdminSecret(mysqli $db, int $adminId): string
{
    ensureTotpColumn($db);

    // Fetch existing secret
    $stmt = $db->prepare("SELECT totp_secret FROM users WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $adminId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row    = $result->fetch_assoc();
    $stmt->close();

    if (!empty($row['totp_secret'])) {
        // Decrypt and return
        return TOTP::decryptSecret($row['totp_secret']);
    }

    // Generate new secret
    $plainSecret    = TOTP::generateSecret();
    $encryptedSecret = TOTP::encryptSecret($plainSecret);

    $upd = $db->prepare("UPDATE users SET totp_secret = ?, updated_at = NOW() WHERE id = ?");
    $upd->bind_param('si', $encryptedSecret, $adminId);
    $upd->execute();
    $upd->close();

    error_log('[2FA_SETUP] Generated new TOTP secret for admin_id=' . $adminId);
    return $plainSecret;
}

/**
 * Backfill 2FA secrets for ALL existing admin users who don't have one.
 * Safe to call from seed_admins.php or a migration script.
 */
function backfillAdminSecrets(mysqli $db): array
{
    ensureTotpColumn($db);

    $result = $db->query(
        "SELECT id, email FROM users
         WHERE user_role = 'admin' AND (totp_secret IS NULL OR totp_secret = '')
         ORDER BY id"
    );
    $updated = [];
    while ($row = $result->fetch_assoc()) {
        getOrCreateAdminSecret($db, (int)$row['id']);
        $updated[] = $row['email'];
    }
    return $updated;
}
?>
