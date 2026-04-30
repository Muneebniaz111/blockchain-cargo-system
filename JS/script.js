/**
 * Shipyard Cargo Management System
 * Main JavaScript File
 * Handles interactivity and dynamic functionality
 */

// ===================================
// DOM READY
// ===================================

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    setupNavbarScroll();
    setupSmoothScroll();
    setupFormValidation();
    setupIntersectionObserver();
    setupScrollAnimations();
    setupAccessibility();
}

// ===================================
// NAVBAR SCROLL EFFECTS
// ===================================

function setupNavbarScroll() {
    const navbar = document.querySelector('nav');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 100) {
            navbar.style.boxShadow = '0 8px 20px rgba(14, 76, 124, 0.3)';
            navbar.style.paddingTop = '0.8rem';
            navbar.style.paddingBottom = '0.8rem';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.15)';
            navbar.style.paddingTop = '1.2rem';
            navbar.style.paddingBottom = '1.2rem';
        }

        // Show/hide navbar on scroll
        if (scrollTop > lastScrollTop && scrollTop > 300) {
            // Scrolling down - hide navbar
            navbar.style.transform = 'translateY(-100%)';
            navbar.style.transition = 'transform 0.3s ease-in-out';
        } else {
            // Scrolling up - show navbar
            navbar.style.transform = 'translateY(0)';
            navbar.style.transition = 'transform 0.3s ease-in-out';
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
}

// ===================================
// SMOOTH SCROLL BEHAVIOR
// ===================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// ===================================
// FORM VALIDATION
// ===================================

function setupFormValidation() {
    // Set up Bootstrap form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                showNotification('Please fill in all required fields correctly', 'error');
            } else {
                showNotification('Form submitted successfully!', 'success');
            }
            form.classList.add('was-validated');
        }, false);
    });
}

// ===================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===================================

function setupIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                entry.target.style.opacity = '1';
            }
        });
    }, observerOptions);

    // Observe feature cards and sections
    document.querySelectorAll('.feature-card, .about-section, .hero-section').forEach(el => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s ease-in-out';
        observer.observe(el);
    });
}

// ===================================
// SCROLL ANIMATIONS
// ===================================

function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const animation = entry.target.getAttribute('data-animate');
                entry.target.style.animation = `${animation} 0.6s ease-out forwards`;
                animationObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    animatedElements.forEach(el => {
        animationObserver.observe(el);
    });
}

// ===================================
// NOTIFICATION SYSTEM
// ===================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.setAttribute('role', 'alert');
    notification.style.position = 'fixed';
    notification.style.top = '80px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    notification.style.borderRadius = '8px';

    notification.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    document.body.appendChild(notification);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ===================================
// ACCESSIBILITY ENHANCEMENTS
// ===================================

function setupAccessibility() {
    // Add keyboard navigation for buttons
    document.querySelectorAll('button, a.btn-cta').forEach(element => {
        element.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // Add focus visible styles
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
    });

    document.addEventListener('mousedown', function () {
        document.body.classList.remove('keyboard-nav');
    });

    // Update page title on tab blur
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            document.title = '⚡ Shipyard_PK - Come Back!';
        } else {
            document.title = 'Shipyard Cargo Management System - Blockchain Solutions';
        }
    });
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Scroll to top button functionality
 */
function createScrollToTopButton() {
    const button = document.createElement('button');
    button.id = 'scrollToTop';
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #0E4C7C 0%, #17A2B8 100%);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: none;
        z-index: 999;
        box-shadow: 0 4px 15px rgba(14, 76, 124, 0.3);
        transition: all 0.3s ease;
        font-size: 1.2rem;
    `;

    button.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-3px)';
        this.style.boxShadow = '0 8px 25px rgba(14, 76, 124, 0.5)';
    });

    button.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
    });

    button.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    document.body.appendChild(button);

    // Show/hide button based on scroll position
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 300) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    });

    return button;
}

/**
 * Load and cache assets
 */
function preloadAssets() {
    const links = document.querySelectorAll('link[rel="preload"]');
    if (links.length === 0) {
        // Add preload links if they don't exist
        const preloadLinks = [
            { href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css', as: 'style' },
            { href: 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css', as: 'style' }
        ];

        preloadLinks.forEach(link => {
            const el = document.createElement('link');
            el.rel = 'preload';
            el.as = link.as;
            el.href = link.href;
            document.head.appendChild(el);
        });
    }
}

/**
 * Get viewport dimensions
 */
function getViewportSize() {
    return {
        width: Math.max(document.documentElement.clientWidth, window.innerWidth),
        height: Math.max(document.documentElement.clientHeight, window.innerHeight)
    };
}

/**
 * Check if element is in viewport
 */
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// ===================================
// PERFORMANCE OPTIMIZATION
// ===================================

/**
 * Debounce function for scroll and resize events
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for frequent events
 */
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===================================
// RESPONSIVE DESIGN HELPERS
// ===================================

/**
 * Detect screen size
 */
function getScreenSize() {
    const width = window.innerWidth;
    if (width < 480) return 'xs';
    if (width < 768) return 'sm';
    if (width < 992) return 'md';
    if (width < 1200) return 'lg';
    return 'xl';
}

/**
 * Handle responsive design changes
 */
window.addEventListener('resize', debounce(function () {
    const screenSize = getScreenSize();
    document.documentElement.setAttribute('data-screen-size', screenSize);
}, 250));

// Initialize on first load
document.documentElement.setAttribute('data-screen-size', getScreenSize());

// ===================================
// EXTERNAL LIBRARY INITIALIZATION
// ===================================

/**
 * Initialize Bootstrap tooltips and popovers
 */
function initializeBootstrapComponents() {
    // Initialize tooltips
    $('[data-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-toggle="popover"]').popover();
}

// ===================================
// PAGE LOAD OPTIMIZATION
// ===================================

// Preload critical assets
preloadAssets();

// Create scroll to top button when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createScrollToTopButton);
} else {
    createScrollToTopButton();
}

// ===================================
// ERROR HANDLING
// ===================================

/**
 * Global error handler
 */
window.addEventListener('error', function (event) {
    console.error('An error occurred:', event.error);
    // Optionally log to server or monitoring service
});

/**
 * Unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// ===================================
// CUSTOM DATA ATTRIBUTES HANDLER
// ===================================

/**
 * Handle data attribute actions
 */
document.addEventListener('click', function (e) {
    const action = e.target.getAttribute('data-action');
    
    switch (action) {
        case 'scroll-to-top':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'open-modal':
            // Add modal opening logic here
            break;
        default:
            break;
    }
});

// ===================================
// EXPORT FOR MODULE USAGE
// ===================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        debounce,
        throttle,
        getScreenSize,
        isElementInViewport,
        getViewportSize
    };
}
