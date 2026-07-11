import { initDashboardSim } from './dashboard-sim.js';
import { initAppConsolidator } from './app-consolidator.js';
import { initPaymentSim } from './payment-sim.js';
import { initMapAnimation } from './map-animation.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize general UI features
  initWelcomeModal();
  initNavigationBar();
  initMetricCounters();
  initReviewsParallax();
  initAiDemos();
  initSetupModal();
  initScrollReveal();
  highlightActiveLink();
  initFaqAccordion();
  initFeatureSwitcher();
  initHeroCarousel();
  
  // Initialize dynamic modules (they will exit early if their target elements are not on the active page)
  initDashboardSim();
  initAppConsolidator();
  initPaymentSim();
  initMapAnimation();
});

// Homepage Features Tab Switcher
function initFeatureSwitcher() {
  const tabs = document.querySelectorAll('.feature-tab-btn');
  const panels = document.querySelectorAll('.feature-mock-panel');
  if (tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Activate clicked tab
      tab.classList.add('active');

      // Hide all panels
      panels.forEach(p => p.classList.remove('active'));
      
      // Show matching panel
      const targetId = tab.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// FAQ Accordion click toggler
function initFaqAccordion() {
  const triggers = document.querySelectorAll('.faq-trigger');
  if (triggers.length === 0) return;
  
  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.parentElement;
      const content = trigger.nextElementSibling;
      const isActive = parent.classList.contains('active');
      
      // Close other opened FAQs (optional, but makes it look super clean like Stripe)
      document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== parent) {
          item.classList.remove('active');
          const itemContent = item.querySelector('.faq-content');
          if (itemContent) itemContent.style.maxHeight = '0px';
        }
      });
      
      if (isActive) {
        parent.classList.remove('active');
        content.style.maxHeight = '0px';
      } else {
        parent.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
}

// Highlight the active page in navigation menu
function highlightActiveLink() {
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll('.nav-links a');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.includes(href.replace('.html', ''))) {
      link.classList.add('active');
    } else if (href === 'index.html' && (currentPath === '/' || currentPath.endsWith('index.html'))) {
      link.classList.add('active');
    }
  });
}

// Scroll Reveal Observer (Stripe/Apple style placement fade-ins)
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.scroll-reveal');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px' // Trigger slightly before entering fully
  });

  revealEls.forEach(el => observer.observe(el));
}

// Welcome Modal Region Selector
function initWelcomeModal() {
  const container = document.getElementById('welcome-modal-container');
  const buttons = document.querySelectorAll('.modal-opt-btn');
  const activeRegionBadges = document.querySelectorAll('.region-badge');

  if (!container) return;

  // Check if region is saved in sessionStorage
  const savedRegion = sessionStorage.getItem('nile-region');
  if (savedRegion) {
    applyRegion(savedRegion);
  } else {
    // Show modal
    container.classList.add('active');
    document.body.classList.add('modal-open');
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const region = btn.getAttribute('data-region');
      applyRegion(region);
      container.classList.remove('active');
      document.body.classList.remove('modal-open');
    });
  });

  activeRegionBadges.forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      container.classList.add('active');
      document.body.classList.add('modal-open');
    });
  });

  function applyRegion(region) {
    sessionStorage.setItem('nile-region', region);
    
    // Clear previous region classes
    document.body.classList.remove('region-ng', 'region-uk', 'region-us', 'region-gh', 'region-global');
    document.body.classList.add(`region-${region}`);

    // Update active badge text and flag
    const regionNames = {
      ng: 'Nigeria',
      uk: 'United Kingdom',
      us: 'United States'
    };
    
    activeRegionBadges.forEach(badge => {
      badge.innerHTML = `${regionNames[region] || 'Region'} <span style="font-size: 0.7rem; margin-left: 0.25rem;">▾</span>`;
    });

    // Fire event for other modules to update
    document.dispatchEvent(new CustomEvent('regionChanged', { detail: { region } }));
  }
}

// Navigation Show/Hide on Scroll Up/Down
function initNavigationBar() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  let lastScrollY = window.scrollY;
  const delta = 10;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    // Do nothing if scroll change is tiny
    if (Math.abs(currentScrollY - lastScrollY) < delta) return;

    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      // Scroll down - hide nav
      nav.classList.add('nav-hidden');
    } else {
      // Scroll up - show nav
      nav.classList.remove('nav-hidden');
    }

    lastScrollY = currentScrollY;
  });
}

// Metric Numbers Counting Animation
function initMetricCounters() {
  const metricNumEls = document.querySelectorAll('.metric-num');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const targetValue = parseInt(el.getAttribute('data-target'), 10);
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        animateCount(el, targetValue, prefix, suffix);
        observer.unobserve(el); // Animate only once
      }
    });
  }, { threshold: 0.5 });

  metricNumEls.forEach(el => observer.observe(el));

  function animateCount(element, target, prefix, suffix) {
    let start = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad formula
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeProgress * target);

      element.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
      }
    }

    requestAnimationFrame(update);
  }
}

// Reviews Parallax scroll effect
function initReviewsParallax() {
  const cards = document.querySelectorAll('.review-card');
  if (cards.length === 0) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    cards.forEach((card, index) => {
      const speed = (index + 1) * 0.04;
      const yOffset = (scrollY * speed) % 40 - 20; // limit displacement
      card.style.transform = `translateY(${yOffset}px)`;
    });
  });
}

// AI Typing Demos
const AI_RESPONSES = {
  desc: `**Lavender Chamomile Soap**\n\nIndulge in tranquility. Crafted with pure lavender essential oil and organic chamomile flowers, this nourishing soap bar creates a rich, creamy lather that gently cleanses while calming your senses.\n\n*Ingredients: Saponified Olive Oil, Organic Shea Butter, Lavender Oil, Chamomile Buds.*`,
  email: `Subject: We noticed you left something behind... 💜\n\nHi there,\n\nWe saw you looking at our new Lavender Chamomile Soap. It's one of our favorites, and we'd love for you to experience it.\n\nHere is a 10% discount code to help you complete your order: **WELCOME10**\n\n👉 [Return to your cart]`,
  reply: `Hi Sarah,\n\nThanks for reaching out! Your order #1084 containing the Silk Robe and Lavender Soap has been dispatched from our Lagos warehouse. You can track your shipment here: [nile.delivery/track/NL-83726]\n\nLet us know if you need anything else!\n\n- Customer Support`,
  sales: `**Sales Summary: Last 7 Days**\n\n• **Total Revenue**: ₦185,000 (+14% vs last week)\n• **Top Selling Item**: Lavender Soap (34 units)\n• **Average Basket Size**: ₦12,500\n• **Conversion Rate**: 3.4% (up from 2.9%)\n\n*Nile AI Suggestion: Launch a bundle of Lavender Soap + Face Cream to lift margins.*`
};

function initAiDemos() {
  const items = document.querySelectorAll('.ai-ex-item');
  const typingEl = document.getElementById('ai-typing-output');
  let currentTimer = null;

  if (items.length === 0 || !typingEl) return;

  // Load first demo by default
  triggerTyping(AI_RESPONSES.desc);

  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const type = item.getAttribute('data-type');
      triggerTyping(AI_RESPONSES[type]);
    });
  });

  function triggerTyping(fullText) {
    if (currentTimer) clearInterval(currentTimer);
    
    typingEl.textContent = '';
    let index = 0;
    
    currentTimer = setInterval(() => {
      if (index < fullText.length) {
        typingEl.textContent += fullText[index];
        index++;
      } else {
        clearInterval(currentTimer);
      }
    }, 12);
  }
}

// Sign Up and Checkout Setup Flow Modals
function initSetupModal() {
  const container = document.getElementById('setup-modal-container');
  const triggerBtns = document.querySelectorAll('.trigger-setup-modal');
  const closeBtn = document.getElementById('setup-modal-close');
  const form = document.getElementById('setup-form');
  const planSelect = document.getElementById('setup-plan-select');

  if (!container || !closeBtn || !form) return;

  triggerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const plan = btn.getAttribute('data-plan');
      if (plan && planSelect) {
        planSelect.value = plan;
      }
      
      container.classList.add('active');
      document.body.classList.add('modal-open');
    });
  });

  closeBtn.addEventListener('click', () => {
    container.classList.remove('active');
    document.body.classList.remove('modal-open');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('setup-email').value;
    const plan = planSelect ? planSelect.value : 'growth';

    alert(`Success! We've registered your email (${email}) for the ${plan.toUpperCase()} plan. Check your inbox to begin building your store on Nile!`);
    
    container.classList.remove('active');
    document.body.classList.remove('modal-open');
    form.reset();
  });
}

// Hero Section Image Carousel Animation
function initHeroCarousel() {
  const carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots = carousel.querySelectorAll('.carousel-dot');
  let currentIndex = 0;
  let intervalId = null;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    currentIndex = index;
  }

  function nextSlide() {
    let nextIndex = (currentIndex + 1) % slides.length;
    showSlide(nextIndex);
  }

  function startAutoCycle() {
    stopAutoCycle();
    intervalId = setInterval(nextSlide, 4500); // cycle every 4.5 seconds
  }

  function stopAutoCycle() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // Set up dot click listeners for indicators
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      showSlide(i);
      startAutoCycle(); // reset timer on manual selection
    });
  });

  // Start auto-cycling
  startAutoCycle();
}


// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
      document.body.classList.toggle('no-scroll');
      
      // Toggle SVG Icon (Hamburger to Close)
      const isOpen = navLinks.classList.contains('mobile-open');
      if (isOpen) {
        mobileBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      } else {
        mobileBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
      }
    });
  }
});
