<?php
/* ===================================
   ADMIN SESSION CHECK — Route Protection
   Called by admin-dashboard.js on load.
   Returns JSON: { authenticated: bool }
   =================================== */

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

session_start();

$authenticated = false;

if (
    !empty($_SESSION['admin_id'])    &&
    !empty($_SESSION['admin_email']) &&
    isset($_SESSION['user_role'])    &&
    $_SESSION['user_role'] === 'admin'
) {
    $expectedHash = $_SESSION['admin_agent_hash'] ?? null;
    $currentHash  = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($expectedHash !== null && $expectedHash !== $currentHash) {
        error_log('[SESSION_WARN] Admin UA mismatch for admin_id=' . $_SESSION['admin_id']);
    }

    $authenticated = true;
}

echo json_encode([
    'authenticated' => $authenticated,
    'admin_name'    => $authenticated ? ($_SESSION['admin_name']  ?? '') : '',
    'admin_email'   => $authenticated ? ($_SESSION['admin_email'] ?? '') : ''
]);
?>
