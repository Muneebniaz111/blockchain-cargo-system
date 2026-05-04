<?php
/* ===================================
   GET REGISTRATION REQUESTS
   Returns pending / all registration
   requests for the Admin Dashboard.
   Requires active admin session.
   =================================== */

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

session_start();

// ── Auth guard ────────────────────────────────────────────
if (
    empty($_SESSION['admin_id']) ||
    empty($_SESSION['admin_email']) ||
    ($_SESSION['user_role'] ?? '') !== 'admin'
) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

require_once 'config.php';

$filter = strtolower(trim($_GET['status'] ?? 'pending'));
$allowed = ['pending', 'approved', 'rejected', 'all'];
if (!in_array($filter, $allowed)) {
    $filter = 'pending';
}

if ($filter === 'all') {
    $stmt = $mysqli->prepare(
        "SELECT id, full_name, email, contact_number, cnic, status, created_at, reviewed_at, rejection_reason
         FROM registration_requests
         ORDER BY
             CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
             created_at DESC
         LIMIT 200"
    );
} else {
    $stmt = $mysqli->prepare(
        "SELECT id, full_name, email, contact_number, cnic, status, created_at, reviewed_at, rejection_reason
         FROM registration_requests
         WHERE status = ?
         ORDER BY created_at DESC
         LIMIT 200"
    );
    $stmt->bind_param('s', $filter);
}

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $mysqli->error]);
    exit();
}

$stmt->execute();
$result = $stmt->get_result();

$requests = [];
while ($row = $result->fetch_assoc()) {
    $requests[] = [
        'id'               => (int)$row['id'],
        'full_name'        => $row['full_name'],
        'email'            => $row['email'],
        'contact_number'   => $row['contact_number'],
        'cnic'             => $row['cnic'],
        'status'           => $row['status'],
        'created_at'       => $row['created_at'],
        'reviewed_at'      => $row['reviewed_at'],
        'rejection_reason' => $row['rejection_reason']
    ];
}

$stmt->close();

// Also return the pending count for the sidebar badge
$countStmt = $mysqli->prepare("SELECT COUNT(*) AS cnt FROM registration_requests WHERE status = 'pending'");
$countStmt->execute();
$countResult = $countStmt->get_result();
$countRow = $countResult->fetch_assoc();
$pendingCount = (int)$countRow['cnt'];
$countStmt->close();

$mysqli->close();

echo json_encode([
    'success'       => true,
    'requests'      => $requests,
    'pending_count' => $pendingCount,
    'filter'        => $filter
]);
?>
