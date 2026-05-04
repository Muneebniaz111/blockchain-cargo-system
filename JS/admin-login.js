/* ===================================
   ADMIN LOGIN — Two-Step 2FA Flow
   Step 1: Email + Password → credentials check
   Step 2: QR code + 6-digit TOTP → full login
   =================================== */

document.addEventListener('DOMContentLoaded', function () {

    // ── DOM references ────────────────────────────────────
    const stepCredentials   = document.getElementById('step-credentials');
    const step2fa           = document.getElementById('step-2fa');
    const adminLoginForm    = document.getElementById('adminLoginForm');
    const twoFaForm         = document.getElementById('twoFaForm');
    const alertContainer    = document.getElementById('alert-container');
    const alertContainer2fa = document.getElementById('alert-container-2fa');
    const adminEmailInput   = document.getElementById('adminEmail');
    const adminPasswordInput= document.getElementById('adminPassword');
    const otpDigits         = document.querySelectorAll('.otp-digit');
    const otpHidden         = document.getElementById('otp_code');
    const btnVerify         = document.getElementById('btnVerify');
    const backToStep1Btn    = document.getElementById('backToStep1');
    const qrSection         = document.getElementById('qrSection');
    const qrLoading         = document.getElementById('qrLoading');
    const secretDisplay     = document.getElementById('secretDisplay');
    const manualAccount     = document.getElementById('manualAccount');
    const btnCopySecret     = document.getElementById('btnCopySecret');
    const pwToggle          = document.getElementById('pwToggle');

    let timerInterval = null;
    let qrInstance    = null;

    // ── Password toggle ───────────────────────────────────
    if (pwToggle) {
        pwToggle.addEventListener('click', function () {
            const isPassword = adminPasswordInput.type === 'password';
            adminPasswordInput.type = isPassword ? 'text' : 'password';
            this.querySelector('i').className = isPassword ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }

    // ── Validation helpers ────────────────────────────────
    const emailPattern = /^[a-zA-Z0-9._%+\-]+@shipyard\.pk$/;

    function validateAdminEmail() {
        const v = adminEmailInput.value.trim();
        if (!v) { showError('adminEmail', 'Admin email is required'); return false; }
        if (!emailPattern.test(v)) { showError('adminEmail', 'Must be a @shipyard.pk address'); return false; }
        clearError('adminEmail');
        return true;
    }

    function validateAdminPassword() {
        const v = adminPasswordInput.value;
        if (!v) { showError('adminPassword', 'Admin password is required'); return false; }
        if (v.length < 8) { showError('adminPassword', 'Password must be at least 8 characters'); return false; }
        clearError('adminPassword');
        return true;
    }

    adminEmailInput.addEventListener('blur',    validateAdminEmail);
    adminPasswordInput.addEventListener('blur', validateAdminPassword);

    function showError(field, msg) {
        const el = document.getElementById(field + '-error');
        const inp = document.getElementById(field);
        if (el)  { el.textContent = msg; el.classList.add('show'); }
        if (inp) inp.classList.add('is-invalid');
    }
    function clearError(field) {
        const el = document.getElementById(field + '-error');
        const inp = document.getElementById(field);
        if (el)  { el.textContent = ''; el.classList.remove('show'); }
        if (inp) inp.classList.remove('is-invalid');
    }

    // ── Step 1: submit credentials ────────────────────────
    adminLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateAdminEmail() || !validateAdminPassword()) {
            showAlert(alertContainer, 'Please fix all errors before continuing.', 'danger');
            return;
        }

        const btn = adminLoginForm.querySelector('.btn-admin-login');
        setLoading(btn, true);

        try {
            const resp = await fetch('../PHP/process_admin_login.php', {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body:    new URLSearchParams({
                    adminEmail:    adminEmailInput.value.trim().toLowerCase(),
                    adminPassword: adminPasswordInput.value
                }),
                credentials: 'same-origin'
            });

            const data = await resp.json();

            if (data.success && data.needs_2fa) {
                // Transition to 2FA step
                transitionTo2FA(data);
            } else {
                showAlert(alertContainer, data.message || 'Invalid admin credentials', 'danger');
            }
        } catch (err) {
            console.error(err);
            showAlert(alertContainer, 'Server error. Please try again.', 'danger');
        } finally {
            setLoading(btn, false);
        }
    });

    // ── Transition from Step 1 → Step 2 ──────────────────
    function transitionTo2FA(data) {
        // Slide out step 1
        stepCredentials.classList.add('step-exit');
        setTimeout(() => {
            stepCredentials.style.display = 'none';
            stepCredentials.classList.remove('step-exit');
            step2fa.style.display = 'block';
            step2fa.classList.add('step-enter');
            setTimeout(() => step2fa.classList.remove('step-enter'), 400);
        }, 300);

        // Populate manual key fields
        if (secretDisplay) secretDisplay.textContent = data.secret || '—';
        if (manualAccount) manualAccount.textContent  = data.admin_name
            ? data.admin_name + ' (' + adminEmailInput.value.trim() + ')'
            : adminEmailInput.value.trim();

        // Render QR code
        renderQR(data.qr_uri);

        // Start OTP countdown timer
        startTimer();

        // Focus first OTP digit
        setTimeout(() => { if (otpDigits[0]) otpDigits[0].focus(); }, 350);
    }

    // ── Render QR code ────────────────────────────────────
    function renderQR(uri) {
        if (!uri) return;
        // qrCanvas is a <div> — qrcodejs injects its own <canvas> inside it
        const qrDiv = document.getElementById('qrCanvas');
        if (!qrDiv) return;

        // Clear any previous QR render
        if (qrInstance) {
            try { qrInstance.clear(); } catch(e) {}
            qrInstance = null;
        }
        qrDiv.innerHTML = '';   // works correctly on a <div>
        if (qrLoading) qrLoading.style.display = 'flex';

        if (typeof QRCode !== 'undefined') {
            try {
                // QRCode() must receive a DIV element as its first argument
                qrInstance = new QRCode(qrDiv, {
                    text:         uri,
                    width:        200,
                    height:       200,
                    colorDark:    '#0a0a0a',
                    colorLight:   '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
                if (qrLoading) setTimeout(() => { qrLoading.style.display = 'none'; }, 200);
            } catch (e) {
                console.error('QRCode render error:', e);
                fallbackQR(qrDiv, uri);
            }
        } else {
            fallbackQR(qrDiv, uri);
        }
    }

    // Fallback when QRCode.js is unavailable (e.g. offline)
    function fallbackQR(container, uri) {
        if (qrLoading) qrLoading.style.display = 'none';
        container.innerHTML =
            `<div class="qr-fallback">
                <i class="fas fa-qrcode" style="font-size:4rem;opacity:0.3;"></i>
                <p>QR library unavailable. Use the manual key below.</p>
                <a href="${encodeURI(uri)}" class="btn-qr-link" target="_blank" rel="noopener">
                    <i class="fas fa-external-link-alt"></i> Open in Authenticator App
                </a>
             </div>`;
    }

    // ── Copy secret to clipboard ──────────────────────────
    if (btnCopySecret) {
        btnCopySecret.addEventListener('click', async function () {
            const secret = secretDisplay ? secretDisplay.textContent : '';
            if (!secret || secret === '—') return;
            try {
                await navigator.clipboard.writeText(secret);
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { this.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
            } catch (e) {
                // Fallback for older browsers
                const ta = document.createElement('textarea');
                ta.value = secret;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { this.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
            }
        });
    }

    // ── OTP digit inputs — smart navigation ──────────────
    otpDigits.forEach((input, idx) => {
        input.addEventListener('input', function () {
            // Only allow digits
            this.value = this.value.replace(/[^0-9]/g, '').slice(-1);
            assembleOTP();
            if (this.value && idx < otpDigits.length - 1) {
                otpDigits[idx + 1].focus();
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace') {
                if (!this.value && idx > 0) {
                    otpDigits[idx - 1].focus();
                    otpDigits[idx - 1].value = '';
                    assembleOTP();
                }
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                otpDigits[idx - 1].focus();
            } else if (e.key === 'ArrowRight' && idx < otpDigits.length - 1) {
                otpDigits[idx + 1].focus();
            } else if (e.key === 'Enter') {
                twoFaForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        });

        // Support paste on any digit
        input.addEventListener('paste', function (e) {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            if (pasted.length >= 6) {
                for (let i = 0; i < 6 && i < otpDigits.length; i++) {
                    otpDigits[i].value = pasted[i] || '';
                }
                assembleOTP();
                otpDigits[otpDigits.length - 1].focus();
            }
        });
    });

    function assembleOTP() {
        const code = Array.from(otpDigits).map(d => d.value).join('');
        if (otpHidden) otpHidden.value = code;
        if (btnVerify) btnVerify.disabled = code.length < 6;

        // Visual feedback on complete
        otpDigits.forEach((d, i) => {
            d.classList.toggle('otp-filled', !!d.value);
        });
    }

    // ── OTP countdown timer ───────────────────────────────
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const now   = Math.floor(Date.now() / 1000);
        const rem   = 30 - (now % 30);
        const pct   = (rem / 30) * 100;

        const numEl = document.getElementById('timerNum');
        const arcEl = document.getElementById('timerArc');

        if (numEl) {
            numEl.textContent = rem;
            numEl.style.color = rem <= 5 ? '#ef4444' : '';
        }
        if (arcEl) {
            // stroke-dashoffset: 0 = full, 100 = empty
            arcEl.setAttribute('stroke-dashoffset', (100 - pct).toFixed(1));
            arcEl.style.stroke = rem <= 5 ? '#ef4444' : '';
        }

        // When timer resets (new window), shake the OTP inputs as a hint to re-enter
        if (rem === 30) {
            otpDigits.forEach(d => { d.classList.add('otp-refresh'); });
            setTimeout(() => otpDigits.forEach(d => d.classList.remove('otp-refresh')), 500);
        }
    }

    // ── Step 2: verify OTP ────────────────────────────────
    twoFaForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const code = otpHidden ? otpHidden.value.trim() : '';
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            showAlert(alertContainer2fa, 'Please enter the complete 6-digit code.', 'danger');
            return;
        }

        setLoading(btnVerify, true);

        try {
            const resp = await fetch('../PHP/process_2fa_verify.php', {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body:    new URLSearchParams({ otp_code: code }),
                credentials: 'same-origin'
            });

            const data = await resp.json();

            if (data.success) {
                // Full login — update sessionStorage for legacy compatibility
                sessionStorage.setItem('adminSession', 'active');
                sessionStorage.setItem('adminName',  data.admin_name || '');
                sessionStorage.setItem('adminEmail', adminEmailInput.value.trim().toLowerCase());

                showAlert(alertContainer2fa, data.message || 'Authentication successful!', 'success');

                // Stop timer
                if (timerInterval) clearInterval(timerInterval);

                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
            } else {
                showAlert(alertContainer2fa, data.message || 'Invalid code. Try again.', 'danger');
                // Shake effect on wrong code
                shakeOTP();
                // Clear inputs
                otpDigits.forEach(d => { d.value = ''; d.classList.remove('otp-filled'); });
                if (otpHidden) otpHidden.value = '';
                if (btnVerify) btnVerify.disabled = true;
                if (otpDigits[0]) otpDigits[0].focus();
            }
        } catch (err) {
            console.error(err);
            showAlert(alertContainer2fa, 'Server error. Please try again.', 'danger');
        } finally {
            setLoading(btnVerify, false);
        }
    });

    // ── Back to Step 1 ────────────────────────────────────
    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', function () {
            // Stop timer
            if (timerInterval) clearInterval(timerInterval);

            step2fa.classList.add('step-exit');
            setTimeout(() => {
                step2fa.style.display = 'none';
                step2fa.classList.remove('step-exit');
                stepCredentials.style.display = 'block';
                stepCredentials.classList.add('step-enter');
                setTimeout(() => stepCredentials.classList.remove('step-enter'), 400);
                // Clear alert
                if (alertContainer) alertContainer.innerHTML = '';
            }, 300);

            // Clear OTP
            otpDigits.forEach(d => { d.value = ''; d.classList.remove('otp-filled'); });
            if (otpHidden) otpHidden.value = '';
            if (btnVerify) btnVerify.disabled = true;
        });
    }

    // ── Shake animation on wrong OTP ─────────────────────
    function shakeOTP() {
        const container = document.getElementById('otpInputs');
        if (!container) return;
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 600);
    }

    // ── Alert helper ──────────────────────────────────────
    function showAlert(container, message, type) {
        if (!container) return;
        container.innerHTML = `
            <div class="alert alert-${type}" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>`;
        setTimeout(() => {
            const a = container.querySelector('.alert');
            if (a) a.remove();
        }, 6000);
    }

    // ── Loading state helper ──────────────────────────────
    function setLoading(btn, isLoading) {
        if (!btn) return;
        btn.disabled = isLoading;
        btn.classList.toggle('loading', isLoading);
        if (!isLoading) btn.textContent = btn.dataset.originalText || btn.textContent;
        else {
            if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
        }
    }

    // ══════════════════════════════════════════════════════
    // ADMIN FORGOT PASSWORD FLOW
    // Uses existing TOTP / authenticator app for identity
    // ══════════════════════════════════════════════════════
    injectAdminFpModal();

    let afpStep       = 'verify';   // 'verify' | 'reset' | 'success'
    let afpResetToken = '';
    let afpEmail      = '';

    // Attach listener to "Forgot Password?" link
    const forgotPwLink = document.querySelector('.forgot-password-link');
    if (forgotPwLink) {
        forgotPwLink.addEventListener('click', function (e) {
            e.preventDefault();
            afpStep = 'verify';
            afpEmail = (adminEmailInput && adminEmailInput.value.trim()) || '';
            renderAfpStep();
            document.getElementById('afpModal').style.display = 'flex';
            setTimeout(() => {
                const el = document.getElementById('afpAdminEmail');
                if (el) el.focus();
            }, 100);
        });
    }

    function closeAfpModal() {
        const modal = document.getElementById('afpModal');
        if (modal) modal.style.display = 'none';
    }

    document.addEventListener('click', function (e) {
        const modal = document.getElementById('afpModal');
        if (modal && e.target === modal) closeAfpModal();
    });

    function renderAfpStep() {
        const body = document.getElementById('afpModalBody');
        if (!body) return;
        clearAfpAlert();

        if (afpStep === 'verify') {
            body.innerHTML = `
                <p class="afp-desc">
                    Prove your identity using your authenticator app (Google Authenticator, Authy, etc.).<br>
                    Enter your admin email and the current 6-digit TOTP code.
                </p>
                <div class="afp-info-box"><i class="fas fa-shield-alt"></i> 2FA verification is required to reset admin passwords.</div>

                <div class="afp-form-group">
                    <label for="afpAdminEmail"><i class="fas fa-envelope"></i> Admin Email</label>
                    <input type="email" id="afpAdminEmail" class="afp-input"
                           placeholder="admin@shipyard.pk" value="${escAfp(afpEmail)}">
                </div>

                <div class="afp-form-group">
                    <label><i class="fas fa-mobile-alt"></i> Authenticator Code</label>
                    <div class="afp-otp-inputs" id="afpOtpInputs">
                        ${[1,2,3,4,5,6].map(i => `<input class="afp-otp-digit" type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" aria-label="Digit ${i}">`).join('')}
                    </div>
                    <input type="hidden" id="afpOtpHidden" value="">
                    <small class="afp-hint">Open your authenticator app and enter the current 6-digit code.</small>
                </div>

                <button class="afp-btn-primary" id="afpVerifyIdentityBtn">
                    <i class="fas fa-shield-check"></i> Verify Identity
                </button>`;
            initAfpOtpDigits('afpOtpInputs', 'afpOtpHidden');
            document.getElementById('afpVerifyIdentityBtn').addEventListener('click', handleAfpVerifyIdentity);
        }
        else if (afpStep === 'reset') {
            body.innerHTML = `
                <div class="afp-verified-badge"><i class="fas fa-check-circle"></i> Identity Verified</div>
                <p class="afp-desc">Enter your new admin password. You have 5 minutes to complete this step.</p>

                <div class="afp-form-group">
                    <label for="afpNewPw"><i class="fas fa-lock"></i> New Password</label>
                    <div class="afp-pw-wrap">
                        <input type="password" id="afpNewPw" class="afp-input" placeholder="Min 8 chars, 1 uppercase, 1 number">
                        <button type="button" class="afp-pw-toggle" id="afpPwToggle1" tabindex="-1"><i class="fas fa-eye-slash"></i></button>
                    </div>
                </div>
                <div class="afp-form-group">
                    <label for="afpConfPw"><i class="fas fa-lock"></i> Confirm Password</label>
                    <div class="afp-pw-wrap">
                        <input type="password" id="afpConfPw" class="afp-input" placeholder="Repeat your new password">
                        <button type="button" class="afp-pw-toggle" id="afpPwToggle2" tabindex="-1"><i class="fas fa-eye-slash"></i></button>
                    </div>
                </div>

                <div id="afpCountdownRow" class="afp-countdown-row">
                    <i class="fas fa-clock"></i> Time remaining: <strong id="afpCountdown">5:00</strong>
                </div>

                <button class="afp-btn-primary" id="afpResetPwBtn">
                    <i class="fas fa-key"></i> Reset Password
                </button>`;
            initAfpPwToggle('afpPwToggle1', 'afpNewPw');
            initAfpPwToggle('afpPwToggle2', 'afpConfPw');
            document.getElementById('afpResetPwBtn').addEventListener('click', handleAfpResetPassword);
            startAfpCountdown(300);
        }
        else if (afpStep === 'success') {
            body.innerHTML = `
                <div class="afp-success">
                    <i class="fas fa-check-circle afp-success-icon"></i>
                    <h3>Password Reset!</h3>
                    <p>Your admin password has been updated. Please log in with your new credentials.</p>
                    <button class="afp-btn-primary" id="afpGoLoginBtn"><i class="fas fa-sign-in-alt"></i> Back to Login</button>
                </div>`;
            document.getElementById('afpGoLoginBtn').addEventListener('click', () => {
                closeAfpModal();
                stepCredentials.style.display = 'block';
                step2fa.style.display = 'none';
            });
        }
    }

    async function handleAfpVerifyIdentity() {
        const email   = (document.getElementById('afpAdminEmail') || {}).value || '';
        const totpCode = (document.getElementById('afpOtpHidden') || {}).value || '';

        if (!email.trim()) { showAfpAlert('Please enter your admin email.', 'error'); return; }
        if (!/^[^\s@]+@shipyard\.pk$/i.test(email.trim())) { showAfpAlert('Must be a @shipyard.pk address.', 'error'); return; }
        if (totpCode.length !== 6) { showAfpAlert('Please enter the complete 6-digit authenticator code.', 'error'); return; }

        afpEmail = email.trim().toLowerCase();
        const btn = document.getElementById('afpVerifyIdentityBtn');
        setAfpLoading(btn, true);

        try {
            const fd = new FormData();
            fd.append('action', 'verify_identity');
            fd.append('adminEmail', afpEmail);
            fd.append('totp_code', totpCode);
            const resp = await fetch('../PHP/admin_forgot_password.php', { method: 'POST', body: fd });
            const data = await resp.json();

            if (data.success && data.allow_reset) {
                afpResetToken = data.reset_token || '';
                afpStep = 'reset';
                renderAfpStep();
                showAfpAlert('Identity confirmed. Please set your new password.', 'success');
            } else {
                showAfpAlert(data.message || 'Verification failed. Check your email and authenticator code.', 'error');
                // Shake OTP inputs
                const otpCont = document.getElementById('afpOtpInputs');
                if (otpCont) {
                    otpCont.classList.add('afp-shake');
                    setTimeout(() => otpCont.classList.remove('afp-shake'), 600);
                    otpCont.querySelectorAll('.afp-otp-digit').forEach(d => d.value = '');
                    document.getElementById('afpOtpHidden').value = '';
                    otpCont.querySelector('.afp-otp-digit').focus();
                }
            }
        } catch (err) {
            showAfpAlert('Network error. Please check your connection.', 'error');
        } finally {
            setAfpLoading(btn, false);
        }
    }

    let afpCountdownInterval = null;

    function startAfpCountdown(seconds) {
        if (afpCountdownInterval) clearInterval(afpCountdownInterval);
        let remaining = seconds;
        const el = document.getElementById('afpCountdown');
        afpCountdownInterval = setInterval(() => {
            remaining--;
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (el) el.textContent = m + ':' + String(s).padStart(2, '0');
            if (remaining <= 0) {
                clearInterval(afpCountdownInterval);
                afpStep = 'verify';
                renderAfpStep();
                showAfpAlert('Reset window expired. Please verify your identity again.', 'error');
            }
        }, 1000);
    }

    async function handleAfpResetPassword() {
        const newPw  = (document.getElementById('afpNewPw') || {}).value || '';
        const confPw = (document.getElementById('afpConfPw') || {}).value || '';

        if (!newPw || newPw.length < 8) { showAfpAlert('Password must be at least 8 characters.', 'error'); return; }
        if (!/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) { showAfpAlert('Password must have at least one uppercase letter and one number.', 'error'); return; }
        if (newPw !== confPw) { showAfpAlert('Passwords do not match.', 'error'); return; }

        const btn = document.getElementById('afpResetPwBtn');
        setAfpLoading(btn, true);
        try {
            const fd = new FormData();
            fd.append('action', 'reset_password');
            fd.append('reset_token', afpResetToken);
            fd.append('new_password', newPw);
            fd.append('confirm_password', confPw);
            const resp = await fetch('../PHP/admin_forgot_password.php', { method: 'POST', body: fd });
            const data = await resp.json();

            if (data.success) {
                if (afpCountdownInterval) clearInterval(afpCountdownInterval);
                afpStep = 'success';
                renderAfpStep();
            } else {
                showAfpAlert(data.message || 'Password reset failed. Please try again.', 'error');
            }
        } catch (err) {
            showAfpAlert('Network error. Please check your connection.', 'error');
        } finally {
            setAfpLoading(btn, false);
        }
    }

    function initAfpOtpDigits(containerId, hiddenId) {
        const container = document.getElementById(containerId);
        const hidden    = document.getElementById(hiddenId);
        if (!container || !hidden) return;
        const digits = container.querySelectorAll('.afp-otp-digit');
        digits.forEach((input, idx) => {
            input.addEventListener('input', function () {
                this.value = this.value.replace(/\D/, '').slice(-1);
                hidden.value = [...digits].map(d => d.value).join('');
                if (this.value && idx < digits.length - 1) digits[idx + 1].focus();
            });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace' && !this.value && idx > 0) digits[idx - 1].focus();
            });
            input.addEventListener('paste', function (e) {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
                [...pasted.slice(0, 6)].forEach((ch, i) => { if (digits[i]) digits[i].value = ch; });
                hidden.value = [...digits].map(d => d.value).join('');
                digits[Math.min(pasted.length, digits.length - 1)].focus();
            });
        });
        setTimeout(() => { if (digits[0]) digits[0].focus(); }, 100);
    }

    function initAfpPwToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const inp = document.getElementById(inputId);
        if (!btn || !inp) return;
        btn.addEventListener('click', function () {
            const show = inp.type === 'password';
            inp.type = show ? 'text' : 'password';
            this.querySelector('i').className = show ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }

    function showAfpAlert(msg, type) {
        const el = document.getElementById('afpAlertContainer');
        if (!el) return;
        const colors = { error: '#e74c3c', success: '#27ae60', info: '#3498db', warning: '#f39c12' };
        const c = colors[type] || '#555';
        el.innerHTML = `<div style="background:${c}22;border-left:3px solid ${c};color:#e0eaf4;padding:.6rem .8rem;border-radius:6px;font-size:.82rem;margin-bottom:.75rem;line-height:1.5;">${msg}</div>`;
    }

    function clearAfpAlert() {
        const el = document.getElementById('afpAlertContainer');
        if (el) el.innerHTML = '';
    }

    function setAfpLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        if (loading) { btn._orig = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...'; }
        else if (btn._orig) btn.innerHTML = btn._orig;
    }

    function escAfp(s) {
        return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function injectAdminFpModal() {
        const modal = document.createElement('div');
        modal.id = 'afpModal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:1rem;';
        modal.innerHTML = `
            <div id="afpModalCard" style="background:linear-gradient(135deg,#0a1f35 0%,#0e3a5c 100%);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:2rem;width:100%;max-width:440px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.6);color:#e0eaf4;font-family:inherit;">
                <button id="afpModalClose" style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:32px;height:32px;color:#aac;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Close">&times;</button>
                <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:.3rem;color:#7ec8f8;"><i class="fas fa-shield-alt"></i> Admin Forgot Password</h3>
                <hr style="border-color:rgba(255,255,255,0.1);margin:.75rem 0;">
                <div id="afpAlertContainer"></div>
                <div id="afpModalBody"></div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('afpModalClose').addEventListener('click', closeAfpModal);

        const style = document.createElement('style');
        style.textContent = `
            #afpModal * { box-sizing:border-box; }
            .afp-desc { font-size:.84rem; color:#aac; margin-bottom:.85rem; line-height:1.5; }
            .afp-info-box { background:rgba(14,76,124,.3); border:1px solid rgba(126,200,248,.2); border-radius:8px; padding:.6rem .8rem; font-size:.78rem; color:#7ec8f8; margin-bottom:.85rem; display:flex; align-items:center; gap:.5rem; }
            .afp-form-group { margin-bottom:.85rem; }
            .afp-form-group label { display:block; font-size:.78rem; font-weight:600; color:#7ec8f8; margin-bottom:.3rem; }
            .afp-hint { font-size:.73rem; color:#556; margin-top:.3rem; display:block; }
            .afp-input { width:100%; padding:.6rem .8rem; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.15); border-radius:8px; color:#e0eaf4; font-size:.88rem; outline:none; transition:border-color .2s; }
            .afp-input:focus { border-color:#7ec8f8; background:rgba(255,255,255,.1); }
            .afp-pw-wrap { position:relative; }
            .afp-pw-wrap .afp-input { padding-right:2.5rem; }
            .afp-pw-toggle { position:absolute; right:.6rem; top:50%; transform:translateY(-50%); background:none; border:none; color:#7ec8f8; cursor:pointer; font-size:.9rem; padding:.2rem; }
            .afp-otp-inputs { display:flex; gap:.4rem; justify-content:center; margin:.4rem 0; }
            .afp-otp-digit { width:42px; height:48px; text-align:center; font-size:1.2rem; font-weight:700; background:rgba(255,255,255,.08); border:2px solid rgba(255,255,255,.2); border-radius:8px; color:#fff; outline:none; transition:border-color .2s; }
            .afp-otp-digit:focus { border-color:#7ec8f8; background:rgba(126,200,248,.1); }
            .afp-btn-primary { width:100%; padding:.75rem; border:none; border-radius:8px; background:linear-gradient(135deg,#1a6db5,#0e3a5c); color:#fff; font-weight:600; font-size:.9rem; cursor:pointer; transition:opacity .2s; margin-top:.5rem; }
            .afp-btn-primary:hover { opacity:.9; }
            .afp-btn-primary:disabled { opacity:.5; cursor:not-allowed; }
            .afp-verified-badge { background:rgba(39,174,96,.15); border:1px solid rgba(39,174,96,.3); color:#7dffb3; border-radius:8px; padding:.5rem .8rem; font-size:.8rem; font-weight:600; margin-bottom:.85rem; display:flex; align-items:center; gap:.4rem; }
            .afp-countdown-row { text-align:center; font-size:.8rem; color:#aac; margin:.5rem 0; }
            .afp-success { text-align:center; padding:1rem 0; }
            .afp-success-icon { font-size:3rem; color:#27ae60; display:block; margin-bottom:.75rem; }
            .afp-success h3 { color:#7ec8f8; margin-bottom:.5rem; }
            .afp-success p { color:#aac; font-size:.85rem; margin-bottom:1rem; }
            @keyframes afp-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
            .afp-shake { animation: afp-shake .5s ease; }
        `;
        document.head.appendChild(style);
    }
});
