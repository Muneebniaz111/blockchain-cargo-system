/* ===================================
   LOGIN PAGE JAVASCRIPT
   Form Validation & Submission
   + Forgot Password (OTP via WhatsApp/SMS)
   =================================== */

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
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
        email: /^[a-zA-Z0-9._%+\-]+@shipyard\.pk$/
    };

    emailInput.addEventListener('blur', () => validateEmail());
    passwordInput.addEventListener('blur', () => validatePassword());

    function validateEmail() {
        const value = emailInput.value.trim();
        if (!value) { showError('email', 'Email is required'); return false; }
        if (!patterns.email.test(value)) { showError('email', 'Please enter a valid @shipyard.pk email address'); return false; }
        clearError('email');
        return true;
    }

    function validatePassword() {
        const value = passwordInput.value;
        if (!value) { showError('password', 'Password is required'); return false; }
        if (value.length < 8) { showError('password', 'Password must be at least 8 characters'); return false; }
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

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        if (!isEmailValid || !isPasswordValid) {
            showAlert('Please fix all errors before submitting', 'danger');
            return;
        }

        if (rememberMeCheckbox.checked) {
            localStorage.setItem('savedEmail', emailInput.value.trim());
        } else {
            localStorage.removeItem('savedEmail');
        }

        const submitButton = loginForm.querySelector('.btn-login');
        const originalText = submitButton.textContent;
        submitButton.classList.add('loading');
        submitButton.disabled = true;

        try {
            const formData = new FormData(loginForm);
            const response = await fetch('../PHP/process_login.php', { method: 'POST', body: formData });
            const data = await response.json();

            if (data.success) {
                showAlert(data.message || 'Login successful!', 'success');
                setTimeout(() => { window.location.href = 'user-dashboard.html'; }, 1500);
            } else if (data.status === 'pending') {
                showPendingNotice(data.message);
            } else if (data.status === 'rejected') {
                showAlert(data.message || 'Your registration was not approved.', 'danger');
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

    function showPendingNotice(message) {
        alertContainer.innerHTML = `
            <div role="alert" style="
                background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.35);
                border-left:4px solid #ffc107;border-radius:8px;padding:0.9rem 1.1rem;
                font-size:0.86rem;color:#ffe08a;line-height:1.6;
                display:flex;align-items:flex-start;gap:0.7rem;">
                <i class="fas fa-hourglass-half" style="color:#ffc107;margin-top:2px;flex-shrink:0;"></i>
                <div>
                    <strong style="display:block;margin-bottom:0.2rem;">Account Pending Approval</strong>
                    ${message || 'Your registration is awaiting admin review.'}
                </div>
            </div>`;
        alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type}" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>`;
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }

    const logoEl = document.querySelector('.logo-icon');
    if (logoEl) logoEl.addEventListener('click', () => { window.location.href = 'index.html'; });

    // ══════════════════════════════════════════════════════
    // FORGOT PASSWORD FLOW
    // ══════════════════════════════════════════════════════
    injectForgotPasswordModal();

    let fpStep = 'email';
    let fpEmail = '';
    let fpMaskedPhone = '';
    let resendTimer = null;

    document.querySelector('.forgot-password').addEventListener('click', function (e) {
        e.preventDefault();
        fpStep = 'email';
        fpEmail = emailInput.value.trim() || '';
        renderFpStep();
        document.getElementById('fpModal').style.display = 'flex';
        setTimeout(() => { const el = document.getElementById('fpEmailInput'); if (el) el.focus(); }, 100);
    });

    function closeFpModal() {
        document.getElementById('fpModal').style.display = 'none';
        clearResendTimer();
    }

    document.addEventListener('click', function (e) {
        const modal = document.getElementById('fpModal');
        if (e.target === modal) closeFpModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.getElementById('fpModal').style.display === 'flex') closeFpModal();
    });

    function renderFpStep() {
        const body = document.getElementById('fpModalBody');
        if (!body) return;
        clearFpAlert();

        if (fpStep === 'email') {
            body.innerHTML = `
                <p class="fp-desc">Enter your registered email. We'll send an OTP to your phone number via WhatsApp or SMS.</p>
                <div class="fp-form-group">
                    <label for="fpEmailInput"><i class="fas fa-envelope"></i> Registered Email</label>
                    <input type="email" id="fpEmailInput" class="fp-input" placeholder="you@shipyard.pk" value="${escHtml(fpEmail)}">
                </div>
                <button class="fp-btn-primary" id="fpSendOtpBtn"><i class="fas fa-paper-plane"></i> Send OTP</button>`;
            document.getElementById('fpSendOtpBtn').addEventListener('click', handleSendOtp);
            document.getElementById('fpEmailInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleSendOtp(); });
        }
        else if (fpStep === 'otp') {
            body.innerHTML = `
                <p class="fp-desc">A 6-digit OTP was sent to <strong>${escHtml(fpMaskedPhone)}</strong>. Enter it below along with your new password.</p>
                <div class="fp-form-group">
                    <label><i class="fas fa-mobile-alt"></i> OTP Code</label>
                    <div class="fp-otp-inputs" id="fpOtpInputs">
                        ${[1,2,3,4,5,6].map(i => `<input class="fp-otp-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" aria-label="Digit ${i}">`).join('')}
                    </div>
                    <input type="hidden" id="fpOtpHidden" value="">
                </div>
                <div class="fp-form-group">
                    <label for="fpNewPw"><i class="fas fa-lock"></i> New Password</label>
                    <div class="fp-pw-wrap">
                        <input type="password" id="fpNewPw" class="fp-input" placeholder="Min 8 chars, 1 uppercase, 1 number">
                        <button type="button" class="fp-pw-toggle" id="fpPwToggle1" tabindex="-1"><i class="fas fa-eye-slash"></i></button>
                    </div>
                </div>
                <div class="fp-form-group">
                    <label for="fpConfPw"><i class="fas fa-lock"></i> Confirm Password</label>
                    <div class="fp-pw-wrap">
                        <input type="password" id="fpConfPw" class="fp-input" placeholder="Repeat your new password">
                        <button type="button" class="fp-pw-toggle" id="fpPwToggle2" tabindex="-1"><i class="fas fa-eye-slash"></i></button>
                    </div>
                </div>
                <button class="fp-btn-primary" id="fpVerifyBtn"><i class="fas fa-check-circle"></i> Verify & Reset Password</button>
                <div class="fp-resend-row">
                    <span class="fp-resend-timer" id="fpResendTimerWrap">Resend in <span id="fpResendCount">60</span>s</span>
                    <button class="fp-link-btn" id="fpResendBtn" disabled>Resend OTP</button>
                    <span class="fp-sep">|</span>
                    <button class="fp-link-btn" id="fpChangePhoneBtn">Wrong number?</button>
                </div>`;
            initOtpDigits('fpOtpInputs', 'fpOtpHidden');
            initPwToggle('fpPwToggle1', 'fpNewPw');
            initPwToggle('fpPwToggle2', 'fpConfPw');
            document.getElementById('fpVerifyBtn').addEventListener('click', handleVerifyOtp);
            document.getElementById('fpResendBtn').addEventListener('click', () => handleSendOtp(true));
            document.getElementById('fpChangePhoneBtn').addEventListener('click', () => { fpStep = 'change_phone'; renderFpStep(); });
            startResendTimer();
        }
        else if (fpStep === 'change_phone') {
            body.innerHTML = `
                <p class="fp-desc">Enter the exact phone number registered with your <strong>${escHtml(fpEmail)}</strong> account.</p>
                <div class="fp-form-group">
                    <label for="fpPhoneInput"><i class="fas fa-phone"></i> Registered Phone Number</label>
                    <input type="tel" id="fpPhoneInput" class="fp-input" placeholder="e.g. 03001234567">
                </div>
                <button class="fp-btn-primary" id="fpVerifyPhoneBtn"><i class="fas fa-arrow-right"></i> Verify & Send OTP</button>
                <div class="fp-resend-row">
                    <button class="fp-link-btn" id="fpBackBtn">← Back</button>
                </div>`;
            document.getElementById('fpVerifyPhoneBtn').addEventListener('click', handleChangePhone);
            document.getElementById('fpPhoneInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleChangePhone(); });
            document.getElementById('fpBackBtn').addEventListener('click', () => { fpStep = 'otp'; renderFpStep(); });
        }
        else if (fpStep === 'success') {
            body.innerHTML = `
                <div class="fp-success">
                    <i class="fas fa-check-circle fp-success-icon"></i>
                    <h3>Password Reset!</h3>
                    <p>Your password has been updated. You can now log in with your new password.</p>
                    <button class="fp-btn-primary" id="fpGoLoginBtn"><i class="fas fa-sign-in-alt"></i> Go to Login</button>
                </div>`;
            document.getElementById('fpGoLoginBtn').addEventListener('click', closeFpModal);
        }
    }

    async function handleSendOtp(isResend) {
        const emailVal = isResend ? fpEmail : ((document.getElementById('fpEmailInput') || {}).value || fpEmail).trim();
        if (!emailVal) { showFpAlert('Please enter your email address.', 'error'); return; }
        fpEmail = emailVal;

        const btn = document.getElementById('fpSendOtpBtn') || document.getElementById('fpResendBtn');
        setFpLoading(btn, true);

        try {
            const fd = new FormData();
            fd.append('email', fpEmail);
            const resp = await fetch('../PHP/forgot_password_send_otp.php', { method: 'POST', body: fd });
            const data = await resp.json();

            if (data.success) {
                fpMaskedPhone = data.masked_phone || '***';
                fpStep = 'otp';
                renderFpStep();
                const msg = data.message || 'OTP sent!';
                showFpAlert(msg, 'success');
            } else if (data.not_found) {
                showFpAlert('If this email is registered, an OTP will be sent to the phone on file.', 'info');
            } else {
                showFpAlert(data.message || 'Failed to send OTP. Please try again.', 'error');
            }
        } catch (err) {
            showFpAlert('Network error. Please check your connection.', 'error');
        } finally {
            setFpLoading(btn, false);
        }
    }

    async function handleVerifyOtp() {
        const otpCode = (document.getElementById('fpOtpHidden') || {}).value || '';
        const newPw   = (document.getElementById('fpNewPw') || {}).value || '';
        const confPw  = (document.getElementById('fpConfPw') || {}).value || '';

        if (otpCode.length !== 6) { showFpAlert('Please enter the complete 6-digit OTP.', 'error'); return; }
        if (!newPw || newPw.length < 8) { showFpAlert('Password must be at least 8 characters.', 'error'); return; }
        if (!/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) { showFpAlert('Password must have at least one uppercase letter and one number.', 'error'); return; }
        if (newPw !== confPw) { showFpAlert('Passwords do not match.', 'error'); return; }

        const btn = document.getElementById('fpVerifyBtn');
        setFpLoading(btn, true);
        try {
            const fd = new FormData();
            fd.append('action', 'verify_otp');
            fd.append('otp_code', otpCode);
            fd.append('new_password', newPw);
            fd.append('confirm_password', confPw);
            const resp = await fetch('../PHP/forgot_password_verify_otp.php', { method: 'POST', body: fd });
            const data = await resp.json();
            if (data.success) { clearResendTimer(); fpStep = 'success'; renderFpStep(); }
            else { showFpAlert(data.message || 'Verification failed. Please try again.', 'error'); }
        } catch (err) {
            showFpAlert('Network error. Please check your connection.', 'error');
        } finally {
            setFpLoading(btn, false);
        }
    }

    async function handleChangePhone() {
        const phone = (document.getElementById('fpPhoneInput') || {}).value || '';
        if (!phone.trim()) { showFpAlert('Please enter your phone number.', 'error'); return; }

        const btn = document.getElementById('fpVerifyPhoneBtn');
        setFpLoading(btn, true);
        try {
            const fd = new FormData();
            fd.append('action', 'change_phone');
            fd.append('new_phone', phone.trim());
            const resp = await fetch('../PHP/forgot_password_verify_otp.php', { method: 'POST', body: fd });
            const data = await resp.json();

            if (data.success) {
                const fd2 = new FormData();
                fd2.append('email', fpEmail);
                fd2.append('phone', data.use_phone || phone.trim());
                const resp2 = await fetch('../PHP/forgot_password_send_otp.php', { method: 'POST', body: fd2 });
                const data2 = await resp2.json();
                if (data2.success) {
                    fpMaskedPhone = data2.masked_phone || '***';
                    fpStep = 'otp';
                    renderFpStep();
                    const msg2 = data2.message || 'OTP sent!';
                    showFpAlert(msg2, 'success');
                } else {
                    showFpAlert(data2.message || 'Failed to send OTP.', 'error');
                }
            } else {
                showFpAlert(data.message || 'Phone number does not match our records.', 'error');
            }
        } catch (err) {
            showFpAlert('Network error. Please check your connection.', 'error');
        } finally {
            setFpLoading(btn, false);
        }
    }

    function initOtpDigits(containerId, hiddenId) {
        const container = document.getElementById(containerId);
        const hidden    = document.getElementById(hiddenId);
        if (!container || !hidden) return;
        const digits = container.querySelectorAll('.fp-otp-digit');
        digits.forEach((input, idx) => {
            input.addEventListener('input', function () {
                this.value = this.value.replace(/\D/, '').slice(-1);
                updateHidden();
                if (this.value && idx < digits.length - 1) digits[idx + 1].focus();
            });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace' && !this.value && idx > 0) digits[idx - 1].focus();
            });
            input.addEventListener('paste', function (e) {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                [...pasted.slice(0, 6)].forEach((ch, i) => { if (digits[i]) digits[i].value = ch; });
                updateHidden();
                digits[Math.min(pasted.length, digits.length - 1)].focus();
            });
        });
        function updateHidden() { hidden.value = [...digits].map(d => d.value).join(''); }
        setTimeout(() => { if (digits[0]) digits[0].focus(); }, 100);
    }

    function initPwToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const inp = document.getElementById(inputId);
        if (!btn || !inp) return;
        btn.addEventListener('click', function () {
            const show = inp.type === 'password';
            inp.type = show ? 'text' : 'password';
            this.querySelector('i').className = show ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }

    function startResendTimer() {
        clearResendTimer();
        let count = 60;
        const countEl   = document.getElementById('fpResendCount');
        const timerWrap = document.getElementById('fpResendTimerWrap');
        const btn       = document.getElementById('fpResendBtn');
        if (!countEl || !btn) return;
        resendTimer = setInterval(() => {
            count--;
            if (countEl) countEl.textContent = count;
            if (count <= 0) {
                clearResendTimer();
                if (timerWrap) timerWrap.style.display = 'none';
                if (btn) btn.disabled = false;
            }
        }, 1000);
    }

    function clearResendTimer() {
        if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
    }

    function showFpAlert(msg, type) {
        const el = document.getElementById('fpAlertContainer');
        if (!el) return;
        const colors = { error: '#e74c3c', success: '#27ae60', info: '#3498db', warning: '#f39c12' };
        const c = colors[type] || '#555';
        el.innerHTML = `<div style="background:${c}22;border-left:3px solid ${c};color:${c === '#27ae60' ? '#7dffb3' : '#e0eaf4'};padding:0.6rem 0.8rem;border-radius:6px;font-size:0.82rem;margin-bottom:0.75rem;line-height:1.5;">${msg}</div>`;
    }

    function clearFpAlert() {
        const el = document.getElementById('fpAlertContainer');
        if (el) el.innerHTML = '';
    }

    function setFpLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        if (loading) { btn._orig = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...'; }
        else if (btn._orig) btn.innerHTML = btn._orig;
    }

    function escHtml(s) {
        return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function injectForgotPasswordModal() {
        const modal = document.createElement('div');
        modal.id = 'fpModal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:1rem;';
        modal.innerHTML = `
            <div id="fpModalCard" style="background:linear-gradient(135deg,#0d2a45 0%,#0e4c7c 100%);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:2rem;width:100%;max-width:440px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.5);color:#e0eaf4;font-family:inherit;">
                <button id="fpModalClose" style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:32px;height:32px;color:#aac;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Close">&times;</button>
                <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.3rem;color:#7ec8f8;"><i class="fas fa-key"></i> Forgot Password</h3>
                <hr style="border-color:rgba(255,255,255,0.1);margin:0.75rem 0;">
                <div id="fpAlertContainer"></div>
                <div id="fpModalBody"></div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('fpModalClose').addEventListener('click', closeFpModal);

        const style = document.createElement('style');
        style.textContent = `
            #fpModal * { box-sizing:border-box; }
            .fp-desc { font-size:.85rem; color:#aac; margin-bottom:1rem; line-height:1.5; }
            .fp-form-group { margin-bottom:.85rem; }
            .fp-form-group label { display:block; font-size:.78rem; font-weight:600; color:#7ec8f8; margin-bottom:.3rem; }
            .fp-input { width:100%; padding:.6rem .8rem; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.15); border-radius:8px; color:#e0eaf4; font-size:.88rem; outline:none; transition:border-color .2s; }
            .fp-input:focus { border-color:#7ec8f8; background:rgba(255,255,255,.1); }
            .fp-pw-wrap { position:relative; }
            .fp-pw-wrap .fp-input { padding-right:2.5rem; }
            .fp-pw-toggle { position:absolute; right:.6rem; top:50%; transform:translateY(-50%); background:none; border:none; color:#7ec8f8; cursor:pointer; font-size:.9rem; padding:.2rem; }
            .fp-otp-inputs { display:flex; gap:.4rem; justify-content:center; margin:.4rem 0; }
            .fp-otp-digit { width:42px; height:48px; text-align:center; font-size:1.2rem; font-weight:700; background:rgba(255,255,255,.08); border:2px solid rgba(255,255,255,.2); border-radius:8px; color:#fff; outline:none; transition:border-color .2s; }
            .fp-otp-digit:focus { border-color:#7ec8f8; background:rgba(126,200,248,.1); }
            .fp-btn-primary { width:100%; padding:.75rem; border:none; border-radius:8px; background:linear-gradient(135deg,#1a6db5,#0e4c7c); color:#fff; font-weight:600; font-size:.9rem; cursor:pointer; transition:opacity .2s; margin-top:.5rem; }
            .fp-btn-primary:hover { opacity:.9; }
            .fp-btn-primary:disabled { opacity:.5; cursor:not-allowed; }
            .fp-resend-row { display:flex; align-items:center; gap:.5rem; margin-top:.75rem; font-size:.78rem; color:#aac; flex-wrap:wrap; }
            .fp-link-btn { background:none; border:none; color:#7ec8f8; cursor:pointer; font-size:.78rem; padding:0; text-decoration:underline; }
            .fp-link-btn:disabled { color:#556; cursor:not-allowed; text-decoration:none; }
            .fp-sep { color:#556; }
            .fp-success { text-align:center; padding:1rem 0; }
            .fp-success-icon { font-size:3rem; color:#27ae60; display:block; margin-bottom:.75rem; }
            .fp-success h3 { color:#7ec8f8; margin-bottom:.5rem; }
            .fp-success p { color:#aac; font-size:.85rem; margin-bottom:1rem; }
        `;
        document.head.appendChild(style);
    }
});
