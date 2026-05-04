<?php
/* ===================================
   DASHBOARD METRICS — Step 2
   Returns live counts for KPI cards:
   registrations, tracking, contracts,
   certificates, audit logs.
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
ensureAuditTxHashColumn($mysqli);

// Counts from existing tables (no schema changes)
$metrics = [];

// Total cargo registrations
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM cargo");
$metrics['registered_count'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

// In-transit count
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM cargo WHERE status = 'in_transit'");
$metrics['in_transit_count'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

// Delivered count
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM cargo WHERE status = 'delivered'");
$metrics['delivered_count'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

// Tracking events (cargo_tracking history)
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM cargo_tracking");
$metrics['tracking_events'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

// Contract executions (from blockchain_logs)
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM blockchain_logs WHERE action IN ('PAYMENT_RELEASED','CUSTOMS_CLEARED','DELIVERY_CONFIRMED','CARGO_VERIFIED')");
$metrics['contracts_executed'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

// Certificates issued
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM blockchain_logs WHERE action = 'CERTIFICATE_ISSUED'");
$metrics['certificates_issued'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

// Audit log entries
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM audit_logs");
$metrics['audit_logs'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

// Payment status summary
$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM cargo");
$metrics['payment_total'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;

$r = $mysqli->query("SELECT COUNT(*) AS cnt FROM blockchain_logs WHERE action = 'PAYMENT_RELEASED'");
$metrics['payment_released'] = $r ? (int)$r->fetch_assoc()['cnt'] : 0;
$metrics['payment_pending']  = max(0, $metrics['payment_total'] - $metrics['payment_released']);

// Recent registrations (last 5)
$recentResult = $mysqli->query(
    "SELECT cargo_id, description, origin, destination, status, blockchain_hash, created_at
     FROM cargo ORDER BY created_at DESC LIMIT 5"
);
$metrics['recent_registrations'] = [];
while ($row = $recentResult->fetch_assoc()) {
    $metrics['recent_registrations'][] = $row;
}

// Latest payment activity
$r = $mysqli->query(
    "SELECT record_id, created_at FROM blockchain_logs
     WHERE action = 'PAYMENT_RELEASED'
     ORDER BY id DESC LIMIT 1"
);
if ($r && $row = $r->fetch_assoc()) {
    $metrics['latest_payment_activity'] = "Cargo {$row['record_id']} payment released";
} else {
    $metrics['latest_payment_activity'] = 'Awaiting payment workflow update';
}

// IDs of cargo that have had payment released (for per-row payment status)
$prResult = $mysqli->query(
    "SELECT DISTINCT record_id FROM blockchain_logs WHERE action = 'PAYMENT_RELEASED'"
);
$metrics['payment_released_ids'] = [];
if ($prResult) {
    while ($prRow = $prResult->fetch_assoc()) {
        $metrics['payment_released_ids'][] = $prRow['record_id'];
    }
}

// Add in_transit and delivered counts as sub-metrics
$metrics['in_transit_count'] = $metrics['in_transit_count'] ?? 0;
$metrics['delivered_count']  = $metrics['delivered_count']  ?? 0;

$mysqli->close();

echo json_encode(['success' => true, 'metrics' => $metrics]);
?>
