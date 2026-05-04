/* ===================================
   USER DASHBOARD - JAVASCRIPT
   User workflow: Steps 2-8
   =================================== */

/* ===================================
   STATE — demo cargo data
   =================================== */
const userState = {
    user: {
        fullName: 'Ahmed Raza',
        email: 'ahmed.raza@user.shipyard.pk',
        userId: 'USR-2041',
        role: 'Registered User'
    },
    activityLog: [],
    cargo: [
        {
            cargoId: 'CS-0001',
            supplier: 'Oceanic Electronics Ltd.',
            type: 'Electronics',
            status: 'in-transit',
            statusLabel: 'In Transit',
            origin: 'Shanghai',
            destination: 'Karachi',
            eta: '15 May 2025',
            quantity: '240 units',
            timeline: {
                registered: '01 May 2025',
                inTransit: '05 May 2025',
                arrived: null,
                verified: null,
                completed: null
            }
        },
        {
            cargoId: 'CS-0002',
            supplier: 'Textile Export Group',
            type: 'Textiles',
            status: 'arrived',
            statusLabel: 'Arrived',
            origin: 'Mumbai',
            destination: 'Karachi',
            eta: '10 May 2025',
            quantity: '5 tons',
            timeline: {
                registered: '25 Apr 2025',
                inTransit: '29 Apr 2025',
                arrived: '10 May 2025',
                verified: null,
                completed: null
            }
        },
        {
            cargoId: 'CS-0003',
            supplier: 'Delta Machinery Co.',
            type: 'Machinery',
            status: 'registered',
            statusLabel: 'Registered',
            origin: 'Dubai',
            destination: 'Karachi',
            eta: '22 May 2025',
            quantity: '3 units',
            timeline: {
                registered: '08 May 2025',
                inTransit: null,
                arrived: null,
                verified: null,
                completed: null
            }
        },
        {
            cargoId: 'CS-0004',
            supplier: 'Gulf Pharma Exports',
            type: 'Pharmaceuticals',
            status: 'complete',
            statusLabel: 'Completed',
            origin: 'Riyadh',
            destination: 'Karachi',
            eta: '01 May 2025',
            quantity: '100 boxes',
            timeline: {
                registered: '18 Apr 2025',
                inTransit: '21 Apr 2025',
                arrived: '28 Apr 2025',
                verified: '30 Apr 2025',
                completed: '01 May 2025'
            }
        },
        {
            cargoId: 'CS-0005',
            supplier: 'Steel Works Int.',
            type: 'Raw Materials',
            status: 'verified',
            statusLabel: 'Verified',
            origin: 'Istanbul',
            destination: 'Karachi',
            eta: '12 May 2025',
            quantity: '20 tons',
            timeline: {
                registered: '02 May 2025',
                inTransit: '06 May 2025',
                arrived: '11 May 2025',
                verified: '12 May 2025',
                completed: null
            }
        }
    ],
    contracts: [
        {
            cargoId: 'CS-0001',
            type: 'Standard Delivery',
            approval: 'Approved',
            payment: 'Released',
            date: '05 May 2025'
        },
        {
            cargoId: 'CS-0002',
            type: 'Express Delivery',
            approval: 'Pending',
            payment: 'Held',
            date: '29 Apr 2025'
        },
        {
            cargoId: 'CS-0003',
            type: 'Standard Delivery',
            approval: 'Not Approved',
            payment: 'Not Released',
            date: '08 May 2025'
        },
        {
            cargoId: 'CS-0004',
            type: 'Bulk Shipment',
            approval: 'Approved',
            payment: 'Released',
            date: '21 Apr 2025'
        }
    ],
    certificates: [
        {
            partId: 'PART-0088',
            partName: 'Hydraulic Pump Seal',
            authority: 'Pakistan Standards & Quality Authority',
            issueDate: '10 Jan 2025',
            expiryDate: '10 Jan 2026',
            type: 'Quality Certificate',
            valid: true
        },
        {
            partId: 'PART-0099',
            partName: 'Steel Coupling Joint',
            authority: 'Bureau Veritas Pakistan',
            issueDate: '15 Feb 2025',
            expiryDate: '14 Feb 2026',
            type: 'Safety Certificate',
            valid: true
        },
        {
            partId: 'PART-0050',
            partName: 'Outdated Valve Assembly',
            authority: 'ISO Certification Body',
            issueDate: '01 Jan 2023',
            expiryDate: '01 Jan 2024',
            type: 'ISO Certificate',
            valid: false
        }
    ]
};

/* ===================================
   BOOT
   =================================== */
document.addEventListener('DOMContentLoaded', async function () {
    // ── Server-side session verification (route protection) ──
    const sessionOk = await ensureUserSession();
    if (!sessionOk) {
        return; // redirect already fired
    }

    await loadUserProfile(); // Await to ensure user data is loaded first
    initSidebarNavigation();
    initMobileMenu();
    initThemeSwitcher();
    initLogout();
    initSidebarProfileCard();
    initDashboardSection();
    initCargoSearch();
    initCargoTracking();
    initContractStatus();
    initCertificateVerification();
    initActivityHistory();
    populateAllCargoTable();
    populateAllContractsTable();
});

/* ===================================
   ROUTE PROTECTION — server-side session check
   =================================== */
async function ensureUserSession() {
    try {
        const resp = await fetch('../PHP/check_user_session.php', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store'
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.authenticated) {
                return true;
            }
        }
    } catch (e) {
        console.warn('Session check failed:', e);
    }
    // Not authenticated — redirect to login
    window.location.replace('login.html');
    return false;
}

/* ===================================
   SIDEBAR NAVIGATION
   =================================== */
function initSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item:not(.logout-btn)');
    const sections = document.querySelectorAll('.content-section');

    const sectionMeta = {
        dashboard:   { crumb: 'Dashboard / Overview',         heading: 'Dashboard' },
        search:      { crumb: 'Workflow / Cargo Search',       heading: 'Cargo Search' },
        tracking:    { crumb: 'Workflow / Cargo Tracking',     heading: 'Cargo Tracking' },
        contract:    { crumb: 'Workflow / Contract Status',    heading: 'Contract Status' },
        certificate: { crumb: 'Workflow / Certification',      heading: 'Certificate Verification' },
        activity:    { crumb: 'Workflow / Activity History',   heading: 'Activity History' }
    };

    const setTopbarContext = (key) => {
        const crumb   = document.querySelector('.topbar-crumb');
        const heading = document.querySelector('.topbar-copy h1');
        const meta = sectionMeta[key] || sectionMeta.dashboard;
        if (crumb)   crumb.textContent   = meta.crumb;
        if (heading) heading.textContent = meta.heading;
    };

    setTopbarContext('dashboard');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function () {
            const key = this.getAttribute('data-section');
            const sectionId = key + '-section';

            sidebarItems.forEach(i => {
                i.classList.remove('active');
                i.setAttribute('aria-selected', 'false');
            });

            sections.forEach(s => s.classList.remove('active'));

            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');

            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            setTopbarContext(key);

            // Close mobile sidebar
            const sidebar = document.getElementById('userSidebar');
            if (sidebar && window.innerWidth <= 767) {
                sidebar.classList.remove('active');
            }
        });
    });

    // "View All" button in dashboard links to search section
    const viewAllBtn = document.getElementById('viewAllCargoBtn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function () {
            const searchBtn = document.querySelector('.sidebar-item[data-section="search"]');
            if (searchBtn) searchBtn.click();
        });
    }

    // "Track this Cargo" result action
    document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'trackThisCargoBtn') {
            const cargoId = document.getElementById('resultCargoId').textContent;
            const trackBtn = document.querySelector('.sidebar-item[data-section="tracking"]');
            if (trackBtn) trackBtn.click();
            setTimeout(() => {
                const input = document.getElementById('trackingInput');
                if (input && cargoId && cargoId !== '--') {
                    input.value = cargoId;
                    document.getElementById('trackingSearchBtn').click();
                }
            }, 100);
        }

        if (e.target && e.target.id === 'viewContractBtn') {
            const cargoId = document.getElementById('resultCargoId').textContent;
            const contractBtn = document.querySelector('.sidebar-item[data-section="contract"]');
            if (contractBtn) contractBtn.click();
            setTimeout(() => {
                const input = document.getElementById('contractSearchInput');
                if (input && cargoId && cargoId !== '--') {
                    input.value = cargoId;
                    document.getElementById('contractSearchBtn').click();
                }
            }, 100);
        }
    });
}

/* ===================================
   MOBILE MENU
   =================================== */
function initMobileMenu() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('userSidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', function (e) {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }
}

/* ===================================
   THEME SWITCHER
   =================================== */
function initThemeSwitcher() {
    const btn = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeToggleIcon');

    const savedTheme = localStorage.getItem('userDashTheme') || 'dark';
    applyTheme(savedTheme);

    if (btn) {
        btn.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            applyTheme(isLight ? 'dark' : 'light');
        });
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
            if (btn) btn.setAttribute('aria-label', 'Switch to dark mode');
        } else {
            document.body.classList.remove('light-theme');
            if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
            if (btn) btn.setAttribute('aria-label', 'Switch to light mode');
        }
        localStorage.setItem('userDashTheme', theme);
    }
}

/* ===================================
   LOGOUT
   =================================== */
function initLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) {
        btn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await fetch('../PHP/user_logout.php', { method: 'POST', credentials: 'same-origin' });
                } catch (e) {
                    console.warn('Logout request failed, redirecting anyway.');
                }
                localStorage.removeItem('userSession');
                window.location.replace('login.html');
            }
        });
    }
}

/* ===================================
   USER PROFILE
   Fetches the currently logged-in user's
   profile from the server session
   =================================== */
async function loadUserProfile() {
    try {
        const resp = await fetch('../PHP/get_user_profile.php', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store'
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.data) {
                // Update userState with fetched data
                userState.user = {
                    fullName: data.data.fullName,
                    email: data.data.email,
                    userId: data.data.userId,
                    role: data.data.role
                };
            } else {
                console.error('Failed to load user profile:', data.message);
                return;
            }
        } else {
            console.error('Profile fetch failed with status:', resp.status);
            return;
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return;
    }

    // Display fetched user data in the UI
    const u = userState.user;

    const nameEl = document.getElementById('sidebarUserName');
    if (nameEl) nameEl.textContent = u.fullName.split(' ')[0];

    const fullNameEl = document.getElementById('profileFullName');
    if (fullNameEl) fullNameEl.textContent = u.fullName;

    const emailEl = document.getElementById('profileEmail');
    if (emailEl) emailEl.textContent = u.email;

    const userIdEl = document.getElementById('profileUserId');
    if (userIdEl) userIdEl.textContent = u.userId;

    const roleEl = document.getElementById('profileRole');
    if (roleEl) roleEl.textContent = u.role;
}

function initSidebarProfileCard() {
    const trigger = document.getElementById('sidebarProfileTrigger');
    const card    = document.getElementById('userProfileCard');

    if (!trigger || !card) return;

    const toggle = () => {
        const isHidden = card.hidden;
        card.hidden = !isHidden;
        trigger.setAttribute('aria-expanded', String(isHidden));
    };

    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
}

/* ===================================
   STEP 2: DASHBOARD SECTION
   =================================== */
function initDashboardSection() {
    // KPI counts
    document.getElementById('kpi-active').textContent =
        userState.cargo.filter(c => c.status === 'in-transit').length;

    document.getElementById('kpi-recent').textContent = userState.cargo.length;
    document.getElementById('kpi-contracts').textContent = userState.contracts.length;
    document.getElementById('kpi-certs').textContent = userState.certificates.length;

    // Refresh button
    const refreshBtn = document.getElementById('dashRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.innerHTML = '<i class="fas fa-rotate-right fa-spin"></i> Refreshing...';
            setTimeout(() => {
                refreshBtn.innerHTML = '<i class="fas fa-rotate-right"></i> Refresh';
                showNotification('Dashboard refreshed.', 'success');
            }, 900);
        });
    }

    const navRefresh = document.getElementById('navbarRefreshBtn');
    if (navRefresh) {
        navRefresh.addEventListener('click', () => {
            navRefresh.querySelector('i').classList.add('fa-spin');
            setTimeout(() => {
                navRefresh.querySelector('i').classList.remove('fa-spin');
            }, 800);
        });
    }

    // Quick search in dashboard
    const dashQuickInput = document.getElementById('dashQuickSearchInput');
    const dashQuickBtn   = document.getElementById('dashQuickSearchBtn');
    const dashQuickResult = document.getElementById('dashQuickResult');

    const doQuickSearch = () => {
        const id = dashQuickInput ? dashQuickInput.value.trim().toUpperCase() : '';
        if (!id) return;
        const cargo = findCargo(id);
        dashQuickResult.style.display = 'block';
        if (cargo) {
            dashQuickResult.innerHTML =
                `<strong class="job-id">${cargo.cargoId}</strong> &mdash; ${cargo.supplier} &middot; ` +
                `<span class="status-badge ${cargo.status}">${cargo.statusLabel}</span> &middot; ` +
                `${cargo.origin} → ${cargo.destination}`;
            logActivity('search', `Searched ${cargo.cargoId}`, 'Cargo Search & View');
        } else {
            dashQuickResult.textContent = 'No cargo found for "' + id + '".';
        }
    };

    if (dashQuickBtn) dashQuickBtn.addEventListener('click', doQuickSearch);
    if (dashQuickInput) {
        dashQuickInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') doQuickSearch();
        });
    }

    // Navbar search
    const navSearch = document.getElementById('navbarSearchInput');
    if (navSearch) {
        navSearch.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const id = navSearch.value.trim().toUpperCase();
                if (id) {
                    const searchSideBtn = document.querySelector('.sidebar-item[data-section="search"]');
                    if (searchSideBtn) searchSideBtn.click();
                    setTimeout(() => {
                        const si = document.getElementById('cargoSearchInput');
                        if (si) { si.value = id; document.getElementById('cargoSearchBtn').click(); }
                    }, 100);
                }
            }
        });
    }
}

/* ===================================
   STEP 3: CARGO SEARCH & VIEW
   =================================== */
function initCargoSearch() {
    const input    = document.getElementById('cargoSearchInput');
    const btn      = document.getElementById('cargoSearchBtn');
    const resultArea = document.getElementById('searchResultArea');
    const noResult   = document.getElementById('searchNoResult');

    const doSearch = () => {
        const id = input ? input.value.trim().toUpperCase() : '';
        if (!id) return;

        const cargo = findCargo(id);

        resultArea.style.display = 'none';
        noResult.style.display   = 'none';

        if (cargo) {
            document.getElementById('resultCargoId').textContent   = cargo.cargoId;
            document.getElementById('resultSupplier').textContent  = cargo.supplier;
            document.getElementById('resultType').textContent      = cargo.type;
            document.getElementById('resultOrigin').textContent    = cargo.origin;
            document.getElementById('resultDestination').textContent = cargo.destination;
            document.getElementById('resultEta').textContent       = cargo.eta;
            document.getElementById('resultQuantity').textContent  = cargo.quantity;

            const badge = document.getElementById('resultStatusBadge');
            badge.textContent  = cargo.statusLabel;
            badge.className    = 'status-badge ' + cargo.status;

            resultArea.style.display = 'block';
            logActivity('search', `Searched ${cargo.cargoId}`, 'Cargo Search & View');
        } else {
            noResult.style.display = 'block';
        }
    };

    if (btn)   btn.addEventListener('click', doSearch);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

function populateAllCargoTable() {
    const tbody = document.getElementById('allCargoTableBody');
    if (!tbody) return;

    tbody.innerHTML = userState.cargo.map(c => `
        <tr>
            <td><span class="job-id">${c.cargoId}</span></td>
            <td>${c.supplier}</td>
            <td>${c.type}</td>
            <td><span class="status-badge ${c.status}">${c.statusLabel}</span></td>
            <td>${c.destination}</td>
            <td>
                <button class="btn btn-ghost btn-sm cargo-action-btn" data-id="${c.cargoId}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.cargo-action-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const input = document.getElementById('cargoSearchInput');
            if (input) { input.value = id; document.getElementById('cargoSearchBtn').click(); }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

/* ===================================
   STEP 4: CARGO TRACKING
   =================================== */
function initCargoTracking() {
    const input  = document.getElementById('trackingInput');
    const btn    = document.getElementById('trackingSearchBtn');
    const result = document.getElementById('trackingResultArea');
    const noRes  = document.getElementById('trackingNoResult');

    const doTrack = () => {
        const id = input ? input.value.trim().toUpperCase() : '';
        if (!id) return;

        const cargo = findCargo(id);
        result.style.display = 'none';
        noRes.style.display  = 'none';

        if (cargo) {
            document.getElementById('trackingCargoId').textContent    = cargo.cargoId;
            document.getElementById('trackOriginCity').textContent    = cargo.origin;
            document.getElementById('trackDestCity').textContent      = cargo.destination;

            // Current status badge
            const statusBadge = document.getElementById('trackingCurrentStatus');
            statusBadge.textContent = cargo.statusLabel;
            statusBadge.className   = 'status-badge ' + cargo.status;

            // Fill timeline
            renderTrackingTimeline(cargo);

            result.style.display = 'block';
            logActivity('tracking', `Tracked ${cargo.cargoId}`, 'Cargo Tracking');
        } else {
            noRes.style.display = 'block';
        }
    };

    if (btn)   btn.addEventListener('click', doTrack);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') doTrack(); });
}

function renderTrackingTimeline(cargo) {
    const stepOrder = ['registered', 'in-transit', 'arrived', 'verified', 'completed'];
    const stepKeys  = ['registered', 'inTransit',  'arrived', 'verified', 'completed'];
    const dateIds   = ['step-registered-date', 'step-transit-date', 'step-arrived-date', 'step-verified-date', 'step-completed-date'];

    const steps      = document.querySelectorAll('.timeline-step');
    const connectors = document.querySelectorAll('.timeline-connector');

    // Determine current step index
    let currentIdx = 0;
    const statusMap = {
        'registered': 0,
        'in-transit': 1,
        'arrived':    2,
        'verified':   3,
        'complete':   4
    };
    currentIdx = statusMap[cargo.status] !== undefined ? statusMap[cargo.status] : 0;

    steps.forEach((step, i) => {
        step.classList.remove('active', 'done');
        if (i < currentIdx) step.classList.add('done');
        else if (i === currentIdx) step.classList.add('active');

        const dateEl = document.getElementById(dateIds[i]);
        const dateVal = cargo.timeline[stepKeys[i]];
        if (dateEl) dateEl.textContent = dateVal || '-';
    });

    connectors.forEach((con, i) => {
        con.classList.remove('done');
        if (i < currentIdx) con.classList.add('done');
    });

    // Route progress bar
    const pct = Math.round((currentIdx / (stepOrder.length - 1)) * 100);
    const progressBar = document.getElementById('routeProgressBar');
    const shipIcon    = document.getElementById('routeShipIcon');
    if (progressBar) progressBar.style.width = pct + '%';
    if (shipIcon)    shipIcon.style.left     = pct + '%';
}

/* ===================================
   STEP 5: CONTRACT STATUS
   =================================== */
function initContractStatus() {
    const input  = document.getElementById('contractSearchInput');
    const btn    = document.getElementById('contractSearchBtn');
    const result = document.getElementById('contractResultArea');
    const noRes  = document.getElementById('contractNoResult');

    const doSearch = () => {
        const id = input ? input.value.trim().toUpperCase() : '';
        if (!id) return;

        const contract = userState.contracts.find(c => c.cargoId.toUpperCase() === id);
        result.style.display = 'none';
        noRes.style.display  = 'none';

        if (contract) {
            document.getElementById('contractCargoId').textContent = contract.cargoId;
            document.getElementById('contractDate').textContent    = contract.date;
            document.getElementById('contractType').textContent    = contract.type;

            const approvalEl = document.getElementById('contractApprovalStatus');
            approvalEl.textContent = contract.approval;
            approvalEl.style.color = contract.approval === 'Approved' ? 'var(--success)'
                                   : contract.approval === 'Pending'  ? 'var(--warning)'
                                   : 'var(--danger)';

            const paymentEl = document.getElementById('contractPaymentStatus');
            paymentEl.textContent = contract.payment;
            paymentEl.style.color = contract.payment === 'Released' ? 'var(--success)'
                                  : contract.payment === 'Held'     ? 'var(--warning)'
                                  : 'var(--danger)';

            result.style.display = 'block';
            logActivity('contract', `Viewed contract for ${contract.cargoId}`, 'Contract Status');
        } else {
            noRes.style.display = 'block';
        }
    };

    if (btn)   btn.addEventListener('click', doSearch);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

function populateAllContractsTable() {
    const tbody = document.getElementById('allContractsTableBody');
    if (!tbody) return;

    tbody.innerHTML = userState.contracts.map(c => {
        const approvalClass = c.approval === 'Approved' ? 'complete'
                            : c.approval === 'Pending'  ? 'review'
                            : 'invalid';
        const paymentClass  = c.payment  === 'Released' ? 'complete'
                            : c.payment  === 'Held'     ? 'review'
                            : 'invalid';
        return `
        <tr>
            <td><span class="job-id">${c.cargoId}</span></td>
            <td>${c.type}</td>
            <td><span class="status-badge ${approvalClass}">${c.approval}</span></td>
            <td><span class="status-badge ${paymentClass}">${c.payment}</span></td>
            <td class="text-muted-sm">${c.date}</td>
        </tr>`;
    }).join('');
}

/* ===================================
   STEP 6: CERTIFICATE VERIFICATION
   =================================== */
function initCertificateVerification() {
    const input  = document.getElementById('certPartInput');
    const btn    = document.getElementById('certVerifyBtn');
    const result = document.getElementById('certResultArea');
    const noRes  = document.getElementById('certNoResult');

    const doVerify = () => {
        const id = input ? input.value.trim().toUpperCase() : '';
        if (!id) return;

        const cert = userState.certificates.find(c => c.partId.toUpperCase() === id);
        result.style.display = 'none';
        noRes.style.display  = 'none';

        if (cert) {
            // Verdict
            const verdictIcon  = document.getElementById('certVerdictIcon');
            const verdictTitle = document.getElementById('certVerdictTitle');
            const verdictSub   = document.getElementById('certVerdictSub');

            if (cert.valid) {
                verdictIcon.className  = 'cert-verdict-icon valid-icon';
                verdictIcon.innerHTML  = '<i class="fas fa-check-circle"></i>';
                verdictTitle.textContent = 'Certificate Valid';
                verdictSub.textContent   = 'This part certificate has been verified successfully.';
            } else {
                verdictIcon.className  = 'cert-verdict-icon invalid-icon';
                verdictIcon.innerHTML  = '<i class="fas fa-times-circle"></i>';
                verdictTitle.textContent = 'Certificate Invalid';
                verdictSub.textContent   = 'This certificate has expired or is not recognised.';
            }

            document.getElementById('certPartId').textContent    = cert.partId;
            document.getElementById('certPartName').textContent  = cert.partName;
            document.getElementById('certAuthority').textContent = cert.authority;
            document.getElementById('certIssueDate').textContent = cert.issueDate;
            document.getElementById('certExpiryDate').textContent = cert.expiryDate;
            document.getElementById('certType').textContent      = cert.type;

            result.style.display = 'block';
            logActivity('certificate', `Verified ${cert.partId} (${cert.valid ? 'Valid' : 'Invalid'})`, 'Certificate Verification');
        } else {
            noRes.style.display = 'block';
        }
    };

    if (btn)   btn.addEventListener('click', doVerify);
    if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') doVerify(); });
}

/* ===================================
   STEP 7: ACTIVITY HISTORY
   =================================== */
function initActivityHistory() {
    const filter = document.getElementById('activityTypeFilter');
    const clearBtn = document.getElementById('clearHistoryBtn');

    if (filter) {
        filter.addEventListener('change', () => renderFullActivityList(filter.value));
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear all activity history?')) {
                userState.activityLog = [];
                renderFullActivityList('all');
                updateDashActivityList();
                showNotification('Activity history cleared.', 'info');
            }
        });
    }

    renderFullActivityList('all');
}

function logActivity(type, label, section) {
    userState.activityLog.unshift({
        type,
        label,
        section,
        time: new Date()
    });

    renderFullActivityList(
        (document.getElementById('activityTypeFilter') || {}).value || 'all'
    );
    updateDashActivityList();
}

function renderFullActivityList(filterType) {
    const container = document.getElementById('fullActivityList');
    const noMsg     = document.getElementById('noActivityMsg');
    const countBadge = document.getElementById('activityCountBadge');
    if (!container) return;

    const iconMap = {
        search:      { icon: 'fa-search',             cls: 'info-item' },
        tracking:    { icon: 'fa-map-location-dot',   cls: 'warning-item' },
        contract:    { icon: 'fa-file-contract',       cls: 'info-item' },
        certificate: { icon: 'fa-shield-check',        cls: 'success-item' }
    };

    let log = userState.activityLog;
    if (filterType && filterType !== 'all') {
        log = log.filter(l => l.type === filterType);
    }

    if (countBadge) countBadge.textContent = log.length + (log.length === 1 ? ' entry' : ' entries');

    if (log.length === 0) {
        // Remove all items but keep the no-activity message
        Array.from(container.children).forEach(child => {
            if (!child.id || child.id !== 'noActivityMsg') child.remove();
        });
        if (noMsg) noMsg.style.display = 'flex';
        return;
    }

    if (noMsg) noMsg.style.display = 'none';

    const items = log.map(entry => {
        const meta = iconMap[entry.type] || { icon: 'fa-circle-info', cls: 'info-item' };
        return `
        <div class="activity-item ${meta.cls}">
            <span class="activity-icon"><i class="fas ${meta.icon}"></i></span>
            <div class="activity-copy">
                <strong>${entry.label}</strong>
                <span>${entry.section}</span>
            </div>
            <span class="activity-time">${timeAgo(entry.time)}</span>
        </div>`;
    }).join('');

    container.innerHTML = items + (noMsg ? noMsg.outerHTML : '');
    if (noMsg) noMsg.style.display = 'none';
}

function updateDashActivityList() {
    const container = document.getElementById('dashActivityList');
    if (!container) return;

    const iconMap = {
        search:      { icon: 'fa-search',           cls: 'info-item' },
        tracking:    { icon: 'fa-map-location-dot', cls: 'warning-item' },
        contract:    { icon: 'fa-file-contract',     cls: 'info-item' },
        certificate: { icon: 'fa-shield-check',      cls: 'success-item' }
    };

    const recent = userState.activityLog.slice(0, 5);

    if (recent.length === 0) return;

    container.innerHTML = recent.map(entry => {
        const meta = iconMap[entry.type] || { icon: 'fa-circle-info', cls: 'info-item' };
        return `
        <div class="activity-item ${meta.cls}">
            <span class="activity-icon"><i class="fas ${meta.icon}"></i></span>
            <div class="activity-copy">
                <strong>${entry.label}</strong>
                <span>${entry.section}</span>
            </div>
            <span class="activity-time">${timeAgo(entry.time)}</span>
        </div>`;
    }).join('');
}

/* ===================================
   UTILITIES
   =================================== */
function findCargo(id) {
    return userState.cargo.find(c => c.cargoId.toUpperCase() === id.toUpperCase()) || null;
}

function timeAgo(date) {
    const diffSec = Math.floor((Date.now() - date) / 1000);
    if (diffSec < 60)   return diffSec + 's ago';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
    return Math.floor(diffSec / 86400) + 'd ago';
}

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = 'notification notification-' + type;
    notif.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        padding: 12px 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 500;
        max-width: 320px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInNotif 0.25s ease;
    `;
    const iconMap = { success: 'fa-check-circle', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    notif.innerHTML = `<i class="fas ${iconMap[type] || 'fa-circle-info'}"></i> ${message}`;
    document.body.appendChild(notif);

    const style = document.createElement('style');
    style.textContent = `@keyframes slideInNotif { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`;
    document.head.appendChild(style);

    setTimeout(() => {
        notif.style.transition = 'opacity 0.3s ease';
        notif.style.opacity = '0';
        setTimeout(() => { notif.remove(); style.remove(); }, 350);
    }, 3200);
}
