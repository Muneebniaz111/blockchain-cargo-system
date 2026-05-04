<?php
/* ===================================
   USER FORGOT PASSWORD — Step 2
   Verify the 6-digit OTP submitted by
   the user and, if valid, allow them to
   set a new password.

   POST params (verify step):
     action    = 'verify_otp'
     otp_code  — 6-digit code
     new_password      — new password
     confirm_password  — confirmation

   POST params (resend / change phone):
     action = 'resend_otp'
     email  — user's registered email

   Session must contain fp_user_id set
   by forgot_password_send_otp.php
   =================================== */

header('Content-Type: application/json');
session_start();
require_once 'config.php';

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method';
    echo json_encode($response);
    exit();
}

$action = trim($_POST['action'] ?? 'verify_otp');

// ══════════════════════════════════════════════════════════
// ACTION: verify_otp — check OTP + set new password
// ══════════════════════════════════════════════════════════
if ($action === 'verify_otp') {

    // ── Session check ─────────────────────────────────────
    if (empty($_SESSION['fp_user_id']) || empty($_SESSION['fp_otp_id'])) {
        $response['message'] = 'Session expired. Please restart the forgot password process.';
        echo json_encode($response);
        exit();
    }

    $userId  = (int)$_SESSION['fp_user_id'];
    $otpId   = (int)$_SESSION['fp_otp_id'];
    $otpCode = trim($_POST['otp_code'] ?? '');
    $newPw   = $_POST['new_password']     ?? '';
    $confPw  = $_POST['confirm_password'] ?? '';

    // ── Input validation ──────────────────────────────────
    if (!preg_match('/^\d{6}$/', $otpCode)) {
        $response['message'] = 'Please enter a valid 6-digit OTP.';
        echo json_encode($response);
        exit();
    }

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

    // ── Fetch OTP record ──────────────────────────────────
    ensureOtpTable($mysqli);

    $stmt = $mysqli->prepare(
        "SELECT id, otp_hash, is_used, attempts, expires_at
         FROM password_reset_otps
         WHERE id = ? AND user_id = ? AND user_type = 'user'
         LIMIT 1"
    );
    if (!$stmt) {
        $response['message'] = 'Database error.';
        echo json_encode($response);
        exit();
    }
    $stmt->bind_param('ii', $otpId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $response['message'] = 'OTP not found. Please request a new one.';
        $stmt->close();
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    $otpRecord = $result->fetch_assoc();
    $stmt->close();

    // ── Guard: already used ───────────────────────────────
    if ((int)$otpRecord['is_used'] === 1) {
        $response['message'] = 'This OTP has already been used. Please request a new one.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // ── Guard: expired ────────────────────────────────────
    if (strtotime($otpRecord['expires_at']) < time()) {
        $response['message'] = 'OTP has expired. Please request a new one.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // ── Guard: too many attempts (max 5) ──────────────────
    if ((int)$otpRecord['attempts'] >= 5) {
        $response['message'] = 'Too many incorrect attempts. Please request a new OTP.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // ── Increment attempt counter ─────────────────────────
    $upd = $mysqli->prepare(
        "UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = ?"
    );
    if ($upd) {
        $upd->bind_param('i', $otpId);
        $upd->execute();
        $upd->close();
    }

    // ── Verify OTP ────────────────────────────────────────
    if (!password_verify($otpCode, $otpRecord['otp_hash'])) {
        $attemptsLeft = 4 - (int)$otpRecord['attempts']; // already incremented
        $response['message'] = 'Invalid OTP. ' . max(0, $attemptsLeft) . ' attempt(s) remaining.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // ── OTP valid — update password ───────────────────────
    $newHash = password_hash($newPw, PASSWORD_BCRYPT);

    $updPw = $mysqli->prepare(
        "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ? AND user_role = 'user'"
    );
    if (!$updPw) {
        $response['message'] = 'Failed to update password. Please try again.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }
    $updPw->bind_param('si', $newHash, $userId);
    $updPw->execute();
    $updPw->close();

    // ── Mark OTP as used ─────────────────────────────────
    $markUsed = $mysqli->prepare(
        "UPDATE password_reset_otps SET is_used = 1 WHERE id = ?"
    );
    if ($markUsed) {
        $markUsed->bind_param('i', $otpId);
        $markUsed->execute();
        $markUsed->close();
    }

    // ── Audit log ─────────────────────────────────────────
    $audit = $mysqli->prepare(
        "INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address, created_at)
         VALUES (?, 'PASSWORD_RESET', 'USER', 'User reset password via OTP', ?, NOW())"
    );
    if ($audit) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $audit->bind_param('is', $userId, $ip);
        $audit->execute();
        $audit->close();
    }

    // ── Clear session state ───────────────────────────────
    unset(
        $_SESSION['fp_user_id'],
        $_SESSION['fp_otp_id'],
        $_SESSION['fp_phone'],
        $_SESSION['fp_sent_at'],
        $_SESSION['fp_agent_hash']
    );

    error_log('[PASSWORD_RESET_SUCCESS] user_id=' . $userId);

    $response['success'] = true;
    $response['message'] = 'Password reset successfully! You can now log in with your new password.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

// ══════════════════════════════════════════════════════════
// ACTION: change_phone — update phone number and resend OTP
// ══════════════════════════════════════════════════════════
if ($action === 'change_phone') {
    if (empty($_SESSION['fp_user_id'])) {
        $response['message'] = 'Session expired. Please restart the forgot password process.';
        echo json_encode($response);
        exit();
    }

    $userId   = (int)$_SESSION['fp_user_id'];
    $newPhone = preg_replace('/\D/', '', trim($_POST['new_phone'] ?? ''));

    if (empty($newPhone) || strlen($newPhone) < 10) {
        $response['message'] = 'Please enter a valid phone number.';
        echo json_encode($response);
        exit();
    }

    // Normalise
    if (strlen($newPhone) === 10 && $newPhone[0] === '3') {
        $newPhone = '92' . $newPhone;
    } elseif (strlen($newPhone) === 11 && substr($newPhone, 0, 2) === '03') {
        $newPhone = '92' . substr($newPhone, 1);
    }

    // Verify this phone belongs to the user (or allow any — policy choice)
    $chk = $mysqli->prepare(
        "SELECT id, full_name, contact_number FROM users WHERE id = ? LIMIT 1"
    );
    $chk->bind_param('i', $userId);
    $chk->execute();
    $row = $chk->get_result()->fetch_assoc();
    $chk->close();

    if (!$row) {
        $response['message'] = 'User not found.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // Check if the new phone matches the registered number
    $storedPhone = preg_replace('/\D/', '', $row['contact_number']);
    if (strlen($storedPhone) === 11 && substr($storedPhone, 0, 2) === '03') {
        $storedPhone = '92' . substr($storedPhone, 1);
    } elseif (strlen($storedPhone) === 10 && $storedPhone[0] === '3') {
        $storedPhone = '92' . $storedPhone;
    }

    if ($newPhone !== $storedPhone) {
        $response['message'] = 'This phone number does not match our records. Please enter the exact number registered with your account, or contact support.';
        $mysqli->close();
        echo json_encode($response);
        exit();
    }

    // Phone matches — redirect to send OTP with this phone
    $response['success']   = true;
    $response['message']   = 'Phone verified. Redirecting to send OTP...';
    $response['use_phone'] = $newPhone;
    $mysqli->close();
    echo json_encode($response);
    exit();
}

$response['message'] = 'Unknown action.';
echo json_encode($response);

// ── Helpers ───────────────────────────────────────────────
function ensureOtpTable(mysqli $db): void
{
    $db->query("
        CREATE TABLE IF NOT EXISTS password_reset_otps (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            user_type   ENUM('user','admin') NOT NULL DEFAULT 'user',
            otp_hash    VARCHAR(255) NOT NULL,
            phone_used  VARCHAR(20) NULL,
            is_used     TINYINT(1) NOT NULL DEFAULT 0,
            attempts    INT NOT NULL DEFAULT 0,
            expires_at  DATETIME NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user   (user_id, user_type),
            INDEX idx_expire (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}
?>
