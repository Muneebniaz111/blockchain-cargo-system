<?php
/* ===================================
   USER SESSION CHECK — Route Protection
   Called by user-dashboard.js on load.
   Returns JSON: { authenticated: bool }
   =================================== */

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

session_start();

$authenticated = false;

if (
    !empty($_SESSION['user_id'])   &&
    !empty($_SESSION['user_email']) &&
    isset($_SESSION['user_role'])   &&
    $_SESSION['user_role'] === 'user'
) {
    // Optional agent fingerprint check (soft — don't block on mismatch, just log)
    $expectedHash = $_SESSION['user_agent_hash'] ?? null;
    $currentHash  = hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($expectedHash !== null && $expectedHash !== $currentHash) {
        error_log('[SESSION_WARN] User-agent mismatch for user_id=' . $_SESSION['user_id']);
    }

    $authenticated = true;
}

echo json_encode([
    'authenticated' => $authenticated,
    'user_name'     => $authenticated ? ($_SESSION['user_name'] ?? '') : '',
    'user_email'    => $authenticated ? ($_SESSION['user_email'] ?? '') : ''
]);
?>
