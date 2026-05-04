-- ===================================
-- SHIPYARD CARGO MANAGEMENT SYSTEM
-- Database Schema & SQL Queries
-- ===================================

-- Create Database
CREATE DATABASE IF NOT EXISTS shipyard_cargo;
USE shipyard_cargo;

-- ===================================
-- USERS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    cnic VARCHAR(15) NOT NULL,
    password VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    user_role ENUM('user', 'admin', 'operator') DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    totp_secret VARCHAR(512) NULL COMMENT 'AES-256-CBC encrypted TOTP Base32 secret for 2FA',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_email (email),
    UNIQUE KEY unique_cnic (cnic),
    INDEX idx_email (email),
    INDEX idx_cnic (cnic),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- REGISTRATION REQUESTS TABLE
-- Stores pending user registrations
-- awaiting admin approval
-- ===================================
CREATE TABLE IF NOT EXISTS registration_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    cnic VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed — copied to users on approval',
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL COMMENT 'admin user id who acted on this',
    reviewed_at TIMESTAMP NULL,
    rejection_reason VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY fk_reviewed_by (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- CARGO TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS cargo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cargo_id VARCHAR(50) NOT NULL UNIQUE KEY unique_cargo_id (cargo_id),
    description TEXT NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    status ENUM('registered', 'in_transit', 'delivered', 'delayed', 'cancelled') DEFAULT 'registered',
    weight DECIMAL(10, 2),
    value DECIMAL(15, 2),
    user_id INT NOT NULL,
    blockchain_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY fk_cargo_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- CARGO TRACKING HISTORY TABLE
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
-- PERFORMANCE INDEXES
-- ===================================
CREATE INDEX IF NOT EXISTS idx_users_email_status    ON users(email, is_active);
CREATE INDEX IF NOT EXISTS idx_cargo_status_user     ON cargo(status, user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_cargo_date   ON cargo_tracking(cargo_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_reg_status_date       ON registration_requests(status, created_at);

-- ===================================
-- DEFAULT ADMIN ACCOUNTS
-- Run: php seed_admins.php
-- Passwords are stored as bcrypt hashes only.
-- To set or reset a password, use:
--   php -r "echo password_hash('YourPassword', PASSWORD_BCRYPT, ['cost' => 12]);"
-- and update the hash in seed_admins.php
-- ===================================

-- ===================================
-- 2FA MIGRATION (for existing databases)
-- Run this if upgrading from a version
-- that didn't have the totp_secret column
-- ===================================
-- ALTER TABLE users
--     ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(512) NULL
--     COMMENT 'AES-256-CBC encrypted TOTP Base32 secret for 2FA'
--     AFTER password;
--
-- After adding the column, run: php seed_admins.php
-- This will auto-generate secrets for all existing admins.

-- ===================================
-- PASSWORD RESET OTPs TABLE
-- Stores hashed OTPs for user forgot
-- password flow (WhatsApp/SMS OTP).
-- Auto-created by PHP on first use,
-- but include here for explicit setup.
-- ===================================
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL              COMMENT 'References users.id',
    user_type   ENUM('user','admin') NOT NULL DEFAULT 'user',
    otp_hash    VARCHAR(255) NOT NULL     COMMENT 'bcrypt hash of the 6-digit OTP',
    phone_used  VARCHAR(20) NULL          COMMENT 'E.164 phone OTP was sent to (user flow only)',
    is_used     TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 once the OTP has been successfully consumed',
    attempts    INT NOT NULL DEFAULT 0    COMMENT 'Wrong-guess counter; lock at 5',
    expires_at  DATETIME NOT NULL         COMMENT 'OTP valid until this UTC timestamp',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user   (user_id, user_type),
    INDEX idx_expire (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores short-lived OTPs for the forgot-password flow';

-- ===================================
-- BLOCKCHAIN LOGS TABLE (new)
-- Append-only ledger of all workflow
-- events with chained SHA-256 hashes.
-- Auto-created by blockchain.php on
-- first use — no manual migration needed.
-- ===================================
CREATE TABLE IF NOT EXISTS blockchain_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    record_id       VARCHAR(100)  NOT NULL  COMMENT 'Cargo ID, cert ID, etc.',
    action          VARCHAR(100)  NOT NULL  COMMENT 'REGISTERED, STATUS_UPDATE, etc.',
    previous_status VARCHAR(100)  NOT NULL  DEFAULT '',
    new_status      VARCHAR(100)  NOT NULL  DEFAULT '',
    data_payload    TEXT          NULL      COMMENT 'JSON snapshot of record data',
    previous_hash   VARCHAR(64)   NOT NULL  COMMENT 'Hash of previous block for chaining',
    tx_hash         VARCHAR(64)   NOT NULL  COMMENT 'SHA-256 hash of this block (0x prefix)',
    created_by      INT           NULL      COMMENT 'Admin user ID who triggered this event',
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_record_id  (record_id),
    INDEX idx_action     (action),
    INDEX idx_tx_hash    (tx_hash),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Append-only blockchain ledger for all cargo workflow events';

-- ===================================
-- TX_HASH COLUMN MIGRATION
-- Added to audit_logs to reference the
-- corresponding blockchain block.
-- Run once on existing databases:
-- ===================================
-- ALTER TABLE audit_logs
--     ADD COLUMN tx_hash VARCHAR(64) NULL
--     COMMENT 'Blockchain transaction hash reference'
--     AFTER user_agent;
