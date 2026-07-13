import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4000);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nile.ng';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@nile.ng';
const adminPassword = process.env.ADMIN_PASSWORD || 'NileAdmin2026!';
const sessionCookie = 'nile_admin_session=local-dev-session';

let articles = seedArticles();
let categories = seedCategories();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const method = req.method === 'HEAD' ? 'GET' : req.method || 'GET';

    if (method === 'GET' && url.pathname === '/healthz') return sendText(res, 'ok');
    if (method === 'GET' && url.pathname === '/robots.txt') {
      return sendText(res, `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${siteUrl}/sitemap.xml`);
    }
    if (method === 'GET' && url.pathname === '/sitemap.xml') return sendXml(res, sitemapXml());
    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return sendHtml(res, await readHtml('index.html'));
    if (method === 'GET' && url.pathname === '/admin') return sendHtml(res, await readHtml('admin.html'));
    if (method === 'GET' && url.pathname === '/blog') return sendHtml(res, await readHtml('blog.html'));
    if (method === 'GET' && url.pathname.startsWith('/blog/category/')) return sendHtml(res, await readHtml('blog.html'));
    if (method === 'GET' && url.pathname.startsWith('/blog/')) return sendArticlePage(res, url.pathname.split('/').pop());
    if (method === 'GET' && url.pathname.endsWith('.html')) return sendHtml(res, await readHtml(url.pathname.slice(1)));
    if (method === 'GET' && (url.pathname.startsWith('/src/') || url.pathname.startsWith('/public/'))) return sendStatic(res, url.pathname.slice(1));

    if (url.pathname === '/api/auth/login' && method === 'POST') return login(req, res);
    if (url.pathname === '/api/auth/logout' && method === 'POST') return logout(res);
    if (url.pathname === '/api/auth/me' && method === 'GET') return me(req, res);
    if (url.pathname === '/api/articles' && method === 'GET') return apiArticles(res, url);
    if (url.pathname.startsWith('/api/articles/') && method === 'GET') return apiArticle(res, url.pathname.split('/').pop());
    if (url.pathname === '/api/categories' && method === 'GET') return apiCategories(res);
    if (url.pathname === '/api/admin/articles' && method === 'POST') return saveArticle(req, res);
    if (url.pathname.startsWith('/api/admin/articles/') && method === 'PUT') return updateArticle(req, res, url.pathname.split('/').pop());
    if (url.pathname.endsWith('/archive') && method === 'POST') return archiveArticle(res, url.pathname.split('/').at(-2));
    if (url.pathname === '/api/admin/categories' && method === 'POST') return addCategory(req, res);
    if (url.pathname === '/api/cloudinary/signature' && method === 'POST') {
      return sendJson(res, { error: 'Cloudinary upload signing is unavailable in local fallback mode.' }, 503);
    }

    sendText(res, 'Not found', 404);
  } catch (error) {
    sendText(res, error.message || 'Server error', 500);
  }
});

server.listen(port, () => {
  console.log(`Nile local fallback site: http://localhost:${port}`);
  console.log(`Admin: http://localhost:${port}/admin`);
});

async function readHtml(file) {
  return readFile(join(rootDir, file), 'utf8');
}

async function sendStatic(res, file) {
  const body = await readFile(join(rootDir, file));
  send(res, body, 200, mimeTypes[extname(file)] || 'application/octet-stream');
}

async function sendArticlePage(res, slug) {
  const article = articles.find((item) => item.slug === slug && ['published', 'draft', 'scheduled'].includes(item.status));
  const html = await readHtml('article.html');
  if (!article) return sendHtml(res, html.replace('<div data-article-detail></div>', '<div data-article-detail><h1>Article not found</h1><p>This Nile Dispatch article may have moved or been unpublished.</p></div>'), 404);
  const pageTitle = article.seo?.title || `${article.title} | Nile`;
  article.views += 1;
  const rendered = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`)
    .replace(/<meta name="description"[\s\S]*?>/i, `<meta name="description" content="${escapeAttribute(article.seo?.description || article.excerpt)}" />`)
    .replace('</head>', `    <link rel="canonical" href="${siteUrl}/blog/${article.slug}" />\n  </head>`)
    .replace('<div data-article-detail></div>', `<div data-article-detail data-server-rendered="true">${renderArticle(article)}</div>`);
  sendHtml(res, rendered);
}

function renderArticle(article) {
  return `
      <span class="blog-eyebrow">${escapeHtml(article.category)}</span>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <span>${escapeHtml(article.author?.name || 'Nile Editorial')}</span>
        <span>${formatDate(article.publishedAt || article.createdAt)}</span>
        <span>${article.readingMinutes || 2} min read</span>
      </div>
      ${article.coverImage ? `<img class="article-cover" src="${escapeAttribute(article.coverImage)}" alt="${escapeAttribute(article.title)}" />` : ''}
      <div class="article-content">${article.content}</div>
      <div class="article-inline-cta">
        <span class="blog-eyebrow">Next step</span>
        <p>Launch content, payments, fulfillment, and customer growth from one Nile operating layer.</p>
        <a class="btn btn-emerald" href="https://app.nile.ng">Start Building</a>
      </div>`;
}

async function login(req, res) {
  const body = await readJson(req);
  if (String(body.email || '').toLowerCase() !== adminEmail.toLowerCase() || String(body.password || '') !== adminPassword) {
    return sendJson(res, { error: 'Invalid email or password' }, 401);
  }
  res.setHeader('Set-Cookie', `${sessionCookie}; Path=/; SameSite=Lax`);
  sendJson(res, { ok: true, email: adminEmail, role: 'admin' });
}

function logout(res) {
  res.setHeader('Set-Cookie', 'nile_admin_session=; Path=/; Max-Age=0');
  sendJson(res, { ok: true });
}

function me(req, res) {
  if (!isAuthed(req)) return sendJson(res, { error: 'Authentication required' }, 401);
  sendJson(res, { email: adminEmail, role: 'admin' });
}

function apiArticles(res, url) {
  const includeDrafts = url.searchParams.get('status') === 'all';
  const category = url.searchParams.get('category') || '';
  const data = articles
    .filter((article) => (includeDrafts ? article.status !== 'archived' : article.status === 'published'))
    .filter((article) => !category || article.categorySlug === category)
    .map(publicArticle);
  sendJson(res, { articles: data });
}

function apiArticle(res, slug) {
  const article = articles.find((item) => item.slug === slug);
  if (!article) return sendJson(res, { error: 'Article not found' }, 404);
  article.views += 1;
  sendJson(res, { article: publicArticle(article) });
}

function apiCategories(res) {
  const counts = new Map();
  articles.filter((article) => article.status === 'published').forEach((article) => counts.set(article.categorySlug, (counts.get(article.categorySlug) || 0) + 1));
  const merged = [...categories].map((category) => ({ ...category, count: counts.get(category.slug) || 0 }));
  sendJson(res, { categories: merged });
}

async function saveArticle(req, res) {
  const body = await readJson(req);
  const article = makeArticle(body);
  articles.unshift(article);
  sendJson(res, { article: publicArticle(article) }, 201);
}

async function updateArticle(req, res, id) {
  const body = await readJson(req);
  const index = articles.findIndex((item) => item.id === id || item._id === id);
  if (index < 0) return sendJson(res, { error: 'Article not found' }, 404);
  articles[index] = { ...articles[index], ...makeArticle(body, articles[index]), updatedAt: new Date().toISOString() };
  sendJson(res, { article: publicArticle(articles[index]) });
}

function archiveArticle(res, id) {
  const article = articles.find((item) => item.id === id || item._id === id);
  if (article) article.status = 'archived';
  sendJson(res, { ok: true });
}

async function addCategory(req, res) {
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  if (!name) return sendJson(res, { error: 'Category name is required' }, 400);
  const category = { name, slug: makeSlug(name), description: String(body.description || '') };
  if (!categories.some((item) => item.slug === category.slug)) categories.push(category);
  sendJson(res, { category }, 201);
}

function makeArticle(input, existing = {}) {
  const now = new Date().toISOString();
  const category = input.category || 'Commerce Growth';
  const title = input.title || existing.title || 'Untitled article';
  const slug = makeSlug(input.slug || title);
  return {
    ...existing,
    _id: existing._id || `local-${Date.now()}`,
    id: existing.id || existing._id || `local-${Date.now()}`,
    title,
    slug,
    excerpt: input.excerpt || '',
    coverImage: input.coverImage || '',
    category,
    categorySlug: makeSlug(input.categorySlug || category),
    tags: input.tags || [],
    author: input.author || { name: 'Nile Editorial', role: 'Commerce infrastructure team' },
    seo: input.seo || { title, description: input.excerpt || '' },
    content: input.content || '<p>Start writing here.</p>',
    status: input.status || 'draft',
    scheduledAt: input.scheduledAt || null,
    publishedAt: input.status === 'published' ? existing.publishedAt || now : existing.publishedAt,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    views: existing.views || 0,
    conversions: existing.conversions || 0
  };
}

function publicArticle(article) {
  return {
    ...article,
    id: article.id || article._id,
    readingMinutes: Math.max(2, Math.ceil(stripHtml(article.content).split(/\s+/).length / 220)),
    canonical: `${siteUrl}/blog/${article.slug}`
  };
}

function sitemapXml() {
  const articleUrls = articles
    .filter((article) => article.status === 'published')
    .map((article) => `<url><loc>${siteUrl}/blog/${article.slug}</loc><lastmod>${new Date(article.updatedAt || Date.now()).toISOString()}</lastmod></url>`)
    .join('');
  const pages = ['/', '/solutions.html', '/pricing.html', '/blog', '/knowledge.html', '/about.html', '/contact.html']
    .map((path) => `<url><loc>${siteUrl}${path}</loc></url>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages}${articleUrls}</urlset>`;
}

function seedCategories() {
  return [
    { name: 'Commerce Growth', slug: 'commerce-growth', description: 'Operating playbooks for growing modern commerce brands.' },
    { name: 'SEO', slug: 'seo', description: 'Search strategy, editorial planning, and durable organic growth.' },
    { name: 'Payments', slug: 'payments', description: 'Checkout, payment recovery, and conversion confidence.' },
    { name: 'Lead Generation', slug: 'lead-generation', description: 'Turning education and traffic into qualified pipeline.' },
    { name: 'Fulfillment', slug: 'fulfillment', description: 'Shipping, delivery, and post-purchase operations.' }
  ];
}

function seedArticles() {
  const now = new Date().toISOString();
  return [
    seedArticle('How Nigerian brands can build a high-converting commerce stack', 'nigerian-brands-commerce-stack', 'A practical guide to payments, inventory, storefront speed, fulfillment, and customer education for ambitious local brands.', '/src/assets/storefront_laptop.jpg', 'Commerce Growth', 151, 9, now),
    seedArticle('The SEO checklist every modern retail founder should use', 'retail-founder-seo-checklist', 'Technical, editorial, and conversion SEO steps Nile merchants can apply before publishing new product education content.', '/src/assets/fashion_founder.jpg', 'SEO', 87, 5, now),
    seedArticle('Payment methods Nigerian customers expect at checkout', 'nigerian-checkout-payment-methods', 'What to offer at checkout, how to reduce failed payments, and where payment education belongs in your buying journey.', '/src/assets/shopping_basket.jpg', 'Payments', 216, 17, now),
    seedArticle('How to turn product education into qualified leads', 'product-education-qualified-leads', 'A Nile playbook for writing guides that answer buyer questions, rank in search, and move readers into sales conversations.', '/src/assets/creative_studio.jpg', 'Lead Generation', 177, 21, now),
    seedArticle('A fulfillment checklist for founders shipping across Lagos', 'lagos-fulfillment-checklist', 'The operational checks that help stores avoid missed deliveries, duplicate labels, and customer support overload.', '/src/assets/logistics_truck.jpg', 'Fulfillment', 123, 8, now)
  ];
}

function seedArticle(title, slug, excerpt, coverImage, category, views, conversions, now) {
  return {
    _id: slug,
    id: slug,
    title,
    slug,
    excerpt,
    coverImage,
    category,
    categorySlug: makeSlug(category),
    tags: [makeSlug(category)],
    author: { name: 'Nile Editorial', role: 'Commerce infrastructure team' },
    seo: { title: `${title} | Nile`, description: excerpt },
    content: '<h2>Start with the operating layer</h2><p>Customers experience your brand as one continuous journey. Nile helps connect storefronts, payments, fulfillment, and customer growth.</p><h2>Make every article conversion-aware</h2><p>Teach the buyer, answer objections, and place clear calls to action near the decision points.</p>',
    status: 'published',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    views,
    conversions
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function isAuthed(req) {
  return String(req.headers.cookie || '').includes('nile_admin_session=local-dev-session');
}

function sendHtml(res, body, status = 200) {
  send(res, body, status, 'text/html; charset=utf-8');
}

function sendJson(res, body, status = 200) {
  send(res, JSON.stringify(body), status, 'application/json; charset=utf-8');
}

function sendText(res, body, status = 200) {
  send(res, body, status, 'text/plain; charset=utf-8');
}

function sendXml(res, body, status = 200) {
  send(res, body, status, 'application/xml; charset=utf-8');
}

function send(res, body, status, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function makeSlug(value = '') {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
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
