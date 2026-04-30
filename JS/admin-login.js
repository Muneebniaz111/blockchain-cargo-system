/* ===================================
   ADMIN LOGIN PAGE JAVASCRIPT
   Form Validation & Submission
   FIX #6 & #7: Removed hardcoded credentials.
   Authentication is now handled server-side
   via fetch() to process_admin_login.php.
   =================================== */

document.addEventListener('DOMContentLoaded', function () {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const alertContainer = document.getElementById('alert-container');

    // Form fields
    const adminEmailInput = document.getElementById('adminEmail');
    const adminPasswordInput = document.getElementById('adminPassword');

    // Form validation patterns
    const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    };

    // Real-time validation
    adminEmailInput.addEventListener('blur', () => validateAdminEmail());
    adminPasswordInput.addEventListener('blur', () => validateAdminPassword());

    // Validation functions
    function validateAdminEmail() {
        const value = adminEmailInput.value.trim();

        if (!value) {
            showError('adminEmail', 'Admin email is required');
            return false;
        }
        if (!patterns.email.test(value)) {
            showError('adminEmail', 'Please enter a valid email address');
            return false;
        }
        clearError('adminEmail');
        return true;
    }

    function validateAdminPassword() {
        const value = adminPasswordInput.value;

        if (!value) {
            showError('adminPassword', 'Admin password is required');
            return false;
        }
        if (value.length < 8) {
            showError('adminPassword', 'Password must be at least 8 characters');
            return false;
        }
        clearError('adminPassword');
        return true;
    }

    function showError(fieldName, message) {
        const input = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + '-error');
        input.classList.add('is-invalid');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    function clearError(fieldName) {
        const input = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + '-error');
        input.classList.remove('is-invalid');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    // Form submission — server-side authentication via PHP
    adminLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate all fields
        const isEmailValid = validateAdminEmail();
        const isPasswordValid = validateAdminPassword();

        if (!isEmailValid || !isPasswordValid) {
            showAlert('Please fix all errors before submitting', 'danger');
            return;
        }

        // Show loading state
        const submitButton = adminLoginForm.querySelector('.btn-admin-login');
        const originalText = submitButton.textContent;
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        const email = adminEmailInput.value.trim().toLowerCase();
        const password = adminPasswordInput.value;

        try {
            const response = await fetch('../PHP/process_admin_login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ adminEmail: email, adminPassword: password })
            });

            const data = await response.json();

            if (data.success) {
                // Store session info returned by the server
                sessionStorage.setItem('adminSession', 'active');
                sessionStorage.setItem('adminName', data.admin_name || email);
                sessionStorage.setItem('adminEmail', email);

                showAlert('Admin login successful! Redirecting to dashboard...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 900);
            } else {
                showAlert(data.message || 'Invalid admin credentials', 'danger');
                console.warn('Failed admin login attempt');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            showAlert('Server error. Please try again.', 'danger');
        } finally {
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });

    // Show alert message
    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type}" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    // Logo click - go back to home
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
        logoIcon.addEventListener('click', function () {
            window.location.href = 'index.html';
        });
    }
});
