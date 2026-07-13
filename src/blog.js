import { initAnalytics, trackEvent } from './analytics.js';

const articleGrid = document.querySelector('[data-article-grid]');
const articleDetail = document.querySelector('[data-article-detail]');
const searchForm = document.querySelector('[data-blog-search]');
const emptyState = document.querySelector('[data-blog-empty]');
const categoryList = document.querySelector('[data-category-list]');
const tagList = document.querySelector('[data-tag-list]');
const feedTitle = document.querySelector('[data-feed-title]');
const mobileButton = document.getElementById('mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

let articles = [];
let categories = [];
let activeCategory = 'All';
let activeCategorySlug = '';
let activeTag = '';
let activeQuery = '';

initAnalytics();
initBlogNavigation();
if (articleGrid) initBlogIndex();
if (articleDetail?.dataset.serverRendered === 'true') trackBlogArticleView();
if (articleDetail && articleDetail.dataset.serverRendered !== 'true') initArticleDetail();

async function initBlogIndex() {
  const categoryFromPath = getCategorySlugFromPath();
  activeCategorySlug = categoryFromPath;
  const [articleData, categoryData] = await Promise.all([
    fetchJson(`/api/articles${categoryFromPath ? `?category=${encodeURIComponent(categoryFromPath)}` : ''}`),
    fetchJson('/api/categories')
  ]);
  articles = articleData.articles || [];
  categories = categoryData.categories || [];
  const active = categories.find((category) => category.slug === categoryFromPath);
  activeCategory = active?.name || 'All';
  if (feedTitle && active) feedTitle.textContent = `${active.name} articles`;
  renderFilters();
  renderArticles();

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    activeQuery = new FormData(searchForm).get('query').toString().trim().toLowerCase();
    renderArticles();
  });
}

async function initArticleDetail() {
  const slug = window.location.pathname.split('/').filter(Boolean).pop();
  try {
    const { article } = await fetchJson(`/api/articles/${slug}`);
    document.title = article.seo?.title || `${article.title} | Nile`;
    setMeta('description', article.seo?.description || article.excerpt);
    injectStructuredData(article);
    articleDetail.innerHTML = `
      <span class="blog-eyebrow">${escapeHtml(article.category)}</span>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <span>${escapeHtml(article.author?.name || 'Nile Editorial')}</span>
        <span>${formatDate(article.publishedAt || article.createdAt)}</span>
        <span>${article.readingMinutes} min read</span>
      </div>
      ${article.coverImage ? `<img class="article-cover" src="${escapeAttribute(article.coverImage)}" alt="${escapeAttribute(article.title)}" />` : ''}
      <div class="article-content">${sanitizeArticleHtml(article.content)}</div>
      <div class="article-inline-cta">
        <span class="blog-eyebrow">Next step</span>
        <p>Launch content, payments, fulfillment, and customer growth from one Nile operating layer.</p>
        <a class="btn btn-emerald" href="https://app.nile.ng">Start Building</a>
      </div>
    `;
    trackBlogArticleView(article);
  } catch {
    articleDetail.innerHTML = '<h1>Article not found</h1><p>This Nile Dispatch article may have moved or been unpublished.</p>';
  }
}

function trackBlogArticleView(article = {}) {
  trackEvent('blog_article_view', {
    article_slug: window.location.pathname.split('/').filter(Boolean).pop(),
    article_title: article.title || document.querySelector('[data-article-detail] h1')?.textContent.trim()
  });
}

function renderFilters() {
  const visibleCategories = [{ name: 'All', slug: '', count: articles.length }, ...categories];
  const tags = [...new Set(articles.flatMap((article) => article.tags || []))].slice(0, 12);

  categoryList.innerHTML = visibleCategories
    .map((category) => {
      const active = category.slug === activeCategorySlug || (!category.slug && !activeCategorySlug);
      const href = category.slug ? `/blog/category/${category.slug}` : '/blog';
      return `<a class="${active ? 'active' : ''}" href="${href}" data-category="${escapeAttribute(category.name)}">${escapeHtml(category.name)} <span>${category.count || 0}</span></a>`;
    })
    .join('');
  tagList.innerHTML = tags
    .map((tag) => `<button class="${tag === activeTag ? 'active' : ''}" data-tag="${escapeAttribute(tag)}">#${escapeHtml(tag)}</button>`)
    .join('');

  tagList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      activeTag = activeTag === button.dataset.tag ? '' : button.dataset.tag;
      renderFilters();
      renderArticles();
    });
  });
}

function renderArticles() {
  const filtered = articles.filter((article) => {
    const haystack = [article.title, article.excerpt, article.category, ...(article.tags || [])].join(' ').toLowerCase();
    const matchesQuery = !activeQuery || haystack.includes(activeQuery);
    const matchesCategory = activeCategory === 'All' || article.category === activeCategory;
    const matchesTag = !activeTag || (article.tags || []).includes(activeTag);
    return matchesQuery && matchesCategory && matchesTag;
  });

  emptyState.hidden = filtered.length > 0;
  articleGrid.innerHTML = filtered.map(renderArticleCard).join('');
}

function renderArticleCard(article) {
  const tags = (article.tags || []).slice(0, 3).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('');
  return `
    <a class="article-card" href="/blog/${escapeAttribute(article.slug)}">
      <img src="${escapeAttribute(article.coverImage || '/src/assets/shipping_packages.jpg')}" alt="${escapeAttribute(article.title)}" loading="lazy" />
      <div class="article-card-body">
        <div class="article-card-meta">
          <span>${escapeHtml(article.category || 'Guide')}</span>
          <span>${formatDate(article.publishedAt || article.createdAt)}</span>
          <span>${article.readingMinutes} min read</span>
        </div>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.excerpt || '')}</p>
        <div class="article-tags">${tags}</div>
      </div>
    </a>
  `;
}

function getCategorySlugFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const index = parts.indexOf('category');
  return index >= 0 ? parts[index + 1] || '' : '';
}

function initBlogNavigation() {
  mobileButton?.addEventListener('click', () => {
    navLinks?.classList.toggle('mobile-open');
    document.body.classList.toggle('modal-open', navLinks?.classList.contains('mobile-open'));
  });
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function formatDate(value) {
  if (!value) return 'Draft';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function setMeta(name, content) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content || '');
}

function injectStructuredData(article) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.coverImage,
    author: { '@type': 'Person', name: article.author?.name || 'Nile Editorial' },
    publisher: { '@type': 'Organization', name: 'Nile' },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: article.canonical
  });
  document.head.appendChild(script);
}

function sanitizeArticleHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = value || '';
  template.content.querySelectorAll('script, iframe, object, embed, style').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (/^on/i.test(attribute.name) || attribute.value.toLowerCase().includes('javascript:')) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
