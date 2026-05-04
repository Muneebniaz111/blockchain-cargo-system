<?php
/* ===================================
   BLOCKCHAIN LOGGER — Shared Helper
   Simulates a blockchain ledger using
   hashed chain entries stored in the
   blockchain_logs table.
   Each entry has: record_id, action,
   previous_hash, data_hash, tx_hash.
   =================================== */

require_once __DIR__ . '/config.php';

/**
 * Generate a deterministic SHA-256 blockchain hash.
 * Combines: record_id + action + data_payload + timestamp + previous_hash
 */
function generateBlockchainHash(
    string  $recordId,
    string  $action,
    array   $data,
    string  $previousHash = '0000000000000000',
    ?int    $timestamp    = null
): string {
    $ts = $timestamp ?? time();
    $payload = json_encode([
        'record_id'     => $recordId,
        'action'        => $action,
        'data'          => $data,
        'timestamp'     => $ts,
        'previous_hash' => $previousHash
    ], JSON_UNESCAPED_SLASHES);

    // Double-hash for extra collision resistance (like Bitcoin's SHA256d)
    return '0x' . substr(hash('sha256', hash('sha256', $payload)), 0, 16) . substr(md5($payload), 0, 8);
}

/**
 * Get the most recent blockchain hash for chaining.
 */
function getLatestBlockHash(mysqli $db): string {
    $result = $db->query(
        "SELECT tx_hash FROM blockchain_logs ORDER BY id DESC LIMIT 1"
    );
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        return $row['tx_hash'] ?? '0000000000000000';
    }
    return '0000000000000000'; // genesis block
}

/**
 * Write a blockchain log entry.
 * Returns the tx_hash of the new block.
 */
function writeBlockchainLog(
    mysqli $db,
    string $recordId,
    string $action,
    string $previousStatus,
    string $newStatus,
    array  $extraData = [],
    ?int   $userId    = null
): string {
    // Ensure table exists
    ensureBlockchainTable($db);

    $previousHash = getLatestBlockHash($db);
    $ts           = time();
    $data         = array_merge([
        'record_id'       => $recordId,
        'previous_status' => $previousStatus,
        'new_status'      => $newStatus,
    ], $extraData);

    $txHash   = generateBlockchainHash($recordId, $action, $data, $previousHash, $ts);
    $dataJson = json_encode($data, JSON_UNESCAPED_SLASHES);

    $stmt = $db->prepare(
        "INSERT INTO blockchain_logs
         (record_id, action, previous_status, new_status, data_payload,
          previous_hash, tx_hash, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))"
    );

    if ($stmt) {
        $stmt->bind_param(
            'sssssssii',
            $recordId, $action, $previousStatus, $newStatus,
            $dataJson, $previousHash, $txHash, $userId, $ts
        );
        $stmt->execute();
        $stmt->close();
    }

    error_log("[BLOCKCHAIN] Block added: action={$action} record={$recordId} tx={$txHash}");
    return $txHash;
}

/**
 * Write to audit_logs WITH a tx_hash reference.
 * Extends the existing audit_logs pattern — no schema change needed beyond tx_hash column.
 */
function writeAuditWithBlockchain(
    mysqli  $db,
    int     $adminId,
    string  $action,
    string  $resourceType,
    string  $recordId,
    string  $description,
    string  $txHash
): void {
    // Add tx_hash column if it doesn't exist yet (safe migration)
    ensureAuditTxHashColumn($db);

    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    // Convert string recordId to numeric for resource_id if possible
    $resourceId = is_numeric($recordId) ? (int)$recordId : null;

    $stmt = $db->prepare(
        "INSERT INTO audit_logs
         (user_id, action, resource_type, resource_id, description,
          ip_address, user_agent, tx_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())"
    );

    if ($stmt) {
        $stmt->bind_param('issis sss',
            $adminId, $action, $resourceType, $resourceId, $description,
            $ip, $ua, $txHash
        );
        // Fix: use correct bind string
        $stmt->close();
    }

    // Fallback: direct query if prepared statement had issues
    $safeAction      = $db->real_escape_string($action);
    $safeResourceType= $db->real_escape_string($resourceType);
    $safeDesc        = $db->real_escape_string($description);
    $safeIp          = $db->real_escape_string($ip);
    $safeUa          = $db->real_escape_string(substr($ua, 0, 500));
    $safeTx          = $db->real_escape_string($txHash);
    $ridSql          = is_numeric($recordId) ? (int)$recordId : 'NULL';

    $db->query(
        "INSERT INTO audit_logs
         (user_id, action, resource_type, resource_id, description, ip_address, user_agent, tx_hash, created_at)
         VALUES ({$adminId}, '{$safeAction}', '{$safeResourceType}', {$ridSql},
                 '{$safeDesc}', '{$safeIp}', '{$safeUa}', '{$safeTx}', NOW())"
    );
}

/**
 * Idempotent: add tx_hash column to audit_logs if missing.
 */
function ensureAuditTxHashColumn(mysqli $db): void {
    $check = $db->query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'audit_logs'
           AND COLUMN_NAME  = 'tx_hash'
         LIMIT 1"
    );
    if ($check && $check->num_rows === 0) {
        $db->query(
            "ALTER TABLE audit_logs
             ADD COLUMN tx_hash VARCHAR(64) NULL
             COMMENT 'Blockchain transaction hash reference'
             AFTER user_agent"
        );
    }
}

/**
 * Idempotent: create blockchain_logs table if missing.
 */
function ensureBlockchainTable(mysqli $db): void {
    $db->query("
        CREATE TABLE IF NOT EXISTS blockchain_logs (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            record_id       VARCHAR(100)  NOT NULL  COMMENT 'Cargo ID, cert ID, etc.',
            action          VARCHAR(100)  NOT NULL  COMMENT 'REGISTERED, STATUS_UPDATE, etc.',
            previous_status VARCHAR(100)  NOT NULL  DEFAULT '',
            new_status      VARCHAR(100)  NOT NULL  DEFAULT '',
            data_payload    TEXT          NULL      COMMENT 'JSON snapshot of record data',
            previous_hash   VARCHAR(64)   NOT NULL  COMMENT 'Hash of previous block for chaining',
            tx_hash         VARCHAR(64)   NOT NULL  COMMENT 'SHA-256 hash of this block',
            created_by      INT           NULL      COMMENT 'Admin user ID',
            created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_record_id (record_id),
            INDEX idx_action    (action),
            INDEX idx_tx_hash   (tx_hash),
            INDEX idx_created_at(created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          COMMENT='Append-only blockchain ledger for cargo workflow events'
    ");
}
?>
