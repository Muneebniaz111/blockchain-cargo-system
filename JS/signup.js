/* ===================================
   SIGNUP PAGE JAVASCRIPT
   Form Validation & Submission
   =================================== */

document.addEventListener('DOMContentLoaded', function () {
    const signupForm = document.getElementById('signupForm');
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
        email: /^[a-zA-Z0-9._%+\-]+@shipyard\.pk$/,
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
            showError('email', 'Only @shipyard.pk email addresses are accepted');
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
                // Show pending approval message — no redirect, user must wait for admin
                showPendingMessage(data.message || 'Your registration is pending admin approval.');
                signupForm.reset();
            } else if (data.status === 'already_pending') {
                showAlert(data.message || 'A registration with this email or CNIC is already pending.', 'warning');
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

    // Show a persistent pending-approval banner
    function showPendingMessage(message) {
        alertContainer.innerHTML = `
            <div class="alert alert-pending-approval" role="alert" style="
                background: linear-gradient(135deg, #eaf6fb, #dff0f5);
                border: 1px solid #9dd9e8;
                border-left: 4px solid #17A2B8;
                border-radius: 8px;
                padding: 1rem 1.2rem;
                color: #0c4a6e;
                font-size: 0.88rem;
                line-height: 1.6;
            ">
                <div style="display:flex;align-items:flex-start;gap:0.7rem;">
                    <i class="fas fa-hourglass-half" style="color:#17A2B8;font-size:1.1rem;margin-top:2px;flex-shrink:0;"></i>
                    <div>
                        <strong style="display:block;margin-bottom:0.25rem;font-size:0.92rem;color:#0c4a6e;">
                            Registration Submitted
                        </strong>
                        <span style="color:#155e75;">${message}</span>
                        <div style="margin-top:0.6rem;font-size:0.8rem;color:#1e7a91;">
                            Once approved, you can <a href="login.html" style="color:#0E4C7C;font-weight:600;text-decoration:underline;">log in here</a>.
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Scroll to message
        alertContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
