# Shipyard Cargo Management System - Setup Guide

## Overview
This guide will help you set up the Shipyard Cargo Management System with the database, server, and all necessary components.

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **PHP 7.4 or higher** - For backend processing
   - Download from: https://www.php.net/downloads
   - Ensure the `php` command is in your system PATH

2. **MySQL 5.7 or higher** - For database storage
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use: https://www.apachefriends.org/ (includes Apache + MySQL)

3. **Python 3.x** - For development server (optional)
   - Download from: https://www.python.org/downloads/

4. **Git** (optional) - For version control
   - Download from: https://git-scm.com/

---

## Step 1: Database Setup

### 1.1 Start MySQL Server

**Windows (using XAMPP/WAMP):**
```
Open XAMPP Control Panel → Click "Start" next to MySQL
```

**Windows (Command Line):**
```
net start MySQL80
```

**Mac/Linux:**
```
mysql.server start
# or
brew services start mysql
```

### 1.2 Create Database

Open MySQL Command Line or phpMyAdmin and execute the following:

```sql
-- Copy and paste the entire content from: PHP/database_schema.sql
```

**Alternatively, using Command Line:**
```bash
mysql -u root < PHP/database_schema.sql
```

### 1.3 Verify Database Creation

```sql
mysql -u root
USE shipyard_cargo;
SHOW TABLES;
```

You should see:
- `users`
- `cargo`
- `cargo_tracking`
- `audit_logs`

---

## Step 2: Configure PHP Database Connection

### 2.1 Edit PHP/config.php

Open `PHP/config.php` and update database credentials:

```php
define('DB_HOST', 'localhost');      // Your MySQL host
define('DB_USER', 'root');           // Your MySQL username
define('DB_PASS', '');               // Your MySQL password (if any)
define('DB_NAME', 'shipyard_cargo'); // Database name
```

### 2.2 Test Database Connection

Open `PHP/config.php` in your browser or run:
```bash
php -S localhost:8000 -t .
```

If no error appears, your database connection is working.

---

## Step 3: Start Development Server

### Option A: Using Python (Recommended)

Navigate to your project folder and run:

```bash
cd d:\BSE\SEMESTER 08\FYP\SCS_Fyp\Code
python -m http.server 8000
```

Then access: **http://localhost:8000**

### Option B: Using PHP Built-in Server

```bash
cd d:\BSE\SEMESTER 08\FYP\SCS_Fyp\Code
php -S localhost:8000
```

Then access: **http://localhost:8000**

### Option C: Using Apache/XAMPP

1. Copy your `Code` folder to `C:\xampp\htdocs\shipyard_cargo`
2. Start Apache from XAMPP Control Panel
3. Access: **http://localhost/shipyard_cargo**

---

## Step 4: Test the Application

### 4.1 Access Landing Page

Open your browser and navigate to:
```
http://localhost:8000/Html/index.html
```

You should see:
- Navigation bar with logo
- Hero section with call-to-action buttons
- Feature cards
- Footer

### 4.2 Test Signup Page

1. Click "Get Started" button on home page
2. You will be redirected to: `http://localhost:8000/Html/signup.html`
3. Fill in the form with:
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Contact: `03001234567`
   - CNIC: `12345-6789012-3`
   - Password: `SecurePass123`
   - Confirm: `SecurePass123`
4. Click "Register"

**Expected Result:** Success message and redirect to login page

### 4.3 Test Login Page

1. Navigate to: `http://localhost:8000/Html/login.html`
2. Enter credentials from signup:
   - Email: `john@example.com`
   - Password: `SecurePass123`
3. Click "Login"

**Expected Result:** Success message (though dashboard.html doesn't exist yet)

---

## Step 5: Verify Database Records

Check if user data was saved:

```sql
USE shipyard_cargo;
SELECT id, full_name, email, contact_number, cnic FROM users;
```

You should see your newly registered user.

---

## Project File Structure

```
SCS_Fyp/Code/
├── Html/
│   ├── index.html          (Landing page)
│   ├── signup.html         (Registration page)
│   └── login.html          (Login page)
├── Css/
│   ├── styles.css          (Landing page styles)
│   ├── signup.css          (Signup page styles)
│   └── login.css           (Login page styles)
├── JS/
│   ├── script.js           (Landing page logic)
│   ├── signup.js           (Signup form validation)
│   └── login.js            (Login form validation)
├── PHP/
│   ├── config.php          (Database configuration)
│   ├── process_signup.php  (Signup processing)
│   ├── process_login.php   (Login processing)
│   └── database_schema.sql (Database structure)
└── Assest/
    ├── background.jpg
    ├── anchor_icon.png
    └── [other images]
```

---

## Troubleshooting

### Issue: "Cannot connect to database"
**Solution:**
- Check MySQL is running: `mysql -u root`
- Verify credentials in `PHP/config.php`
- Ensure database `shipyard_cargo` exists

### Issue: "localhost:8000 refused to connect"
**Solution:**
- Make sure Python/PHP server is running
- Try a different port: `python -m http.server 8001`
- Check firewall settings

### Issue: "CORS error when submitting form"
**Solution:**
- Use PHP server instead: `php -S localhost:8000`
- Or disable CORS restrictions in development

### Issue: "No such file or directory: database_schema.sql"
**Solution:**
- Verify file exists at: `PHP/database_schema.sql`
- Run from correct directory
- Use absolute path: `mysql -u root < C:\path\to\database_schema.sql`

### Issue: "POST request fails silently"
**Solution:**
- Check browser console (F12) for errors
- Verify form action path in HTML
- Check PHP error logs
- Ensure PHP scripts are executable

---

## Security Notes

### Before Production Deployment:

1. **Change Database Credentials**
   - Don't use default `root` with no password
   - Create dedicated MySQL user for this app

2. **Enable HTTPS**
   - Use SSL/TLS certificates
   - Never transmit passwords over HTTP

3. **Input Validation**
   - All inputs are validated both client and server-side
   - Use prepared statements (already implemented)

4. **Password Security**
   - Passwords are hashed with bcrypt (cost: 10)
   - Never store plain-text passwords

5. **Session Management**
   - Implement session timeout
   - Use secure session cookies

6. **Rate Limiting**
   - Implement rate limiting on login/signup endpoints
   - Prevent brute force attacks

---

## Next Steps

1. **Create Dashboard Page** (`Html/dashboard.html`)
   - User profile view
   - Cargo management interface

2. **Implement Cargo Management**
   - Add cargo registration form
   - Create cargo tracking interface

3. **Blockchain Integration**
   - Integrate blockchain for cargo verification
   - Create smart contracts for transactions

4. **Admin Panel**
   - User management
   - System monitoring
   - Report generation

5. **Mobile App**
   - React Native or Flutter app
   - Push notifications

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error messages in browser console (F12)
3. Check PHP error logs in system
4. Verify file paths and permissions
5. Ensure all prerequisites are installed

---

## Version Info

- **PHP**: 7.4+
- **MySQL**: 5.7+
- **Bootstrap**: 4.6.0
- **Font Awesome**: 6.0.0
- **jQuery**: 3.6.0
- **Created**: 2024

---

Last Updated: 2024
