<?php
/* ===================================
   CERTIFICATE ISSUANCE — Step 6
   Issues certificate + writes
   blockchain record + audit entry.
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

$cargoId     = trim($_POST['cargoId']     ?? '');
$supplier    = trim($_POST['supplier']    ?? '');
$certType    = trim($_POST['certType']    ?? '');
$description = trim($_POST['description'] ?? '');
$adminId     = (int)$_SESSION['admin_id'];

if (!$cargoId || !$supplier || !$certType) {
    echo json_encode(['success' => false, 'message' => 'Cargo ID, supplier, and certificate type are required']);
    exit();
}

// Generate certificate number (sequential-ish)
$countResult = $mysqli->query(
    "SELECT COUNT(*) AS cnt FROM blockchain_logs WHERE action = 'CERTIFICATE_ISSUED'"
);
$countRow   = $countResult ? $countResult->fetch_assoc() : ['cnt' => 0];
$certNumber = str_pad((int)$countRow['cnt'] + 1, 3, '0', STR_PAD_LEFT);

$certLabel  = ucwords(str_replace('_', ' ', $certType));

// 1. Write blockchain record for certificate issuance
$txHash = writeBlockchainLog(
    $mysqli,
    $cargoId,
    'CERTIFICATE_ISSUED',
    '',
    'issued',
    [
        'cert_number' => $certNumber,
        'cert_type'   => $certType,
        'supplier'    => $supplier,
        'description' => $description,
        'issued_by'   => $adminId,
        'issued_at'   => date('Y-m-d H:i:s'),
    ],
    $adminId
);

// 2. Update cargo blockchain_hash with certificate hash
$upd = $mysqli->prepare("UPDATE cargo SET blockchain_hash = ?, updated_at = NOW() WHERE cargo_id = ?");
if ($upd) {
    $upd->bind_param('ss', $txHash, $cargoId);
    $upd->execute();
    $upd->close();
}

// 3. Audit log
writeAuditWithBlockchain(
    $mysqli, $adminId,
    'CERTIFICATE_ISSUED', 'CARGO',
    $cargoId,
    "Certificate #{$certNumber} ({$certLabel}) issued for cargo {$cargoId}. Supplier: {$supplier}.",
    $txHash
);

$mysqli->close();

echo json_encode([
    'success'    => true,
    'message'    => "Certificate #{$certNumber} issued for {$cargoId}",
    'cargoId'    => $cargoId,
    'certNumber' => $certNumber,
    'certType'   => $certType,
    'certLabel'  => $certLabel,
    'tx_hash'    => $txHash,
    'issuedAt'   => date('Y-m-d')
]);
?>
