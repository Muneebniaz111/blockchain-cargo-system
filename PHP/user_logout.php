<?php
/* ===================================
   USER LOGOUT
   Destroys user session & cookies
   =================================== */

header('Content-Type: application/json');

session_start();

// Clear remember-me cookie
setcookie('remember_user_email', '', time() - 3600, '/');

// Log the logout
if (!empty($_SESSION['user_email'])) {
    error_log('[LOGOUT] User logged out: ' . $_SESSION['user_email']);
}

// Wipe session data
$_SESSION = [];

// Invalidate session cookie
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(), '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
?>
