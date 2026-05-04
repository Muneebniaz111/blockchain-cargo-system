<?php
/* ===================================
   GET AUDIT LOGS — Step 7
   Returns audit_logs with blockchain
   tx_hash, role, record ID, action,
   timestamp for the Audit Monitoring
   section.
   =================================== */
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');
session_start();

if (empty($_SESSION['admin_id']) || ($_SESSION['user_role'] ?? '') !== 'admin') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once 'config.php';
require_once 'blockchain.php';

// Ensure tx_hash column exists
ensureAuditTxHashColumn($mysqli);

$actionFilter = trim($_GET['action'] ?? '');
$search       = trim($_GET['search'] ?? '');
$limit        = min((int)($_GET['limit'] ?? 50), 200);

// Build query with optional filters
$where = [];
$params = [];
$types  = '';

if ($actionFilter) {
    $where[]  = 'a.action LIKE ?';
    $params[] = '%' . $actionFilter . '%';
    $types   .= 's';
}

if ($search) {
    $where[]  = '(a.description LIKE ? OR a.action LIKE ? OR a.resource_type LIKE ?)';
    $params[] = "%{$search}%";
    $params[] = "%{$search}%";
    $params[] = "%{$search}%";
    $types   .= 'sss';
}

$whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "
    SELECT
        a.id,
        a.action,
        a.resource_type,
        a.resource_id,
        a.description,
        a.tx_hash,
        a.ip_address,
        a.created_at,
        u.full_name  AS admin_name,
        u.user_role  AS admin_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    {$whereClause}
    ORDER BY a.created_at DESC
    LIMIT {$limit}
";

if ($params) {
    $stmt = $mysqli->prepare($sql);
    if ($stmt) {
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        echo json_encode(['success' => false, 'message' => 'DB error: ' . $mysqli->error]);
        exit();
    }
} else {
    $result = $mysqli->query($sql);
}

$logs = [];
while ($row = $result->fetch_assoc()) {
    // Extract cargo ID from resource context if available
    $cargoId = '-';
    if ($row['resource_type'] === 'CARGO' || $row['resource_type'] === 'cargo') {
        if (preg_match('/\b(CS-\d+)\b/', $row['description'], $m)) {
            $cargoId = $m[1];
        }
    }

    // Clean up "unknown" status labels in descriptions
    $description = $row['description'] ?? '';
    $description = preg_replace('/unknown/i', 'Not on Record', $description);
    // Convert raw DB status enum names in descriptions to display labels
    $statusReplacements = [
        '/in_transit/i'    => 'In Transit',
        '/registered/i'    => 'Registered',
        '/arrived/i'       => 'Arrived',
        '/delivered/i'     => 'Delivered',
        '/delayed/i'       => 'Delayed',
        '/cancelled/i'     => 'Cancelled',
        '/not_recorded/i'  => 'Not on Record',
    ];
    foreach ($statusReplacements as $pattern => $replace) {
        $description = preg_replace($pattern, $replace, $description);
    }

    // Build a "performed by" string: prefer full name, fallback to role
    $adminName  = $row['admin_name']  ?? '';
    $adminRole  = $row['admin_role']  ?? 'admin';
    $performedBy = $adminName ?: ucfirst($adminRole);

    $logs[] = [
        'id'           => (int)$row['id'],
        'timestamp'    => $row['created_at'],
        'action'       => $row['action'],
        'role'         => ucwords($adminRole),
        'admin_name'   => $performedBy,
        'cargo_id'     => $cargoId,
        'details'      => $description,
        'tx_hash'      => $row['tx_hash'] ?? null,
        'resource_type'=> $row['resource_type'],
    ];
}

// Also get blockchain_logs for enhanced display
ensureBlockchainTable($mysqli);
$bcResult = $mysqli->query(
    "SELECT record_id, action, previous_status, new_status, tx_hash, previous_hash, created_at
     FROM blockchain_logs
     ORDER BY id DESC
     LIMIT 20"
);
$blockchainLogs = [];
while ($row = $bcResult->fetch_assoc()) {
    // Normalize "unknown" / "not_recorded" status values
    $prevStatus = $row['previous_status'];
    $newStatus  = $row['new_status'];
    if ($prevStatus === 'unknown' || $prevStatus === 'not_recorded') $prevStatus = '';
    if ($newStatus  === 'unknown' || $newStatus  === 'not_recorded') $newStatus  = 'Registered';
    $row['previous_status'] = $prevStatus;
    $row['new_status']      = $newStatus;
    $blockchainLogs[] = $row;
}

$mysqli->close();

echo json_encode([
    'success'         => true,
    'logs'            => $logs,
    'blockchain_logs' => $blockchainLogs,
    'total'           => count($logs)
]);
?>
