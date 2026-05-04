<?php
/* ===================================
   GET USER PROFILE
   Dedicated endpoint to return
   the currently logged-in user's profile
   from the session and database.
   =================================== */

header('Content-Type: application/json');
session_start();

$response = [
    'success' => false,
    'message' => ''
];

// Verify user session is active
if (empty($_SESSION['user_id']) || empty($_SESSION['user_email'])) {
    $response['message'] = 'Not authenticated';
    http_response_code(401);
    echo json_encode($response);
    exit();
}

require_once 'config.php';

$query = "SELECT id, full_name, email, contact_number, cnic, user_role FROM users WHERE id = ? AND user_role = 'user' AND is_active = 1 LIMIT 1";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    $response['message'] = 'Database error: ' . $mysqli->error;
    echo json_encode($response);
    exit();
}

$stmt->bind_param('i', $_SESSION['user_id']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $response['message'] = 'User profile not found';
    http_response_code(404);
    echo json_encode($response);
    $stmt->close();
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();
$mysqli->close();

// Return user profile
$response['success'] = true;
$response['data'] = [
    'userId' => 'USR-' . str_pad($user['id'], 4, '0', STR_PAD_LEFT),
    'fullName' => $user['full_name'],
    'email' => $user['email'],
    'contactNumber' => $user['contact_number'],
    'cnic' => $user['cnic'],
    'role' => ucfirst($user['user_role']) . ' User'
];

echo json_encode($response);
?>
