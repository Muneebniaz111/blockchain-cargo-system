# Admin Account Setup Guide

## Overview
The Shipyard Cargo Management System comes with three pre-configured default admin accounts. These accounts are seeded into the database using secure bcrypt password hashing.

## Default Admin Accounts

### 1. Muneeb Niaz
- **Email:** muneeb@shipyard.pk
- **Password:** Admin@Muneeb2024
- **Contact:** +923001234567
- **CNIC:** 35201-1234567-1
- **Role:** Admin

### 2. Rana M. Muzammil
- **Email:** rana@shipyard.pk
- **Password:** Admin@Rana2024
- **Contact:** +923001234568
- **CNIC:** 35201-1234568-1
- **Role:** Admin

### 3. Mohsin Akhtar
- **Email:** mohsin@shipyard.pk
- **Password:** Admin@Mohsin2024
- **Contact:** +923001234569
- **CNIC:** 35201-1234569-1
- **Role:** Admin

## Setup Instructions

### Step 1: Create Database and Tables
```bash
# Connect to MySQL and run the schema file
mysql -u root -p < PHP/database_schema.sql
```

Or use MySQL Workbench/PHPMyAdmin to import the `database_schema.sql` file.

### Step 2: Seed Admin Accounts
```bash
# Run the seeding script from the PHP directory
php seed_admins.php
```

**Expected Output:**
```
============================================================
SHIPYARD ADMIN ACCOUNT SEEDING
============================================================

✅ Admin 'Muneeb Niaz' (muneeb@shipyard.pk) created successfully.
   📧 Email: muneeb@shipyard.pk
   🔐 Default Password: Admin@Muneeb2024
   ☎️  Contact: +923001234567
   🆔 CNIC: 35201-1234567-1
   👤 Role: admin

✅ Admin 'Rana M. Muzammil' (rana@shipyard.pk) created successfully.
   📧 Email: rana@shipyard.pk
   🔐 Default Password: Admin@Rana2024
   ☎️  Contact: +923001234568
   🆔 CNIC: 35201-1234568-1
   👤 Role: admin

✅ Admin 'Mohsin Akhtar' (mohsin@shipyard.pk) created successfully.
   📧 Email: mohsin@shipyard.pk
   🔐 Default Password: Admin@Mohsin2024
   ☎️  Contact: +923001234569
   🆔 CNIC: 35201-1234569-1
   👤 Role: admin

============================================================
SEEDING SUMMARY
============================================================
✅ Successfully Created: 3
⚠️  Already Existing: 0
❌ Errors: 0
============================================================

✅ Admin accounts have been successfully seeded!

📋 DEFAULT ADMIN LOGIN CREDENTIALS:

Admin 1:
Email: muneeb@shipyard.pk
Password: Admin@Muneeb2024

Admin 2:
Email: rana@shipyard.pk
Password: Admin@Rana2024

Admin 3:
Email: mohsin@shipyard.pk
Password: Admin@Mohsin2024

⚠️  IMPORTANT: Please change these default passwords after first login!
```

### Step 3: Verify Installation
Test the admin login at: `http://localhost:8000/Html/admin-login.html`

Use any of the three admin accounts above to log in.

## Security Features

### Password Hashing
- All passwords are securely hashed using **bcrypt** with a cost factor of 10
- Passwords are never stored in plain text
- Password verification uses PHP's `password_verify()` function

### Database Structure
```sql
-- The users table stores:
- full_name: Admin's full name
- email: Unique admin email (primary login identifier)
- contact_number: Phone number for contact
- cnic: National ID (unique constraint)
- password: Bcrypt hashed password (255 characters)
- user_role: ENUM('user', 'admin', 'operator') - set to 'admin'
- is_verified: Boolean (default TRUE for seeded admins)
- is_active: Boolean (default TRUE for seeded admins)
- last_login: Tracks last login timestamp
- created_at: Account creation timestamp
- updated_at: Last modification timestamp
```

### Authentication Flow
1. Admin enters email and password on admin-login.html
2. Form submits to PHP/process_admin_login.php via AJAX
3. PHP validates:
   - Email exists in database
   - User has role = 'admin'
   - Account is active (is_active = TRUE)
   - Password matches bcrypt hash
4. On success:
   - Session is created with admin_id, admin_email, admin_name
   - Last login timestamp is updated
   - Audit log entry is recorded
   - Admin is redirected to admin dashboard

### Audit Logging
Admin login attempts are logged in the `audit_logs` table:
- **Action:** ADMIN_LOGIN
- **User IP:** Captured for security tracking
- **User Agent:** Browser/device information
- **Timestamp:** When login occurred
- **Description:** Admin name and status

## Managing Admin Accounts

### Change Default Password (Important!)
After first login, admins should change their default passwords:
1. Log in with default credentials
2. Navigate to admin settings
3. Update password to a strong, unique password
4. Confirm password change

### Add New Admin Account
```bash
# Edit seed_admins.php and add new account to $admins array
# Or manually run the seeding script for a single admin
php seed_admins.php
```

### Deactivate Admin Account
```sql
UPDATE users SET is_active = FALSE WHERE email = 'admin_email@shipyard.pk';
```

### Reset Admin Password
```php
// Generate new hash
$newPassword = 'NewPassword@2024';
$hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 10]);

// Update database
UPDATE users SET password = '$hashedPassword' WHERE email = 'admin_email@shipyard.pk';
```

## Troubleshooting

### Issue: "Admin login failed" error
**Solution:** 
- Verify admin account exists in database: `SELECT * FROM users WHERE user_role = 'admin';`
- Check if account is active: `is_active = TRUE`
- Verify password hash is correct

### Issue: "Database connection failed"
**Solution:**
- Verify database name, username, and password in `config.php`
- Ensure MySQL/MariaDB server is running
- Check database exists: `SHOW DATABASES;`

### Issue: Seed script shows "already exists"
**Solution:**
- Admin account was already seeded (normal on repeat runs)
- To re-seed, delete existing admin accounts first:
  ```sql
  DELETE FROM users WHERE email IN ('muneeb@shipyard.pk', 'rana@shipyard.pk', 'mohsin@shipyard.pk');
  ```
- Then run seeding script again

### Issue: Seeding script fails with SQL error
**Solution:**
- Verify table structure matches expected schema
- Check CNIC format: must be `12345-1234567-1` (with dashes)
- Ensure no duplicate emails exist in database

## File Reference

### Core Files
- **PHP/process_admin_login.php** - Admin authentication logic
- **PHP/seed_admins.php** - Admin account seeding script
- **PHP/generate_admin_hashes.php** - Bcrypt hash generator utility
- **PHP/database_schema.sql** - Database schema with instructions
- **Html/admin-login.html** - Admin login interface
- **Css/admin-login.css** - Admin login styling
- **JS/admin-login.js** - Admin login validation

### Related Configuration
- **PHP/config.php** - Database connection settings
- **PHP/process_login.php** - Regular user login (for comparison)

## Security Best Practices

1. **Change Default Passwords:** All admins must change passwords on first login
2. **Strong Passwords:** Enforce 8+ characters, uppercase, lowercase, numbers, special characters
3. **Regular Audits:** Review audit_logs for unauthorized login attempts
4. **Account Monitoring:** Deactivate unused admin accounts
5. **Backup Strategy:** Regularly backup database including user credentials
6. **Access Control:** Limit admin access to trusted networks if possible
7. **Session Management:** Sessions expire after inactivity
8. **Secure Connection:** Use HTTPS in production environment

## Technical Details

### Bcrypt Configuration
- **Algorithm:** PASSWORD_BCRYPT
- **Cost Factor:** 10 (balanced between security and speed)
- **Hash Length:** 60 characters
- **Collision Probability:** Negligible

### Database Constraints
- **Email:** UNIQUE constraint prevents duplicate admin emails
- **CNIC:** UNIQUE constraint prevents duplicate IDs
- **user_role:** ENUM ensures only valid roles
- **is_active:** Boolean prevents inactive login attempts

## Support & Troubleshooting

For issues with admin account setup:
1. Check error logs in browser console (F12 Developer Tools)
2. Check PHP error logs in terminal/server logs
3. Verify database contents using MySQL client
4. Run seeding script with verbose output for debugging

## Next Steps

After setting up admin accounts:
1. Develop admin dashboard (admin-dashboard.html)
2. Create admin user management interface
3. Implement admin audit log viewer
4. Add system settings/configuration page
5. Implement two-factor authentication for admins
6. Create admin activity reporting
