<?php
/* ===================================
   ADMIN FORGOT PASSWORD
   Two-action endpoint:

   action = 'verify_identity'
     Checks admin email exists and that
     the submitted 6-digit TOTP (from
     authenticator app) is valid.
     On success: stores partial session
     and returns allow_reset=true.

   action = 'reset_password'
     Uses the partial session set above
     to update the admin's password.

   No email is exposed — admin must know
   their authenticator app code to prove
   identity. If 2FA is lost, a super-admin
   must reset it manually.
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

$action = trim($_POST['action'] ?? 'verify_identity');

// ══════════════════════════════════════════════════════════
// ACTION: verify_identity — email + TOTP → grant reset token
// ══════════════════════════════════════════════════════════
if ($action === 'verify_identity') {

    $adminEmail = strtolower(trim($_POST['adminEmail'] ?? ''));
    $otpCode    = trim($_POST['totp_code'] ?? '');

    // ── Basic validation ──────────────────────────────────
    if (empty($adminEmail)) {
        $response['message'] = 'Admin email is required';
        echo json_encode($response);
        exit();
    }
    if (!preg_match('/^[a-zA-Z0-9._%+\-]+@shipyard\.pk$/i', $adminEmail)) {
        $response['message'] = 'Invalid admin email format';
        echo json_encode($response);
        exit();
    }
    if (!preg_match('/^\d{6}$/', $otpCode)) {
        $response['message'] = 'Please enter a valid 6-digit authenticator code';
        echo json_encode($response);
        exit();
    }

    // ── Rate-limit: 5 attempts per 15 min per IP ──────────
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $rlKey = 'admin_fp_' . md5($ip);
    if (!isset($_SESSION[$rlKey])) {
        $_SESSION[$rlKey] = ['count' => 0, 'window_start' => time()];
    }
    $rl = &$_SESSION[$rlKey];
    if (time() - $rl['window_start'] > 900) {
        $rl = ['count' => 0, 'window_start' => time()];
    }
    $rl['count']++;
    if ($rl['count'] > 5) {
        $response['message'] = 'Too many attempts. Please wait 15 minutes before trying again.';
        echo json_encode($response);
        exit();
    }

    // ── Fetch admin ───────────────────────────────────────
    $stmt = $mysqli->prepare(
        "SELECT id, full_name, email, totp_secret, is_active
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
        // Deliberately generic message
        $response['message'] = 'Invalid credentials or authentication code';
        error_log('[ADMIN_FP_NOTFOUND] ' . $adminEmail);
        $stmt->close();
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    $admin = $result->fetch_assoc();
    $stmt->close();

    if (!(bool)$admin['is_active']) {
        $response['message'] = 'This admin account is deactivated';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    if (empty($admin['totp_secret'])) {
        $response['message'] = '2FA is not configured for this account. Contact the system owner to reset your account.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // ── Verify TOTP ───────────────────────────────────────
    $plainSecret = TOTP::decryptSecret($admin['totp_secret']);
    if (empty($plainSecret)) {
        $response['message'] = '2FA configuration error. Contact the system owner.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    if (!TOTP::verifyCode($plainSecret, $otpCode)) {
        error_log('[ADMIN_FP_INVALID_TOTP] ' . $adminEmail);
        $response['message'] = 'Invalid authentication code. Please check your authenticator app and try again.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // ── TOTP valid — set partial reset session ────────────
    // Generate a one-time reset token
    $resetToken = bin2hex(random_bytes(32));

    $_SESSION['admin_fp_id']          = (int)$admin['id'];
    $_SESSION['admin_fp_email']       = $admin['email'];
    $_SESSION['admin_fp_token']       = $resetToken;
    $_SESSION['admin_fp_granted_at']  = time();
    $_SESSION['admin_fp_agent_hash']  = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');

    error_log('[ADMIN_FP_VERIFIED] ' . $adminEmail);

    $mysqli->close();

    $response['success']      = true;
    $response['allow_reset']  = true;
    $response['message']      = 'Identity verified. Please set your new password.';
    $response['reset_token']  = $resetToken;   // echoed back; JS must send it on next step
    echo json_encode($response);
    exit();
}

// ══════════════════════════════════════════════════════════
// ACTION: reset_password — set new password using session
// ══════════════════════════════════════════════════════════
if ($action === 'reset_password') {

    // ── Session validation ────────────────────────────────
    if (
        empty($_SESSION['admin_fp_id']) ||
        empty($_SESSION['admin_fp_token']) ||
        empty($_SESSION['admin_fp_granted_at'])
    ) {
        $response['message'] = 'Session expired. Please restart the forgot password process.';
        echo json_encode($response);
        exit();
    }

    // Token must be <= 5 minutes old
    if (time() - $_SESSION['admin_fp_granted_at'] > 300) {
        unset($_SESSION['admin_fp_id'], $_SESSION['admin_fp_email'],
              $_SESSION['admin_fp_token'], $_SESSION['admin_fp_granted_at'],
              $_SESSION['admin_fp_agent_hash']);
        $response['message'] = 'Reset window expired (5 minutes). Please start over.';
        echo json_encode($response);
        exit();
    }

    // Agent fingerprint
    $expectedAgent = $_SESSION['admin_fp_agent_hash'] ?? null;
    $currentAgent  = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($expectedAgent !== null && $expectedAgent !== $currentAgent) {
        $response['message'] = 'Session validation failed. Please start over.';
        echo json_encode($response);
        exit();
    }

    // Token check
    $submittedToken = trim($_POST['reset_token'] ?? '');
    if (!hash_equals($_SESSION['admin_fp_token'], $submittedToken)) {
        $response['message'] = 'Invalid reset token. Please start over.';
        echo json_encode($response);
        exit();
    }

    $adminId = (int)$_SESSION['admin_fp_id'];
    $newPw   = $_POST['new_password']     ?? '';
    $confPw  = $_POST['confirm_password'] ?? '';

    // ── Password validation ───────────────────────────────
    if (empty($newPw)) {
        $response['message'] = 'New password is required.';
        echo json_encode($response);
        exit();
    }
    if (strlen($newPw) < 8) {
        $response['message'] = 'Password must be at least 8 characters.';
        echo json_encode($response);
        exit();
    }
    if (!preg_match('/[A-Z]/', $newPw) || !preg_match('/[0-9]/', $newPw)) {
        $response['message'] = 'Password must contain at least one uppercase letter and one number.';
        echo json_encode($response);
        exit();
    }
    if ($newPw !== $confPw) {
        $response['message'] = 'Passwords do not match.';
        echo json_encode($response);
        exit();
    }

    // ── Update password ───────────────────────────────────
    $newHash = password_hash($newPw, PASSWORD_BCRYPT);

    $upd = $mysqli->prepare(
        "UPDATE users SET password = ?, updated_at = NOW()
         WHERE id = ? AND user_role = 'admin'"
    );
    if (!$upd) {
        $response['message'] = 'Database error. Please try again.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }
    $upd->bind_param('si', $newHash, $adminId);
    $upd->execute();
    $upd->close();

    // ── Audit log ─────────────────────────────────────────
    $audit = $mysqli->prepare(
        "INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address, created_at)
         VALUES (?, 'ADMIN_PASSWORD_RESET', 'ADMIN', 'Admin reset password via 2FA verification', ?, NOW())"
    );
    if ($audit) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $audit->bind_param('is', $adminId, $ip);
        $audit->execute();
        $audit->close();
    }

    // ── Clear session ─────────────────────────────────────
    unset(
        $_SESSION['admin_fp_id'],
        $_SESSION['admin_fp_email'],
        $_SESSION['admin_fp_token'],
        $_SESSION['admin_fp_granted_at'],
        $_SESSION['admin_fp_agent_hash']
    );

    error_log('[ADMIN_PASSWORD_RESET_SUCCESS] admin_id=' . $adminId);

    $mysqli->close();

    $response['success'] = true;
    $response['message'] = 'Admin password reset successfully! You can now log in with your new password.';
    echo json_encode($response);
    exit();
}

$response['message'] = 'Unknown action.';
echo json_encode($response);
?>
