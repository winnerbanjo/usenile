import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.usenile.co';
const primaryHost = new URL(siteUrl).host;
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@nile.ng';
const adminPassword = process.env.ADMIN_PASSWORD || 'NileAdmin2026!';
const sessionCookie = 'nile_admin_session=local-dev-session';

let articles = seedArticles();
const categories = [
  { name: 'Online Business', slug: 'online-business', description: 'Practical launch guides for Nigerian founders building online.' },
  { name: 'Websites', slug: 'websites', description: 'How to turn a business idea into a trusted digital storefront.' },
  { name: 'Pricing', slug: 'pricing', description: 'Cost guides and budgeting advice for business owners.' },
  { name: 'Payments', slug: 'payments', description: 'Checkout, payment recovery, and conversion confidence.' },
  { name: 'Fulfillment', slug: 'fulfillment', description: 'Shipping, delivery, and post-purchase operations.' }
];

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const cleanHtmlPages = new Set([
  'about',
  'ai',
  'careers',
  'contact',
  'cookies',
  'developers',
  'dpa',
  'knowledge',
  'merchant-agreement',
  'pricing',
  'privacy',
  'refund-policy',
  'samples',
  'security',
  'sla',
  'solutions',
  'team',
  'terms'
]);

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, siteUrl);
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    const requestHost = String(req.headers.host || '').toLowerCase();

    if (method === 'GET' && shouldRedirectToPrimaryHost(requestHost)) {
      return redirect(res, `${siteUrl}${url.pathname}${url.search}`);
    }

    if (method === 'GET' && url.pathname === '/healthz') return sendText(res, 'ok');
    if (method === 'GET' && url.pathname === '/robots.txt') return sendText(res, `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${siteUrl}/sitemap.xml`);
    if (method === 'GET' && url.pathname === '/sitemap.xml') return sendXml(res, sitemapXml());
    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return sendHtml(res, await readHtml('index.html'));
    if (method === 'GET' && url.pathname === '/admin') return sendHtml(res, await readHtml('admin.html'));
    if (method === 'GET' && url.pathname === '/blog') return sendHtml(res, await readHtml('blog.html'));
    if (method === 'GET' && url.pathname.startsWith('/blog/category/')) return sendHtml(res, await readHtml('blog.html'));
    if (method === 'GET' && url.pathname.startsWith('/blog/')) return sendArticlePage(res, url.pathname.split('/').pop());
    if (method === 'GET' && url.pathname.endsWith('.html')) return sendHtml(res, await readHtml(url.pathname.slice(1)));
    if (method === 'GET' && cleanHtmlPages.has(url.pathname.slice(1))) return sendHtml(res, await readHtml(`${url.pathname.slice(1)}.html`));
    if (method === 'GET' && (url.pathname.startsWith('/src/') || url.pathname.startsWith('/public/'))) return sendStatic(res, url.pathname.slice(1));

    if (url.pathname === '/api/auth/login' && method === 'POST') return login(req, res);
    if (url.pathname === '/api/auth/logout' && method === 'POST') return logout(res);
    if (url.pathname === '/api/auth/me' && method === 'GET') return me(req, res);
    if (url.pathname === '/api/articles' && method === 'GET') return apiArticles(res, url);
    if (url.pathname.startsWith('/api/articles/') && method === 'GET') return apiArticle(res, url.pathname.split('/').pop());
    if (url.pathname === '/api/categories' && method === 'GET') return apiCategories(res);

    sendText(res, 'Not found', 404);
  } catch (error) {
    sendText(res, error.message || 'Server error', 500);
  }
}

async function readHtml(file) {
  return readFile(join(rootDir, file), 'utf8');
}

async function sendStatic(res, file) {
  const body = await readFile(join(rootDir, file));
  send(res, body, 200, mimeTypes[extname(file)] || 'application/octet-stream');
}

async function sendArticlePage(res, slug) {
  const article = articles.find((item) => item.slug === slug && item.status === 'published');
  const html = await readHtml('article.html');
  if (!article) return sendHtml(res, html.replace('<div data-article-detail></div>', '<div data-article-detail><h1>Article not found</h1><p>This Nile Dispatch article may have moved or been unpublished.</p></div>'), 404);
  article.views += 1;
  const rendered = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(article.seo.title)}</title>`)
    .replace(/<meta name="description"[\s\S]*?>/i, `<meta name="description" content="${escapeAttribute(article.seo.description)}" />`)
    .replace('</head>', `    <link rel="canonical" href="${siteUrl}/blog/${article.slug}" />\n  </head>`)
    .replace('<div data-article-detail></div>', `<div data-article-detail data-server-rendered="true">${renderArticle(article)}</div>`);
  sendHtml(res, rendered);
}

function renderArticle(article) {
  return `
      <span class="blog-eyebrow">${escapeHtml(article.category)}</span>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <span>${escapeHtml(article.author.name)}</span>
        <span>${formatDate(article.publishedAt)}</span>
        <span>${publicArticle(article).readingMinutes} min read</span>
      </div>
      <img class="article-cover" src="${escapeAttribute(article.coverImage)}" alt="${escapeAttribute(article.title)}" />
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
  res.setHeader('Set-Cookie', `${sessionCookie}; Path=/; SameSite=Lax; Secure`);
  sendJson(res, { ok: true, email: adminEmail, role: 'admin' });
}

function logout(res) {
  res.setHeader('Set-Cookie', 'nile_admin_session=; Path=/; Max-Age=0');
  sendJson(res, { ok: true });
}

function me(req, res) {
  if (!String(req.headers.cookie || '').includes('nile_admin_session=local-dev-session')) return sendJson(res, { error: 'Authentication required' }, 401);
  sendJson(res, { email: adminEmail, role: 'admin' });
}

function apiArticles(res, url) {
  const category = url.searchParams.get('category') || '';
  const data = articles
    .filter((article) => article.status === 'published')
    .filter((article) => !category || article.categorySlug === category)
    .map(publicArticle);
  sendJson(res, { articles: data });
}

function apiArticle(res, slug) {
  const article = articles.find((item) => item.slug === slug && item.status === 'published');
  if (!article) return sendJson(res, { error: 'Article not found' }, 404);
  article.views += 1;
  sendJson(res, { article: publicArticle(article) });
}

function apiCategories(res) {
  const counts = new Map();
  articles.forEach((article) => counts.set(article.categorySlug, (counts.get(article.categorySlug) || 0) + 1));
  sendJson(res, { categories: categories.map((category) => ({ ...category, count: counts.get(category.slug) || 0 })) });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function publicArticle(article) {
  return {
    ...article,
    id: article.id,
    readingMinutes: Math.max(2, Math.ceil(stripHtml(article.content).split(/\s+/).length / 220)),
    canonical: `${siteUrl}/blog/${article.slug}`
  };
}

function sitemapXml() {
  const articleUrls = articles.map((article) => `<url><loc>${siteUrl}/blog/${article.slug}</loc><lastmod>${article.updatedAt}</lastmod></url>`).join('');
  const pages = ['/', '/solutions', '/pricing', '/blog', '/knowledge', '/about', '/contact']
    .map((path) => `<url><loc>${siteUrl}${path}</loc></url>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages}${articleUrls}</urlset>`;
}

function seedArticles() {
  const now = new Date().toISOString();
  return [
    seedArticle({
      title: 'The Complete Guide to Starting an Online Business in Nigeria (2026)',
      slug: 'start-online-business-nigeria-2026',
      excerpt: 'A practical step-by-step guide for choosing an idea, launching a website, accepting payments, delivering orders, and growing an online business in Nigeria.',
      coverImage: '/src/assets/storefront_laptop.jpg',
      category: 'Online Business',
      tags: ['online-business', 'nigeria', 'startup-guide'],
      views: 0,
      conversions: 0,
      now,
      content: onlineBusinessGuideContent()
    }),
    seedArticle({
      title: 'Why Snapchat Ads Are the Most Underrated Marketing Channel for Nigerian Businesses',
      slug: 'why-snapchat-ads-are-the-most-underrated-marketing-platform',
      excerpt: 'If you are spending all your budget on Instagram and Facebook, you are missing out on one of the most powerful ad platforms today.',
      coverImage: '/src/assets/snapchat-ads-blog.jpg',
      category: 'Marketing',
      tags: ['snapchat-ads', 'marketing', 'nigeria'],
      views: 0,
      conversions: 0,
      now,
      content: snapchatAdsContent()
    }),
    seedArticle({
      title: "How to Build a Website for Your Business (Complete Beginner's Guide)",
      slug: 'build-business-website-beginners-guide',
      excerpt: 'A beginner-friendly guide to planning, designing, launching, and improving a professional business website that customers can trust.',
      coverImage: '/src/assets/creative_studio.jpg',
      category: 'Websites',
      tags: ['websites', 'beginner-guide', 'business-growth'],
      views: 0,
      conversions: 0,
      now,
      content: businessWebsiteGuideContent()
    }),
    seedArticle({
      title: 'How Much Does a Website Cost in Nigeria? (2026 Pricing Guide)',
      slug: 'website-cost-nigeria-2026-pricing-guide',
      excerpt: 'A practical 2026 pricing guide for Nigerian business owners comparing landing pages, business websites, ecommerce sites, custom apps, and hidden website costs.',
      coverImage: '/src/assets/storefront_laptop.jpg',
      category: 'Pricing',
      tags: ['website-pricing', 'nigeria', 'business-websites'],
      views: 0,
      conversions: 0,
      now,
      content: websiteCostGuideContent()
    }),
    seedArticle({
      title: 'Website vs Instagram Business Page: Which Is Better for Your Business?',
      slug: 'website-vs-instagram-business-page',
      excerpt: 'A practical comparison of Instagram business pages and websites, and how growing businesses can use both to attract, convert, and retain customers.',
      coverImage: '/src/assets/fashion_founder.jpg',
      category: 'Websites',
      tags: ['websites', 'instagram', 'social-commerce'],
      views: 0,
      conversions: 0,
      now,
      content: websiteVsInstagramContent()
    }),
    seedArticle({
      title: 'Why your Nigerian business needs a website, even if Instagram is working',
      slug: 'why-nigerian-business-needs-website',
      excerpt: 'Social media can help customers discover you, but a website gives your brand trust, ownership, search visibility, and a better buying experience.',
      coverImage: '/src/assets/fashion_founder.jpg',
      category: 'Websites',
      tags: ['websites', 'trust', 'social-commerce'],
      views: 0,
      conversions: 0,
      now,
      content: websiteTrustContent()
    }),
    seedArticle({
      title: 'How to set up online payments customers can trust',
      slug: 'online-payment-setup-nigeria',
      excerpt: 'A simple payment checklist for Nigerian businesses that want fewer failed orders, clearer checkout flows, and more confident customers.',
      coverImage: '/src/assets/shopping_basket.jpg',
      category: 'Payments',
      tags: ['payments', 'checkout', 'conversion'],
      views: 0,
      conversions: 0,
      now,
      content: paymentSetupContent()
    }),
    seedArticle({
      title: 'A beginner-friendly delivery checklist for online sellers',
      slug: 'delivery-checklist-online-sellers-nigeria',
      excerpt: 'What to decide before your first orders start coming in: delivery zones, pricing, timelines, packaging, returns, and customer updates.',
      coverImage: '/src/assets/logistics_truck.jpg',
      category: 'Fulfillment',
      tags: ['delivery', 'fulfillment', 'operations'],
      views: 0,
      conversions: 0,
      now,
      content: deliveryChecklistContent()
    })
  ];
}

function seedArticle({ title, slug, excerpt, coverImage, category, tags, views, conversions, now, content }) {
  return {
    id: slug,
    title,
    slug,
    excerpt,
    coverImage,
    category,
    categorySlug: slugify(category),
    tags,
    author: { name: 'Nile Editorial', role: 'Commerce infrastructure team' },
    seo: { title: `${title} | Nile`, description: excerpt },
    content,
    status: 'published',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    views,
    conversions
  };
}

function onlineBusinessGuideContent() {
  return `
    <p><strong>Want to start an online business in Nigeria but do not know where to begin?</strong> You are not alone. Every day, thousands of Nigerians look for ways to earn online, sell products, or turn an idea into a real business.</p>
    <p>The good news is that launching online is more accessible than ever. With the right plan, you can start with a focused offer, build a professional presence, receive payments, deliver orders, and grow beyond your first customers.</p>
    <h2>Why start an online business in Nigeria?</h2>
    <p>Nigeria is one of Africa's most active digital markets. Customers discover brands on social media, compare options on Google, pay through transfers and cards, and expect businesses to respond quickly.</p>
    <ul><li>Reach customers beyond your immediate location.</li><li>Sell at any time of day.</li><li>Reduce the overhead of a physical shop.</li><li>Build a brand people can search for and trust.</li><li>Track orders, enquiries, and customer demand more clearly.</li></ul>
    <h2>Step 1: Choose a focused business idea</h2>
    <p>Start with a real problem, a clear audience, or a product category people already buy. Popular categories include fashion, beauty, hair, food, electronics, home items, digital products, coaching, and professional services.</p>
    <p>Before spending money, answer four questions: who is the customer, what problem are you solving, why should they choose you, and can the business grow over time?</p>
    <h2>Step 2: Validate before you build</h2>
    <p>Do not spend months building something nobody wants. Talk to potential customers, study competitors, read reviews, check search demand, and watch what people ask for on Instagram, TikTok, WhatsApp groups, and Facebook communities.</p>
    <h2>Step 3: Register and organise the business</h2>
    <p>You can start small, but basic structure matters. Register your business name when you are ready, open a dedicated business account, keep records, and understand your tax obligations as revenue grows.</p>
    <h2>Step 4: Create a professional website</h2>
    <p>Social media is useful for discovery, but you do not own the platform. A website gives customers a stable place to learn about you, browse products, place orders, send enquiries, and find you on Google.</p>
    <p>Your website should include your products or services, pricing, delivery information, contact options, trust pages, and clear calls to action.</p>
    <h2>Step 5: Choose a simple domain name</h2>
    <p>Your domain is your online address. Choose something short, memorable, easy to spell, and close to your brand name. Avoid complicated words, unnecessary numbers, and spellings customers may forget.</p>
    <h2>Step 6: Add products or services properly</h2>
    <p>Each product page should have a clear title, strong photos, a useful description, pricing, available sizes or colours, delivery details, and stock information. Customers buy faster when they do not have to ask basic questions first.</p>
    <h2>Step 7: Set up reliable payments</h2>
    <p>Customers expect convenient payment options such as bank transfer, debit cards, and mobile-friendly checkout. A clear payment flow reduces abandoned orders and builds confidence.</p>
    <h2>Step 8: Plan delivery before orders arrive</h2>
    <p>Decide the states or cities you serve, delivery fees, timelines, courier partners, packaging standards, and return process. Clear shipping information prevents confusion and saves support time.</p>
    <h2>Step 9: Build trust from the first visit</h2>
    <p>Your site should include About, Contact, Privacy Policy, Terms, Refund Policy, FAQs, and customer reviews where available. Good branding, fast replies, and honest policies make online buyers more comfortable.</p>
    <h2>Step 10: Start marketing consistently</h2>
    <p>Use Google Search, social media, WhatsApp, email, and paid advertising when you understand your audience. Start with helpful content and clear offers, then improve based on what customers click, ask, and buy.</p>
    <h2>Common mistakes to avoid</h2>
    <ul><li>Waiting until everything is perfect before launching.</li><li>Using poor product photos.</li><li>Publishing unclear pricing or delivery details.</li><li>Relying only on social media.</li><li>Not collecting customer information.</li><li>Ignoring follow-up and customer support.</li></ul>
    <h2>How much does it cost?</h2>
    <p>Your cost depends on the model. Typical expenses include domain name, website, inventory, packaging, delivery, marketing, business registration, and branding. Start with what you can afford, prove demand, and improve as sales grow.</p>
    <h2>Frequently asked questions</h2>
    <h3>Can I start with little capital?</h3><p>Yes. Many businesses begin with one product or service, then reinvest profits into better inventory, branding, and marketing.</p>
    <h3>Do I need a website if I already sell on Instagram?</h3><p>Yes. Social media helps people discover you, while a website gives them a trusted place to browse, order, pay, and learn more about your brand.</p>
    <h3>What products sell well online in Nigeria?</h3><p>Fashion, beauty, hair, food, electronics, digital products, home items, and services remain strong categories, but the best choice depends on audience demand and your ability to deliver well.</p>
    <h2>Final thoughts</h2>
    <p>Starting an online business in Nigeria is no longer reserved for large companies. Whether you are launching a clothing brand, skincare business, restaurant, consulting firm, or retail store, the opportunity is real for founders who build consistently.</p>
    <p>Nile helps entrepreneurs create professional business websites, manage products, receive payments, and grow with the tools they need to sell confidently online.</p>`;
}

function businessWebsiteGuideContent() {
  return `
    <p>Whether you are starting a fashion brand, restaurant, skincare business, consultancy, pharmacy, school, or retail store, a professional website is one of the strongest investments you can make for your business.</p>
    <p>Customers now expect to find serious businesses online. They want to browse products, compare prices, read reviews, contact you easily, and sometimes place an order without visiting a physical location.</p>
    <p>This guide walks you through how to build a business website from start to finish, even if you have no technical experience.</p>
    <h2>Why every business needs a website</h2>
    <p>Instagram, TikTok, Facebook, and WhatsApp are useful marketing channels, but they should not be your only online presence. A website gives your business a professional home that customers can visit at any time.</p>
    <ul><li>A professional online identity.</li><li>Better credibility and trust.</li><li>Visibility on Google Search.</li><li>A central place to showcase products or services.</li><li>Online ordering, bookings, or enquiries.</li><li>A way to collect customer information.</li><li>More control over your brand than social platforms provide.</li></ul>
    <h2>Step 1: Define the purpose of your website</h2>
    <p>Before choosing colours, templates, or tools, decide what the website should help your business achieve. A website for a restaurant will not need the same structure as a school, consultant, or online store.</p>
    <p>Common goals include selling products, generating leads, accepting bookings, displaying services, building brand awareness, receiving enquiries, and sharing company information.</p>
    <h2>Step 2: Choose a domain name</h2>
    <p>Your domain is your website address. Choose something short, easy to remember, easy to spell, and close to your business name. Avoid unnecessary numbers, symbols, and complicated spellings.</p>
    <p>Examples include yourbusiness.com, yourbrand.store, or yourcompany.shop. The best domain feels professional when a customer sees it on a flyer, Instagram bio, receipt, or Google result.</p>
    <h2>Step 3: Select the right website platform</h2>
    <p>You can hire a developer, use a website builder, or choose a commerce platform that lets you manage products, payments, and content yourself. The right option should save time, not create extra work.</p>
    <p>Look for ease of use, mobile responsiveness, SEO tools, payment integrations, product management, security, speed, customer support, and room to grow as your business becomes more complex.</p>
    <h2>Step 4: Plan your website structure</h2>
    <p>Most business websites do not need dozens of pages. Keep the navigation simple so visitors can quickly understand who you are, what you sell, and how to take the next step.</p>
    <ul><li>Home.</li><li>About Us.</li><li>Products or Services.</li><li>Contact.</li><li>Frequently Asked Questions.</li><li>Privacy Policy.</li><li>Terms and Conditions.</li><li>Refund Policy where applicable.</li></ul>
    <p>Online stores may also need categories, cart, checkout, customer accounts, and order tracking.</p>
    <h2>Step 5: Design for your customers</h2>
    <p>Good design is not only about looking attractive. It should help visitors find information, trust your business, and take action with as little confusion as possible.</p>
    <p>Prioritise clean layouts, easy navigation, readable typography, high-quality images, clear buttons, fast loading pages, and consistent branding. Your site should work well on phones, tablets, and desktops.</p>
    <h2>Step 6: Create high-quality content</h2>
    <p>Every page should clearly explain what you offer and why it matters. Avoid vague text like "we offer quality services" without saying what the customer actually gets.</p>
    <p>For each product or service, include a descriptive title, clear explanation, benefits, pricing where appropriate, strong images, FAQs, and a call-to-action. Original content also helps your website perform better in search.</p>
    <h2>Step 7: Add professional images</h2>
    <p>Images are often the first thing visitors notice. Use high-resolution product photos, team photos, storefront images, service demonstrations, or lifestyle photos where relevant.</p>
    <p>Avoid blurry, pixelated, or heavily watermarked images. Add descriptive alt text to important images so the website is more accessible and easier for search engines to understand.</p>
    <h2>Step 8: Set up online payments</h2>
    <p>If you sell online, customers should be able to pay securely and easily. Common options include bank transfers, debit cards, credit cards, and locally supported payment methods.</p>
    <p>A smooth checkout experience can reduce abandoned purchases. Make payment instructions clear and show customers what happens after payment is completed.</p>
    <h2>Step 9: Configure delivery or bookings</h2>
    <p>If you sell physical products, define delivery locations, shipping fees, timelines, and return policies. If you sell services, set up appointment booking, consultation requests, contact forms, or calendar scheduling.</p>
    <p>The process should feel simple to customers. They should not need to message you repeatedly just to understand delivery, booking, or next steps.</p>
    <h2>Step 10: Optimise for search engines</h2>
    <p>Your website should be easy for Google to understand. Start with unique page titles, helpful descriptions, clear headings, fast loading speed, mobile-friendly layouts, internal links, descriptive URLs, and structured content.</p>
    <p>SEO takes time, but these basics help your business become more discoverable when customers search for what you offer.</p>
    <h2>Step 11: Build trust</h2>
    <p>People are more likely to buy from businesses they trust. Add an About page, contact information, a business email, customer reviews, FAQs, clear policies, secure checkout, and professional branding.</p>
    <p>Small details matter. A real address, clear response times, useful product descriptions, and visible policies can make customers feel safer before they pay.</p>
    <h2>Step 12: Launch your website</h2>
    <p>Before going live, test the full experience. Check links, forms, payments, images, mobile layout, page speed, spelling, grammar, policies, and social media links.</p>
    <p>Testing prevents a poor first impression and helps you catch simple mistakes before customers do.</p>
    <h2>Common website mistakes to avoid</h2>
    <ul><li>Using poor-quality images.</li><li>Publishing slow pages.</li><li>Creating confusing navigation.</li><li>Hiding contact information.</li><li>Leaving outdated business details online.</li><li>Putting too much text on the homepage.</li><li>Forgetting clear calls-to-action.</li><li>Ignoring mobile users.</li><li>Failing to update the site regularly.</li></ul>
    <h2>Frequently asked questions</h2>
    <h3>Can I build a business website without coding?</h3><p>Yes. Modern website builders and commerce platforms allow business owners to create professional websites without writing code.</p>
    <h3>How long does it take to build a website?</h3><p>A simple business website can often be launched within a few days. A larger ecommerce website may take longer depending on products, pages, payments, and custom features.</p>
    <h3>What pages should every business website have?</h3><p>At minimum, include Home, About, Products or Services, and Contact. FAQs, policies, blogs, and testimonials can improve trust and customer experience.</p>
    <h3>Is a website better than relying only on social media?</h3><p>Yes. Social media helps people discover your business, while your website gives customers a permanent, professional place to learn more, buy, book, or contact you directly. The strongest approach is to use both together.</p>
    <h2>Final thoughts</h2>
    <p>A business website is more than an online brochure. It is your digital storefront, sales representative, and marketing platform working around the clock.</p>
    <p>Whether you are launching your first business or expanding an existing one, investing in a professional website helps you build credibility, reach more customers, and create new opportunities for growth.</p>
    <p>A well-built website is not just an expense. It is an investment in the future of your business.</p>`;
}

function websiteCostGuideContent() {
  return `
    <p>If you are planning to build a website for your business, one of the first questions you will probably ask is: <strong>how much does a website cost in Nigeria?</strong></p>
    <p>The answer depends on the type of website, the features you need, whether you hire a developer or use a website builder, and how much control you want as the business grows.</p>
    <p>This guide breaks down common website costs in Nigeria, explains what affects pricing, and helps you choose an option that fits your stage of business.</p>
    <h2>The short answer</h2>
    <p>A professional business website in Nigeria can cost anywhere from <strong>&#8358;15,000 to several million naira</strong>, depending on complexity.</p>
    <table><thead><tr><th>Website type</th><th>Typical cost</th></tr></thead><tbody><tr><td>Landing page</td><td>&#8358;15,000 - &#8358;100,000</td></tr><tr><td>Small business website</td><td>&#8358;15,000 - &#8358;250,000</td></tr><tr><td>Ecommerce website</td><td>&#8358;25,000 - &#8358;1,000,000+</td></tr><tr><td>Corporate website</td><td>&#8358;150,000 - &#8358;2,000,000+</td></tr><tr><td>Custom web application</td><td>&#8358;500,000 - &#8358;10,000,000+</td></tr></tbody></table>
    <p>These ranges are only a guide. The final price depends on how the website is built, how many features you need, and whether the site must support ecommerce, bookings, dashboards, or custom workflows.</p>
    <h2>What determines website cost?</h2>
    <h3>1. Type of website</h3>
    <p>A simple portfolio or brochure website costs less than a full ecommerce platform. Business websites, online stores, restaurant websites, school websites, hotel websites, real estate websites, booking platforms, and membership websites all require different levels of work.</p>
    <h3>2. Design approach</h3>
    <p>Custom designs usually cost more than professionally designed templates. Templates can still look polished when customised properly, and they often help small businesses launch faster.</p>
    <h3>3. Number of pages</h3>
    <p>A five-page website is naturally cheaper than a fifty-page website. Common pages include Home, About, Services, Products, Contact, FAQ, Blog, Privacy Policy, and Terms of Service.</p>
    <h3>4. Ecommerce features</h3>
    <p>If you sell online, you may need product catalogues, carts, checkout, payment processing, inventory management, order tracking, delivery fee calculation, discount codes, and customer accounts.</p>
    <h3>5. Custom features</h3>
    <p>Appointment booking, school portals, memberships, learning platforms, marketplaces, customer dashboards, and internal management tools usually cost more because they are built around specific business workflows.</p>
    <h2>Hidden website costs to budget for</h2>
    <p>Many first-time business owners only budget for the initial website build. A realistic website budget should also include the costs of keeping the site online, secure, updated, and visible.</p>
    <h3>Domain name</h3>
    <p>Your domain is your online address, such as yourbusiness.com or yourbrand.store. Domains are usually renewed yearly.</p>
    <h3>Hosting</h3>
    <p>Hosting keeps your website online. Some website platforms include hosting in their plans, while other setups require separate hosting.</p>
    <h3>Maintenance</h3>
    <p>Websites need regular care. Maintenance may include security updates, performance improvements, content updates, bug fixes, backups, and technical support.</p>
    <h3>Marketing</h3>
    <p>Building a website is only the first step. You may still need Google Search optimisation, social media, email marketing, paid advertising, and content marketing to attract visitors.</p>
    <h2>Should you hire a developer or use a website builder?</h2>
    <h3>Hiring a developer</h3>
    <p>A developer may be the right choice if you need highly customised functionality, complex business workflows, bespoke software, or enterprise integrations. The tradeoff is usually higher upfront cost and more technical dependence for future changes.</p>
    <h3>Using a website builder</h3>
    <p>A website builder is often practical for small businesses, fashion brands, restaurants, retail stores, service providers, creators, and startups. Benefits can include faster launch, lower upfront cost, easy updates, built-in hosting, mobile responsiveness, and integrated ecommerce tools.</p>
    <h2>Is the cheapest option always best?</h2>
    <p>Not always. A very low-cost website may lack mobile optimisation, security, SEO foundations, payment integration, fast loading speed, or reliable support.</p>
    <p>Choosing purely on price can become more expensive later if you need to rebuild the website. Focus on value, customer experience, and whether the solution can support your next stage of growth.</p>
    <h2>How to budget for a website</h2>
    <p>Before choosing a solution, ask yourself what the website should do, whether you will sell products online, whether you need payments, whether you will update it yourself, whether you need a blog, and how much the business may grow over the next few years.</p>
    <p>These answers help you avoid paying for features you do not need while making sure you do not outgrow the website too quickly.</p>
    <h2>Frequently asked questions</h2>
    <h3>Can I build a professional website on a small budget?</h3><p>Yes. Many businesses start with a simple website and add new features over time. Launching early and improving steadily is often better than waiting for perfection.</p>
    <h3>Do I need an ecommerce website if I sell on Instagram?</h3><p>A website complements social media. It gives customers a trusted place to browse products, place orders, and learn more without depending on one social platform.</p>
    <h3>How long does it take to build a website?</h3><p>Simple business websites can often be launched within days. Larger custom projects may take weeks or months depending on features, content, and approvals.</p>
    <h3>Can I manage my own website after it is built?</h3><p>Many modern website platforms let business owners update products, content, and pages without technical knowledge.</p>
    <h2>Final thoughts</h2>
    <p>The cost of a website in Nigeria depends on your business goals, not a single fixed price. A small business may only need a clean professional website to establish credibility, while a larger organisation may need advanced custom functionality.</p>
    <p>Instead of asking for the cheapest possible website, ask which website solution will help your business grow over the next five years.</p>
    <p>A well-built website can generate enquiries, sales, and long-term customer relationships. That makes it an investment, not just another business expense.</p>`;
}

function websiteVsInstagramContent() {
  return `
    <p>If you are starting a business today, you may be asking: <strong>do I really need a website, or is an Instagram Business Page enough?</strong></p>
    <p>It is a fair question. Many successful businesses begin on Instagram, TikTok, or WhatsApp before launching a website. But as your business grows, customer expectations grow too.</p>
    <p>The truth is that Instagram and a website serve different purposes. Instagram helps people discover your business. A website helps them trust it, buy from it, and return again.</p>
    <h2>The short answer</h2>
    <p>If you are serious about building a long-term business, use both. Instagram is excellent for attention, while your website converts that attention into enquiries, orders, and repeat customers.</p>
    <h2>What is an Instagram Business Page?</h2>
    <p>An Instagram Business Page lets businesses share photos and videos, communicate with customers, display contact information, run ads, sell through Instagram Shopping where available, and build a community.</p>
    <p>It is one of the easiest ways to start marketing online because your audience may already spend time there.</p>
    <h2>What is a business website?</h2>
    <p>A business website is your company's digital headquarters. Unlike social media, your website belongs to your business.</p>
    <p>It lets customers learn about your business, browse products or services, place orders, make payments, contact your team, read FAQs, and find you through Google Search.</p>
    <h2>Instagram vs website: quick comparison</h2>
    <table><thead><tr><th>Feature</th><th>Instagram Business Page</th><th>Business Website</th></tr></thead><tbody><tr><td>Brand control</td><td>Limited</td><td>Complete</td></tr><tr><td>Google visibility</td><td>Very limited</td><td>Strong</td></tr><tr><td>Online payments</td><td>Limited</td><td>Full support</td></tr><tr><td>Product catalogue</td><td>Basic</td><td>Advanced</td></tr><tr><td>Search functionality</td><td>Limited</td><td>Full</td></tr><tr><td>Ownership</td><td>Platform controlled</td><td>You own it</td></tr><tr><td>Custom branding</td><td>Limited</td><td>Flexible</td></tr><tr><td>SEO opportunities</td><td>Minimal</td><td>Extensive</td></tr><tr><td>Professional credibility</td><td>Good</td><td>Excellent</td></tr><tr><td>Scalability</td><td>Moderate</td><td>High</td></tr></tbody></table>
    <h2>1. Ownership matters</h2>
    <p>Your Instagram page exists on Instagram's platform. Your website belongs to your business. If Instagram changes policies, limits reach, or your account has issues, your website can remain available.</p>
    <p>Building your whole business on a platform you do not control creates risk. A website gives you a more stable foundation.</p>
    <h2>2. Customers trust websites</h2>
    <p>Many customers feel more comfortable buying from a business with a professional website, clear product pages, policies, secure checkout, and contact information.</p>
    <p>An Instagram page can create interest, but a website often provides the extra confidence needed before payment.</p>
    <h2>3. Google can find your website</h2>
    <p>People search Google every day for products and services such as fashion stores in Lagos, skincare products in Nigeria, restaurants near me, hair vendors in Abuja, website builders, and online clothing stores.</p>
    <p>A properly optimised website can appear in these searches. Instagram posts rarely provide the same long-term search visibility.</p>
    <h2>4. Websites work while you sleep</h2>
    <p>Instagram needs regular posting to stay visible. A website can keep working when you are offline. Customers can browse products, read about your business, place orders, pay, or submit enquiries at any time.</p>
    <h2>5. Websites create a better shopping experience</h2>
    <p>As your product catalogue grows, Instagram can become difficult to manage. Customers may struggle to find products, compare options, check stock, or complete purchases.</p>
    <p>A website allows visitors to search, filter, browse categories, read details, and checkout in a more structured way.</p>
    <h2>6. Payments are easier on a website</h2>
    <p>Many Instagram businesses still send account numbers through direct messages. That can work, but it adds friction.</p>
    <p>A website gives customers a structured checkout flow with payment options, order confirmation, and clearer next steps.</p>
    <h2>7. Your brand looks more professional</h2>
    <p>With a website, you control colours, typography, layout, images, product presentation, and the full customer journey. That creates a stronger and more consistent brand experience than a profile page alone.</p>
    <h2>8. Websites grow with your business</h2>
    <p>As your business expands, you may need product categories, inventory management, customer accounts, order tracking, discount codes, blog content, analytics, and email marketing.</p>
    <p>These are easier to manage through a website than through social media alone.</p>
    <h2>Where Instagram excels</h2>
    <p>Instagram is still a strong marketing platform. It is useful for product launches, behind-the-scenes content, customer testimonials, short-form videos, community building, influencer collaborations, and brand storytelling.</p>
    <h2>Where websites excel</h2>
    <p>Websites are strongest for product browsing, detailed information, online ordering, search engine visibility, payment collection, customer trust, and long-term business growth.</p>
    <h2>The best strategy is to combine both</h2>
    <p>A strong customer journey might look like this: someone discovers your business on Instagram, visits your website to learn more, browses your products or services, completes a purchase or enquiry, and returns later through your website to buy again.</p>
    <p>Each platform has a job. Instagram attracts attention. Your website turns attention into action.</p>
    <h2>Which businesses benefit most from a website?</h2>
    <p>A website is especially valuable for fashion brands, skincare businesses, hair vendors, restaurants, pharmacies, schools, consultants, agencies, hotels, furniture stores, electronics retailers, and service providers.</p>
    <p>If customers need information before buying, a website becomes even more important.</p>
    <h2>Frequently asked questions</h2>
    <h3>Can I start with only Instagram?</h3><p>Yes. Many businesses start this way while validating products or services. As your customer base grows, adding a website improves professionalism, trust, and discoverability.</p>
    <h3>Do I still need Instagram if I have a website?</h3><p>Yes. Instagram is still one of the best ways to build awareness and engage your audience. It complements your website rather than replacing it.</p>
    <h3>Which one helps with Google Search?</h3><p>A website. Search engines can index your pages, helping customers discover your business when they search for relevant products and services.</p>
    <h3>Can customers buy directly from my website?</h3><p>Yes. Modern business websites can support product catalogues, secure checkout, payment processing, delivery options, and order management.</p>
    <h2>Final thoughts</h2>
    <p>Instagram is powerful for attracting attention, building community, and showcasing your brand. A website is where that attention becomes trust, enquiries, and sales.</p>
    <p>The strongest businesses do not choose one over the other. They use Instagram to reach new audiences and their website to convert visitors into loyal customers.</p>
    <p>If you are building for the long term, investing in both gives you more control, stronger credibility, and more opportunities to grow.</p>`;
}

function websiteTrustContent() {
  return '<p>Instagram, TikTok, and WhatsApp are powerful discovery channels, but they should not be the only home for your business. A website gives customers a stable place to understand your offer, confirm your legitimacy, and take action.</p><h2>You own the customer journey</h2><p>On social media, your content competes with everything else in the feed. On your website, the customer can focus on your products, policies, reviews, and checkout steps without distraction.</p><h2>Search creates long-term demand</h2><p>People search Google for products, prices, delivery options, and business names. A properly structured website gives your brand a chance to appear when buyers are already looking.</p><h2>Trust pages matter</h2><p>Include About, Contact, Terms, Privacy, Refund Policy, and FAQs. These pages answer the questions cautious customers ask before paying online.</p><h2>Use social media and your website together</h2><p>Let social platforms create awareness, then send serious buyers to your website to browse, order, and pay. That combination is stronger than either channel alone.</p>';
}

function paymentSetupContent() {
  return '<p>Payment friction can turn interested buyers into abandoned orders. Your payment setup should make the next step obvious, secure, and easy to complete on mobile.</p><h2>Offer familiar options</h2><p>Many Nigerian customers expect transfer, card, and mobile-friendly payment options. Make the available methods clear before checkout so buyers are not surprised.</p><h2>Confirm orders quickly</h2><p>After payment, customers should know what happens next. Show a confirmation message, send order details, and explain delivery timing.</p><h2>Reduce failed-payment confusion</h2><p>If a payment fails, give customers a clear retry path or support contact. Confusion at this stage can cost the sale.</p><h2>Track what works</h2><p>Review completed orders, failed attempts, and customer questions. The best payment setup improves as you learn where buyers hesitate.</p>';
}

function deliveryChecklistContent() {
  return '<p>Delivery is part of the customer experience. Even when your product is excellent, unclear delivery information can create doubt before purchase and frustration after checkout.</p><h2>Define your delivery zones</h2><p>List where you deliver, how long it takes, and whether pricing changes by location. Start with areas you can serve reliably, then expand.</p><h2>Set packaging standards</h2><p>Good packaging protects the product and reinforces your brand. Decide what every order should include before volume increases.</p><h2>Choose courier partners carefully</h2><p>Compare speed, reliability, communication, and cost. The cheapest option is not always best if it creates repeated support problems.</p><h2>Communicate after purchase</h2><p>Customers want to know when their order has been received, dispatched, and delivered. Simple updates reduce anxiety and support messages.</p><h2>Write a clear return policy</h2><p>Explain what can be returned, the timeframe, and the condition required. Clear policies protect both the customer and your business.</p>';
}

function sendHtml(res, body, status = 200) {
  send(res, injectRuntimeConfig(body), status, 'text/html; charset=utf-8');
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
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.end(body);
}

function redirect(res, location, status = 308) {
  res.statusCode = status;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.end(`Redirecting to ${location}`);
}

function shouldRedirectToPrimaryHost(host) {
  if (!host || host === primaryHost || host.startsWith('localhost') || host.startsWith('127.0.0.1')) return false;
  return host === 'usenile.co' || host === 'nile.ng' || host === 'www.nile.ng';
}

function slugify(value = '') {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function injectRuntimeConfig(html) {
  if (!gaMeasurementId || !html.includes('</head>')) return html;
  const config = `<script>window.__NILE_GA_MEASUREMENT_ID__=${JSON.stringify(gaMeasurementId)};</script>`;
  return html.replace('</head>', `    ${config}\n  </head>`);
}

function snapchatAdsContent() {
  return `
    <p>If you're spending all your advertising budget on Instagram and Facebook, you're probably making the same mistake thousands of Nigerian businesses are making every day.</p>
    <p>While everyone is competing for attention on Meta, there's another platform quietly delivering incredible results for brands that know how to use it.</p>
    <p><strong>That platform is Snapchat.</strong></p>
    <p>For many business owners, Snapchat is still seen as an app for sending disappearing pictures. In reality, it's one of the most powerful advertising platforms available today, especially if your audience includes Gen Z and Millennials.</p>
    <p>If you're looking for cheaper advertising costs, less competition, and a new source of customers, it might be time to give Snapchat Ads a serious look.</p>

    <h2>Why Most Businesses Ignore Snapchat</h2>
    <p>When people think about digital advertising, they usually think about:</p>
    <ul>
      <li>Facebook Ads</li>
      <li>Instagram Ads</li>
      <li>TikTok Ads</li>
      <li>Google Ads</li>
    </ul>
    <p>Snapchat rarely makes the list.</p>
    <p><strong>That's exactly why it's such an opportunity.</strong></p>
    <p>Less competition often means your ads can reach more people for the same budget compared to more crowded platforms.</p>

    <h2>Snapchat's Audience Is More Valuable Than You Think</h2>
    <p>Snapchat has hundreds of millions of active users worldwide, and many of them open the app dozens of times each day. The platform is especially strong among younger audiences who are highly engaged with short-form, vertical content.</p>
    <p>If your business sells products or services to people between 18 and 35 years old, Snapchat deserves to be part of your marketing strategy.</p>
    
    <h2>Why Snapchat Ads Can Be Cheaper</h2>
    <p>One reason many marketers are getting good results is simple. There are fewer advertisers competing for the same audience compared to Facebook and Instagram.</p>
    <p>That often translates into:</p>
    <ul>
      <li>Lower advertising costs</li>
      <li>Better visibility</li>
      <li>Higher engagement</li>
      <li>Less ad fatigue</li>
    </ul>

    <h2>The Biggest Mistake Businesses Make</h2>
    <p>Many businesses simply copy their Instagram ads and upload them to Snapchat.</p>
    <p><strong>That usually doesn't work.</strong></p>
    <p>Snapchat users expect content that feels natural and native. Instead of polished commercials, create videos that look like someone picked up their phone and started talking.</p>

    <h2>Final Thoughts</h2>
    <p>The best marketing platform isn't always the most popular one. It's the platform that delivers the best return on your investment.</p>
    <p>Snapchat Ads remain one of the most overlooked opportunities for businesses that want to reach younger audiences with engaging, mobile-first advertising.</p>
    <p>If you've never considered Snapchat before, now might be the perfect time to test it.</p>
  `;
}
