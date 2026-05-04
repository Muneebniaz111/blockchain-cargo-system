<?php
/* ===================================
   SMART CONTRACT EXECUTION — Step 5
   Executes contract logic + writes
   blockchain transaction + audit.
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

$cargoId        = trim($_POST['cargoId']        ?? '');
$contractType   = trim($_POST['contractType']   ?? '');
$walletAddr     = trim($_POST['walletAddr']      ?? '');
$customsApproval= filter_var($_POST['customsApproval'] ?? false, FILTER_VALIDATE_BOOLEAN);
$adminId        = (int)$_SESSION['admin_id'];

if (!$cargoId || !$contractType || !$walletAddr) {
    echo json_encode(['success' => false, 'message' => 'Cargo ID, contract type, and wallet address are required']);
    exit();
}

// Map contract type to action
$actionMap = [
    'payment'      => 'PAYMENT_RELEASED',
    'customs'      => 'CUSTOMS_CLEARED',
    'delivery'     => 'DELIVERY_CONFIRMED',
    'verification' => 'CARGO_VERIFIED',
];
$blockchainAction = $actionMap[$contractType] ?? strtoupper($contractType) . '_EXECUTED';

// Determine new status based on contract type
$newStatusMap = [
    'payment'      => 'delivered',
    'customs'      => 'in_transit',
    'delivery'     => 'delivered',
    'verification' => 'arrived',
];
$newStatus = $newStatusMap[$contractType] ?? 'in_transit';

// Get current cargo status
$previousStatus = 'unknown';
$cargoDbId      = null;
$fetchStmt = $mysqli->prepare("SELECT id, status FROM cargo WHERE cargo_id = ? LIMIT 1");
if ($fetchStmt) {
    $fetchStmt->bind_param('s', $cargoId);
    $fetchStmt->execute();
    $result = $fetchStmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $previousStatus = $row['status'];
        $cargoDbId      = (int)$row['id'];
    }
    $fetchStmt->close();
}

// 1. Write blockchain transaction
$txHash = writeBlockchainLog(
    $mysqli,
    $cargoId,
    $blockchainAction,
    $previousStatus,
    $newStatus,
    [
        'contract_type'    => $contractType,
        'wallet_address'   => $walletAddr,
        'customs_approved' => $customsApproval,
        'executed_by'      => $adminId,
    ],
    $adminId
);

// 2. Update cargo status if payment released or delivery confirmed
if (in_array($contractType, ['payment', 'delivery']) && $cargoDbId) {
    $upd = $mysqli->prepare(
        "UPDATE cargo SET status = ?, blockchain_hash = ?, updated_at = NOW() WHERE id = ?"
    );
    if ($upd) {
        $upd->bind_param('ssi', $newStatus, $txHash, $cargoDbId);
        $upd->execute();
        $upd->close();
    }
}

// 3. Audit log
$typeLabel = ucwords(str_replace('_', ' ', $contractType));
writeAuditWithBlockchain(
    $mysqli, $adminId,
    $blockchainAction, 'CARGO',
    $cargoId,
    "{$typeLabel} contract executed for cargo {$cargoId}. Wallet: {$walletAddr}. Customs: " . ($customsApproval ? 'Yes' : 'No'),
    $txHash
);

$mysqli->close();

echo json_encode([
    'success'       => true,
    'message'       => ucwords($contractType) . " contract executed for cargo {$cargoId}",
    'cargoId'       => $cargoId,
    'tx_hash'       => $txHash,
    'contractType'  => $contractType,
    'action'        => $blockchainAction,
    'paymentReleased'=> $contractType === 'payment',
    'newStatus'     => $newStatus
]);
?>
