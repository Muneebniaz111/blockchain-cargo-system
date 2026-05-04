<?php
/* ===================================
   ADMIN LOGIN — STEP 2 (2FA Verify)
   Validates the 6-digit TOTP code.
   On success: upgrades to full admin session.
   Partial session must exist from Step 1.
   =================================== */

header('Content-Type: application/json');
session_start();
require_once 'config.php';
require_once 'totp.php';

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method';
    echo json_encode($response);
    exit();
}

// ── Validate partial session ──────────────────────────────
if (
    empty($_SESSION['2fa_pending_admin_id']) ||
    empty($_SESSION['2fa_pending_admin_email']) ||
    empty($_SESSION['2fa_pending_time'])
) {
    $response['message'] = 'Session expired. Please log in again.';
    echo json_encode($response);
    exit();
}

// Agent fingerprint check
$expectedHash = $_SESSION['2fa_agent_hash'] ?? null;
$currentHash  = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
if ($expectedHash !== null && $expectedHash !== $currentHash) {
    error_log('[2FA_WARN] User-agent mismatch during 2FA step');
    $response['message'] = 'Session validation failed. Please log in again.';
    // Clear partial session
    unset($_SESSION['2fa_pending_admin_id'], $_SESSION['2fa_pending_admin_email'],
          $_SESSION['2fa_pending_admin_name'], $_SESSION['2fa_pending_time'],
          $_SESSION['2fa_agent_hash']);
    echo json_encode($response);
    exit();
}

// Partial session must not be older than 10 minutes
if (time() - $_SESSION['2fa_pending_time'] > 600) {
    unset($_SESSION['2fa_pending_admin_id'], $_SESSION['2fa_pending_admin_email'],
          $_SESSION['2fa_pending_admin_name'], $_SESSION['2fa_pending_time'],
          $_SESSION['2fa_agent_hash']);
    $response['message'] = 'Session timed out. Please log in again.';
    echo json_encode($response);
    exit();
}

// ── Get submitted OTP ─────────────────────────────────────
$otpCode  = trim($_POST['otp_code'] ?? '');
$adminId  = (int)$_SESSION['2fa_pending_admin_id'];

if (!preg_match('/^\d{6}$/', $otpCode)) {
    $response['message'] = 'Please enter a valid 6-digit code';
    echo json_encode($response);
    exit();
}

// ── Fetch encrypted secret from DB ───────────────────────
$stmt = $mysqli->prepare(
    "SELECT id, full_name, email, totp_secret, is_active, user_role
     FROM users
     WHERE id = ? AND user_role = 'admin' AND is_active = 1
     LIMIT 1"
);
if (!$stmt) {
    $response['message'] = 'Database error';
    echo json_encode($response);
    exit();
}
$stmt->bind_param('i', $adminId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $response['message'] = 'Admin account not found or deactivated';
    $stmt->close();
    $mysqli->close();
    echo json_encode($response);
    exit();
}

$admin = $result->fetch_assoc();
$stmt->close();

if (empty($admin['totp_secret'])) {
    $response['message'] = '2FA not configured for this account. Contact system administrator.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

// ── Decrypt and verify TOTP ───────────────────────────────
$plainSecret = TOTP::decryptSecret($admin['totp_secret']);
if (empty($plainSecret)) {
    error_log('[2FA_ERROR] Failed to decrypt TOTP secret for admin_id=' . $adminId);
    $response['message'] = '2FA configuration error. Contact system administrator.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

if (!TOTP::verifyCode($plainSecret, $otpCode)) {
    error_log('[2FA_FAILED] Invalid OTP for admin: ' . $admin['email']);
    $response['message'] = 'Invalid authentication code. Please try again.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

// ── OTP valid — upgrade to full admin session ──────────────
// Clear partial 2FA session data
unset(
    $_SESSION['2fa_pending_admin_id'],
    $_SESSION['2fa_pending_admin_email'],
    $_SESSION['2fa_pending_admin_name'],
    $_SESSION['2fa_pending_time'],
    $_SESSION['2fa_agent_hash']
);

// Create full session
$_SESSION['admin_id']         = (int)$admin['id'];
$_SESSION['admin_email']      = $admin['email'];
$_SESSION['admin_name']       = $admin['full_name'];
$_SESSION['user_role']        = 'admin';
$_SESSION['admin_login_time'] = time();
$_SESSION['admin_agent_hash'] = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');

// ── Update last login ─────────────────────────────────────
$upd = $mysqli->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
if ($upd) {
    $upd->bind_param('i', $admin['id']);
    $upd->execute();
    $upd->close();
}

// ── Audit log ─────────────────────────────────────────────
$audit = $mysqli->prepare(
    "INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address, user_agent, created_at)
     VALUES (?, 'ADMIN_LOGIN_2FA', 'ADMIN_SESSION', ?, ?, ?, NOW())"
);
if ($audit) {
    $desc = 'Admin ' . $admin['full_name'] . ' completed 2FA login';
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua   = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $audit->bind_param('isss', $admin['id'], $desc, $ip, $ua);
    $audit->execute();
    $audit->close();
}

error_log('[ADMIN_LOGIN_2FA_SUCCESS] ' . $admin['email'] . ' | IP: ' . ($_SERVER['REMOTE_ADDR'] ?? ''));

$response['success']    = true;
$response['message']    = 'Authentication successful! Redirecting to dashboard...';
$response['admin_name'] = $admin['full_name'];

$mysqli->close();
echo json_encode($response);
?>
