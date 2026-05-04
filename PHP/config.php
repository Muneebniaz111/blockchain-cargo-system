<?php
/* ===================================
   DATABASE CONFIGURATION
   Shipyard Cargo Management System
   =================================== */

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'shipyard_cargo');

// Create connection
$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check connection
if ($mysqli->connect_error) {
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $mysqli->connect_error
    ]));
}

// Set charset to UTF8
$mysqli->set_charset("utf8");

// ── Application Security Key (used for 2FA secret encryption) ──
// IMPORTANT: Change this to a long random string in production!
// Generate with: php -r "echo bin2hex(random_bytes(32));"
if (!defined('APP_KEY')) {
    define('APP_KEY', 'shipyard-cms-2fa-secret-key-v1-change-in-production');
}

// ── 2FA Configuration ──
define('TOTP_ISSUER',       'Shipyard CMS');
define('TOTP_OTP_LENGTH',   6);
define('TOTP_PERIOD',       30);  // seconds

// ── OTP / Forgot-Password Messaging ──────────────────────
// WhatsApp via CallMeBot (free gateway).
// User must first message +34 644 38 49 53: "I allow callmebot to send me messages"
// Then visit: https://www.callmebot.com/blog/free-api-whatsapp-messages/
// to get your API key and replace the empty string below.
if (!defined('CALLMEBOT_API_KEY')) {
    define('CALLMEBOT_API_KEY', '');  // e.g. '1234567'
}

// Africa's Talking SMS (https://africastalking.com)
// Sign up, create an app, and replace with your Live credentials.
// Set AT_USERNAME to 'sandbox' and use sandbox API key for testing.
if (!defined('AT_API_KEY')) {
    define('AT_API_KEY',  '');        // e.g. 'atsk_live_...'
}
if (!defined('AT_USERNAME')) {
    define('AT_USERNAME', 'sandbox'); // change to your AT username in production
}

// ── App Environment ───────────────────────────────────────
// Set to 'production' to hide dev OTP in response
if (!defined('APP_ENV')) {
    define('APP_ENV', 'development'); // CHANGE TO 'production' before go-live
}


// Enable error reporting (development only)
if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

?>
