/* ===================================
   LOGIN PAGE JAVASCRIPT
   Form Validation & Submission
   =================================== */

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const alertContainer = document.getElementById('alert-container');
    const rememberMeCheckbox = document.getElementById('rememberMe');

    // Form fields
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Load saved email if remember me was previously checked
    window.addEventListener('load', function () {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            emailInput.value = savedEmail;
            rememberMeCheckbox.checked = true;
        }
    });

    // Form validation patterns
    const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    };

    // Real-time validation
    emailInput.addEventListener('blur', () => validateEmail());
    passwordInput.addEventListener('blur', () => validatePassword());

    // Validation functions
    function validateEmail() {
        const value = emailInput.value.trim();
        const errorElement = document.getElementById('email-error');

        if (!value) {
            showError('email', 'Email is required');
            return false;
        }
        if (!patterns.email.test(value)) {
            showError('email', 'Please enter a valid email address');
            return false;
        }
        clearError('email');
        return true;
    }

    function validatePassword() {
        const value = passwordInput.value;
        const errorElement = document.getElementById('password-error');

        if (!value) {
            showError('password', 'Password is required');
            return false;
        }
        if (value.length < 8) {
            showError('password', 'Password must be at least 8 characters');
            return false;
        }
        clearError('password');
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

    // Form submission
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate all fields
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();

        if (!isEmailValid || !isPasswordValid) {
            showAlert('Please fix all errors before submitting', 'danger');
            return;
        }

        // Save email if remember me is checked
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('savedEmail', emailInput.value.trim());
        } else {
            localStorage.removeItem('savedEmail');
        }

        // Show loading state
        const submitButton = loginForm.querySelector('.btn-login');
        const originalText = submitButton.textContent;
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        try {
            // Submit form data
            const formData = new FormData(loginForm);
            const response = await fetch('../PHP/process_login.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showAlert(data.message || 'Login successful!', 'success');
                // Redirect after 1.5 seconds
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                showAlert(data.message || 'Invalid email or password', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Network error: Unable to connect to server', 'danger');
        } finally {
            submitButton.classList.remove('loading');
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });

    // Google Login Button
    document.getElementById('googleLoginBtn').addEventListener('click', function () {
        showAlert('Google login integration will be configured by your admin', 'warning');
        // TODO: Implement Google OAuth flow
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
    document.querySelector('.logo-icon').addEventListener('click', function () {
        window.location.href = 'index.html';
    });

    // Forgot password link
    document.querySelector('.forgot-password').addEventListener('click', function (e) {
        e.preventDefault();
        showAlert('Password reset functionality will be implemented soon', 'warning');
    });
});
