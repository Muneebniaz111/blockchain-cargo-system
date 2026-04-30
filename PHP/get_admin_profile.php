<?php
/* ===================================
   GET ADMIN PROFILE
   FIX #10: Dedicated endpoint to return
   the currently logged-in admin's profile
   from the session. Replaces the incorrect
   use of seed_admins.php for profile data.
   =================================== */

header('Content-Type: application/json');
session_start();

$response = [
    'success' => false,
    'message' => ''
];

// Verify admin session is active
if (empty($_SESSION['admin_id']) || empty($_SESSION['admin_email'])) {
    $response['message'] = 'Not authenticated';
    http_response_code(401);
    echo json_encode($response);
    exit();
}

require_once 'config.php';

$query = "SELECT id, full_name, email, contact_number, cnic, user_role FROM users WHERE id = ? AND user_role = 'admin' AND is_active = 1 LIMIT 1";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    $response['message'] = 'Database error: ' . $mysqli->error;
    echo json_encode($response);
    exit();
}

$stmt->bind_param('i', $_SESSION['admin_id']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $response['message'] = 'Admin profile not found';
    http_response_code(404);
    echo json_encode($response);
    $stmt->close();
    exit();
}

$admin = $result->fetch_assoc();
$stmt->close();

$response['success'] = true;
$response['profile'] = [
    'full_name'      => $admin['full_name'],
    'email'          => $admin['email'],
    'contact_number' => $admin['contact_number'],
    'cnic'           => $admin['cnic'],
    'user_role'      => $admin['user_role']
];

echo json_encode($response);
$mysqli->close();
?>
