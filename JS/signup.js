/* ===================================
   SIGNUP PAGE JAVASCRIPT
   Form Validation & Submission
   =================================== */

document.addEventListener('DOMContentLoaded', function () {
    const signupForm = document.getElementById('signupForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const alertContainer = document.getElementById('alert-container');

    // Form fields
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const contactNumberInput = document.getElementById('contactNumber');
    const cnicInput = document.getElementById('cnic');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Form validation patterns
    const patterns = {
        fullName: /^[a-zA-Z\s]{3,50}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        contactNumber: /^(\+92|0)[0-9]{10}$/,
        cnic: /^\d{5}-\d{7}-\d{1}$/,
        password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    };

    // Real-time validation
    fullNameInput.addEventListener('blur', () => validateFullName());
    emailInput.addEventListener('blur', () => validateEmail());
    contactNumberInput.addEventListener('blur', () => validateContactNumber());
    cnicInput.addEventListener('blur', () => validateCNIC());
    passwordInput.addEventListener('blur', () => validatePassword());
    confirmPasswordInput.addEventListener('blur', () => validateConfirmPassword());

    // Validation functions
    function validateFullName() {
        const value = fullNameInput.value.trim();
        const errorElement = document.getElementById('fullName-error');

        if (!value) {
            showError('fullName', 'Full name is required');
            return false;
        }
        if (!patterns.fullName.test(value)) {
            showError('fullName', 'Name must be 3-50 characters and contain only letters');
            return false;
        }
        clearError('fullName');
        return true;
    }

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

    function validateContactNumber() {
        const value = contactNumberInput.value.trim();
        const errorElement = document.getElementById('contactNumber-error');

        if (!value) {
            showError('contactNumber', 'Contact number is required');
            return false;
        }
        if (!patterns.contactNumber.test(value)) {
            showError('contactNumber', 'Please enter a valid Pakistani phone number (+92300... or 03...)');
            return false;
        }
        clearError('contactNumber');
        return true;
    }

    function validateCNIC() {
        const value = cnicInput.value.trim();
        const errorElement = document.getElementById('cnic-error');

        if (!value) {
            showError('cnic', 'CNIC is required');
            return false;
        }
        if (!patterns.cnic.test(value)) {
            showError('cnic', 'CNIC format: 12345-6789012-3');
            return false;
        }
        clearError('cnic');
        return true;
    }

    function validatePassword() {
        const value = passwordInput.value;
        const errorElement = document.getElementById('password-error');

        if (!value) {
            showError('password', 'Password is required');
            return false;
        }
        if (!patterns.password.test(value)) {
            showError('password', 'Password must be at least 8 characters with uppercase, lowercase, and numbers');
            return false;
        }
        clearError('password');
        return true;
    }

    function validateConfirmPassword() {
        const value = confirmPasswordInput.value;
        const password = passwordInput.value;
        const errorElement = document.getElementById('confirmPassword-error');

        if (!value) {
            showError('confirmPassword', 'Please confirm your password');
            return false;
        }
        if (value !== password) {
            showError('confirmPassword', 'Passwords do not match');
            return false;
        }
        clearError('confirmPassword');
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
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate all fields
        const isFullNameValid = validateFullName();
        const isEmailValid = validateEmail();
        const isContactNumberValid = validateContactNumber();
        const isCNICValid = validateCNIC();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();

        if (!isFullNameValid || !isEmailValid || !isContactNumberValid || !isCNICValid || !isPasswordValid || !isConfirmPasswordValid) {
            showAlert('Please fix all errors before submitting', 'danger');
            return;
        }

        // Show loading state
        const submitButton = signupForm.querySelector('.btn-register');
        const originalText = submitButton.textContent;
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        try {
            // Submit form data
            const formData = new FormData(signupForm);
            const response = await fetch('../PHP/process_signup.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showAlert(data.message || 'Account created successfully!', 'success');
                signupForm.reset();
                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showAlert(data.message || 'An error occurred during registration', 'danger');
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
    googleLoginBtn.addEventListener('click', function () {
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

    // Real-time password confirmation check
    confirmPasswordInput.addEventListener('input', function () {
        if (passwordInput.value && confirmPasswordInput.value) {
            if (passwordInput.value === confirmPasswordInput.value) {
                clearError('confirmPassword');
            }
        }
    });

    // Logo click - go back to home
    document.querySelector('.logo-icon').addEventListener('click', function () {
        window.location.href = 'index.html';
    });
});
