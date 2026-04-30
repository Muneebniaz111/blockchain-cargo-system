<?php
/* ===================================
   LOGIN FORM PROCESSING
   User Authentication
   =================================== */

header('Content-Type: application/json');

// Start session
session_start();

// Include database configuration
require_once 'config.php';

// Initialize response array
$response = [
    'success' => false,
    'message' => ''
];

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method';
    echo json_encode($response);
    exit();
}

// Get and sanitize input data
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$rememberMe = isset($_POST['rememberMe']) ? true : false;

// Basic validation
if (empty($email) || empty($password)) {
    $response['message'] = 'Email and password are required';
    echo json_encode($response);
    exit();
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Invalid email format';
    echo json_encode($response);
    exit();
}

// Query database for user
$query = "SELECT id, full_name, email, password, is_active, is_verified FROM users WHERE email = ? LIMIT 1";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    $response['message'] = 'Database error: ' . $mysqli->error;
    echo json_encode($response);
    exit();
}

$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Log failed login attempt
    error_log('Failed login attempt for email: ' . $email);
    $response['message'] = 'Invalid email or password';
    echo json_encode($response);
    $stmt->close();
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();

// Check if account is active
if (!$user['is_active']) {
    $response['message'] = 'Your account has been deactivated. Please contact support.';
    echo json_encode($response);
    exit();
}

// Verify password using bcrypt
if (!password_verify($password, $user['password'])) {
    // Log failed login attempt
    error_log('Failed password verification for email: ' . $email);
    $response['message'] = 'Invalid email or password';
    echo json_encode($response);
    exit();
}

// Check if email is verified (optional - comment out if not required)
// if (!$user['is_verified']) {
//     $response['message'] = 'Please verify your email before logging in.';
//     echo json_encode($response);
//     exit();
// }

// Update last login timestamp
$update_query = "UPDATE users SET last_login = NOW() WHERE id = ?";
$update_stmt = $mysqli->prepare($update_query);
if ($update_stmt) {
    $update_stmt->bind_param('i', $user['id']);
    $update_stmt->execute();
    $update_stmt->close();
}

// Create session
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['login_time'] = time();

// Set remember me cookie (30 days)
if ($rememberMe) {
    setcookie('user_email', $email, time() + (30 * 24 * 60 * 60), '/');
}

// Log successful login
error_log('Successful login for user: ' . $user['email']);

$response['success'] = true;
$response['message'] = 'Login successful! Redirecting...';

echo json_encode($response);
$mysqli->close();
?>
