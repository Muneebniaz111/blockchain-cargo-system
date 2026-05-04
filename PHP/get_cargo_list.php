<?php
/* ===================================
   GET CARGO LIST
   Returns all cargo rows for the
   Tracking Management table, plus
   recent contract execution history
   from blockchain_logs.
   No schema changes — uses existing tables.
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

ensureBlockchainTable($mysqli);

// ── Cargo list for tracking table ────────────────────────
// Map DB status enum → display label + CSS class
$statusMap = [
    'registered' => ['label' => 'Registered', 'class' => 'registered'],
    'in_transit' => ['label' => 'In Transit', 'class' => 'in-transit'],
    'arrived'    => ['label' => 'Arrived',    'class' => 'arrived'],
    'delivered'  => ['label' => 'Delivered',  'class' => 'delivered'],
    'delayed'    => ['label' => 'Delayed',    'class' => 'delayed'],
    'cancelled'  => ['label' => 'Cancelled',  'class' => 'cancelled'],
];

$cargoResult = $mysqli->query(
    "SELECT cargo_id, description, origin, destination, status,
            weight, blockchain_hash, created_at, updated_at
     FROM cargo
     ORDER BY created_at DESC
     LIMIT 100"
);

$cargoList = [];
if ($cargoResult) {
    while ($row = $cargoResult->fetch_assoc()) {
        $st     = $statusMap[$row['status']] ?? ['label' => ucfirst($row['status']), 'class' => $row['status']];
        // Parse type from description: stored as "{type} from {supplier}" or free text
        $desc   = $row['description'] ?? '';
        $typeGuess = 'Cargo';
        if (preg_match('/^(.+?) from /', $desc, $m)) {
            $typeGuess = trim($m[1]);
        }
        $cargoList[] = [
            'cargo_id'        => $row['cargo_id'],
            'cargo_type'      => $typeGuess,
            'origin'          => $row['origin'],
            'destination'     => $row['destination'],
            'status'          => $row['status'],
            'status_label'    => $st['label'],
            'status_class'    => $st['class'],
            'blockchain_hash' => $row['blockchain_hash'] ?? '',
            'created_at'      => $row['created_at'],
            'eta'             => $row['updated_at'] ? substr($row['updated_at'], 0, 10) : substr($row['created_at'], 0, 10),
        ];
    }
}

// ── Contract execution history from blockchain_logs ──────
$contractActions = ['PAYMENT_RELEASED', 'CUSTOMS_CLEARED', 'DELIVERY_CONFIRMED', 'CARGO_VERIFIED'];
$inClause = "'" . implode("','", $contractActions) . "'";

$contractResult = $mysqli->query(
    "SELECT record_id, action, previous_status, new_status, tx_hash, created_at
     FROM blockchain_logs
     WHERE action IN ({$inClause})
     ORDER BY id DESC
     LIMIT 20"
);

$contractHistory = [];
if ($contractResult) {
    while ($row = $contractResult->fetch_assoc()) {
        $label = ucwords(strtolower(str_replace('_', ' ', $row['action'])));
        $contractHistory[] = [
            'cargo_id'   => $row['record_id'],
            'action'     => $row['action'],
            'label'      => $label,
            'tx_hash'    => $row['tx_hash'],
            'created_at' => $row['created_at'],
            'status'     => $row['new_status'],
        ];
    }
}

// ── Certificates from blockchain_logs ────────────────────
$certResult = $mysqli->query(
    "SELECT record_id, data_payload, tx_hash, created_at
     FROM blockchain_logs
     WHERE action = 'CERTIFICATE_ISSUED'
     ORDER BY id DESC
     LIMIT 20"
);

$certificates = [];
if ($certResult) {
    while ($row = $certResult->fetch_assoc()) {
        $payload = json_decode($row['data_payload'] ?? '{}', true);
        $certificates[] = [
            'cargo_id'    => $row['record_id'],
            'cert_number' => $payload['cert_number'] ?? '???',
            'cert_type'   => $payload['cert_type']   ?? 'certificate',
            'cert_label'  => ucwords(str_replace('_', ' ', $payload['cert_type'] ?? 'Certificate')),
            'supplier'    => $payload['supplier']     ?? '',
            'tx_hash'     => $row['tx_hash'],
            'issued_at'   => substr($row['created_at'], 0, 10),
        ];
    }
}

// ── Recent activity log from audit_logs ──────────────────
ensureAuditTxHashColumn($mysqli);
$activityResult = $mysqli->query(
    "SELECT action, description, created_at
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT 8"
);

$activities = [];
if ($activityResult) {
    while ($row = $activityResult->fetch_assoc()) {
        // Map action to icon class
        $iconMap = [
            'CARGO_REGISTERED'   => ['icon' => 'fa-box-open',         'class' => 'warning-item'],
            'STATUS_UPDATE'      => ['icon' => 'fa-map-location-dot',  'class' => 'danger-item'],
            'CERTIFICATE_ISSUED' => ['icon' => 'fa-certificate',       'class' => 'info-item'],
            'PAYMENT_RELEASED'   => ['icon' => 'fa-handshake',         'class' => 'info-item'],
            'ADMIN_LOGIN_2FA'    => ['icon' => 'fa-sign-in-alt',       'class' => 'info-item'],
            'ADMIN_LOGOUT'       => ['icon' => 'fa-sign-out-alt',      'class' => 'info-item'],
        ];
        $meta  = $iconMap[$row['action']] ?? ['icon' => 'fa-circle-info', 'class' => 'info-item'];
        $activities[] = [
            'action'     => $row['action'],
            'description'=> $row['description'],
            'icon'       => $meta['icon'],
            'item_class' => $meta['class'],
            'created_at' => $row['created_at'],
        ];
    }
}

$mysqli->close();

echo json_encode([
    'success'          => true,
    'cargo_list'       => $cargoList,
    'contract_history' => $contractHistory,
    'certificates'     => $certificates,
    'activities'       => $activities,
]);
?>
