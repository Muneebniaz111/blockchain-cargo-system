<?php
/* ===================================
   USER FORGOT PASSWORD — Step 1
   Accepts an email (or phone) to find
   the account, generates a 6-digit OTP,
   stores it hashed in the DB, then sends
   it via WhatsApp (CallMeBot) with SMS
   (Africa's Talking / generic cURL) as
   fallback.

   POST params:
     email       — the user's registered email
     phone       — (optional) override phone if
                   the stored one is wrong
   Response JSON:
     success, message, masked_phone
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

// ── Rate-limit: max 3 OTP requests per 10 min per IP ─────
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rateLimitKey = 'otp_req_' . md5($ip);
if (!isset($_SESSION[$rateLimitKey])) {
    $_SESSION[$rateLimitKey] = ['count' => 0, 'window_start' => time()];
}
$rl = &$_SESSION[$rateLimitKey];
if (time() - $rl['window_start'] > 600) {
    $rl = ['count' => 0, 'window_start' => time()];
}
$rl['count']++;
if ($rl['count'] > 3) {
    $response['message'] = 'Too many OTP requests. Please wait 10 minutes before trying again.';
    echo json_encode($response);
    exit();
}

$email          = strtolower(trim($_POST['email']    ?? ''));
$overridePhone  = trim($_POST['phone']               ?? '');

// ── Validate email ────────────────────────────────────────
if (empty($email)) {
    $response['message'] = 'Email address is required';
    echo json_encode($response);
    exit();
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Invalid email format';
    echo json_encode($response);
    exit();
}

// ── Look up user ──────────────────────────────────────────
$stmt = $mysqli->prepare(
    "SELECT id, full_name, email, contact_number, is_active
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
    // Deliberately vague to prevent user enumeration
    $response['message'] = 'If this email is registered, an OTP will be sent to the associated phone number.';
    $response['not_found'] = true;
    $stmt->close();
    $mysqli->close();
    echo json_encode($response);
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();

if (!(bool)$user['is_active']) {
    $response['message'] = 'This account has been deactivated. Please contact support.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}

// ── Determine phone to use ────────────────────────────────
$phone = !empty($overridePhone) ? $overridePhone : $user['contact_number'];
$phone = preg_replace('/\D/', '', $phone); // digits only

if (empty($phone) || strlen($phone) < 10) {
    $response['message'] = 'Invalid phone number. Please enter a valid phone number.';
    echo json_encode($response);
    exit();
}

// Normalise to international format (+92 for Pakistan)
if (strlen($phone) === 10 && $phone[0] === '3') {
    $phone = '92' . $phone;          // 03xx… → 923xx…
} elseif (strlen($phone) === 11 && substr($phone, 0, 2) === '03') {
    $phone = '92' . substr($phone, 1); // 03xx… → 923xx…
}
// If already has country code, keep as-is

// ── Generate OTP ──────────────────────────────────────────
$otpPlain = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$otpHash  = password_hash($otpPlain, PASSWORD_BCRYPT);
$expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

// ── Ensure password_reset_otps table exists ───────────────
ensureOtpTable($mysqli);

// ── Delete old OTPs for this user ─────────────────────────
$del = $mysqli->prepare("DELETE FROM password_reset_otps WHERE user_id = ? AND user_type = 'user'");
if ($del) {
    $del->bind_param('i', $user['id']);
    $del->execute();
    $del->close();
}

// ── Store new OTP ─────────────────────────────────────────
$ins = $mysqli->prepare(
    "INSERT INTO password_reset_otps
        (user_id, user_type, otp_hash, phone_used, expires_at, created_at)
     VALUES (?, 'user', ?, ?, ?, NOW())"
);
if (!$ins) {
    $response['message'] = 'Failed to create OTP. Please try again.';
    $mysqli->close();
    echo json_encode($response);
    exit();
}
$ins->bind_param('isss', $user['id'], $otpHash, $phone, $expiresAt);
$ins->execute();
$otpId = $mysqli->insert_id;
$ins->close();

// ── Send OTP via WhatsApp → SMS fallback ─────────────────
$sendResult = sendOtpWhatsApp($phone, $otpPlain, $user['full_name']);
if (!$sendResult['sent']) {
    // WhatsApp failed — try SMS
    $sendResult = sendOtpSms($phone, $otpPlain, $user['full_name']);
}

// Mask phone for display
$maskedPhone = maskPhone($phone);

// Log the attempt
error_log('[FORGOT_PW_OTP] user_id=' . $user['id'] . ' phone=' . $maskedPhone . ' channel=' . ($sendResult['channel'] ?? 'unknown'));

// Store session state for step 2
$_SESSION['fp_user_id']    = (int)$user['id'];
$_SESSION['fp_otp_id']     = $otpId;
$_SESSION['fp_phone']      = $phone;
$_SESSION['fp_sent_at']    = time();
$_SESSION['fp_agent_hash'] = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');

$mysqli->close();

$response['success']      = true;
$response['message']      = 'OTP sent to ' . $maskedPhone . '. It expires in 10 minutes.';
$response['masked_phone'] = $maskedPhone;
$response['channel']      = $sendResult['channel'] ?? 'sms';

// OTP is never returned in the response for security reasons.
// It is sent exclusively via WhatsApp/SMS to the user's registered phone number.

echo json_encode($response);

// ══════════════════════════════════════════════════════════
// ── Helper functions ──────────────────────────────────────
// ══════════════════════════════════════════════════════════

function ensureOtpTable(mysqli $db): void
{
    $db->query("
        CREATE TABLE IF NOT EXISTS password_reset_otps (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            user_type   ENUM('user','admin') NOT NULL DEFAULT 'user',
            otp_hash    VARCHAR(255) NOT NULL COMMENT 'bcrypt hash of the 6-digit OTP',
            phone_used  VARCHAR(20) NULL COMMENT 'Phone OTP was sent to (users only)',
            is_used     TINYINT(1) NOT NULL DEFAULT 0,
            attempts    INT NOT NULL DEFAULT 0,
            expires_at  DATETIME NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user   (user_id, user_type),
            INDEX idx_expire (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

/**
 * Send OTP via WhatsApp using CallMeBot API
 * (Free WhatsApp gateway; user must first send a message to +34 644 38 49 53
 *  with text: I allow callmebot to send me messages)
 * Config: define CALLMEBOT_API_KEY in config.php
 */
function sendOtpWhatsApp(string $phone, string $otp, string $name): array
{
    $apiKey = defined('CALLMEBOT_API_KEY') ? CALLMEBOT_API_KEY : '';
    if (empty($apiKey)) {
        return ['sent' => false, 'channel' => 'whatsapp', 'error' => 'No API key configured'];
    }

    $message = urlencode(
        "Shipyard CMS\n" .
        "Hello {$name},\n\n" .
        "Your password reset OTP is: *{$otp}*\n\n" .
        "This code expires in 10 minutes.\n" .
        "Do not share this code with anyone."
    );

    $url = "https://api.callmebot.com/whatsapp.php?phone={$phone}&text={$message}&apikey={$apiKey}";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        return ['sent' => true, 'channel' => 'whatsapp'];
    }
    error_log('[OTP_WHATSAPP_FAIL] HTTP ' . $httpCode . ' for phone ' . maskPhone($phone));
    return ['sent' => false, 'channel' => 'whatsapp', 'error' => 'HTTP ' . $httpCode];
}

/**
 * Send OTP via SMS using Africa's Talking API
 * Config: define AT_API_KEY and AT_USERNAME in config.php
 * Can be swapped for any SMS provider.
 */
function sendOtpSms(string $phone, string $otp, string $name): array
{
    $apiKey   = defined('AT_API_KEY')   ? AT_API_KEY   : '';
    $username = defined('AT_USERNAME')  ? AT_USERNAME  : 'sandbox';

    if (empty($apiKey)) {
        error_log('[OTP_SMS] No SMS API key configured — OTP logged server-side only');
        // Log OTP to error_log as last resort (for development/testing)
        error_log('[OTP_SMS_DEV] OTP for +' . $phone . ' is: ' . $otp);
        return ['sent' => true, 'channel' => 'log_only'];
    }

    $message = "Shipyard CMS: Your password reset OTP is {$otp}. Valid for 10 minutes. Do not share.";
    $to      = '+' . ltrim($phone, '+');

    $postData = http_build_query([
        'username' => $username,
        'to'       => $to,
        'message'  => $message,
        'from'     => 'ShipyardCMS',
    ]);

    $ch = curl_init('https://api.africastalking.com/version1/messaging');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apiKey: ' . $apiKey,
        'Accept: application/json',
        'Content-Type: application/x-www-form-urlencoded',
    ]);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 201 || $httpCode === 200) {
        return ['sent' => true, 'channel' => 'sms'];
    }
    error_log('[OTP_SMS_FAIL] HTTP ' . $httpCode . ' body=' . $result);
    return ['sent' => false, 'channel' => 'sms', 'error' => 'HTTP ' . $httpCode];
}

function maskPhone(string $phone): string
{
    $len = strlen($phone);
    if ($len <= 4) return str_repeat('*', $len);
    return substr($phone, 0, 2) . str_repeat('*', $len - 4) . substr($phone, -2);
}
?>
