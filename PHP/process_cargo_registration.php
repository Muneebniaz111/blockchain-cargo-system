<?php
/* ===================================
   CARGO REGISTRATION — Step 3
   Stores cargo in DB + writes
   blockchain log + audit entry.
   =================================== */
header('Content-Type: application/json');
session_start();

// Auth guard
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
$cargoType   = trim($_POST['cargoType']   ?? '');
$supplier    = trim($_POST['supplier']    ?? '');
$quantity    = (float)($_POST['quantity'] ?? 0);
$origin      = trim($_POST['origin']      ?? '');
$destination = trim($_POST['destination'] ?? '');
$eta         = trim($_POST['eta']         ?? '');
$description = trim($_POST['description'] ?? '');
$adminId     = (int)$_SESSION['admin_id'];

// Validation
$errors = [];
if (!$cargoId)     $errors[] = 'Cargo ID is required';
if (!$cargoType)   $errors[] = 'Cargo Type is required';
if (!$supplier)    $errors[] = 'Supplier is required';
if ($quantity <= 0)$errors[] = 'Quantity must be positive';
if (!$origin)      $errors[] = 'Origin is required';
if (!$destination) $errors[] = 'Destination is required';
if (!$eta)         $errors[] = 'ETA is required';

if (!empty($errors)) {
    echo json_encode(['success' => false, 'message' => implode('; ', $errors)]);
    exit();
}

// Check duplicate Cargo ID
$chk = $mysqli->prepare("SELECT id FROM cargo WHERE cargo_id = ? LIMIT 1");
$chk->bind_param('s', $cargoId);
$chk->execute();
$chk->store_result();
if ($chk->num_rows > 0) {
    $chk->close();
    echo json_encode(['success' => false, 'message' => "Cargo ID '{$cargoId}' already exists"]);
    exit();
}
$chk->close();

// Find the admin's user record (for FK)
// Use admin_id from session — admin is stored in users table
$userId = $adminId; // cargo belongs to the admin who registered it

// 1. Write blockchain log (before DB insert, get hash to store)
$txHash = writeBlockchainLog(
    $mysqli,
    $cargoId,
    'REGISTERED',
    '',
    'registered',
    [
        'cargo_type'  => $cargoType,
        'supplier'    => $supplier,
        'quantity_kg' => $quantity,
        'origin'      => $origin,
        'destination' => $destination,
        'eta'         => $eta,
    ],
    $adminId
);

// 2. Store in cargo table (using blockchain_hash field that already exists in schema)
$ins = $mysqli->prepare(
    "INSERT INTO cargo
     (cargo_id, description, origin, destination, status, weight, user_id, blockchain_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'registered', ?, ?, ?, NOW(), NOW())"
);
if (!$ins) {
    echo json_encode(['success' => false, 'message' => 'DB prepare error: ' . $mysqli->error]);
    exit();
}

$desc = $description ?: "{$cargoType} from {$supplier}";
$ins->bind_param('sssssdss', $cargoId, $desc, $origin, $destination, $quantity, $userId, $txHash);

if (!$ins->execute()) {
    echo json_encode(['success' => false, 'message' => 'Insert error: ' . $ins->error]);
    $ins->close();
    exit();
}
$newCargoDbId = (int)$mysqli->insert_id;
$ins->close();

// Also store in cargo_tracking as initial event
$trackStmt = $mysqli->prepare(
    "INSERT INTO cargo_tracking (cargo_id, location, status, notes, recorded_at)
     VALUES (?, ?, 'registered', ?, NOW())"
);
if ($trackStmt) {
    $initNote = "Cargo registered via admin dashboard. Supplier: {$supplier}. Qty: {$quantity}kg.";
    $trackStmt->bind_param('iss', $newCargoDbId, $origin, $initNote);
    $trackStmt->execute();
    $trackStmt->close();
}

// 3. Write audit log WITH tx_hash
writeAuditWithBlockchain(
    $mysqli, $adminId,
    'CARGO_REGISTERED', 'CARGO',
    $cargoId,
    "Cargo {$cargoId} ({$cargoType}) registered from {$origin} to {$destination}. Supplier: {$supplier}.",
    $txHash
);

$mysqli->close();

echo json_encode([
    'success'   => true,
    'message'   => "Cargo {$cargoId} registered successfully!",
    'cargoId'   => $cargoId,
    'tx_hash'   => $txHash,
    'status'    => 'registered',
    'cargoType' => $cargoType,
    'supplier'  => $supplier,
    'origin'    => $origin,
    'destination'=> $destination,
    'eta'       => $eta
]);
?>
