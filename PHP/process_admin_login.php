<?php
/* ===================================
   ADMIN LOGIN — STEP 1 (Credentials)
   Verifies email + password.
   On success: does NOT create full session.
   Returns needs_2fa=true so JS shows 2FA step.
   The QR URI is returned for first-time setup.
   =================================== */

header('Content-Type: application/json');
session_start();
require_once 'config.php';
require_once 'totp.php';
require_once 'setup_admin_2fa.php';

$response = ['success' => false, 'message' => '', 'needs_2fa' => false];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method';
    echo json_encode($response);
    exit();
}

$adminEmail    = strtolower(trim($_POST['adminEmail']    ?? ''));
$adminPassword = $_POST['adminPassword']                  ?? '';

if (empty($adminEmail) || empty($adminPassword)) {
    $response['message'] = 'Admin email and password are required';
    echo json_encode($response);
    exit();
}

if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Invalid email format';
    echo json_encode($response);
    exit();
}

if (!preg_match('/^[a-zA-Z0-9._%+\-]+@shipyard\.pk$/i', $adminEmail)) {
    $response['message'] = 'Invalid admin credentials';
    error_log('[ADMIN_LOGIN_FAILED] Non-shipyard email: ' . $adminEmail);
    echo json_encode($response);
    exit();
}

// ── DB lookup ─────────────────────────────────────────────
$stmt = $mysqli->prepare(
    "SELECT id, full_name, email, password, user_role, is_active
     FROM users
     WHERE email = ? AND user_role = 'admin'
     LIMIT 1"
);
if (!$stmt) {
    $response['message'] = 'Database error';
    echo json_encode($response);
    exit();
}
$stmt->bind_param('s', $adminEmail);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    error_log('[ADMIN_LOGIN_FAILED] No admin: ' . $adminEmail);
    $response['message'] = 'Invalid admin credentials';
    $stmt->close();
    $mysqli->close();
    echo json_encode($response);
    exit();
}

$admin = $result->fetch_assoc();
$stmt->close();

if (!(bool)$admin['is_active']) {
    $response['message'] = 'This admin account has been deactivated.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

if (!password_verify($adminPassword, $admin['password'])) {
    error_log('[ADMIN_LOGIN_FAILED] Wrong password: ' . $adminEmail);
    $response['message'] = 'Invalid admin credentials';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

// ── Credentials valid — get/create 2FA secret ─────────────
$plainSecret = getOrCreateAdminSecret($mysqli, (int)$admin['id']);
$qrData      = TOTP::getQrData($plainSecret, $admin['email']);

// ── Store partial-auth in session ─────────────────────────
// Not a full admin session — just enough to proceed to step 2
$_SESSION['2fa_pending_admin_id']    = (int)$admin['id'];
$_SESSION['2fa_pending_admin_email'] = $admin['email'];
$_SESSION['2fa_pending_admin_name']  = $admin['full_name'];
$_SESSION['2fa_pending_time']        = time();
$_SESSION['2fa_agent_hash']          = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');

$mysqli->close();

// ── Return 2FA challenge to frontend ──────────────────────
$response['success']    = true;
$response['needs_2fa']  = true;
$response['message']    = 'Credentials verified. Please enter your 2FA code.';
$response['admin_name'] = $admin['full_name'];
$response['qr_uri']     = $qrData['uri'];    // for QR rendering
$response['secret']     = $plainSecret;       // for manual entry
$response['is_new_setup'] = true; // Always show QR (user can dismiss after first scan)

echo json_encode($response);
?>
