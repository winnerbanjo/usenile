const measurementId = getMeasurementId();
const allowedEvents = new Set([
  'pricing_click',
  'get_started_click',
  'whatsapp_click',
  'signup_started',
  'signup_completed',
  'blog_article_view',
  'newsletter_signup',
  'app_download_click'
]);

let analyticsReady = false;

export function initAnalytics() {
  if (!measurementId || analyticsReady || typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false
  });

  loadGoogleAnalyticsScript();
  trackPageView();
  window.addEventListener('popstate', trackPageView);
  document.addEventListener('click', trackTrackedClick);
  document.addEventListener('submit', trackTrackedSubmit);
  analyticsReady = true;
}

export function trackEvent(name, params = {}) {
  if (!measurementId || !allowedEvents.has(name) || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, {
    page_location: window.location.href,
    page_path: window.location.pathname,
    ...params
  });
}

export function trackPageView(path = window.location.pathname + window.location.search) {
  if (!measurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: path
  });
}

function loadGoogleAnalyticsScript() {
  if (document.querySelector(`[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`)) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

function trackTrackedClick(event) {
  const link = event.target.closest?.('a, button');
  if (!link) return;

  const href = link.getAttribute('href') || '';
  const text = link.textContent.trim().toLowerCase();
  const eventName = link.dataset.analyticsEvent || inferClickEvent(href, text, link);
  if (!eventName) return;

  trackEvent(eventName, {
    link_url: href || undefined,
    link_text: text || undefined
  });
}

function trackTrackedSubmit(event) {
  if (event.target.matches?.('.newsletter-form')) {
    trackEvent('newsletter_signup');
  }
}

function inferClickEvent(href, text, element) {
  if (href.includes('wa.me') || href.includes('whatsapp') || text.includes('whatsapp')) return 'whatsapp_click';
  if (href.includes('pricing') || element.closest?.('.pricing-card')) return 'pricing_click';
  if (href.includes('app.nile.ng') || text.includes('start building') || text.includes('get started')) return 'get_started_click';
  if (text.includes('download') || element.closest?.('.app-downloads-section')) return 'app_download_click';
  return '';
}

function getMeasurementId() {
  const runtimeId = typeof window !== 'undefined' ? window.__NILE_GA_MEASUREMENT_ID__ : '';
  const buildId = import.meta.env?.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return runtimeId || buildId || '';
}
