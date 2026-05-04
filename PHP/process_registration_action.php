<?php
/* ===================================
   PROCESS REGISTRATION ACTION
   Admin approves or rejects a pending
   registration request.
   POST: id, action ('approve'|'reject'), reason (optional)
   =================================== */

header('Content-Type: application/json');
session_start();

// ── Auth guard ────────────────────────────────────────────
if (
    empty($_SESSION['admin_id']) ||
    empty($_SESSION['admin_email']) ||
    ($_SESSION['user_role'] ?? '') !== 'admin'
) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit();
}

require_once 'config.php';

$requestId = (int)($_POST['id']     ?? 0);
$action    = trim($_POST['action']  ?? '');
$reason    = trim($_POST['reason']  ?? '');
$adminId   = (int)$_SESSION['admin_id'];
$adminName = $_SESSION['admin_name'] ?? 'Admin';

if ($requestId <= 0 || !in_array($action, ['approve', 'reject'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
    exit();
}

// ── Fetch the pending request ─────────────────────────────
$fetch = $mysqli->prepare(
    "SELECT id, full_name, email, contact_number, cnic, password_hash, status
     FROM registration_requests
     WHERE id = ? AND status = 'pending'
     LIMIT 1"
);
if (!$fetch) {
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit();
}
$fetch->bind_param('i', $requestId);
$fetch->execute();
$reqResult = $fetch->get_result();

if ($reqResult->num_rows === 0) {
    $fetch->close();
    $mysqli->close();
    echo json_encode(['success' => false, 'message' => 'Request not found or already processed']);
    exit();
}

$req = $reqResult->fetch_assoc();
$fetch->close();

// ── Begin transaction ─────────────────────────────────────
$mysqli->begin_transaction();

try {
    if ($action === 'approve') {
        // ── 1. Insert into users table ─────────────────────
        $ins = $mysqli->prepare(
            "INSERT INTO users
             (full_name, email, contact_number, cnic, password, user_role, is_verified, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'user', FALSE, TRUE, NOW(), NOW())"
        );
        if (!$ins) throw new Exception('DB prepare error: ' . $mysqli->error);

        $ins->bind_param(
            'sssss',
            $req['full_name'],
            $req['email'],
            $req['contact_number'],
            $req['cnic'],
            $req['password_hash']
        );

        if (!$ins->execute()) {
            throw new Exception('Failed to create user: ' . $ins->error);
        }
        $newUserId = (int)$mysqli->insert_id;
        $ins->close();

        // ── 2. Update request status to approved ───────────
        $upd = $mysqli->prepare(
            "UPDATE registration_requests
             SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
             WHERE id = ?"
        );
        $upd->bind_param('ii', $adminId, $requestId);
        $upd->execute();
        $upd->close();

        // ── 3. Audit log ───────────────────────────────────
        $audit = $mysqli->prepare(
            "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, description, ip_address, created_at)
             VALUES (?, 'REGISTRATION_APPROVED', 'REGISTRATION_REQUEST', ?, ?, ?, NOW())"
        );
        if ($audit) {
            $desc = 'Admin ' . $adminName . ' approved registration for ' . $req['email'];
            $ip   = $_SERVER['REMOTE_ADDR'] ?? '';
            $audit->bind_param('iiss', $adminId, $requestId, $desc, $ip);
            $audit->execute();
            $audit->close();
        }

        $mysqli->commit();
        error_log('[REG_APPROVED] ' . $req['email'] . ' approved by ' . $adminName);

        echo json_encode([
            'success' => true,
            'action'  => 'approved',
            'message' => 'User "' . htmlspecialchars($req['full_name']) . '" has been approved and can now log in.'
        ]);

    } else {
        // ── Reject ─────────────────────────────────────────
        $rejectionReason = !empty($reason) ? $reason : 'Registration request rejected by administrator';

        $upd = $mysqli->prepare(
            "UPDATE registration_requests
             SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
                 rejection_reason = ?, updated_at = NOW()
             WHERE id = ?"
        );
        if (!$upd) throw new Exception('DB prepare error: ' . $mysqli->error);
        $upd->bind_param('isi', $adminId, $rejectionReason, $requestId);
        $upd->execute();
        $upd->close();

        // ── Audit log ──────────────────────────────────────
        $audit = $mysqli->prepare(
            "INSERT INTO audit_logs (user_id, action, resource_type, resource_id, description, ip_address, created_at)
             VALUES (?, 'REGISTRATION_REJECTED', 'REGISTRATION_REQUEST', ?, ?, ?, NOW())"
        );
        if ($audit) {
            $desc = 'Admin ' . $adminName . ' rejected registration for ' . $req['email'];
            $ip   = $_SERVER['REMOTE_ADDR'] ?? '';
            $audit->bind_param('iiss', $adminId, $requestId, $desc, $ip);
            $audit->execute();
            $audit->close();
        }

        $mysqli->commit();
        error_log('[REG_REJECTED] ' . $req['email'] . ' rejected by ' . $adminName);

        echo json_encode([
            'success' => true,
            'action'  => 'rejected',
            'message' => 'Registration request for "' . htmlspecialchars($req['full_name']) . '" has been rejected.'
        ]);
    }

} catch (Exception $e) {
    $mysqli->rollback();
    error_log('[REG_ACTION_ERROR] ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Operation failed: ' . $e->getMessage()]);
}

$mysqli->close();
?>
