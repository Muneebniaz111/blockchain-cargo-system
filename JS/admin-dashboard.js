/* ===================================
   ADMIN DASHBOARD - JAVASCRIPT
   =================================== */

const dashboardState = {
    registeredCount: 5,
    trackingUpdates: 3,
    contractsExecuted: 2,
    certificatesIssued: 2,
    auditLogs: 5,
    recentRegistrations: [
        {
            cargoId: 'CS-0001',
            supplier: 'Oceanic Electronics Ltd.',
            cargoType: 'Electronics',
            statusClass: 'complete',
            statusText: 'Registered',
            paymentReleased: true,
            paymentUpdatedAt: Date.now() - 300000,
            origin: 'Shanghai',
            destination: 'Karachi'
        },
        {
            cargoId: 'CS-0002',
            supplier: 'Textile Export Group',
            cargoType: 'Textiles',
            statusClass: 'complete',
            statusText: 'Registered',
            paymentReleased: false,
            paymentUpdatedAt: Date.now() - 240000,
            origin: 'Mumbai',
            destination: 'Karachi'
        },
        {
            cargoId: 'CS-0003',
            supplier: 'Delta Machinery Co.',
            cargoType: 'Machinery',
            statusClass: 'queued',
            statusText: 'Pending',
            paymentReleased: false,
            paymentUpdatedAt: Date.now() - 180000,
            origin: 'Dubai',
            destination: 'Karachi'
        }
    ]
};

const seededAdminProfiles = [
    {
        full_name: 'Muneeb Niaz',
        email: 'muneeb@shipyard.pk',
        contact_number: '+923001234567',
        cnic: '35201-1234567-1',
        user_role: 'admin'
    },
    {
        full_name: 'Rana M. Muzammil',
        email: 'rana@shipyard.pk',
        contact_number: '+923001234568',
        cnic: '35201-1234568-1',
        user_role: 'admin'
    },
    {
        full_name: 'Mohsin Akhtar',
        email: 'mohsin@shipyard.pk',
        contact_number: '+923001234569',
        cnic: '35201-1234569-1',
        user_role: 'admin'
    }
];

document.addEventListener('DOMContentLoaded', function() {
    if (!ensureAdminSession()) {
        return;
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
        audit: { crumb: 'Workflow / Audit Monitoring', heading: 'Audit Monitoring' }
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

function handleCargoRegistration() {
    const cargoId = document.getElementById('cargoId').value;
    const cargoType = document.getElementById('cargoType').value;
    const supplier = document.getElementById('supplier').value;
    const quantity = document.getElementById('quantity').value;
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const eta = document.getElementById('eta').value;

    // Validation
    if (!cargoId || !cargoType || !supplier || !quantity || !origin || !destination || !eta) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Simulate registration
    console.log('Cargo Registration:', {
        cargoId,
        cargoType,
        supplier,
        quantity,
        origin,
        destination,
        eta
    });

    showNotification(`Cargo ${cargoId} registered successfully! Blockchain recording in progress...`, 'success');

    dashboardState.registeredCount += 1;
    dashboardState.recentRegistrations.unshift({
        cargoId,
        supplier,
        cargoType,
        statusClass: 'complete',
        statusText: 'Registered',
        paymentReleased: false,
        paymentUpdatedAt: Date.now(),
        origin,
        destination
    });

    prependTrackingRow(cargoId, cargoType, origin, destination);
    createAuditLog('Registration', cargoId, `Cargo registered - ${cargoType} shipment`);
    renderDashboardMonitoring();
    
    // Reset form
    document.getElementById('cargoRegistrationForm').reset();

    // Add to recent activity
    addActivityLog(`Cargo registration: ${cargoId} (${cargoType})`);
}

function handleSmartContract() {
    const cargoId = document.getElementById('contractCargoId').value;
    const contractType = document.getElementById('contractType').value;
    const walletAddr = document.getElementById('contractWallet').value;
    const customsApproval = document.getElementById('customsApproval').checked;

    if (!cargoId || !contractType || !walletAddr) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    console.log('Smart Contract Execution:', {
        cargoId,
        contractType,
        walletAddr,
        customsApproval
    });

    // Simulate blockchain transaction
    const txHash = '0x' + Math.random().toString(16).substr(2, 8).toUpperCase();
    
    showNotification(
        `Contract executed successfully! Blockchain ID: ${txHash}`,
        'success'
    );

    // Add to history
    const historyList = document.querySelector('.history-list');
    if (historyList) {
        const newItem = document.createElement('div');
        newItem.className = 'history-item success';
        newItem.innerHTML = `
            <div class="history-icon">
                <i class="fas fa-check"></i>
            </div>
            <div class="history-content">
                <p><strong>${contractType.charAt(0).toUpperCase() + contractType.slice(1)} - ${cargoId}</strong></p>
                <small>${new Date().toLocaleString()} | Blockchain ID: ${txHash}</small>
            </div>
        `;
        historyList.insertBefore(newItem, historyList.firstChild);
    }

    dashboardState.contractsExecuted += 1;
    if (contractType === 'payment') {
        setCargoPaymentStatus(cargoId, true);
        addActivityLog(`Payment released: ${cargoId}`);
    }
    createAuditLog('Contract', cargoId, `${toSentenceCase(contractType)} contract executed`);
    renderDashboardMonitoring();

    document.getElementById('contractForm').reset();
    addActivityLog(`Smart contract executed: ${contractType} for ${cargoId}`);
}

function handleCertification() {
    const cargoId = document.getElementById('certCargoId').value;
    const supplier = document.getElementById('certSupplier').value;
    const certType = document.getElementById('certType').value;
    const description = document.getElementById('certDescription').value;

    if (!cargoId || !supplier || !certType) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    console.log('Certificate Issuance:', {
        cargoId,
        supplier,
        certType,
        description
    });

    // Generate certificate number
    const certNumber = Math.floor(Math.random() * 10000).toString().padStart(3, '0');

    showNotification(`Certificate #${certNumber} issued successfully for ${cargoId}`, 'success');

    // Add to certificates list
    const certList = document.querySelector('.certificates-list');
    if (certList) {
        const newCert = document.createElement('div');
        newCert.className = 'cert-item';
        newCert.innerHTML = `
            <div class="cert-icon">
                <i class="fas fa-scroll"></i>
            </div>
            <div class="cert-info">
                <p><strong>Certificate #${certNumber} - ${cargoId}</strong></p>
                <small>${certType} | Issued: ${new Date().toLocaleDateString()}</small>
            </div>
            <div class="cert-actions">
                <button class="btn-icon" title="Download">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;
        
        // Insert before the heading
        const heading = certList.querySelector('h4');
        certList.insertBefore(newCert, heading.nextSibling);
    }

    dashboardState.certificatesIssued += 1;
    createAuditLog('Certificate', cargoId, `${toSentenceCase(certType)} certificate issued`);
    renderDashboardMonitoring();

    document.getElementById('certificationForm').reset();
    addActivityLog(`Certificate issued: ${certType} for ${cargoId}`);
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
    if (auditSearch) auditSearch.addEventListener('keyup', filterAuditLogs);
    if (auditTypeFilter) auditTypeFilter.addEventListener('change', filterAuditLogs);
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

function saveCargoUpdate() {
    const modal = document.getElementById('updateModal');
    const newStatus = document.getElementById('newStatus').value;
    const location = document.getElementById('currentLocation').value;
    const notes = document.getElementById('updateNotes').value;
    const cargoId = modal.dataset.cargoId;

    if (!newStatus) {
        showNotification('Please select a status', 'error');
        return;
    }

    console.log('Cargo Update:', {
        cargoId,
        newStatus,
        location,
        notes
    });

    // Update table row
    const table = document.querySelector('#trackingTable tbody');
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.querySelector('td:first-child').textContent === cargoId) {
                const statusCell = row.querySelector('.status-badge');
                statusCell.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace('-', ' ');
                statusCell.className = `status-badge ${newStatus}`;
            }
        });
    }

    dashboardState.trackingUpdates += 1;
    createAuditLog('Update', cargoId, `Status updated to ${toSentenceCase(newStatus)}`);
    renderDashboardMonitoring();

    showNotification(`Cargo ${cargoId} status updated to ${newStatus}`, 'success');
    addActivityLog(`Cargo tracking updated: ${cargoId} -> ${newStatus}`);

    closeUpdateModal();
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

function createAuditLog(action, cargoId, details) {
    const auditBody = document.querySelector('.audit-table tbody');
    if (!auditBody) {
        return;
    }

    dashboardState.auditLogs += 1;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const actionClass = action.toLowerCase();
    const txHash = `0x${Math.random().toString(16).slice(2, 8)}...`;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${timestamp}</td>
        <td><span class="action-badge ${actionClass}">${action}</span></td>
        <td>Admin</td>
        <td>${cargoId || '-'}</td>
        <td>${details}</td>
        <td><code>${txHash}</code></td>
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
    const table = document.querySelector('.audit-table tbody');

    if (!table) return;

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const action = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        const details = row.querySelector('td:nth-child(5)').textContent.toLowerCase();

        const matchesSearch = details.includes(searchInput);
        const matchesType = typeFilter === '' || action.includes(typeFilter);

        row.style.display = matchesSearch && matchesType ? '' : 'none';
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

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        showNotification('Logging out...', 'info');

        // Frontend-only logout for current UI stage
        sessionStorage.clear();
        localStorage.removeItem('adminSession');

        setTimeout(function() {
            window.location.href = 'admin-login.html';
        }, 700);
    }
}

function ensureAdminSession() {
    const isSessionActive = sessionStorage.getItem('adminSession') === 'active';
    if (isSessionActive) {
        return true;
    }

    window.location.href = 'admin-login.html';
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
    const profileTrigger = document.getElementById('sidebarProfileTrigger');
    const profileCard    = document.getElementById('adminProfileCard');
    const sidebar        = document.getElementById('adminSidebar');

    if (!profileTrigger || !profileCard) { return; }

    // ── Move card to <body> so sidebar overflow never clips it ──
    document.body.appendChild(profileCard);

    // ── Fixed base styles; position & display are set by positionCard() ──
    profileCard.style.cssText = [
        'position:fixed',
        'z-index:2000',
        'width:270px',
        'display:none',
        'flex-direction:column',
        'gap:0',
        'border-radius:12px',
        'padding:0',
        'background:var(--surface,#0d2438)',
        'border:1px solid var(--border-color,rgba(255,255,255,0.15))',
        'box-shadow:0 12px 40px rgba(0,0,0,0.55)',
        'box-sizing:border-box',
        'overflow:hidden',
        'pointer-events:auto'
    ].join(';');

    // ── Compute the best position for the card ──
    const positionCard = () => {
        const trigRect  = profileTrigger.getBoundingClientRect();
        const sideRect  = sidebar ? sidebar.getBoundingClientRect() : { right: 160, left: 0, width: 160 };
        const vpW       = window.innerWidth;
        const vpH       = window.innerHeight;
        const CARD_W    = 270;
        const GAP       = 10;   // gap between sidebar edge and card
        const MARGIN    = 10;   // min distance from viewport edges

        // ── Horizontal: always open to the RIGHT of sidebar ──
        // On very small screens where sidebar is hidden/overlay, open above trigger instead
        const isMobileOverlay = window.matchMedia('(max-width: 767px)').matches;

        let left, top;

        if (isMobileOverlay) {
            // Mobile: centre the card horizontally on screen
            left = Math.max(MARGIN, (vpW - CARD_W) / 2);
        } else {
            // Desktop/tablet: card opens to the right of the sidebar
            left = sideRect.right + GAP;
            // If no room on the right, flip to the left of the sidebar
            if (left + CARD_W > vpW - MARGIN) {
                left = Math.max(MARGIN, sideRect.left - CARD_W - GAP);
            }
        }

        // Clamp horizontally
        left = Math.max(MARGIN, Math.min(left, vpW - CARD_W - MARGIN));

        // ── Vertical: measure card height, open UPWARD from trigger bottom ──
        profileCard.style.display = 'flex';
        const CARD_H = profileCard.offsetHeight || 240; // fallback if not rendered yet

        if (isMobileOverlay) {
            // Mobile: anchor to bottom of trigger, open upward
            top = trigRect.top - CARD_H - GAP;
            // If that goes off the top, just stack below
            if (top < MARGIN) {
                top = trigRect.bottom + GAP;
            }
        } else {
            // Desktop: primary strategy — open UPWARD so it never falls off screen
            // Bottom of card aligns with bottom of trigger row
            top = trigRect.bottom - CARD_H;

            // If that goes above the viewport, push down to MARGIN
            if (top < MARGIN) {
                top = MARGIN;
            }

            // If card still overflows bottom (short viewport), cap it
            if (top + CARD_H > vpH - MARGIN) {
                top = Math.max(MARGIN, vpH - CARD_H - MARGIN);
            }
        }

        profileCard.style.left = left + 'px';
        profileCard.style.top  = top  + 'px';
    };

    const openCard = () => {
        profileCard.removeAttribute('hidden');
        positionCard();
        profileTrigger.setAttribute('aria-expanded', 'true');
    };

    const closeCard = () => {
        profileCard.setAttribute('hidden', '');
        profileCard.style.display = 'none';
        profileTrigger.setAttribute('aria-expanded', 'false');
    };

    const toggleCard = () => {
        if (profileCard.hasAttribute('hidden') || profileCard.style.display === 'none') {
            openCard();
        } else {
            closeCard();
        }
    };

    profileTrigger.addEventListener('click',   e => { e.stopPropagation(); toggleCard(); });
    profileTrigger.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(); }
    });

    document.addEventListener('click', e => {
        if (profileCard.style.display !== 'none'
            && !profileCard.contains(e.target)
            && !profileTrigger.contains(e.target)) {
            closeCard();
        }
    });

    const reposition = () => {
        if (profileCard.style.display !== 'none') { positionCard(); }
    };
    window.addEventListener('resize',  reposition);
    window.addEventListener('scroll',  reposition, { passive: true });
    if (sidebar) { sidebar.addEventListener('scroll', reposition, { passive: true }); }

    // Start hidden
    profileCard.setAttribute('hidden', '');
    profileCard.style.display = 'none';

    fetchCurrentAdminProfile().then(profile => renderAdminProfileCard(profile))
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

            // Re-run dashboard monitoring init to refresh KPI data
            if (typeof initDashboardMonitoring === 'function') {
                initDashboardMonitoring();
            }

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
                    if (typeof initDashboardMonitoring === 'function') {
                        initDashboardMonitoring();
                    }
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


