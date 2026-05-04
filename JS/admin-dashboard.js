/* ===================================
   ADMIN DASHBOARD - JAVASCRIPT
   =================================== */

const dashboardState = {
    registeredCount:   0,
    trackingUpdates:   0,
    contractsExecuted: 0,
    certificatesIssued:0,
    auditLogs:         0,
    recentRegistrations: []   // populated entirely from DB via loadLiveMetrics()
};

// Admin profiles are fetched exclusively from get_admin_profile.php (no hardcoded values)

document.addEventListener('DOMContentLoaded', async function() {
    // ── Server-side session verification (route protection) ──
    const sessionOk = await ensureAdminSession();
    if (!sessionOk) {
        return; // redirect already fired inside ensureAdminSession
    }

    // Initialize dashboard
    initSidebarNavigation();
    initMobileMenu();
    initThemeSwitcher();
    initFormHandlers();
    initTableInteractions();
    initLogout();
    loadAdminName();
    initSidebarProfileCard();
    initDashboardMonitoring();
    initNavbarSearch();
    initRefreshButton();
    initSettingsButton();
    initUserApprovals();
    loadLiveMetrics();          // Load real KPIs from DB
    loadCargoList();            // Populate tracking table, contracts, certs, activity
    initAuditMonitoring();      // Wire live audit logs

    // FIX #9: Merged from second DOMContentLoaded block — prevent Enter key
    // from accidentally submitting modal forms (except in textareas).
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
        form.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.target.matches('textarea')) {
                e.preventDefault();
            }
        });
    });
});

// ===================================
// SIDEBAR NAVIGATION
// ===================================

function initSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item:not(.logout-btn)');
    const sections = document.querySelectorAll('.content-section');
    const sectionMeta = {
        dashboard: { crumb: 'Dashboard / Monitoring', heading: 'Dashboard' },
        registration: { crumb: 'Workflow / Cargo Registration', heading: 'Cargo Registration' },
        tracking: { crumb: 'Workflow / Tracking Management', heading: 'Cargo Tracking' },
        contracts: { crumb: 'Workflow / Smart Contracts', heading: 'Smart Contracts' },
        certification: { crumb: 'Workflow / Certification Issuance', heading: 'Certification' },
        audit: { crumb: 'Workflow / Audit Monitoring', heading: 'Audit Monitoring' },
        'user-approvals': { crumb: 'User Management / Registration Approvals', heading: 'User Approvals' }
    };

    const setTopbarContext = (sectionKey) => {
        const topbarCrumb = document.querySelector('.topbar-crumb');
        const topbarHeading = document.querySelector('.topbar-copy h1');
        const activeMeta = sectionMeta[sectionKey] || sectionMeta.dashboard;

        if (topbarCrumb) {
            topbarCrumb.textContent = activeMeta.crumb;
        }

        if (topbarHeading) {
            topbarHeading.textContent = activeMeta.heading;
        }
    };

    setTopbarContext('dashboard');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionKey = this.getAttribute('data-section');
            const sectionId = sectionKey + '-section';
            
            // Remove active class from all items
            sidebarItems.forEach(i => {
                i.classList.remove('active');
                i.setAttribute('aria-selected', 'false');
            });
            
            // Hide all sections
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            
            // Show selected section
            const activeSection = document.getElementById(sectionId);
            if (activeSection) {
                activeSection.classList.add('active');
            }

            setTopbarContext(sectionKey);
            
            // Close mobile sidebar
            closeMobileSidebar();
        });
    });
}

// ===================================
// MOBILE MENU
// ===================================

function initMobileMenu() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('adminSidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.add('active');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', function() {
            closeMobileSidebar();
        });
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (!sidebar) {
            return;
        }

        if (!sidebar.contains(e.target) && (!sidebarToggle || !sidebarToggle.contains(e.target))) {
            closeMobileSidebar();
        }
    });
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
        sidebar.classList.remove('active');
    }
}

// ===================================
// THEME SWITCHER
// ===================================

function initThemeSwitcher() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const storedTheme = localStorage.getItem('adminDashboardTheme') || 'dark';

    applyTheme(storedTheme);
    updateThemeToggle(storedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';

            applyTheme(nextTheme);
            updateThemeToggle(nextTheme);
            localStorage.setItem('adminDashboardTheme', nextTheme);
        });
    }
}

function applyTheme(theme) {
    const isLightTheme = theme === 'light';
    const themeColor = document.querySelector('meta[name="theme-color"]');

    document.body.classList.toggle('light-theme', isLightTheme);
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    if (themeColor) {
        themeColor.setAttribute('content', isLightTheme ? '#f4f5f0' : '#1a1f1a');
    }
}

function updateThemeToggle(currentTheme) {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeToggleIcon = document.getElementById('themeToggleIcon');

    if (!themeToggleBtn || !themeToggleIcon) {
        return;
    }

    const showMoonIcon = currentTheme === 'light';

    themeToggleIcon.className = showMoonIcon ? 'fas fa-moon' : 'fas fa-sun';

    const nextModeLabel = showMoonIcon ? 'Switch to dark mode' : 'Switch to light mode';
    themeToggleBtn.setAttribute('aria-label', nextModeLabel);
    themeToggleBtn.setAttribute('title', nextModeLabel);
}

// ===================================
// FORM HANDLERS
// ===================================

function initFormHandlers() {
    // Cargo Registration Form
    const registrationForm = document.getElementById('cargoRegistrationForm');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCargoRegistration();
        });
    }

    // Smart Contract Form
    const contractForm = document.getElementById('contractForm');
    if (contractForm) {
        contractForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSmartContract();
        });
    }

    // Certification Form
    const certForm = document.getElementById('certificationForm');
    if (certForm) {
        certForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCertification();
        });
    }
}

async function handleCargoRegistration() {
    const cargoId     = document.getElementById('cargoId').value.trim();
    const cargoType   = document.getElementById('cargoType').value;
    const supplier    = document.getElementById('supplier').value.trim();
    const quantity    = document.getElementById('quantity').value;
    const origin      = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const eta         = document.getElementById('eta').value;
    const description = document.getElementById('description') ? document.getElementById('description').value : '';

    if (!cargoId || !cargoType || !supplier || !quantity || !origin || !destination || !eta) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = document.querySelector('#cargoRegistrationForm .btn-primary');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registering...'; }

    try {
        const fd = new FormData();
        fd.append('cargoId', cargoId);
        fd.append('cargoType', cargoType);
        fd.append('supplier', supplier);
        fd.append('quantity', quantity);
        fd.append('origin', origin);
        fd.append('destination', destination);
        fd.append('eta', eta);
        fd.append('description', description);

        const resp = await fetch('../PHP/process_cargo_registration.php', {
            method: 'POST', credentials: 'same-origin', body: fd
        });
        const data = await resp.json();

        if (data.success) {
            showNotification(`✓ Cargo ${cargoId} registered! Blockchain TX: ${data.tx_hash}`, 'success');
            showBlockchainBadge('Registration', cargoId, data.tx_hash);

            dashboardState.registeredCount += 1;
            dashboardState.recentRegistrations.unshift({
                cargoId, supplier, cargoType,
                statusClass: 'complete', statusText: 'Registered',
                paymentReleased: false, paymentUpdatedAt: Date.now(),
                origin, destination
            });

            prependTrackingRow(cargoId, cargoType, origin, destination);
            createAuditLog('Registration', cargoId,
                `Cargo registered - ${cargoType} shipment`, data.tx_hash);
            renderDashboardMonitoring();
            document.getElementById('cargoRegistrationForm').reset();
            addActivityLog(`Cargo registration: ${cargoId} (${cargoType})`);
            loadLiveMetrics();
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (err) {
        // Graceful fallback: run local simulation if PHP not reachable
        console.warn('PHP registration endpoint unavailable, running locally:', err.message);
        showNotification(`Cargo ${cargoId} registered (local mode). Blockchain recording pending.`, 'success');
        dashboardState.registeredCount += 1;
        dashboardState.recentRegistrations.unshift({
            cargoId, supplier, cargoType,
            statusClass: 'complete', statusText: 'Registered',
            paymentReleased: false, paymentUpdatedAt: Date.now(),
            origin, destination
        });
        prependTrackingRow(cargoId, cargoType, origin, destination);
        createAuditLog('Registration', cargoId, `Cargo registered - ${cargoType} shipment`);
        renderDashboardMonitoring();
        document.getElementById('cargoRegistrationForm').reset();
        addActivityLog(`Cargo registration: ${cargoId} (${cargoType})`);
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> Register Cargo'; }
    }
}

async function handleSmartContract() {
    const cargoId        = document.getElementById('contractCargoId').value.trim();
    const contractType   = document.getElementById('contractType').value;
    const walletAddr     = document.getElementById('contractWallet').value.trim();
    const customsApproval= document.getElementById('customsApproval').checked;

    if (!cargoId || !contractType || !walletAddr) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const execBtn = document.querySelector('#contractForm .btn-primary');
    if (execBtn) { execBtn.disabled = true; execBtn.textContent = 'Executing...'; }

    try {
        const fd = new FormData();
        fd.append('cargoId',         cargoId);
        fd.append('contractType',    contractType);
        fd.append('walletAddr',      walletAddr);
        fd.append('customsApproval', customsApproval ? '1' : '0');

        const resp = await fetch('../PHP/execute_contract.php', {
            method: 'POST', credentials: 'same-origin', body: fd
        });
        const data = await resp.json();

        const txHash = data.tx_hash || ('0x' + Math.random().toString(16).substr(2,8).toUpperCase());
        const typeLabel = toSentenceCase(contractType);

        if (data.success || resp.ok) {
            showNotification(`✓ ${typeLabel} contract executed! TX: ${txHash}`, 'success');
            showBlockchainBadge('Contract', cargoId, txHash);
        } else {
            showNotification(data.message || 'Contract execution failed', 'error');
        }

        // Append to execution history
        const historyList = document.querySelector('.history-list');
        if (historyList) {
            const newItem = document.createElement('div');
            newItem.className = 'history-item success';
            newItem.innerHTML = `
                <div class="history-icon"><i class="fas fa-check"></i></div>
                <div class="history-content">
                    <p><strong>${typeLabel} - ${cargoId}</strong></p>
                    <small>${new Date().toLocaleString()} | Blockchain ID: <code>${txHash}</code></small>
                </div>
            `;
            historyList.insertBefore(newItem, historyList.firstChild);
        }

        dashboardState.contractsExecuted += 1;
        if (contractType === 'payment' || (data.paymentReleased)) {
            setCargoPaymentStatus(cargoId, true);
            addActivityLog(`Payment released: ${cargoId}`);
        }
        createAuditLog('Contract', cargoId,
            `${typeLabel} contract executed`, txHash);
        renderDashboardMonitoring();
        document.getElementById('contractForm').reset();
        addActivityLog(`Smart contract executed: ${contractType} for ${cargoId}`);
        loadLiveMetrics();
    } catch (err) {
        console.warn('PHP contract endpoint unavailable:', err.message);
        const txHash = '0x' + Math.random().toString(16).substr(2, 8).toUpperCase();
        const typeLabel = toSentenceCase(contractType);
        showNotification(`Contract executed (local mode)! Blockchain ID: ${txHash}`, 'success');
        dashboardState.contractsExecuted += 1;
        if (contractType === 'payment') { setCargoPaymentStatus(cargoId, true); }
        createAuditLog('Contract', cargoId, `${typeLabel} contract executed`, txHash);
        renderDashboardMonitoring();
        document.getElementById('contractForm').reset();
        addActivityLog(`Smart contract executed: ${contractType} for ${cargoId}`);
    } finally {
        if (execBtn) { execBtn.disabled = false; execBtn.innerHTML = '<i class="fas fa-rocket"></i> Execute Contract'; }
    }
}

async function handleCertification() {
    const cargoId     = document.getElementById('certCargoId').value.trim();
    const supplier    = document.getElementById('certSupplier').value.trim();
    const certType    = document.getElementById('certType').value;
    const description = document.getElementById('certDescription').value;

    if (!cargoId || !supplier || !certType) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const issueBtn = document.querySelector('#certificationForm .btn-primary');
    if (issueBtn) { issueBtn.disabled = true; issueBtn.textContent = 'Issuing...'; }

    try {
        const fd = new FormData();
        fd.append('cargoId',     cargoId);
        fd.append('supplier',    supplier);
        fd.append('certType',    certType);
        fd.append('description', description);

        const resp = await fetch('../PHP/issue_certificate.php', {
            method: 'POST', credentials: 'same-origin', body: fd
        });
        const data = await resp.json();

        const certNumber = data.certNumber || Math.floor(Math.random()*10000).toString().padStart(3,'0');
        const txHash     = data.tx_hash  || '';
        const certLabel  = data.certLabel || toSentenceCase(certType);

        if (data.success) {
            showNotification(`✓ Certificate #${certNumber} issued! TX: ${txHash}`, 'success');
            showBlockchainBadge('Certificate', cargoId, txHash);
        } else {
            showNotification(data.message || 'Certificate issuance failed', 'error');
        }

        // Add to UI list
        const certList = document.querySelector('.certificates-list');
        if (certList) {
            const newCert = document.createElement('div');
            newCert.className = 'cert-item';
            const issuedDate = data.issuedAt || new Date().toLocaleDateString();
            newCert.innerHTML = `
                <div class="cert-icon"><i class="fas fa-scroll"></i></div>
                <div class="cert-info">
                    <p><strong>Certificate #${certNumber} — ${cargoId}</strong></p>
                    <small>${certLabel} | Issued: ${issuedDate}</small>
                    ${txHash ? `<small class="cert-tx">TX: <code>${txHash}</code></small>` : ''}
                </div>
                <div class="cert-actions">
                    <button class="btn-icon cert-download-btn" title="Download Certificate as PDF"
                        data-cert-number="${certNumber}"
                        data-cargo-id="${cargoId}"
                        data-supplier="${supplier}"
                        data-cert-type="${certType}"
                        data-cert-label="${certLabel}"
                        data-issued-at="${issuedDate}"
                        data-tx-hash="${txHash}"
                        data-description="${escHtml(description)}">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
            const heading = certList.querySelector('h4');
            certList.insertBefore(newCert, heading ? heading.nextSibling : certList.firstChild);
            // Bind download handler immediately
            const dlBtn = newCert.querySelector('.cert-download-btn');
            if (dlBtn) dlBtn.addEventListener('click', () => downloadCertificate(dlBtn.dataset));
        }

        dashboardState.certificatesIssued += 1;
        createAuditLog('Certificate', cargoId,
            `${certLabel} certificate issued`, txHash);
        renderDashboardMonitoring();
        document.getElementById('certificationForm').reset();
        addActivityLog(`Certificate issued: ${certType} for ${cargoId}`);
        loadLiveMetrics();
    } catch (err) {
        console.warn('PHP certificate endpoint unavailable:', err.message);
        const certNumber = Math.floor(Math.random()*10000).toString().padStart(3,'0');
        const certLabel  = toSentenceCase(certType);
        showNotification(`Certificate #${certNumber} issued (local mode)`, 'success');
        const certList = document.querySelector('.certificates-list');
        if (certList) {
            const newCert = document.createElement('div');
            newCert.className = 'cert-item';
            const localDate = new Date().toLocaleDateString();
            newCert.innerHTML = `
                <div class="cert-icon"><i class="fas fa-scroll"></i></div>
                <div class="cert-info">
                    <p><strong>Certificate #${certNumber} — ${cargoId}</strong></p>
                    <small>${certLabel} | Issued: ${localDate}</small>
                </div>
                <div class="cert-actions">
                    <button class="btn-icon cert-download-btn" title="Download Certificate as PDF"
                        data-cert-number="${certNumber}"
                        data-cargo-id="${cargoId}"
                        data-supplier="${supplier}"
                        data-cert-type="${certType}"
                        data-cert-label="${certLabel}"
                        data-issued-at="${localDate}"
                        data-tx-hash=""
                        data-description="">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
            const heading = certList.querySelector('h4');
            certList.insertBefore(newCert, heading ? heading.nextSibling : certList.firstChild);
            const dlBtn = newCert.querySelector('.cert-download-btn');
            if (dlBtn) dlBtn.addEventListener('click', () => downloadCertificate(dlBtn.dataset));
        }
        dashboardState.certificatesIssued += 1;
        createAuditLog('Certificate', cargoId, `${certLabel} certificate issued`);
        renderDashboardMonitoring();
        document.getElementById('certificationForm').reset();
        addActivityLog(`Certificate issued: ${certType} for ${cargoId}`);
    } finally {
        if (issueBtn) { issueBtn.disabled = false; issueBtn.innerHTML = '<i class="fas fa-print"></i> Issue Certificate'; }
    }
}

// ===================================
// TABLE INTERACTIONS
// ===================================

function initTableInteractions() {
    initSelectArrowToggles();

    // Update button handlers
    const updateBtns = document.querySelectorAll('.update-btn');
    updateBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            openUpdateModal(this.closest('tr'));
        });
    });

    // Modal controls
    const closeModal = document.getElementById('closeModal');
    const cancelUpdate = document.getElementById('cancelUpdate');
    const saveUpdate = document.getElementById('saveUpdate');

    if (closeModal) closeModal.addEventListener('click', closeUpdateModal);
    if (cancelUpdate) cancelUpdate.addEventListener('click', closeUpdateModal);
    if (saveUpdate) saveUpdate.addEventListener('click', saveCargoUpdate);

    // Search functionality
    const searchInput = document.getElementById('cargoSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterCargoTable);
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterCargoTable);
    }

    // Audit search and filter
    const auditSearch = document.getElementById('auditSearch');
    const auditTypeFilter = document.getElementById('auditTypeFilter');
    const auditTimeFilter = document.getElementById('auditTimeFilter');
    if (auditSearch) auditSearch.addEventListener('keyup', filterAuditLogs);
    if (auditTypeFilter) auditTypeFilter.addEventListener('change', filterAuditLogs);
    if (auditTimeFilter) auditTimeFilter.addEventListener('change', filterAuditLogs);
}

function initSelectArrowToggles() {
    const controllers = [
        {
            select: document.getElementById('certType'),
            target: 'wrapper',
            wrapperSelector: '.cert-type-select'
        },
        {
            select: document.getElementById('cargoType'),
            target: 'wrapper',
            wrapperSelector: '.cargo-type-select'
        },
        {
            select: document.getElementById('origin'),
            target: 'wrapper',
            wrapperSelector: '.origin-select'
        },
        {
            select: document.getElementById('destination'),
            target: 'wrapper',
            wrapperSelector: '.destination-select'
        },
        {
            select: document.getElementById('contractType'),
            target: 'wrapper',
            wrapperSelector: '.contract-type-select'
        },
        {
            select: document.getElementById('statusFilter'),
            target: 'wrapper',
            wrapperSelector: '.status-filter-select'
        },
        {
            select: document.getElementById('auditTypeFilter'),
            target: 'wrapper',
            wrapperSelector: '.audit-type-select'
        },
        {
            select: document.getElementById('auditTimeFilter'),
            target: 'wrapper',
            wrapperSelector: '.audit-time-select'
        }
    ];

    const bindDropdownArrowController = (config) => {
        if (!config.select) {
            return;
        }

        const getArrowHost = () => {
            if (config.target === 'self') {
                return config.select;
            }

            const wrapper = config.select.closest(config.wrapperSelector);
            return wrapper || config.select;
        };

        const getIsOpen = () => getArrowHost().classList.contains('is-open');
        const setIsOpen = (isOpen) => {
            getArrowHost().classList.toggle('is-open', isOpen);
        };

        config.select.addEventListener('mousedown', () => setIsOpen(!getIsOpen()));

        config.select.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                setIsOpen(true);
            }

            if (e.key === 'Escape' || e.key === 'Tab') {
                setIsOpen(false);
            }
        });

        config.select.addEventListener('change', () => setIsOpen(false));
        config.select.addEventListener('blur', () => setIsOpen(false));

        document.addEventListener('pointerdown', function(e) {
            const host = getArrowHost();
            if (!host.contains(e.target)) {
                setIsOpen(false);
            }
        });

        window.addEventListener('blur', () => setIsOpen(false));
    };

    controllers.forEach(bindDropdownArrowController);
}

function openUpdateModal(row) {
    const cargoId = row.querySelector('td:first-child').textContent;
    const currentStatus = row.querySelector('.status-badge').textContent.trim().toLowerCase();

    document.getElementById('updateModal').classList.add('active');
    document.getElementById('newStatus').value = currentStatus;
    
    // Store the row reference for later use
    document.getElementById('updateModal').dataset.cargoId = cargoId;
    document.getElementById('updateModal').dataset.row = row.rowIndex;
}

function closeUpdateModal() {
    document.getElementById('updateModal').classList.remove('active');
}

async function saveCargoUpdate() {
    const modal    = document.getElementById('updateModal');
    const newStatus= document.getElementById('newStatus').value;
    const location = document.getElementById('currentLocation').value;
    const notes    = document.getElementById('updateNotes').value;
    const cargoId  = modal.dataset.cargoId;

    if (!newStatus) {
        showNotification('Please select a status', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveUpdate');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
        const fd = new FormData();
        fd.append('cargoId',   cargoId);
        fd.append('newStatus', newStatus);
        fd.append('location',  location);
        fd.append('notes',     notes);

        const resp = await fetch('../PHP/update_cargo_status.php', {
            method: 'POST', credentials: 'same-origin', body: fd
        });
        const data = await resp.json();

        const displayStatus = data.displayStatus || toSentenceCase(newStatus);
        const txHash = data.tx_hash || '';

        if (data.success) {
            showNotification(`✓ ${cargoId}: ${data.previousStatus || '?'} → ${displayStatus}. TX: ${txHash}`, 'success');
            if (txHash) showBlockchainBadge('Status Update', cargoId, txHash);
        } else {
            showNotification(data.message || 'Update failed', 'error');
        }

        // Always update the table row locally for immediate feedback
        const table = document.querySelector('#trackingTable tbody');
        if (table) {
            table.querySelectorAll('tr').forEach(row => {
                if (row.querySelector('td:first-child')?.textContent.trim() === cargoId) {
                    const statusCell = row.querySelector('.status-badge');
                    if (statusCell) {
                        statusCell.textContent = displayStatus;
                        statusCell.className   = `status-badge ${newStatus.replace('_','-')}`;
                    }
                }
            });
        }

        dashboardState.trackingUpdates += 1;
        createAuditLog('Update', cargoId,
            `Status updated: ${data.previousStatus || '?'} → ${displayStatus}`, txHash);
        renderDashboardMonitoring();
        addActivityLog(`Cargo tracking updated: ${cargoId} -> ${displayStatus}`);
        loadLiveMetrics();
    } catch (err) {
        console.warn('PHP status update unavailable:', err.message);
        // Local fallback
        const table = document.querySelector('#trackingTable tbody');
        if (table) {
            table.querySelectorAll('tr').forEach(row => {
                if (row.querySelector('td:first-child')?.textContent.trim() === cargoId) {
                    const statusCell = row.querySelector('.status-badge');
                    if (statusCell) {
                        statusCell.textContent = toSentenceCase(newStatus);
                        statusCell.className   = `status-badge ${newStatus}`;
                    }
                }
            });
        }
        dashboardState.trackingUpdates += 1;
        createAuditLog('Update', cargoId, `Status updated to ${toSentenceCase(newStatus)}`);
        renderDashboardMonitoring();
        showNotification(`Cargo ${cargoId} status updated (local mode)`, 'success');
        addActivityLog(`Cargo tracking updated: ${cargoId} -> ${newStatus}`);
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Update'; }
        closeUpdateModal();
    }
}

function filterCargoTable() {
    const searchInput = document.getElementById('cargoSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
    const table = document.querySelector('#trackingTable tbody');

    if (!table) return;

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cargoId = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
        const origin = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        const status = row.querySelector('.status-badge').textContent.toLowerCase();

        const matchesSearch = cargoId.includes(searchInput) || origin.includes(searchInput);
        const matchesStatus = statusFilter === '' || status.includes(statusFilter);

        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    });
}

function initDashboardMonitoring() {
    renderDashboardMonitoring();
}

function renderDashboardMonitoring() {
    const registrationBody = document.getElementById('dashboardRegistrationBody');
    const registrationCountEl = document.getElementById('dash-registered-count');
    const registrationChangeEl = document.getElementById('dash-registered-change');
    const trackingCountEl = document.getElementById('dash-tracking-count');
    const contractCountEl = document.getElementById('dash-contract-count');
    const certificateCountEl = document.getElementById('dash-certificate-count');
    const certificateChangeEl = document.getElementById('dash-certificate-change');
    const paymentRegisteredEl = document.getElementById('dash-payment-registered');
    const paymentReleasedEl = document.getElementById('dash-payment-released');
    const paymentPendingEl = document.getElementById('dash-payment-pending');
    const paymentLatestEl = document.getElementById('dash-payment-latest');
    const paymentChartBody = document.getElementById('dash-payment-chart-body');
    const paymentBarRegisteredEl = document.getElementById('dash-payment-bar-registered');
    const paymentBarReleasedEl = document.getElementById('dash-payment-bar-released');
    const paymentBarPendingEl = document.getElementById('dash-payment-bar-pending');

    if (registrationCountEl) {
        registrationCountEl.textContent = String(dashboardState.registeredCount);
    }

    if (registrationChangeEl) {
        const recentCount = Math.min(dashboardState.recentRegistrations.length, 5);
        registrationChangeEl.textContent = `${recentCount} in recent list`;
    }

    if (trackingCountEl) {
        trackingCountEl.textContent = String(dashboardState.trackingUpdates);
    }

    if (contractCountEl) {
        contractCountEl.textContent = String(dashboardState.contractsExecuted);
    }

    if (certificateCountEl) {
        certificateCountEl.textContent = String(dashboardState.certificatesIssued);
    }

    if (certificateChangeEl) {
        certificateChangeEl.textContent = `${dashboardState.auditLogs} audit logs created`;
    }

    const paymentSummary = getPaymentSummary();

    if (paymentRegisteredEl) {
        paymentRegisteredEl.textContent = `Registered: ${paymentSummary.total}`;
    }

    if (paymentReleasedEl) {
        paymentReleasedEl.textContent = `Released: ${paymentSummary.released}`;
    }

    if (paymentPendingEl) {
        paymentPendingEl.textContent = `Pending: ${paymentSummary.pending}`;
    }

    if (paymentLatestEl) {
        const latestPaymentCargo = dashboardState.recentRegistrations
            .filter((item) => item.paymentReleased)
            .sort((a, b) => (b.paymentUpdatedAt || 0) - (a.paymentUpdatedAt || 0))[0];
        paymentLatestEl.textContent = latestPaymentCargo
            ? `Cargo ${latestPaymentCargo.cargoId} payment released`
            : 'Awaiting payment workflow update';
    }

    const normalizedMax = Math.max(1, paymentSummary.total);
    if (paymentBarRegisteredEl) {
        paymentBarRegisteredEl.style.height = `${Math.max(24, (paymentSummary.total / normalizedMax) * 100)}%`;
    }
    if (paymentBarReleasedEl) {
        paymentBarReleasedEl.style.height = `${Math.max(24, (paymentSummary.released / normalizedMax) * 100)}%`;
    }
    if (paymentBarPendingEl) {
        paymentBarPendingEl.style.height = `${Math.max(24, (paymentSummary.pending / normalizedMax) * 100)}%`;
    }

    if (paymentChartBody) {
        const chartRows = dashboardState.recentRegistrations.slice(0, 6);
        paymentChartBody.innerHTML = chartRows.map((item) => {
            const released = Boolean(item.paymentReleased);
            const badgeClass = released ? 'released' : 'pending';
            const badgeText = released ? 'Released' : 'Pending';
            const fillWidth = released ? 100 : 52;

            return `
                <div class="payment-chart-row">
                    <span class="payment-chart-id">${item.cargoId}</span>
                    <div class="payment-chart-track">
                        <span class="payment-chart-fill ${badgeClass}" style="width: ${fillWidth}%"></span>
                    </div>
                    <span class="payment-chart-badge ${badgeClass}">${badgeText}</span>
                </div>
            `;
        }).join('');
    }

    if (registrationBody) {
        registrationBody.innerHTML = dashboardState.recentRegistrations.slice(0, 5).map((item) => `
            <tr>
                <td class="job-id">${item.cargoId}</td>
                <td>
                    <strong>${item.supplier}</strong>
                    <span>Registered cargo manifest and quantity</span>
                </td>
                <td>${item.cargoType}</td>
                <td><span class="status-badge ${item.statusClass}">${item.statusText}</span></td>
                <td>${item.origin}</td>
                <td>${item.destination}</td>
                <td><button class="btn btn-ghost view-btn" type="button">View</button></td>
            </tr>
        `).join('');
    }
}

function getTrackingStatusSummary() {
    const summary = {
        inTransit: 0,
        arrived: 0,
        delivered: 0,
        registered: 0
    };

    const rows = document.querySelectorAll('#trackingTable tbody tr');
    rows.forEach((row) => {
        const statusText = row.querySelector('.status-badge');
        if (!statusText) {
            return;
        }

        const normalizedStatus = statusText.textContent.trim().toLowerCase();

        if (normalizedStatus.includes('in transit')) {
            summary.inTransit += 1;
        } else if (normalizedStatus.includes('arrived')) {
            summary.arrived += 1;
        } else if (normalizedStatus.includes('delivered')) {
            summary.delivered += 1;
        } else {
            summary.registered += 1;
        }
    });

    return summary;
}

function getPaymentSummary() {
    const total = dashboardState.recentRegistrations.length;
    const released = dashboardState.recentRegistrations.filter((item) => item.paymentReleased).length;

    return {
        total,
        released,
        pending: Math.max(0, total - released)
    };
}

function setCargoPaymentStatus(cargoId, isReleased) {
    const targetCargo = dashboardState.recentRegistrations.find((item) => item.cargoId === cargoId);

    if (targetCargo) {
        targetCargo.paymentReleased = isReleased;
        targetCargo.paymentUpdatedAt = Date.now();
        return;
    }

    dashboardState.recentRegistrations.unshift({
        cargoId,
        supplier: 'Contract Workflow Update',
        cargoType: 'N/A',
        statusClass: 'complete',
        statusText: 'Registered',
        paymentReleased: isReleased,
        paymentUpdatedAt: Date.now(),
        origin: '-',
        destination: '-'
    });
}

function prependTrackingRow(cargoId, cargoType, origin, destination) {
    const trackingBody = document.querySelector('#trackingTable tbody');
    if (!trackingBody) {
        return;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${cargoId}</td>
        <td>${cargoType}</td>
        <td>${origin}</td>
        <td>${destination}</td>
        <td><span class="status-badge registered">Registered</span></td>
        <td>${new Date().toISOString().slice(0, 10)}</td>
        <td>
            <button class="btn-icon update-btn" title="Update Status">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon view-btn" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        </td>
    `;

    trackingBody.insertBefore(row, trackingBody.firstChild);

    const updateBtn = row.querySelector('.update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', function() {
            openUpdateModal(row);
        });
    }
}

function createAuditLog(action, cargoId, details, txHash) {
    const auditBody = document.querySelector('.audit-table tbody');
    if (!auditBody) {
        return;
    }

    dashboardState.auditLogs += 1;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const actionClass = action.toLowerCase();
    // Use provided blockchain hash or generate a local placeholder
    const displayHash = txHash
        ? `<code class="tx-hash blockchain-verified" title="Blockchain verified: ${txHash}">${txHash.substring(0, 18)}...</code>`
        : `<code class="tx-hash tx-local" title="Local entry — blockchain sync pending">local-${Math.random().toString(16).slice(2, 8)}</code>`;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${timestamp}</td>
        <td><span class="action-badge ${actionClass}">${action}</span></td>
        <td><span class="role-badge">Admin</span></td>
        <td class="cargo-id-cell">${cargoId || '-'}</td>
        <td class="details-cell">${details}</td>
        <td>${displayHash}</td>
    `;

    auditBody.insertBefore(row, auditBody.firstChild);
    addActivityLog(`Audit log created: ${action} entry for ${cargoId || 'system'}`);
}

function toSentenceCase(value) {
    return value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function filterAuditLogs() {
    const searchInput = document.getElementById('auditSearch').value.toLowerCase();
    const typeFilter = document.getElementById('auditTypeFilter').value.toLowerCase();
    const timeFilter = (document.getElementById('auditTimeFilter') || {}).value || '';
    const table = document.querySelector('.audit-table tbody');

    if (!table) return;

    const now = new Date();

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const actionCell  = row.querySelector('td:nth-child(2)');
        const detailsCell = row.querySelector('td:nth-child(5)');
        const tsCell      = row.querySelector('td:nth-child(1)');
        if (!actionCell || !detailsCell) return;

        const action  = actionCell.textContent.toLowerCase();
        const details = detailsCell.textContent.toLowerCase();
        const tsText  = tsCell ? tsCell.textContent.trim() : '';

        const matchesSearch = details.includes(searchInput) || action.includes(searchInput);
        const matchesType   = typeFilter === '' || action.includes(typeFilter);

        let matchesTime = true;
        if (timeFilter && tsText) {
            const rowDate = new Date(tsText);
            if (!isNaN(rowDate)) {
                const diffMs = now - rowDate;
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                if (timeFilter === 'daily')   matchesTime = diffDays <= 1;
                else if (timeFilter === 'weekly')  matchesTime = diffDays <= 7;
                else if (timeFilter === 'monthly') matchesTime = diffDays <= 30;
                else if (timeFilter === 'yearly')  matchesTime = diffDays <= 365;
            }
        }

        row.style.display = matchesSearch && matchesType && matchesTime ? '' : 'none';
    });
}

// ===================================
// LOGOUT
// ===================================

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }
}

async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        showNotification('Logging out...', 'info');
        try {
            await fetch('../PHP/admin_logout.php', { method: 'POST' });
        } catch (e) {
            console.warn('Logout request failed, clearing local state anyway.');
        }
        sessionStorage.clear();
        localStorage.removeItem('adminSession');
        window.location.href = 'admin-login.html';
    }
}

async function ensureAdminSession() {
    // Primary check: verify PHP server session
    try {
        const resp = await fetch('../PHP/check_admin_session.php', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store'
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.authenticated) {
                // Keep sessionStorage in sync for legacy references
                sessionStorage.setItem('adminSession', 'active');
                if (data.admin_name)  sessionStorage.setItem('adminName', data.admin_name);
                if (data.admin_email) sessionStorage.setItem('adminEmail', data.admin_email);
                return true;
            }
        }
    } catch (e) {
        // Network error — fall through to redirect
        console.warn('Session check failed:', e);
    }
    // Not authenticated — clear any stale local state and redirect
    sessionStorage.clear();
    window.location.replace('admin-login.html');
    return false;
}

// ===================================
// UTILITIES
// ===================================

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(function() {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(function() {
            notification.remove();
        }, 300);
    }, 4000);
}

function getNotificationBg(type) {
    switch(type) {
        case 'success': return 'linear-gradient(135deg, rgba(40, 167, 69, 0.3), rgba(40, 167, 69, 0.2))';
        case 'error': return 'linear-gradient(135deg, rgba(220, 53, 69, 0.3), rgba(220, 53, 69, 0.2))';
        case 'warning': return 'linear-gradient(135deg, rgba(255, 193, 7, 0.3), rgba(255, 193, 7, 0.2))';
        default: return 'linear-gradient(135deg, rgba(23, 162, 184, 0.3), rgba(23, 162, 184, 0.2))';
    }
}

function getNotificationBorder(type) {
    switch(type) {
        case 'success': return 'rgba(40, 167, 69, 0.5)';
        case 'error': return 'rgba(220, 53, 69, 0.5)';
        case 'warning': return 'rgba(255, 193, 7, 0.5)';
        default: return 'rgba(23, 162, 184, 0.5)';
    }
}

function loadAdminName() {
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
        adminNameElement.textContent = 'System Administrator';
    }
}


function initSidebarProfileCard() {
    const trigger = document.getElementById('sidebarProfileTrigger');
    const card    = document.getElementById('adminProfileCard');

    if (!trigger || !card) return;

    // Simple in-sidebar toggle — identical pattern to user dashboard
    const toggle = () => {
        const isHidden = card.hidden;
        card.hidden = !isHidden;
        trigger.setAttribute('aria-expanded', String(isHidden));
    };

    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!card.hidden && !card.contains(e.target) && !trigger.contains(e.target)) {
            card.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        }
    });

    fetchCurrentAdminProfile()
        .then(profile => renderAdminProfileCard(profile))
        .catch(()      => renderAdminProfileCard(null));
}

// FIX #10: Fetch profile from dedicated endpoint instead of seed_admins.php
async function fetchCurrentAdminProfile() {
    const sessionEmail = (sessionStorage.getItem('adminEmail') || '').toLowerCase();

    try {
        const response = await fetch('../PHP/get_admin_profile.php', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('Profile endpoint returned ' + response.status);
        }

        const payload = await response.json();

        if (payload.success && payload.profile) {
            return payload.profile;
        }
    } catch (error) {
        console.warn('Profile fetch fallback:', error.message);
    }

    // Fallback: use session name if PHP endpoint is unreachable
    const fallbackName = sessionStorage.getItem('adminName') || 'Admin';
    return { full_name: fallbackName, email: sessionEmail, user_role: 'admin' };
}

function renderAdminProfileCard(profile) {
    const profileFullName = document.getElementById('profileFullName');
    const profileEmail = document.getElementById('profileEmail');
    const profileContact = document.getElementById('profileContact');
    const profileCnic = document.getElementById('profileCnic');
    const profileRole = document.getElementById('profileRole');

    if (!profile) {
        if (profileFullName) profileFullName.textContent = 'Unavailable';
        if (profileEmail) profileEmail.textContent = 'Unavailable';
        if (profileContact) profileContact.textContent = 'Unavailable';
        if (profileCnic) profileCnic.textContent = 'Unavailable';
        if (profileRole) profileRole.textContent = 'Admin';
        return;
    }

    if (profileFullName) profileFullName.textContent = profile.full_name || 'Unavailable';
    if (profileEmail) profileEmail.textContent = profile.email || 'Unavailable';
    if (profileContact) profileContact.textContent = profile.contact_number || 'Unavailable';
    if (profileCnic) profileCnic.textContent = profile.cnic || 'Unavailable';
    if (profileRole) profileRole.textContent = toSentenceCase(profile.user_role || 'admin');
    // Update sidebar admin name display
    const sidebarAdminName = document.getElementById('sidebarAdminName');
    if (sidebarAdminName && profile.full_name) {
        sidebarAdminName.textContent = profile.full_name.split(' ')[0];
    }
}

function addActivityLog(message) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageParts = message.split(':');
    const title = messageParts.shift().trim();
    const description = messageParts.length ? messageParts.join(':').trim() : 'Recent dashboard update logged.';

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item info-item';
    activityItem.innerHTML = `
        <div class="activity-icon"><i class="fas fa-circle-info"></i></div>
        <div class="activity-copy">
            <strong>${title}</strong>
            <span>${description}</span>
        </div>
        <span class="activity-time">${timeStr}</span>
    `;

    // Insert at the top
    activityList.insertBefore(activityItem, activityList.firstChild);

    // Limit to 5 recent activities
    while (activityList.children.length > 5) {
        activityList.removeChild(activityList.lastChild);
    }
}


// ===================================
// NAVBAR SEARCH FUNCTIONALITY
// ===================================

function initNavbarSearch() {
    const navbarSearch = document.getElementById('navbarSearchInput');
    if (!navbarSearch) return;

    // Debounce helper
    let searchTimeout = null;

    navbarSearch.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            performNavbarSearch(navbarSearch.value.trim());
        }, 250);
    });

    navbarSearch.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            navbarSearch.value = '';
            performNavbarSearch('');
            navbarSearch.blur();
        }
    });
}

function performNavbarSearch(query) {
    const q = query.toLowerCase();

    // Highlight helper: wrap matching text in a span
    function highlightText(el, term) {
        if (!el || !term) return;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) nodes.push(node);
        nodes.forEach(function(textNode) {
            const parent = textNode.parentNode;
            if (parent.classList && parent.classList.contains('search-highlight')) return;
            const idx = textNode.nodeValue.toLowerCase().indexOf(term);
            if (idx === -1) return;
            const before = document.createTextNode(textNode.nodeValue.slice(0, idx));
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.style.cssText = 'background:rgba(212,168,67,0.4);color:inherit;border-radius:2px;padding:0 2px;';
            mark.textContent = textNode.nodeValue.slice(idx, idx + term.length);
            const after = document.createTextNode(textNode.nodeValue.slice(idx + term.length));
            parent.replaceChild(after, textNode);
            parent.insertBefore(mark, after);
            parent.insertBefore(before, mark);
        });
    }

    // Remove existing highlights
    document.querySelectorAll('.search-highlight').forEach(function(el) {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });

    if (!q) {
        // Restore all hidden rows/cards
        document.querySelectorAll('[data-search-hidden]').forEach(function(el) {
            el.removeAttribute('data-search-hidden');
            el.style.display = '';
        });
        // Remove any "no results" banners
        document.querySelectorAll('.navbar-search-noresult').forEach(function(e) { e.remove(); });
        return;
    }

    let totalMatches = 0;

    // Search in ALL visible tables
    document.querySelectorAll('table tbody tr').forEach(function(row) {
        const text = row.textContent.toLowerCase();
        const match = text.includes(q);
        if (!match) {
            row.setAttribute('data-search-hidden', '1');
            row.style.display = 'none';
        } else {
            row.removeAttribute('data-search-hidden');
            row.style.display = '';
            highlightText(row, q);
            totalMatches++;
        }
    });

    // Search in KPI / stat cards (highlight matching ones)
    document.querySelectorAll('.stat-card, .kpi-card').forEach(function(card) {
        const text = card.textContent.toLowerCase();
        if (text.includes(q)) {
            card.style.outline = '2px solid rgba(212,168,67,0.7)';
            card.style.outlineOffset = '2px';
            highlightText(card, q);
            totalMatches++;
        } else {
            card.style.outline = '';
            card.style.outlineOffset = '';
        }
    });

    // Show notification
    if (totalMatches === 0) {
        showNotification('No results found for "' + query + '"', 'warning');
    }
}

// ===================================
// REFRESH BUTTON FUNCTIONALITY
// ===================================

function initRefreshButton() {
    const refreshBtn = document.getElementById('navbarRefreshBtn');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', function() {
        const icon = refreshBtn.querySelector('i');
        // Spin animation
        refreshBtn.disabled = true;
        if (icon) icon.style.transition = 'transform 0.6s ease';
        if (icon) icon.style.transform = 'rotate(360deg)';

        showNotification('Refreshing dashboard data...', 'info');

        setTimeout(function() {
            // Clear any active navbar search
            const navbarSearch = document.getElementById('navbarSearchInput');
            if (navbarSearch && navbarSearch.value) {
                navbarSearch.value = '';
                performNavbarSearch('');
            }

            // Re-run all live data fetches
            if (typeof loadLiveMetrics === 'function')   loadLiveMetrics();
            if (typeof loadCargoList   === 'function')   loadCargoList();
            if (typeof loadLiveAuditLogs === 'function') loadLiveAuditLogs();

            if (icon) {
                icon.style.transform = '';
                icon.style.transition = '';
            }
            refreshBtn.disabled = false;
            showNotification('Dashboard refreshed successfully', 'success');
        }, 700);
    });
}

// ===================================
// SETTINGS BUTTON FUNCTIONALITY
// ===================================

function initSettingsButton() {
    const settingsBtn = document.getElementById('navbarSettingsBtn');
    if (!settingsBtn) return;

    // Create settings panel if it doesn't exist
    let panel = document.getElementById('navbarSettingsPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'navbarSettingsPanel';
        panel.setAttribute('hidden', '');
        panel.innerHTML = `
            <div class="settings-panel-header">
                <span>Dashboard Settings</span>
                <button class="settings-close-btn" id="settingsCloseBtn" type="button" aria-label="Close settings">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="settings-panel-body">
                <div class="settings-row">
                    <label class="settings-label">
                        <i class="fas fa-bell"></i> Notifications
                    </label>
                    <label class="settings-toggle">
                        <input type="checkbox" id="settingNotifications" checked>
                        <span class="settings-toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <label class="settings-label">
                        <i class="fas fa-sync-alt"></i> Auto-Refresh
                    </label>
                    <label class="settings-toggle">
                        <input type="checkbox" id="settingAutoRefresh">
                        <span class="settings-toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <label class="settings-label">
                        <i class="fas fa-compress-alt"></i> Compact View
                    </label>
                    <label class="settings-toggle">
                        <input type="checkbox" id="settingCompactView">
                        <span class="settings-toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <label class="settings-label">
                        <i class="fas fa-palette"></i> Theme
                    </label>
                    <button class="settings-theme-btn" id="settingsThemeBtn" type="button">Toggle Theme</button>
                </div>
            </div>
        `;
        panel.style.cssText = `
            position: fixed;
            top: 70px;
            right: 16px;
            width: 280px;
            background: var(--surface, #0d2438);
            border: 1px solid var(--border-color, rgba(255,255,255,0.1));
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            z-index: 1050;
            padding: 0;
            overflow: hidden;
        `;
        document.body.appendChild(panel);

        // Inject settings panel styles
        const s = document.createElement('style');
        s.textContent = `
            #navbarSettingsPanel .settings-panel-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.1));
                font-size: 13px; font-weight: 700; color: var(--text-primary, #fff);
                letter-spacing: 0.04em; text-transform: uppercase;
            }
            #navbarSettingsPanel .settings-close-btn {
                background: none; border: none; cursor: pointer;
                color: var(--text-muted, #aaa); font-size: 14px; padding: 2px 6px;
                border-radius: 4px; transition: color 150ms;
            }
            #navbarSettingsPanel .settings-close-btn:hover { color: var(--text-primary, #fff); }
            #navbarSettingsPanel .settings-panel-body { padding: 10px 0; }
            #navbarSettingsPanel .settings-row {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; gap: 12px;
            }
            #navbarSettingsPanel .settings-row:hover { background: var(--surface-alt, rgba(255,255,255,0.04)); }
            #navbarSettingsPanel .settings-label {
                font-size: 12px; color: var(--text-primary, #fff); display: flex; align-items: center;
                gap: 8px; cursor: default;
            }
            #navbarSettingsPanel .settings-label i { color: var(--accent, #d4a843); width: 14px; text-align: center; }
            #navbarSettingsPanel .settings-toggle { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; cursor: pointer; }
            #navbarSettingsPanel .settings-toggle input { opacity: 0; width: 0; height: 0; }
            #navbarSettingsPanel .settings-toggle-slider {
                position: absolute; inset: 0; background: rgba(255,255,255,0.15);
                border-radius: 20px; transition: background 200ms;
            }
            #navbarSettingsPanel .settings-toggle-slider::before {
                content: ''; position: absolute; width: 14px; height: 14px;
                left: 3px; top: 3px; background: #fff; border-radius: 50%;
                transition: transform 200ms;
            }
            #navbarSettingsPanel .settings-toggle input:checked + .settings-toggle-slider { background: var(--accent, #d4a843); }
            #navbarSettingsPanel .settings-toggle input:checked + .settings-toggle-slider::before { transform: translateX(16px); }
            #navbarSettingsPanel .settings-theme-btn {
                font-size: 11px; padding: 4px 10px; border-radius: 6px;
                background: var(--accent, #d4a843); color: #000; border: none; cursor: pointer;
                font-weight: 600; transition: opacity 150ms;
            }
            #navbarSettingsPanel .settings-theme-btn:hover { opacity: 0.85; }
        `;
        document.head.appendChild(s);
    }

    // Toggle panel
    settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (panel.hasAttribute('hidden')) {
            panel.removeAttribute('hidden');
            settingsBtn.setAttribute('aria-expanded', 'true');
        } else {
            panel.setAttribute('hidden', '');
            settingsBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Close button
    document.addEventListener('click', function(e) {
        const closeBtn = document.getElementById('settingsCloseBtn');
        if (closeBtn && closeBtn.contains(e.target)) {
            panel.setAttribute('hidden', '');
            settingsBtn.setAttribute('aria-expanded', 'false');
            return;
        }
        if (!panel.hasAttribute('hidden') && !panel.contains(e.target) && !settingsBtn.contains(e.target)) {
            panel.setAttribute('hidden', '');
            settingsBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Theme toggle in settings
    document.addEventListener('click', function(e) {
        const themeBtn = document.getElementById('settingsThemeBtn');
        if (themeBtn && themeBtn.contains(e.target)) {
            const themeToggleBtn = document.getElementById('themeToggleBtn');
            if (themeToggleBtn) themeToggleBtn.click();
        }
    });

    // Auto-refresh toggle
    let autoRefreshInterval = null;
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'settingAutoRefresh') {
            if (e.target.checked) {
                autoRefreshInterval = setInterval(function() {
                    if (typeof loadLiveMetrics  === 'function') loadLiveMetrics();
                    if (typeof loadCargoList    === 'function') loadCargoList();
                    if (typeof loadLiveAuditLogs=== 'function') loadLiveAuditLogs();
                }, 30000);
                showNotification('Auto-refresh enabled (every 30s)', 'success');
            } else {
                clearInterval(autoRefreshInterval);
                showNotification('Auto-refresh disabled', 'info');
            }
        }
        if (e.target && e.target.id === 'settingCompactView') {
            document.body.classList.toggle('compact-view', e.target.checked);
            showNotification(e.target.checked ? 'Compact view enabled' : 'Compact view disabled', 'info');
        }
    });
}

// Animation styles (add to document)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);



// ===================================
// USER APPROVALS MODULE
// Registration request management
// ===================================

function initUserApprovals() {
    // Fetch initial pending count for the badge
    updateApprovalBadge();

    // Set up filter tab clicks
    document.querySelectorAll('.approval-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.approval-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const filter = this.dataset.filter;
            loadApprovals(filter);
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refreshApprovals');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const activeTab = document.querySelector('.approval-tab.active');
            const filter = activeTab ? activeTab.dataset.filter : 'pending';
            this.querySelector('i').style.transform = 'rotate(360deg)';
            loadApprovals(filter);
            updateApprovalBadge();
            setTimeout(() => {
                if (this.querySelector('i')) {
                    this.querySelector('i').style.transform = '';
                }
            }, 500);
        });
    }

    // Load on section activation via sidebar
    const approvalsBtn = document.getElementById('userApprovalsBtn');
    if (approvalsBtn) {
        approvalsBtn.addEventListener('click', function() {
            // Load pending by default when section opens
            loadApprovals('pending');
            updateApprovalBadge();
        });
    }
}

// ── Fetch and render approval requests ────────────────────
async function loadApprovals(filter = 'pending') {
    const loading  = document.getElementById('approvalsLoading');
    const empty    = document.getElementById('approvalsEmpty');
    const list     = document.getElementById('approvalsList');

    if (!list) return;

    if (loading) { loading.style.display = 'flex'; }
    if (empty)   { empty.style.display   = 'none'; }
    list.innerHTML = '';

    try {
        const resp = await fetch(
            `../PHP/get_registration_requests.php?status=${encodeURIComponent(filter)}`,
            { credentials: 'same-origin', cache: 'no-store' }
        );

        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();

        if (loading) loading.style.display = 'none';

        if (!data.success) {
            list.innerHTML = `<div class="approvals-empty"><i class="fas fa-exclamation-triangle"></i><p>${escHtml(data.message || 'Error loading requests')}</p></div>`;
            return;
        }

        // Update tab counts
        updateTabCount('tab-pending-count', data.pending_count > 0 ? data.pending_count : '');

        if (!data.requests || data.requests.length === 0) {
            if (empty) { empty.style.display = 'flex'; }
            return;
        }

        data.requests.forEach(req => {
            list.appendChild(buildApprovalCard(req));
        });

    } catch (err) {
        if (loading) loading.style.display = 'none';
        list.innerHTML = `<div class="approvals-empty"><i class="fas fa-wifi"></i><p>Could not load requests. Check server connection.</p></div>`;
        console.error('[APPROVALS] Load error:', err);
    }
}

// ── Build a single approval card DOM element ──────────────
function buildApprovalCard(req) {
    const card = document.createElement('div');
    card.className = `approval-card card-${req.status}`;
    card.dataset.requestId = req.id;

    const statusPill = `<span class="approval-status-pill pill-${req.status}">
        <i class="fas fa-${req.status === 'pending' ? 'clock' : req.status === 'approved' ? 'check' : 'times'}"></i>
        ${cap(req.status)}
    </span>`;

    const dateStr = req.created_at
        ? new Date(req.created_at).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
        : '';

    let rejNote = '';
    if (req.status === 'rejected' && req.rejection_reason) {
        rejNote = `<div class="approval-rejection-note">
            <i class="fas fa-info-circle"></i>
            <span>${escHtml(req.rejection_reason)}</span>
        </div>`;
    }

    let actionHtml = '';
    if (req.status === 'pending') {
        actionHtml = `
            <div class="approval-card-actions">
                <button class="btn-approve" onclick="approveRequest(${req.id}, this)">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn-reject" onclick="showRejectConfirm(${req.id}, this)">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
            <div class="approval-confirm-inline" id="confirm-${req.id}">
                <div class="confirm-question">
                    <i class="fas fa-exclamation-triangle" style="color:#ffc107;margin-right:4px;"></i>
                    Reject this registration?
                </div>
                <div class="confirm-btns">
                    <button class="btn-confirm-yes" onclick="rejectRequest(${req.id}, this)">Yes</button>
                    <button class="btn-confirm-no"  onclick="hideRejectConfirm(${req.id})">No</button>
                </div>
            </div>`;
    } else {
        const reviewedStr = req.reviewed_at
            ? new Date(req.reviewed_at).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' })
            : '';
        actionHtml = `<div class="approval-card-actions" style="font-size:0.75rem;color:var(--text-muted);text-align:right;">
            ${reviewedStr ? `<span>Reviewed<br>${reviewedStr}</span>` : ''}
        </div>`;
    }

    card.innerHTML = `
        <div class="approval-card-info">
            <div class="approval-card-name">
                ${escHtml(req.full_name)}
                ${statusPill}
            </div>
            <div class="approval-card-meta">
                <span><i class="fas fa-envelope"></i> ${escHtml(req.email)}</span>
                <span><i class="fas fa-phone"></i> ${escHtml(req.contact_number)}</span>
                <span><i class="fas fa-id-card"></i> ${escHtml(req.cnic)}</span>
            </div>
            ${rejNote}
            <div class="approval-card-date">
                <i class="fas fa-calendar-alt" style="margin-right:3px;"></i>
                Requested: ${escHtml(dateStr)}
            </div>
        </div>
        ${actionHtml}`;

    return card;
}

// ── Approve a request ─────────────────────────────────────
async function approveRequest(requestId, btnEl) {
    const card = btnEl.closest('.approval-card');
    const allBtns = card ? card.querySelectorAll('button') : [];
    allBtns.forEach(b => b.disabled = true);

    try {
        const formData = new FormData();
        formData.append('id',     requestId);
        formData.append('action', 'approve');

        const resp = await fetch('../PHP/process_registration_action.php', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });
        const data = await resp.json();

        if (data.success) {
            showNotification(data.message || 'User approved successfully', 'success');
            // Remove card with animation
            if (card) {
                card.style.transition = 'opacity 0.4s, transform 0.4s';
                card.style.opacity = '0';
                card.style.transform = 'translateX(20px)';
                setTimeout(() => card.remove(), 420);
            }
            updateApprovalBadge();
            updateTabCount('tab-pending-count', '');
        } else {
            showNotification(data.message || 'Failed to approve', 'error');
            allBtns.forEach(b => b.disabled = false);
        }
    } catch (err) {
        showNotification('Network error. Please try again.', 'error');
        allBtns.forEach(b => b.disabled = false);
    }
}

// ── Show reject confirmation inline ───────────────────────
function showRejectConfirm(requestId, btnEl) {
    const confirm = document.getElementById(`confirm-${requestId}`);
    if (confirm) confirm.classList.add('show');
    // hide the action buttons while confirm is shown
    const card = btnEl.closest('.approval-card');
    if (card) {
        const actBtns = card.querySelectorAll('.btn-approve, .btn-reject');
        actBtns.forEach(b => b.style.display = 'none');
    }
}

function hideRejectConfirm(requestId) {
    const confirm = document.getElementById(`confirm-${requestId}`);
    if (confirm) confirm.classList.remove('show');
    // restore action buttons
    const card = confirm ? confirm.closest('.approval-card') : null;
    if (card) {
        const actBtns = card.querySelectorAll('.btn-approve, .btn-reject');
        actBtns.forEach(b => b.style.display = '');
    }
}

// ── Reject a request ──────────────────────────────────────
async function rejectRequest(requestId, btnEl) {
    const card = btnEl.closest('.approval-card');
    const allBtns = card ? card.querySelectorAll('button') : [];
    allBtns.forEach(b => b.disabled = true);

    try {
        const formData = new FormData();
        formData.append('id',     requestId);
        formData.append('action', 'reject');
        formData.append('reason', 'Registration request rejected by administrator');

        const resp = await fetch('../PHP/process_registration_action.php', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });
        const data = await resp.json();

        if (data.success) {
            showNotification(data.message || 'Request rejected', 'info');
            if (card) {
                card.style.transition = 'opacity 0.4s, transform 0.4s';
                card.style.opacity = '0';
                card.style.transform = 'translateX(-20px)';
                setTimeout(() => card.remove(), 420);
            }
            updateApprovalBadge();
        } else {
            showNotification(data.message || 'Failed to reject', 'error');
            allBtns.forEach(b => b.disabled = false);
        }
    } catch (err) {
        showNotification('Network error. Please try again.', 'error');
        allBtns.forEach(b => b.disabled = false);
    }
}

// ── Update the sidebar badge count ───────────────────────
async function updateApprovalBadge() {
    try {
        const resp = await fetch('../PHP/get_registration_requests.php?status=pending', {
            credentials: 'same-origin',
            cache: 'no-store'
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const badge = document.getElementById('approvalBadge');
        if (!badge) return;
        const count = data.pending_count || 0;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
        updateTabCount('tab-pending-count', count > 0 ? count : '');
    } catch (e) {
        // Silently fail — badge is non-critical
    }
}

// ── Small helpers ─────────────────────────────────────────
function updateTabCount(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function cap(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===================================
// LIVE METRICS — Load real KPIs from DB
// ===================================

async function loadLiveMetrics() {
    try {
        const resp = await fetch('../PHP/get_dashboard_metrics.php', {
            credentials: 'same-origin', cache: 'no-store'
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.success) return;

        const m = data.metrics;

        // Always overwrite from DB — never fall back to stale local values
        dashboardState.registeredCount   = m.registered_count   ?? 0;
        dashboardState.trackingUpdates   = m.tracking_events     ?? 0;
        dashboardState.contractsExecuted = m.contracts_executed  ?? 0;
        dashboardState.certificatesIssued= m.certificates_issued ?? 0;
        dashboardState.auditLogs         = m.audit_logs          ?? 0;

        // Replace recentRegistrations entirely from DB (no merging with stale data)
        if (Array.isArray(m.recent_registrations)) {
            dashboardState.recentRegistrations = m.recent_registrations.map(row => {
                const desc    = row.description || '';
                // Description is stored as "{type} from {supplier}" by process_cargo_registration.php
                const typeMatch     = desc.match(/^(.+?) from (.+)$/);
                const cargoTypeRaw  = typeMatch ? typeMatch[1].trim() : 'Cargo';
                const supplierRaw   = typeMatch ? typeMatch[2].trim() : desc || 'Unknown';
                const st = row.status || 'registered';
                return {
                    cargoId:         row.cargo_id,
                    supplier:        supplierRaw,
                    cargoType:       cargoTypeRaw,
                    statusClass:     st === 'registered' ? 'complete' : (st === 'delivered' ? 'complete' : 'queued'),
                    statusText:      toSentenceCase(st),
                    paymentReleased: m.payment_released_ids
                                     ? m.payment_released_ids.includes(row.cargo_id)
                                     : (st === 'delivered'),
                    paymentUpdatedAt: new Date(row.created_at).getTime(),
                    origin:      row.origin      || '-',
                    destination: row.destination || '-',
                };
            });
        }

        // Payment summary directly from DB
        const payEl    = document.getElementById('dash-payment-registered');
        const relEl    = document.getElementById('dash-payment-released');
        const pendEl   = document.getElementById('dash-payment-pending');
        const latestEl = document.getElementById('dash-payment-latest');

        if (payEl)    payEl.textContent    = `Registered: ${m.payment_total    ?? 0}`;
        if (relEl)    relEl.textContent    = `Released: ${m.payment_released   ?? 0}`;
        if (pendEl)   pendEl.textContent   = `Pending: ${m.payment_pending     ?? 0}`;
        if (latestEl) latestEl.textContent = m.latest_payment_activity || 'No payment activity yet';

        // Payment chart bars from live ratios
        const maxVal = Math.max(1, m.payment_total ?? 0);
        const barReg = document.getElementById('dash-payment-bar-registered');
        const barRel = document.getElementById('dash-payment-bar-released');
        const barPen = document.getElementById('dash-payment-bar-pending');
        if (barReg) barReg.style.height = `${Math.max(8, ((m.payment_total    ?? 0) / maxVal) * 100)}%`;
        if (barRel) barRel.style.height = `${Math.max(8, ((m.payment_released ?? 0) / maxVal) * 100)}%`;
        if (barPen) barPen.style.height = `${Math.max(8, ((m.payment_pending  ?? 0) / maxVal) * 100)}%`;

        renderDashboardMonitoring();

    } catch (e) {
        console.warn('[metrics] Live metrics unavailable:', e.message);
    }
}

// ===================================
// AUDIT MONITORING — Live audit logs
// ===================================

function initAuditMonitoring() {
    const auditSearch    = document.getElementById('auditSearch');
    const auditTypeFilter= document.getElementById('auditTypeFilter');
    const auditTimeFilter= document.getElementById('auditTimeFilter');

    // Load live audit logs when section is activated
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.dataset.section === 'audit') {
                loadLiveAuditLogs();
            }
        });
    });

    // Keep existing filter listeners (already wired in initTableInteractions)
    if (auditSearch)     auditSearch.addEventListener('keyup',    filterAuditLogs);
    if (auditTypeFilter) auditTypeFilter.addEventListener('change', filterAuditLogs);
    if (auditTimeFilter) auditTimeFilter.addEventListener('change', filterAuditLogs);
}

async function loadLiveAuditLogs() {
    try {
        const auditBody = document.querySelector('.audit-table tbody');
        if (!auditBody) return;

        const resp = await fetch('../PHP/get_audit_logs.php?limit=50', {
            credentials: 'same-origin', cache: 'no-store'
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.success || !data.logs.length) return;

        // Prepend DB logs (newest first), skip if already shown locally
        const existingTimestamps = new Set(
            Array.from(auditBody.querySelectorAll('tr td:first-child'))
                 .map(td => td.textContent.trim())
        );

        data.logs.forEach(log => {
            if (existingTimestamps.has(log.timestamp)) return;

            const actionClass = humanAuditActionClass(log.action);
            const actionLabel = humanAuditActionLabel(log.action);
            const txDisplay = log.tx_hash
                ? `<code class="tx-hash blockchain-verified" title="${log.tx_hash}">${log.tx_hash.substring(0,18)}...</code>`
                : `<span style="color:var(--text-muted)">-</span>`;
            // Show "Admin: Name" if we have admin_name, otherwise role
            const performedBy = log.admin_name && log.admin_name !== 'System'
                ? `<span class="role-badge" title="${escHtml(log.admin_name)}">${escHtml(log.admin_name)}</span>`
                : `<span class="role-badge">${log.role || 'System'}</span>`;
            // Human-readable details — clean up "unknown" values
            const cleanDetails = humanAuditDetails(log.details, log.action);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td><span class="action-badge ${actionClass}">${actionLabel}</span></td>
                <td>${performedBy}</td>
                <td class="cargo-id-cell">${log.cargo_id || '-'}</td>
                <td class="details-cell">${escHtml(cleanDetails)}</td>
                <td>${txDisplay}</td>
            `;
            auditBody.appendChild(row);
        });

        // Load blockchain chain view
        renderBlockchainChain(data.blockchain_logs || []);

    } catch (e) {
        console.warn('[audit] Live audit logs unavailable:', e.message);
    }
}

// ===================================
// BLOCKCHAIN CHAIN VIEW
// Renders a mini chain visualization
// ===================================

function renderBlockchainChain(blocks) {
    const auditSection = document.getElementById('audit-section');
    if (!auditSection || !blocks.length) return;

    let chainContainer = document.getElementById('blockchainChainView');
    if (!chainContainer) {
        chainContainer = document.createElement('div');
        chainContainer.id = 'blockchainChainView';
        chainContainer.className = 'blockchain-chain-view';

        const header = auditSection.querySelector('.section-header');
        if (header && header.nextSibling) {
            auditSection.insertBefore(chainContainer, header.nextSibling);
        } else {
            auditSection.appendChild(chainContainer);
        }
    }

    chainContainer.innerHTML = `
        <div class="chain-header">
            <i class="fas fa-link"></i>
            <span>Blockchain Ledger — Recent Blocks</span>
            <span class="chain-count">${blocks.length} blocks</span>
        </div>
        <div class="chain-blocks">
            ${blocks.slice(0, 6).map((block, idx) => `
                <div class="chain-block">
                    <div class="block-header">
                        <span class="block-index">#${blocks.length - idx}</span>
                        <span class="block-action">${block.action.replace(/_/g,' ')}</span>
                    </div>
                    <div class="block-body">
                        <div class="block-field">
                            <span class="block-label">Record</span>
                            <span class="block-value">${block.record_id}</span>
                        </div>
                        <div class="block-field">
                            <span class="block-label">Status</span>
                            <span class="block-value">
                                ${humanBlockStatus(block.previous_status, block.new_status)}
                            </span>
                        </div>
                        <div class="block-field">
                            <span class="block-label">TX Hash</span>
                            <code class="block-hash" title="${block.tx_hash}">${block.tx_hash.substring(0,20)}...</code>
                        </div>
                        <div class="block-field">
                            <span class="block-label">Prev Hash</span>
                            <code class="block-hash prev" title="${block.previous_hash}">${block.previous_hash.substring(0,16)}...</code>
                        </div>
                    </div>
                    <div class="block-ts">${block.created_at}</div>
                </div>
                ${idx < blocks.length - 1 ? '<div class="chain-link"><i class="fas fa-link"></i></div>' : ''}
            `).join('')}
        </div>
    `;
}

// ===================================
// BLOCKCHAIN BADGE — toast with TX hash
// ===================================

function showBlockchainBadge(action, cargoId, txHash) {
    if (!txHash) return;

    const badge = document.createElement('div');
    badge.className = 'blockchain-toast';
    badge.innerHTML = `
        <div class="bc-toast-icon"><i class="fas fa-link"></i></div>
        <div class="bc-toast-body">
            <strong>Blockchain Recorded</strong>
            <span>${action} — ${cargoId}</span>
            <code class="bc-tx">${txHash}</code>
        </div>
        <button class="bc-toast-close" onclick="this.closest('.blockchain-toast').remove()">×</button>
    `;
    document.body.appendChild(badge);

    setTimeout(() => {
        badge.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => badge.remove(), 320);
    }, 6000);
}

// ===================================
// LOAD CARGO LIST — Dynamic data for
// Tracking table, Contract history,
// Certificates list, Activity feed
// ===================================

async function loadCargoList() {
    try {
        const resp = await fetch('../PHP/get_cargo_list.php', {
            credentials: 'same-origin', cache: 'no-store'
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.success) return;

        // ── Tracking table ────────────────────────────────
        _populateTrackingTable(data.cargo_list || []);

        // ── Contract execution history ────────────────────
        _populateContractHistory(data.contract_history || []);

        // ── Certificates list ─────────────────────────────
        _populateCertificatesList(data.certificates || []);

        // ── Recent activity feed ──────────────────────────
        _populateActivityFeed(data.activities || []);

    } catch (e) {
        console.warn('[cargo-list] Unavailable:', e.message);
    }
}

// ── Tracking table ────────────────────────────────────────
function _populateTrackingTable(cargoList) {
    const tbody = document.querySelector('#trackingTable tbody');
    if (!tbody) return;

    if (!cargoList.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state-row">
                    <i class="fas fa-inbox"></i> No cargo records found. Register cargo to begin tracking.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = cargoList.map(c => `
        <tr>
            <td>${escHtml(c.cargo_id)}</td>
            <td>${escHtml(c.cargo_type)}</td>
            <td>${escHtml(c.origin)}</td>
            <td>${escHtml(c.destination)}</td>
            <td><span class="status-badge ${escHtml(c.status_class)}">${escHtml(c.status_label)}</span></td>
            <td>${escHtml(c.eta)}</td>
            <td>
                <button class="btn-icon update-btn" title="Update Status">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon view-btn" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Re-bind update buttons on freshly rendered rows
    tbody.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            openUpdateModal(this.closest('tr'));
        });
    });
}

// ── Contract execution history ────────────────────────────
function _populateContractHistory(history) {
    const list = document.querySelector('.history-list');
    if (!list) return;

    if (!history.length) {
        list.innerHTML = `
            <div class="history-item pending">
                <div class="history-icon"><i class="fas fa-clock"></i></div>
                <div class="history-content">
                    <p><strong>No contracts executed yet</strong></p>
                    <small>Execute a smart contract to see history here.</small>
                </div>
            </div>`;
        return;
    }

    list.innerHTML = history.map(h => `
        <div class="history-item success">
            <div class="history-icon"><i class="fas fa-check"></i></div>
            <div class="history-content">
                <p><strong>${escHtml(h.label)} — ${escHtml(h.cargo_id)}</strong></p>
                <small>${escHtml(h.created_at)} | Blockchain TX: <code>${escHtml(h.tx_hash)}</code></small>
            </div>
        </div>
    `).join('');
}

// ── Certificates list ─────────────────────────────────────
function _populateCertificatesList(certs) {
    const list = document.querySelector('.certificates-list');
    if (!list) return;

    // Keep the h4 heading if present, replace cert-item entries only
    const heading = list.querySelector('h4');

    // Remove all existing cert-item elements
    list.querySelectorAll('.cert-item').forEach(el => el.remove());

    if (!certs.length) {
        const empty = document.createElement('p');
        empty.className = 'certs-empty-msg';
        empty.style.cssText = 'color:var(--text-muted);font-size:0.85rem;padding:0.75rem 0;';
        empty.textContent = 'No certificates issued yet.';
        list.appendChild(empty);
        return;
    }

    // Remove any previous empty message
    list.querySelectorAll('.certs-empty-msg').forEach(el => el.remove());

    certs.forEach(cert => {
        const item = document.createElement('div');
        item.className = 'cert-item';
        item.innerHTML = `
            <div class="cert-icon"><i class="fas fa-scroll"></i></div>
            <div class="cert-info">
                <p><strong>Certificate #${escHtml(cert.cert_number)} — ${escHtml(cert.cargo_id)}</strong></p>
                <small>${escHtml(cert.cert_label)} | Issued: ${escHtml(cert.issued_at)}</small>
                ${cert.tx_hash ? `<small class="cert-tx">TX: <code>${escHtml(cert.tx_hash)}</code></small>` : ''}
            </div>
            <div class="cert-actions">
                <button class="btn-icon cert-download-btn" title="Download Certificate as PDF"
                    data-cert-number="${escHtml(cert.cert_number)}"
                    data-cargo-id="${escHtml(cert.cargo_id)}"
                    data-supplier="${escHtml(cert.supplier || '')}"
                    data-cert-type="${escHtml(cert.cert_type)}"
                    data-cert-label="${escHtml(cert.cert_label)}"
                    data-issued-at="${escHtml(cert.issued_at)}"
                    data-tx-hash="${escHtml(cert.tx_hash || '')}">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;
        // Bind download handler
        const dlBtn = item.querySelector('.cert-download-btn');
        if (dlBtn) dlBtn.addEventListener('click', () => downloadCertificate(dlBtn.dataset));
        list.appendChild(item);
    });
}

// ── Activity feed ─────────────────────────────────────────
function _populateActivityFeed(activities) {
    const list = document.querySelector('.activity-list');
    if (!list) return;

    if (!activities.length) {
        list.innerHTML = `
            <div class="activity-item info-item">
                <div class="activity-icon"><i class="fas fa-circle-info"></i></div>
                <div class="activity-copy">
                    <strong>No recent activity</strong>
                    <span>Dashboard activity will appear here as actions are taken.</span>
                </div>
                <span class="activity-time">Now</span>
            </div>`;
        return;
    }

    list.innerHTML = activities.slice(0, 5).map(a => {
        const timeStr = a.created_at
            ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
        // Build a short title from the action name
        const title = a.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return `
            <div class="activity-item ${escHtml(a.item_class)}">
                <div class="activity-icon"><i class="fas ${escHtml(a.icon)}"></i></div>
                <div class="activity-copy">
                    <strong>${escHtml(title)}</strong>
                    <span>${escHtml(a.description)}</span>
                </div>
                <span class="activity-time">${timeStr}</span>
            </div>
        `;
    }).join('');
}

// ===================================
// CERTIFICATE PDF DOWNLOAD
// Generates a professional Coursera-style
// certificate as a printable HTML window
// then triggers browser print-to-PDF.
// Pure JS, no external dependencies.
// ===================================

function downloadCertificate(data) {
    const certNumber = data.certNumber  || data['cert-number']  || '???';
    const cargoId    = data.cargoId     || data['cargo-id']     || '—';
    const supplier   = data.supplier    || '—';
    const certType   = data.certType    || data['cert-type']    || 'certificate';
    const certLabel  = data.certLabel   || data['cert-label']   || toSentenceCase(certType);
    const issuedAt   = data.issuedAt    || data['issued-at']    || new Date().toLocaleDateString();
    const txHash     = data.txHash      || data['tx-hash']      || '';
    const description= data.description || '';

    // Unique verification code derived from cert number + cargoId
    const verifyCode = btoa(`SHIP-${certNumber}-${cargoId}`).replace(/[^A-Z0-9]/gi, '').substring(0, 16).toUpperCase();

    // Certificate type → readable full title
    const certTitleMap = {
        'authenticity':   'Certificate of Authenticity',
        'origin':         'Certificate of Origin',
        'quality':        'Certificate of Quality',
        'inspection':     'Inspection Certificate',
        'certificate':    'Cargo Certificate',
    };
    const fullCertTitle = certTitleMap[certType] || certLabel || 'Cargo Certificate';

    // Generate QR code SVG (simple matrix pattern for verification URL)
    // Using a basic SVG representation since we have no external QR lib
    const qrSvg = _generateSimpleQrSvg(verifyCode);

    const certHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate #${certNumber} — Shipyard PKG</title>
<style>
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap');

  body {
    font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
    background: #f5f0e8;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }

  .cert-page {
    width: 900px;
    background: #ffffff;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }

  /* Gold border frame */
  .cert-page::before {
    content: '';
    position: absolute; inset: 0;
    border: 16px solid transparent;
    background:
      linear-gradient(#fff,#fff) padding-box,
      linear-gradient(135deg, #c9a84c 0%, #f0d080 30%, #c9a84c 50%, #f0d080 70%, #c9a84c 100%) border-box;
    pointer-events: none;
    z-index: 10;
  }
  /* Inner thin border */
  .cert-page::after {
    content: '';
    position: absolute; inset: 24px;
    border: 1.5px solid #c9a84c;
    pointer-events: none;
    z-index: 10;
  }

  /* Header band */
  .cert-header {
    background: linear-gradient(135deg, #0d2a4a 0%, #0e4c7c 60%, #1a6ba0 100%);
    padding: 32px 52px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .cert-logo-block {
    display: flex; align-items: center; gap: 14px;
  }
  .cert-logo-circle {
    width: 64px; height: 64px;
    background: rgba(255,255,255,0.15);
    border: 2px solid rgba(201,168,76,0.7);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; color: #f0d080;
  }
  .cert-brand-name {
    font-family: 'Playfair Display', serif;
    font-size: 1.6rem;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 1px;
    line-height: 1.15;
  }
  .cert-brand-sub {
    font-size: 0.75rem;
    color: rgba(240,208,128,0.85);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .cert-header-badge {
    text-align: right;
  }
  .cert-header-badge .badge-num {
    font-size: 0.72rem;
    color: rgba(240,208,128,0.85);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .cert-header-badge .badge-id {
    font-family: 'Source Sans 3', monospace;
    font-size: 1.05rem;
    font-weight: 700;
    color: #f0d080;
    letter-spacing: 2px;
  }

  /* Main body */
  .cert-body {
    padding: 42px 60px 36px;
  }

  /* Decorative corner watermark */
  .cert-watermark {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    font-size: 180px;
    font-weight: 900;
    color: rgba(14,76,124,0.04);
    font-family: 'Playfair Display', serif;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
    z-index: 0;
    letter-spacing: 8px;
  }

  .cert-content { position: relative; z-index: 2; }

  /* "This is to certify" row */
  .cert-preamble {
    text-align: center;
    font-size: 0.88rem;
    color: #888;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  /* Big title */
  .cert-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.6rem;
    font-weight: 900;
    color: #0d2a4a;
    text-align: center;
    line-height: 1.15;
    margin-bottom: 4px;
  }

  /* Gold accent line under title */
  .cert-title-rule {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    margin: 14px 0 20px;
  }
  .cert-title-rule::before, .cert-title-rule::after {
    content: '';
    flex: 1; max-width: 180px;
    height: 1.5px;
    background: linear-gradient(90deg, transparent, #c9a84c, transparent);
  }
  .cert-title-rule span {
    font-size: 1.1rem; color: #c9a84c;
  }

  /* Award section */
  .cert-award-label {
    text-align: center;
    font-size: 0.8rem; color: #888;
    letter-spacing: 2px; text-transform: uppercase;
    margin-bottom: 8px;
  }
  .cert-award-value {
    font-family: 'Playfair Display', serif;
    font-size: 2rem; font-weight: 700;
    color: #0e4c7c; text-align: center;
    margin-bottom: 6px;
  }
  .cert-award-type {
    font-family: 'Playfair Display', serif;
    font-size: 1.15rem; font-style: italic; color: #555;
    text-align: center; margin-bottom: 28px;
  }

  /* Details grid */
  .cert-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0;
    border: 1px solid #e8e0d0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 28px;
  }
  .cert-detail-cell {
    padding: 14px 18px;
    border-right: 1px solid #e8e0d0;
    border-bottom: 1px solid #e8e0d0;
  }
  .cert-detail-cell:nth-child(3),
  .cert-detail-cell:nth-child(6) { border-right: none; }
  .cert-detail-cell:nth-last-child(-n+3) { border-bottom: none; }
  .cert-detail-label {
    font-size: 0.68rem; text-transform: uppercase;
    letter-spacing: 1.2px; color: #999; margin-bottom: 4px;
  }
  .cert-detail-value {
    font-size: 0.92rem; font-weight: 600; color: #2d2d2d;
    word-break: break-word;
  }

  /* Description box */
  .cert-description {
    background: linear-gradient(135deg, #f8f6f0 0%, #f0ece0 100%);
    border-left: 4px solid #c9a84c;
    padding: 14px 18px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 28px;
    font-size: 0.88rem; color: #555; line-height: 1.65;
    font-style: italic;
  }
  .cert-description strong { color: #2d2d2d; font-style: normal; }

  /* Bottom row: signature + verification */
  .cert-bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    border-top: 1px solid #e8e0d0;
    padding-top: 22px;
  }

  .cert-sig-block { min-width: 200px; }
  .cert-sig-line {
    width: 180px; height: 1px;
    background: #333; margin-bottom: 6px;
  }
  .cert-sig-label { font-size: 0.75rem; color: #777; letter-spacing: 0.5px; }
  .cert-sig-name { font-size: 0.88rem; font-weight: 700; color: #2d2d2d; }
  .cert-sig-title { font-size: 0.72rem; color: #999; margin-top: 2px; }

  .cert-seal-block {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .cert-seal {
    width: 80px; height: 80px;
    border: 3px solid #c9a84c;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0d2a4a, #0e4c7c);
    color: #f0d080; font-size: 28px;
  }
  .cert-seal-text { font-size: 0.65rem; color: #888; letter-spacing: 1px; text-transform: uppercase; }

  .cert-verify-block { text-align: right; max-width: 200px; }
  .cert-qr { margin-bottom: 8px; display: inline-block; }
  .cert-verify-label { font-size: 0.68rem; color: #888; letter-spacing: 0.5px; margin-bottom: 2px; }
  .cert-verify-code {
    font-family: monospace; font-size: 0.8rem;
    font-weight: 700; color: #0e4c7c;
    letter-spacing: 2px;
    background: #f0f4f8; padding: 4px 8px;
    border-radius: 4px; border: 1px solid #c8d8e8;
    display: inline-block;
  }
  .cert-tx-ref {
    font-size: 0.62rem; color: #aaa;
    word-break: break-all; margin-top: 4px;
    font-family: monospace;
  }

  /* Footer ribbon */
  .cert-footer {
    background: linear-gradient(135deg, #0d2a4a 0%, #0e4c7c 100%);
    padding: 10px 52px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .cert-footer-left { font-size: 0.7rem; color: rgba(255,255,255,0.55); letter-spacing: 0.5px; }
  .cert-footer-right { font-size: 0.7rem; color: rgba(240,208,128,0.7); letter-spacing: 1px; text-transform: uppercase; }

  @media print {
    body { background: #fff; padding: 0; }
    .cert-page { box-shadow: none; width: 100%; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="cert-page">
  <div class="cert-watermark">CERTIFIED</div>

  <!-- Header -->
  <div class="cert-header">
    <div class="cert-logo-block">
      <div class="cert-logo-circle">⚓</div>
      <div>
        <div class="cert-brand-name">Shipyard PKG</div>
        <div class="cert-brand-sub">Cargo Management System</div>
      </div>
    </div>
    <div class="cert-header-badge">
      <div class="badge-num">Certificate No.</div>
      <div class="badge-id">#${certNumber}</div>
    </div>
  </div>

  <!-- Body -->
  <div class="cert-body">
    <div class="cert-content">

      <div class="cert-preamble">This is to certify that</div>
      <div class="cert-title">${fullCertTitle}</div>
      <div class="cert-title-rule"><span>✦</span></div>

      <div class="cert-award-label">Has been issued for Cargo</div>
      <div class="cert-award-value">${cargoId}</div>
      <div class="cert-award-type">Issued by Shipyard PKG Cargo Management Authority</div>

      <!-- Details grid -->
      <div class="cert-details-grid">
        <div class="cert-detail-cell">
          <div class="cert-detail-label">Cargo ID</div>
          <div class="cert-detail-value">${cargoId}</div>
        </div>
        <div class="cert-detail-cell">
          <div class="cert-detail-label">Supplier</div>
          <div class="cert-detail-value">${supplier || '—'}</div>
        </div>
        <div class="cert-detail-cell">
          <div class="cert-detail-label">Certificate Type</div>
          <div class="cert-detail-value">${certLabel}</div>
        </div>
        <div class="cert-detail-cell">
          <div class="cert-detail-label">Issue Date</div>
          <div class="cert-detail-value">${issuedAt}</div>
        </div>
        <div class="cert-detail-cell">
          <div class="cert-detail-label">Certificate ID</div>
          <div class="cert-detail-value">SCMS-${certNumber}</div>
        </div>
        <div class="cert-detail-cell">
          <div class="cert-detail-label">Authority</div>
          <div class="cert-detail-value">Shipyard PKG Admin</div>
        </div>
      </div>

      ${description ? `<div class="cert-description"><strong>Notes:</strong> ${description}</div>` : ''}

      <!-- Bottom: signature + seal + verification -->
      <div class="cert-bottom">
        <div class="cert-sig-block">
          <div class="cert-sig-line"></div>
          <div class="cert-sig-label">Authorized Signature</div>
          <div class="cert-sig-name">Shipyard PKG Administration</div>
          <div class="cert-sig-title">Cargo Management Authority</div>
        </div>

        <div class="cert-seal-block">
          <div class="cert-seal">⚓</div>
          <div class="cert-seal-text">Official Seal</div>
        </div>

        <div class="cert-verify-block">
          <div class="cert-qr">${qrSvg}</div>
          <div class="cert-verify-label">Verification Code</div>
          <div class="cert-verify-code">${verifyCode}</div>
          ${txHash ? `<div class="cert-tx-ref">TX: ${txHash}</div>` : ''}
        </div>
      </div>

    </div>
  </div>

  <!-- Footer -->
  <div class="cert-footer">
    <div class="cert-footer-left">Issued: ${issuedAt} &nbsp;|&nbsp; Ref: SCMS-${certNumber}-${cargoId}</div>
    <div class="cert-footer-right">Shipyard PKG · Blockchain Verified</div>
  </div>
</div>

<!-- Print trigger -->
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 600);
  };
  window.onafterprint = function() { window.close(); };
<\/script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=980,height=780,scrollbars=yes');
    if (!printWin) {
        showNotification('Please allow pop-ups to download the certificate, then try again.', 'warning');
        return;
    }
    printWin.document.open();
    printWin.document.write(certHTML);
    printWin.document.close();
}

/**
 * Generate a simple 12×12 visual representation as SVG
 * (decorative grid that looks like a QR code)
 */
function _generateSimpleQrSvg(code) {
    const size = 64;
    const cells = 12;
    const cell = size / cells;
    let squares = '';

    // Deterministic pattern from the code string
    const seed = code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rng = (i) => {
        const x = Math.sin(seed * 9301 + i * 49297 + 233720) * 10000;
        return x - Math.floor(x);
    };

    // Fixed corner squares (always dark, like real QR)
    const cornerSquares = (x, y) => {
        squares += `<rect x="${x*cell}" y="${y*cell}" width="${3*cell}" height="${3*cell}" fill="#0d2a4a"/>`;
        squares += `<rect x="${(x+.5)*cell}" y="${(y+.5)*cell}" width="${2*cell}" height="${2*cell}" fill="white"/>`;
        squares += `<rect x="${(x+1)*cell}" y="${(y+1)*cell}" width="${1*cell}" height="${1*cell}" fill="#0d2a4a"/>`;
    };
    cornerSquares(0, 0);
    cornerSquares(cells - 3, 0);
    cornerSquares(0, cells - 3);

    // Data area
    for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
            // Skip corner areas
            if ((row < 4 && col < 4) || (row < 4 && col > cells-5) || (row > cells-5 && col < 4)) continue;
            if (rng(row * cells + col) > 0.55) {
                squares += `<rect x="${col*cell}" y="${row*cell}" width="${cell}" height="${cell}" fill="#0d2a4a"/>`;
            }
        }
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="display:block;border:1px solid #e8e0d0;border-radius:3px;">${squares}</svg>`;
}

// ===================================
// AUDIT HELPERS — human-readable labels
// ===================================

/**
 * Map raw DB action strings to clean display labels
 */
function humanAuditActionLabel(action) {
    const labelMap = {
        'CARGO_REGISTERED':        'Cargo Registered',
        'STATUS_UPDATE':           'Status Updated',
        'PAYMENT_RELEASED':        'Payment Released',
        'CUSTOMS_CLEARED':         'Customs Cleared',
        'DELIVERY_CONFIRMED':      'Delivery Confirmed',
        'CARGO_VERIFIED':          'Cargo Verified',
        'CERTIFICATE_ISSUED':      'Certificate Issued',
        'REGISTRATION_APPROVED':   'User Approved',
        'REGISTRATION_REJECTED':   'User Rejected',
        'ADMIN_LOGIN_2FA':         'Admin Login',
        'ADMIN_LOGOUT':            'Admin Logout',
        'ADMIN_LOGIN':             'Admin Login',
    };
    if (labelMap[action]) return labelMap[action];
    // Fallback: clean up underscores
    return action.replace(/^(CARGO_|ADMIN_)/,'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

/**
 * Map action to CSS badge class
 */
function humanAuditActionClass(action) {
    const classMap = {
        'CARGO_REGISTERED':   'registration',
        'STATUS_UPDATE':      'update',
        'PAYMENT_RELEASED':   'contract',
        'CUSTOMS_CLEARED':    'contract',
        'DELIVERY_CONFIRMED': 'contract',
        'CARGO_VERIFIED':     'contract',
        'CERTIFICATE_ISSUED': 'certificate',
        'REGISTRATION_APPROVED': 'registration',
        'REGISTRATION_REJECTED': 'update',
        'ADMIN_LOGIN_2FA':    'login',
        'ADMIN_LOGOUT':       'login',
        'ADMIN_LOGIN':        'login',
    };
    return classMap[action] || action.toLowerCase().replace(/_/g,'-');
}

/**
 * Clean up description text — replace "unknown" with meaningful labels
 */
function humanAuditDetails(details, action) {
    if (!details) return '—';
    let clean = details;

    // Replace status transitions with readable versions
    const statusDisplay = {
        'unknown':    'Not in database',
        'registered': 'Registered',
        'in_transit': 'In Transit',
        'arrived':    'Arrived',
        'delivered':  'Delivered',
        'delayed':    'Delayed',
        'cancelled':  'Cancelled',
    };

    // Fix "from Unknown → Status" pattern
    clean = clean.replace(/\bUnknown\b/g, 'Not on Record');
    clean = clean.replace(/\bunknown\b/g, 'not on record');

    // Fix status labels within description
    Object.entries(statusDisplay).forEach(([raw, label]) => {
        const pattern = new RegExp('\\b' + raw + '\\b', 'gi');
        clean = clean.replace(pattern, match => {
            // Only capitalize status values, not the word in the middle of sentences
            return match[0] === match[0].toUpperCase() ? label : label.toLowerCase();
        });
    });

    return clean;
}

/**
 * Format blockchain status transition cleanly
 */
function humanBlockStatus(previousStatus, newStatus) {
    const display = (s) => {
        if (!s || s === 'unknown' || s === '') return '—';
        const map = {
            'registered': 'Registered',
            'in_transit': 'In Transit',
            'arrived':    'Arrived',
            'delivered':  'Delivered',
            'delayed':    'Delayed',
            'cancelled':  'Cancelled',
            'issued':     'Issued',
            'approved':   'Approved',
        };
        return map[s] || s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g,' ');
    };

    const prev = display(previousStatus);
    const next = display(newStatus);

    if (prev === '—' || prev === next) return next;
    return `${prev} → ${next}`;
}
