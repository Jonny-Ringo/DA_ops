import { initAnalytics } from './analytics.js'
import { initContactForm } from './contact-form.js'
import { initProjectStrip } from './project-strip.js'

// ==========================================
// NAVIGATION ACTIVE STATE
// ==========================================

function updateNavActiveState() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        const target = new URL(link.href);
        const samePage = currentPath === target.pathname || (currentPath === '/index.html' && target.pathname === '/');
        const isActive = samePage && (target.hash ? target.hash === location.hash : !location.hash);
        link.classList.toggle('active', isActive);
        if (isActive) link.setAttribute('aria-current', target.hash ? 'location' : 'page');
        else link.removeAttribute('aria-current');
    });
}

// ==========================================
// MOBILE MENU
// ==========================================

function initMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const links = document.querySelector('.nav-links');
    if (!btn || !links) return;

    const close = (restoreFocus = false) => {
        links.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        if (restoreFocus) btn.focus();
    };

    btn.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        btn.setAttribute('aria-expanded', isOpen);
    });

    // Close on nav link click
    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            close();
        });
    });

    // Close on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('.nav-content')) {
            close();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && links.classList.contains('open')) close(true);
    });
    document.addEventListener('focusin', event => {
        if (!event.target.closest('.nav-content')) close();
    });
    window.matchMedia('(max-width: 1024px)').addEventListener('change', () => close());
}

// ==========================================
// NAV SCROLL BEHAVIOR
// ==========================================

function handleNavScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
        nav.style.background = window.pageYOffset > 50
            ? 'rgba(13, 17, 23, 0.99)'
            : 'rgba(13, 17, 23, 0.96)';
    }, { passive: true });
}

// ==========================================
// SCROLL ANIMATIONS
// ==========================================

function initScrollAnimations() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up').forEach(el => {
        observer.observe(el);
        el.classList.add('reveal-pending');
    });
}

// ==========================================
// SMOOTH SCROLLING
// ==========================================

function initSmoothScrolling() {
    document.querySelectorAll('a[href]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.classList.contains('skip-link')) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const url = new URL(this.href);
            if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
            const target = document.getElementById(url.hash.slice(1));
            if (target) {
                e.preventDefault();
                history.pushState(null, '', url.hash);
                target.setAttribute('tabindex', '-1');
                target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
                target.focus({ preventScroll: true });
                updateNavActiveState();
            }
        });
    });
}

// ==========================================
// EXTERNAL LINKS
// ==========================================

function handleExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        if (!link.hostname.includes(window.location.hostname)) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

// ==========================================
// INIT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initAnalytics();
    initContactForm();
    initProjectStrip();
    updateNavActiveState();
    window.addEventListener('hashchange', updateNavActiveState);
    initMobileMenu();
    handleNavScroll();
    initScrollAnimations();
    initSmoothScrolling();
    handleExternalLinks();
});

export { updateNavActiveState, initSmoothScrolling, handleNavScroll, initScrollAnimations, handleExternalLinks };
