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

// Enable error reporting (development only)
if (defined('ENVIRONMENT') && ENVIRONMENT === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

?>
