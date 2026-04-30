-- ===================================
-- SHIPYARD CARGO MANAGEMENT SYSTEM
-- Database Schema & SQL Queries
-- ===================================

-- Create Database
CREATE DATABASE IF NOT EXISTS shipyard_cargo;
USE shipyard_cargo;

-- ===================================
-- USERS TABLE
-- Stores user registration data
-- ===================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE KEY unique_email (email),
    contact_number VARCHAR(15) NOT NULL,
    cnic VARCHAR(15) NOT NULL UNIQUE KEY unique_cnic (cnic),
    password VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    user_role ENUM('user', 'admin', 'operator') DEFAULT 'user' COMMENT 'User role for access control',
    is_verified BOOLEAN DEFAULT FALSE COMMENT 'Email verification status',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Account active status',
    last_login TIMESTAMP NULL COMMENT 'Last login timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation time',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time',
    
    INDEX idx_email (email),
    INDEX idx_cnic (cnic),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- CARGO TRACKING TABLE
-- Stores cargo information
-- ===================================

CREATE TABLE IF NOT EXISTS cargo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cargo_id VARCHAR(50) NOT NULL UNIQUE KEY unique_cargo_id (cargo_id),
    description TEXT NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    status ENUM('registered', 'in_transit', 'delivered', 'delayed', 'cancelled') DEFAULT 'registered',
    weight DECIMAL(10, 2) COMMENT 'Weight in kg',
    value DECIMAL(15, 2) COMMENT 'Cargo value',
    user_id INT NOT NULL,
    blockchain_hash VARCHAR(255) COMMENT 'Blockchain verification hash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY fk_cargo_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- CARGO TRACKING HISTORY TABLE
-- Stores location and status updates
-- ===================================

CREATE TABLE IF NOT EXISTS cargo_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cargo_id INT NOT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY fk_tracking_cargo (cargo_id) REFERENCES cargo(id) ON DELETE CASCADE,
    INDEX idx_cargo_id (cargo_id),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- AUDIT LOGS TABLE
-- Stores system audit trail
-- ===================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY fk_audit_user (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- DEFAULT ADMIN ACCOUNTS SEEDING
-- Pre-seeded admin accounts for system access
-- ===================================
-- 
-- ⚠️  IMPORTANT: Do NOT manually insert hashes here!
-- 
-- Instead, use the PHP seeding script to populate admin accounts:
--   php seed_admins.php
--
-- Or use the hash generator to create valid bcrypt hashes:
--   php generate_admin_hashes.php
--
-- The seed_admins.php script will:
--   1. Check if admin accounts already exist
--   2. Generate secure bcrypt hashes for each password
--   3. Insert accounts with proper validation
--   4. Display login credentials for initial setup
--
-- DEFAULT ADMIN ACCOUNTS:
-- ===================================
-- Admin 1: Muneeb Niaz
--   Email: muneeb@shipyard.pk
--   Password: Admin@Muneeb2024
--   Contact: +923001234567
--   CNIC: 35201-1234567-1
--
-- Admin 2: Rana M. Muzammil
--   Email: rana@shipyard.pk
--   Password: Admin@Rana2024
--   Contact: +923001234568
--   CNIC: 35201-1234568-1
--
-- Admin 3: Mohsin Akhtar
--   Email: mohsin@shipyard.pk
--   Password: Admin@Mohsin2024
--   Contact: +923001234569
--   CNIC: 35201-1234569-1
--
-- ===================================
-- SETUP INSTRUCTIONS
-- ===================================
-- 1. Create database and tables:
--    mysql -u root < database_schema.sql
--
-- 2. Seed default admin accounts:
--    php seed_admins.php
--
-- 3. Admin login will verify credentials against bcrypt hashes
--
-- 4. Change default passwords after first login!
--

-- ===================================
-- SAMPLE QUERIES
-- Common operations
-- =================================== 

-- Get all active users
SELECT id, full_name, email, contact_number, created_at FROM users WHERE is_active = TRUE ORDER BY created_at DESC;

-- Get user cargo
SELECT * FROM cargo WHERE user_id = ? AND status != 'cancelled' ORDER BY created_at DESC;

-- Get cargo tracking history
SELECT * FROM cargo_tracking WHERE cargo_id = ? ORDER BY recorded_at DESC;

-- Get user's login history
SELECT id, full_name, email, last_login FROM users WHERE id = ?;

-- Get audit logs for specific user
SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100;

-- ===================================
-- INDEXES FOR PERFORMANCE
-- =================================== 

CREATE INDEX idx_users_email_status ON users(email, is_active);
CREATE INDEX idx_cargo_status_user ON cargo(status, user_id);
CREATE INDEX idx_tracking_cargo_date ON cargo_tracking(cargo_id, recorded_at);
