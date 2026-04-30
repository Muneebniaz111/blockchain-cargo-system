<?php
/* ===================================
   ADMIN LOGOUT HANDLER
   Session destruction & cleanup
   =================================== */

header('Content-Type: application/json');

// Start session to destroy it
session_start();

// Initialize response array
$response = [
    'success' => false,
    'message' => ''
];

try {
    // Get admin info before clearing session
    $adminEmail = $_SESSION['admin_email'] ?? 'Unknown';
    $adminName = $_SESSION['admin_name'] ?? 'Unknown';
    
    // Log the logout action to audit logs
    require_once 'config.php';
    
    if (isset($_SESSION['admin_id']) && isset($mysqli)) {
        $adminId = $_SESSION['admin_id'];
        $ipAddress = $_SERVER['REMOTE_ADDR'];
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        $auditQuery = "INSERT INTO audit_logs (user_id, action, resource_type, description, ip_address, user_agent, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, NOW())";
        $auditStmt = $mysqli->prepare($auditQuery);
        
        if ($auditStmt) {
            $action = 'ADMIN_LOGOUT';
            $resourceType = 'ADMIN_SESSION';
            $description = 'Admin ' . $adminName . ' logged out';
            
            $auditStmt->bind_param('isssss', $adminId, $action, $resourceType, $description, $ipAddress, $userAgent);
            $auditStmt->execute();
            $auditStmt->close();
        }
        
        if (isset($mysqli)) {
            $mysqli->close();
        }
    }
    
    // Log logout attempt
    error_log('[ADMIN_LOGOUT] Admin logged out: ' . $adminEmail . ' | IP: ' . $_SERVER['REMOTE_ADDR']);
    
    // Destroy the session
    $_SESSION = array();
    
    // Delete session cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Destroy session
    session_destroy();
    
    $response['success'] = true;
    $response['message'] = 'Admin logout successful';
    
} catch (Exception $e) {
    error_log('[ADMIN_LOGOUT_ERROR] Exception: ' . $e->getMessage());
    $response['message'] = 'Logout error: ' . $e->getMessage();
}

echo json_encode($response);
?>
