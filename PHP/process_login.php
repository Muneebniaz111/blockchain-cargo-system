<?php
/* ===================================
   USER LOGIN — checks approval status
   Only approved (active) users can log in.
   Pending / rejected users get clear feedback.
   =================================== */

header('Content-Type: application/json');
session_start();
require_once 'config.php';

$response = ['success' => false, 'message' => '', 'status' => ''];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method';
    echo json_encode($response);
    exit();
}

$email      = strtolower(trim($_POST['email']    ?? ''));
$password   = $_POST['password']                  ?? '';
$rememberMe = !empty($_POST['rememberMe']);

if (empty($email) || empty($password)) {
    $response['message'] = 'Email and password are required';
    echo json_encode($response);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Invalid email format';
    echo json_encode($response);
    exit();
}

if (!preg_match('/^[a-zA-Z0-9._%+\-]+@shipyard\.pk$/i', $email)) {
    $response['message'] = 'Only @shipyard.pk accounts can log in here';
    echo json_encode($response);
    exit();
}

// ── Check registration_requests first for clear feedback ──
$chkReq = $mysqli->prepare(
    "SELECT status FROM registration_requests
     WHERE email = ?
     ORDER BY created_at DESC
     LIMIT 1"
);
if ($chkReq) {
    $chkReq->bind_param('s', $email);
    $chkReq->execute();
    $reqResult = $chkReq->get_result();
    if ($reqResult->num_rows > 0) {
        $req = $reqResult->fetch_assoc();
        if ($req['status'] === 'pending') {
            $response['status']  = 'pending';
            $response['message'] = 'Your account is pending admin approval. Please wait for the administrator to review your registration.';
            $chkReq->close();
            $mysqli->close();
            echo json_encode($response);
            exit();
        }
        if ($req['status'] === 'rejected') {
            $response['status']  = 'rejected';
            $response['message'] = 'Your registration request was not approved. Please contact the administrator for more information.';
            $chkReq->close();
            $mysqli->close();
            echo json_encode($response);
            exit();
        }
        // status = 'approved' — continue to normal login below
    }
    $chkReq->close();
}

// ── Normal login flow ──────────────────────────────────────
$stmt = $mysqli->prepare(
    "SELECT id, full_name, email, password, is_active, user_role
     FROM users
     WHERE email = ? AND user_role = 'user'
     LIMIT 1"
);
if (!$stmt) {
    $response['message'] = 'Database error';
    echo json_encode($response);
    exit();
}
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $response['message'] = 'Invalid email or password';
    $stmt->close();
    $mysqli->close();
    echo json_encode($response);
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();

if (!(bool)$user['is_active']) {
    $response['status']  = 'inactive';
    $response['message'] = 'Your account has been deactivated. Please contact support.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

if (!password_verify($password, $user['password'])) {
    $response['message'] = 'Invalid email or password';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

// ── Update last login ─────────────────────────────────────
$upd = $mysqli->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
if ($upd) {
    $upd->bind_param('i', $user['id']);
    $upd->execute();
    $upd->close();
}

// ── Session ───────────────────────────────────────────────
$_SESSION['user_id']         = (int)$user['id'];
$_SESSION['user_email']      = $user['email'];
$_SESSION['user_name']       = $user['full_name'];
$_SESSION['user_role']       = 'user';
$_SESSION['login_time']      = time();
$_SESSION['user_agent_hash'] = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');

// ── Remember Me ───────────────────────────────────────────
if ($rememberMe) {
    setcookie('remember_user_email', $user['email'], [
        'expires'  => time() + (30 * 24 * 60 * 60),
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
} else {
    setcookie('remember_user_email', '', time() - 3600, '/');
}

$response['success']   = true;
$response['status']    = 'approved';
$response['message']   = 'Login successful! Redirecting...';
$response['user_name'] = $user['full_name'];

$mysqli->close();
echo json_encode($response);
?>
