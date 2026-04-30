<?php
/* ===================================
   SIGNUP FORM PROCESSING
   Form Validation & Database Insert
   =================================== */

header('Content-Type: application/json');

// Start session
session_start();

// Include database configuration
require_once 'config.php';

// Initialize response array
$response = [
    'success' => false,
    'message' => '',
    'errors' => []
];

// Check if request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method';
    echo json_encode($response);
    exit();
}

// Get and sanitize input data
$fullName = trim($_POST['fullName'] ?? '');
$email = trim($_POST['email'] ?? '');
$contactNumber = trim($_POST['contactNumber'] ?? '');
$cnic = trim($_POST['cnic'] ?? '');
$password = $_POST['password'] ?? '';
$confirmPassword = $_POST['confirmPassword'] ?? '';

// Validation function
function validate_input($data) {
    $errors = [];

    // Validate Full Name
    if (empty($data['fullName'])) {
        $errors['fullName'] = 'Full name is required';
    } elseif (!preg_match('/^[a-zA-Z\s]{3,50}$/', $data['fullName'])) {
        $errors['fullName'] = 'Name must be 3-50 characters and contain only letters';
    }

    // Validate Email
    if (empty($data['email'])) {
        $errors['email'] = 'Email is required';
    } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Invalid email format';
    }

    // Validate Contact Number
    if (empty($data['contactNumber'])) {
        $errors['contactNumber'] = 'Contact number is required';
    } elseif (!preg_match('/^(\+92|0)[0-9]{10}$/', $data['contactNumber'])) {
        $errors['contactNumber'] = 'Invalid Pakistani phone number format';
    }

    // Validate CNIC
    if (empty($data['cnic'])) {
        $errors['cnic'] = 'CNIC is required';
    } elseif (!preg_match('/^\d{5}-\d{7}-\d{1}$/', $data['cnic'])) {
        $errors['cnic'] = 'Invalid CNIC format (12345-6789012-3)';
    }

    // Validate Password
    if (empty($data['password'])) {
        $errors['password'] = 'Password is required';
    } elseif (strlen($data['password']) < 8) {
        $errors['password'] = 'Password must be at least 8 characters';
    } elseif (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/', $data['password'])) {
        $errors['password'] = 'Password must contain uppercase, lowercase, and numbers';
    }

    // Validate Confirm Password
    if (empty($data['confirmPassword'])) {
        $errors['confirmPassword'] = 'Please confirm your password';
    } elseif ($data['password'] !== $data['confirmPassword']) {
        $errors['confirmPassword'] = 'Passwords do not match';
    }

    return $errors;
}

// Validate inputs
$validation_errors = validate_input([
    'fullName' => $fullName,
    'email' => $email,
    'contactNumber' => $contactNumber,
    'cnic' => $cnic,
    'password' => $password,
    'confirmPassword' => $confirmPassword
]);

if (!empty($validation_errors)) {
    $response['errors'] = $validation_errors;
    $response['message'] = 'Validation failed. Please check your inputs.';
    echo json_encode($response);
    exit();
}

// Check if email already exists
$check_email_query = "SELECT id FROM users WHERE email = ?";
$check_stmt = $mysqli->prepare($check_email_query);
if (!$check_stmt) {
    $response['message'] = 'Database error: ' . $mysqli->error;
    echo json_encode($response);
    exit();
}

$check_stmt->bind_param('s', $email);
$check_stmt->execute();
$check_result = $check_stmt->get_result();

if ($check_result->num_rows > 0) {
    $response['errors']['email'] = 'Email already registered';
    $response['message'] = 'This email is already associated with an account.';
    echo json_encode($response);
    exit();
}
$check_stmt->close();

// Check if CNIC already exists
$check_cnic_query = "SELECT id FROM users WHERE cnic = ?";
$check_cnic_stmt = $mysqli->prepare($check_cnic_query);
if (!$check_cnic_stmt) {
    $response['message'] = 'Database error: ' . $mysqli->error;
    echo json_encode($response);
    exit();
}

$check_cnic_stmt->bind_param('s', $cnic);
$check_cnic_stmt->execute();
$check_cnic_result = $check_cnic_stmt->get_result();

if ($check_cnic_result->num_rows > 0) {
    $response['errors']['cnic'] = 'CNIC already registered';
    $response['message'] = 'This CNIC is already associated with an account.';
    echo json_encode($response);
    exit();
}
$check_cnic_stmt->close();

// Hash password using bcrypt
$hashed_password = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

// Prepare insert statement
$insert_query = "INSERT INTO users (full_name, email, contact_number, cnic, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
$insert_stmt = $mysqli->prepare($insert_query);

if (!$insert_stmt) {
    $response['message'] = 'Database error: ' . $mysqli->error;
    echo json_encode($response);
    exit();
}

// Bind parameters
$insert_stmt->bind_param('sssss', $fullName, $email, $contactNumber, $cnic, $hashed_password);

// Execute query
if ($insert_stmt->execute()) {
    $response['success'] = true;
    $response['message'] = 'Account created successfully! You can now login.';
    
    // Log successful registration (optional)
    error_log('New user registered: ' . $email);
} else {
    $response['message'] = 'Error creating account: ' . $insert_stmt->error;
    error_log('Registration error: ' . $insert_stmt->error);
}

$insert_stmt->close();
$mysqli->close();

// Send response
echo json_encode($response);
?>
