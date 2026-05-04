<?php
/* ===================================
   SIGNUP — Creates a PENDING registration
   request (not a live user account).
   Admin must approve before user can log in.
   =================================== */

header('Content-Type: application/json');
session_start();
require_once 'config.php';

$response = ['success' => false, 'message' => '', 'errors' => [], 'status' => ''];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method';
    echo json_encode($response);
    exit();
}

// ── Sanitize ──────────────────────────────────────────────
$fullName        = trim($_POST['fullName']       ?? '');
$email           = strtolower(trim($_POST['email'] ?? ''));
$contactNumber   = trim($_POST['contactNumber']  ?? '');
$cnic            = trim($_POST['cnic']           ?? '');
$password        = $_POST['password']            ?? '';
$confirmPassword = $_POST['confirmPassword']     ?? '';

// ── Validation ────────────────────────────────────────────
$errors = [];

if (empty($fullName)) {
    $errors['fullName'] = 'Full name is required';
} elseif (!preg_match('/^[a-zA-Z\s]{3,50}$/', $fullName)) {
    $errors['fullName'] = 'Name must be 3-50 characters, letters only';
}

if (empty($email)) {
    $errors['email'] = 'Email is required';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Invalid email format';
} elseif (!preg_match('/^[a-zA-Z0-9._%+\-]+@shipyard\.pk$/i', $email)) {
    $errors['email'] = 'Only @shipyard.pk email addresses are accepted';
}

if (empty($contactNumber)) {
    $errors['contactNumber'] = 'Contact number is required';
} elseif (!preg_match('/^(\+92|0)[0-9]{10}$/', $contactNumber)) {
    $errors['contactNumber'] = 'Please enter a valid Pakistani phone number (+92300... or 03...)';
}

if (empty($cnic)) {
    $errors['cnic'] = 'CNIC is required';
} elseif (!preg_match('/^\d{5}-\d{7}-\d{1}$/', $cnic)) {
    $errors['cnic'] = 'CNIC format: 12345-6789012-3';
} else {
    $digits = preg_replace('/[^0-9]/', '', $cnic);
    if (strlen($digits) !== 13) {
        $errors['cnic'] = 'CNIC must contain exactly 13 digits';
    }
}

if (empty($password)) {
    $errors['password'] = 'Password is required';
} elseif (strlen($password) < 8) {
    $errors['password'] = 'Password must be at least 8 characters';
} elseif (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/', $password)) {
    $errors['password'] = 'Password must contain uppercase, lowercase, and a number';
}

if (empty($confirmPassword)) {
    $errors['confirmPassword'] = 'Please confirm your password';
} elseif ($password !== $confirmPassword) {
    $errors['confirmPassword'] = 'Passwords do not match';
}

if (!empty($errors)) {
    $response['errors']  = $errors;
    $response['message'] = 'Please fix the errors above.';
    echo json_encode($response);
    exit();
}

// ── Duplicate checks — scan BOTH users and pending requests ──
// Check users table
$chk = $mysqli->prepare("SELECT id FROM users WHERE email = ? OR cnic = ? LIMIT 1");
$chk->bind_param('ss', $email, $cnic);
$chk->execute();
$chk->store_result();
if ($chk->num_rows > 0) {
    $response['message'] = 'An account with this email or CNIC already exists.';
    $chk->close();
    echo json_encode($response);
    exit();
}
$chk->close();

// Check pending requests (avoid duplicate pending requests)
$chkPending = $mysqli->prepare(
    "SELECT id, status FROM registration_requests
     WHERE (email = ? OR cnic = ?) AND status = 'pending'
     LIMIT 1"
);
$chkPending->bind_param('ss', $email, $cnic);
$chkPending->execute();
$pendingResult = $chkPending->get_result();
if ($pendingResult->num_rows > 0) {
    $response['success'] = false;
    $response['status']  = 'already_pending';
    $response['message'] = 'A registration request with this email or CNIC is already pending admin approval. Please wait.';
    $chkPending->close();
    echo json_encode($response);
    exit();
}
$chkPending->close();

// Also check if email/cnic was previously rejected (allow re-submission)
// No block needed — rejected users may re-apply

// ── Store as PENDING registration request ──────────────────
$passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
$ipAddress    = $_SERVER['REMOTE_ADDR'] ?? '';

$ins = $mysqli->prepare(
    "INSERT INTO registration_requests
     (full_name, email, contact_number, cnic, password_hash, status, ip_address, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())"
);
if (!$ins) {
    $response['message'] = 'Database error. Please try again.';
    echo json_encode($response);
    exit();
}
$ins->bind_param('ssssss', $fullName, $email, $contactNumber, $cnic, $passwordHash, $ipAddress);

if ($ins->execute()) {
    $response['success'] = true;
    $response['status']  = 'pending';
    $response['message'] = 'Your registration request has been submitted and is pending admin approval. You will be able to log in once your account is approved.';
    error_log('[SIGNUP_PENDING] Registration request submitted: ' . $email);
} else {
    $response['message'] = 'Error submitting request. Please try again.';
    error_log('[SIGNUP_ERROR] ' . $ins->error . ' for: ' . $email);
}
$ins->close();
$mysqli->close();

echo json_encode($response);
?>
