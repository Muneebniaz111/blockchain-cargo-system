<?php
/* ===================================
   ADMIN LOGIN FORM PROCESSING
   Admin Authentication & Authorization
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
$adminEmail = trim($_POST['adminEmail'] ?? '');
$adminPassword = $_POST['adminPassword'] ?? '';

// Basic validation
if (empty($adminEmail) || empty($adminPassword)) {
    $response['message'] = 'Admin email and password are required';
    echo json_encode($response);
    exit();
}

// Validate email format
if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Invalid email format';
    echo json_encode($response);
    exit();
}

// Query database for admin user
$query = "SELECT id, full_name, email, password, user_role, is_active, is_verified FROM users WHERE email = ? AND user_role = 'admin' LIMIT 1";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    $response['message'] = 'Database error: ' . $mysqli->error;
    echo json_encode($response);
    exit();
}

$stmt->bind_param('s', $adminEmail);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Log failed admin login attempt
    error_log('[ADMIN_LOGIN_FAILED] No admin account found for email: ' . $adminEmail . ' | IP: ' . $_SERVER['REMOTE_ADDR']);
    $response['message'] = 'Invalid admin credentials';
    echo json_encode($response);
    $stmt->close();
    exit();
}

$admin = $result->fetch_assoc();
$stmt->close();

// Check if admin account is active
if (!$admin['is_active']) {
    error_log('[ADMIN_LOGIN_FAILED] Admin account deactivated for: ' . $adminEmail . ' | IP: ' . $_SERVER['REMOTE_ADDR']);
    $response['message'] = 'Your admin account has been deactivated. Please contact the system administrator.';
    echo json_encode($response);
    exit();
}

// Verify password using bcrypt
if (!password_verify($adminPassword, $admin['password'])) {
    // Log failed login attempt
    error_log('[ADMIN_LOGIN_FAILED] Invalid password for admin: ' . $adminEmail . ' | IP: ' . $_SERVER['REMOTE_ADDR']);
    $response['message'] = 'Invalid admin credentials';
    echo json_encode($response);
    exit();
}

// Check if email is verified (optional for admins)
if (!$admin['is_verified']) {
    error_log('[ADMIN_LOGIN_WARNING] Unverified admin account logged in: ' . $adminEmail);
    // Allow login but log it
}

// Update last login timestamp
$update_query = "UPDATE users SET last_login = NOW() WHERE id = ?";
$update_stmt = $mysqli->prepare($update_query);
if ($update_stmt) {
    $update_stmt->bind_param('i', $admin['id']);
    $update_stmt->execute();
    $update_stmt->close();
}

// Create session with admin-specific data
$_SESSION['admin_id'] = $admin['id'];
$_SESSION['admin_email'] = $admin['email'];
$_SESSION['admin_name'] = $admin['full_name'];
$_SESSION['user_role'] = $admin['user_role'];
$_SESSION['admin_login_time'] = time();

// Log successful admin login
error_log('[ADMIN_LOGIN_SUCCESS] Admin logged in: ' . $admin['full_name'] . ' (' . $adminEmail . ') | IP: ' . $_SERVER['REMOTE_ADDR']);

// Log to audit table if needed
$audit_query = "INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address, user_agent, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
$audit_stmt = $mysqli->prepare($audit_query);
if ($audit_stmt) {
    $action = 'ADMIN_LOGIN';
    $resource_type = 'ADMIN_SESSION';
    $description = 'Admin ' . $admin['full_name'] . ' logged in successfully';
    $ip_address = $_SERVER['REMOTE_ADDR'];
    $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    $audit_stmt->bind_param('isssss', $admin['id'], $action, $resource_type, $description, $ip_address, $user_agent);
    $audit_stmt->execute();
    $audit_stmt->close();
}

$response['success'] = true;
$response['message'] = 'Admin login successful! Redirecting to dashboard...';
$response['admin_name'] = $admin['full_name'];

echo json_encode($response);
$mysqli->close();
?>
