import { chatBubbles } from '../data/chat-bubbles.js'
import { initAnalytics } from './analytics.js'
import { initContactForm } from './contact-form.js'
import { updateSiteMetadata } from './site-url.js'
import { initProjectStrip } from './project-strip.js'

// ==========================================
// CHAT BUBBLE RENDERER
// ==========================================

function renderChatCloud() {
    const cloud = document.querySelector('.chat-cloud')
    if (!cloud) return

    chatBubbles.forEach(bubble => {
        const div = document.createElement('div')
        div.className = `chat-bubble-bg ${bubble.class}`

        bubble.exchanges.forEach((exchange, index) => {
            const isAgent = exchange.speaker === 'agent'
            const isFollowUp = index > 0 && !isAgent

            const label = document.createElement('span')
            label.className = isAgent
                ? 'bubble-sender agent'
                : isFollowUp
                    ? 'bubble-sender customer follow-up'
                    : 'bubble-sender customer'
            label.textContent = isAgent ? 'Agent' : 'User'

            const p = document.createElement('p')
            p.textContent = `"${exchange.text}"`

            div.appendChild(label)
            div.appendChild(p)
        })

        cloud.appendChild(div)
    })

    // Seeded scatter keeps the composition stable while checking actual card sizes.
    function placeBubbles() {
        const width = cloud.clientWidth
        const height = cloud.clientHeight
        const limit = width <= 600 ? 4 : width <= 1100 ? 8 : 12
        let seed = 42
        const random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
            return seed / 4294967296
        }
        const placed = []

        Array.from(cloud.children).forEach((bubble, index) => {
            bubble.hidden = index >= limit
            if (bubble.hidden) return

            const cardWidth = Math.min(210 + random() * 70, width <= 600 ? width * 0.43 : width * 0.29)
            const angle = (random() - 0.5) * 5
            bubble.style.width = `${cardWidth}px`
            bubble.style.transform = `rotate(${angle}deg)`
            const cardHeight = bubble.offsetHeight
            const radians = Math.abs(angle) * Math.PI / 180
            const boundsWidth = cardWidth * Math.cos(radians) + cardHeight * Math.sin(radians)
            const boundsHeight = cardHeight * Math.cos(radians) + cardWidth * Math.sin(radians)
            const inset = 12
            const gap = 18
            let position

            for (let attempt = 0; attempt < 200; attempt++) {
                const x = inset + random() * Math.max(0, width - boundsWidth - inset * 2)
                const y = inset + random() * Math.max(0, height - boundsHeight - inset * 2)
                const rect = { x, y, right: x + boundsWidth, bottom: y + boundsHeight }
                if (rect.right > width - inset || rect.bottom > height - inset) continue
                const overlaps = placed.some(other =>
                    rect.x < other.right + gap && rect.right + gap > other.x &&
                    rect.y < other.bottom + gap && rect.bottom + gap > other.y
                )
                if (!overlaps) { position = rect; break }
            }

            // Leave some breathing room rather than forcing every example to fit.
            bubble.hidden = !position
            if (!position) return
            placed.push(position)
            bubble.style.left = `${position.x + (boundsWidth - cardWidth) / 2}px`
            bubble.style.top = `${position.y + (boundsHeight - cardHeight) / 2}px`
        })
    }

    placeBubbles()
    if ('ResizeObserver' in window) {
        new ResizeObserver(placeBubbles).observe(cloud)
    } else {
        window.addEventListener('resize', placeBubbles)
    }
    document.fonts?.ready.then(placeBubbles)
}

// ==========================================
// NAVIGATION ACTIVE STATE
// ==========================================

function updateNavActiveState() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        const linkPath = new URL(link.href).pathname;
        const isActive = currentPath === linkPath || (currentPath === '/' && linkPath === '/');
        link.classList.toggle('active', isActive);
    });
}

// ==========================================
// MOBILE MENU
// ==========================================

function initMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const links = document.querySelector('.nav-links');
    if (!btn || !links) return;

    btn.addEventListener('click', () => {
        const isOpen = links.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        btn.setAttribute('aria-expanded', isOpen);
    });

    // Close on nav link click
    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            links.classList.remove('open');
            btn.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        });
    });

    // Close on outside click
    document.addEventListener('click', e => {
        if (!e.target.closest('.nav-content')) {
            links.classList.remove('open');
            btn.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
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
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

// ==========================================
// SMOOTH SCROLLING
// ==========================================

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') { e.preventDefault(); return; }
            const target = document.getElementById(href.substring(1));
            if (target) {
                e.preventDefault();
                const navH = document.querySelector('.nav')?.offsetHeight || 0;
                window.scrollTo({ top: target.offsetTop - navH - 20, behavior: 'smooth' });
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
    updateSiteMetadata();
    initAnalytics();
    initContactForm();
    initProjectStrip();
    renderChatCloud();
    updateNavActiveState();
    initMobileMenu();
    handleNavScroll();
    initScrollAnimations();
    initSmoothScrolling();
    handleExternalLinks();
});

export { updateNavActiveState, initSmoothScrolling, handleNavScroll, initScrollAnimations, handleExternalLinks };
