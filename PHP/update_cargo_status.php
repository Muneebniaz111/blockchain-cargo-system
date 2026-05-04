<?php
/* ===================================
   CARGO STATUS UPDATE — Step 4
   Updates status in DB + writes
   blockchain event + audit entry.
   =================================== */
header('Content-Type: application/json');
session_start();

if (empty($_SESSION['admin_id']) || ($_SESSION['user_role'] ?? '') !== 'admin') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once 'config.php';
require_once 'blockchain.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid method']);
    exit();
}

$cargoId   = trim($_POST['cargoId']   ?? '');
$newStatus = trim($_POST['newStatus'] ?? '');
$location  = trim($_POST['location']  ?? '');
$notes     = trim($_POST['notes']     ?? '');
$adminId   = (int)$_SESSION['admin_id'];

$allowedStatuses = ['registered', 'in_transit', 'arrived', 'delivered', 'delayed', 'cancelled'];
$statusMap = [
    'registered' => 'registered',
    'in-transit' => 'in_transit',
    'in_transit' => 'in_transit',
    'arrived'    => 'arrived',
    'delivered'  => 'delivered',
    'delayed'    => 'delayed',
    'cancelled'  => 'cancelled',
];
$dbStatus = $statusMap[strtolower($newStatus)] ?? strtolower($newStatus);

if (!$cargoId || !$newStatus) {
    echo json_encode(['success' => false, 'message' => 'Cargo ID and status are required']);
    exit();
}

// Fetch current status from DB
$previousStatus = 'not_recorded';
$cargoDbId      = null;
$fetchStmt = $mysqli->prepare("SELECT id, status FROM cargo WHERE cargo_id = ? LIMIT 1");
if ($fetchStmt) {
    $fetchStmt->bind_param('s', $cargoId);
    $fetchStmt->execute();
    $fetchResult = $fetchStmt->get_result();
    $cargoRow = $fetchResult->fetch_assoc();
    $fetchStmt->close();
    if ($cargoRow) {
        $previousStatus = $cargoRow['status'] ?: 'registered';
        $cargoDbId      = (int)$cargoRow['id'];
    }
    // previousStatus defaults to 'not_recorded' if cargo not found in DB
}

// Fetch admin full name for richer audit description
$adminName = 'Admin';
$nameStmt = $mysqli->prepare("SELECT full_name FROM users WHERE id = ? LIMIT 1");
if ($nameStmt) {
    $nameStmt->bind_param('i', $adminId);
    $nameStmt->execute();
    $nameResult = $nameStmt->get_result();
    if ($nameRow = $nameResult->fetch_assoc()) {
        $adminName = $nameRow['full_name'] ?: 'Admin';
    }
    $nameStmt->close();
}

// 1. Write blockchain event
$txHash = writeBlockchainLog(
    $mysqli,
    $cargoId,
    'STATUS_UPDATE',
    $previousStatus,
    $dbStatus,
    [
        'location'       => $location,
        'notes'          => $notes,
        'updated_by'     => $adminId,
    ],
    $adminId
);

// 2. Update cargo table if row exists
if ($cargoDbId) {
    $upd = $mysqli->prepare(
        "UPDATE cargo SET status = ?, blockchain_hash = ?, updated_at = NOW() WHERE id = ?"
    );
    if ($upd) {
        $upd->bind_param('ssi', $dbStatus, $txHash, $cargoDbId);
        $upd->execute();
        $upd->close();
    }

    // Add tracking history entry
    $trackStmt = $mysqli->prepare(
        "INSERT INTO cargo_tracking (cargo_id, location, status, notes, recorded_at)
         VALUES (?, ?, ?, ?, NOW())"
    );
    if ($trackStmt) {
        $loc = $location ?: 'Status updated via dashboard';
        $trackStmt->bind_param('isss', $cargoDbId, $loc, $dbStatus, $notes);
        $trackStmt->execute();
        $trackStmt->close();
    }
}

// 3. Audit log with blockchain hash
$displayStatus = ucwords(str_replace('_', ' ', $dbStatus));
$displayPrev   = ucwords(str_replace('_', ' ', $previousStatus));
$locationNote  = $location ? "Location: {$location}." : '';
$notesNote     = $notes    ? " Notes: {$notes}."      : '';
writeAuditWithBlockchain(
    $mysqli, $adminId,
    'STATUS_UPDATE', 'CARGO',
    $cargoId,
    "Cargo {$cargoId}: status changed from {$displayPrev} → {$displayStatus}. {$locationNote}{$notesNote} Updated by: {$adminName}.",
    $txHash
);

$mysqli->close();

echo json_encode([
    'success'           => true,
    'message'           => "Cargo {$cargoId} status updated to {$displayStatus}",
    'cargoId'           => $cargoId,
    'tx_hash'           => $txHash,
    'previousStatus'    => $previousStatus,
    'displayPrevStatus' => $displayPrev,
    'newStatus'         => $dbStatus,
    'displayStatus'     => $displayStatus,
    'updatedBy'         => $adminName,
]);
?>
