import 'dotenv/config';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import { SignJWT, jwtVerify } from 'jose';
import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'path';
import slugify from 'slugify';
import { fileURLToPath } from 'url';
import { z } from 'zod';

config({ path: '.env.local', override: true });

const rootDir = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = new TextEncoder().encode(process.env.AUTH_SECRET || 'local-dev-secret');
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nile.ng';
const loginAttempts = new Map();
let cloudinaryApi;

const pageSeo = {
  index: {
    path: '/',
    title: 'Nile 3.0 | Unified Commerce Infrastructure',
    description:
      'Nile helps ambitious brands build storefronts, accept payments, manage fulfillment, track inventory, and grow with one unified commerce operating system.',
    image: '/src/assets/hero.png'
  },
  about: {
    path: '/about.html',
    title: 'About Nile | Commerce Infrastructure for Ambitious Brands',
    description: 'Learn about Nile, the commerce operating system helping modern businesses sell, get paid, ship, and grow from one platform.',
    image: '/src/assets/founder.jpg'
  },
  ai: {
    path: '/ai.html',
    title: 'Nile AI Assistant | Automate Commerce Operations',
    description: 'Use Nile AI to write product listings, generate support replies, forecast inventory, and speed up daily commerce workflows.',
    image: '/src/assets/creative_studio.jpg'
  },
  careers: {
    path: '/careers.html',
    title: 'Careers at Nile | Build the Future of Commerce',
    description: 'Explore opportunities to help Nile build unified commerce infrastructure for founders, brands, and operators.',
    image: '/src/assets/studio_camera.jpg'
  },
  contact: {
    path: '/contact.html',
    title: 'Contact Nile | Sales, Partnerships, and Support',
    description: 'Contact Nile to discuss platform subscriptions, developer integrations, partnerships, and merchant support.',
    image: '/src/assets/build_trust.jpg'
  },
  developers: {
    path: '/developers.html',
    title: 'Nile Developer Hub | Commerce APIs and Integrations',
    description: 'Build integrations, automate workflows, and extend commerce operations with Nile developer tools and APIs.',
    image: '/src/assets/manage_dashboard.png'
  },
  knowledge: {
    path: '/knowledge.html',
    title: 'Nile Knowledge Base | Commerce Guides and FAQs',
    description: 'Find Nile tutorials, FAQs, account help, pricing guidance, domain setup instructions, and commerce operations answers.',
    image: '/src/assets/build_trust.jpg',
    structuredData: faqSchema([
      [
        'What is Nile?',
        'Nile is an all-in-one commerce platform that helps businesses create websites, accept payments, manage inventory, process orders, and grow online.'
      ],
      [
        'Do I need technical experience?',
        "No. Nile is designed for business owners of all experience levels. You don't need any coding or technical knowledge to start building your store."
      ],
      [
        'Can I use my own domain?',
        'Yes. You can connect your own custom domain or start with a free Nile subdomain. Custom domains are enabled automatically on the Growth and Premium plans.'
      ],
      [
        'What payment providers does Nile support?',
        'Nile supports multiple payment providers depending on your region, including Paystack, bank transfers, and Stripe in supported markets.'
      ],
      [
        'Can I manage my business from my phone?',
        'Yes. You can manage products, view sales reports, print shipping labels, and email customers from the Nile dashboard on mobile or desktop.'
      ],
      [
        'Is there a free trial?',
        'Yes. You can start with a free trial on any Nile platform plan and upgrade whenever you are ready.'
      ]
    ])
  },
  pricing: {
    path: '/pricing.html',
    title: 'Nile Pricing | Transparent Commerce Platform Plans',
    description: 'Compare Nile platform plans and managed setup options for storefronts, payments, fulfillment, and commerce growth.',
    image: '/src/assets/storefront_laptop.jpg'
  },
  samples: {
    path: '/samples.html',
    title: 'Nile Store Samples | Live Commerce Examples',
    description: 'Browse live store examples and commerce experiences powered by Nile for modern brands and founders.',
    image: '/src/assets/fashion_founder.jpg'
  },
  security: {
    path: '/security.html',
    title: 'Nile Security | Safeguarding Commerce Operations',
    description: 'Review Nile security practices for protecting merchant accounts, payments, customer data, and business operations.',
    image: '/src/assets/build_trust.jpg'
  },
  solutions: {
    path: '/solutions.html',
    title: 'Nile Solutions | Storefronts, Payments, Shipping, and Inventory',
    description: 'Explore Nile commerce solutions for building storefronts, accepting payments, printing labels, managing stock, and scaling operations.',
    image: '/src/assets/manage_dashboard.png'
  },
  team: {
    path: '/team.html',
    title: 'Nile Team | Builders of the Commerce Operating System',
    description: 'Meet the team building Nile, the unified commerce operating system for ambitious businesses.',
    image: '/src/assets/founder.jpg'
  },
  blog: {
    path: '/blog',
    title: 'Nile Dispatch | Commerce Growth Guides',
    description: 'Read practical Nile guides on commerce growth, payments, fulfillment, SEO, product education, and customer operations.',
    image: '/src/assets/storefront_laptop.jpg'
  },
  privacy: {
    path: '/privacy.html',
    title: 'Privacy Policy | Nile',
    description: 'Learn how Nile collects, processes, secures, and manages merchant, customer, and transaction data.',
    image: '/src/assets/build_trust.jpg'
  },
  terms: {
    path: '/terms.html',
    title: 'Terms of Service | Nile',
    description: 'Read Nile terms covering subscriptions, platform use, domain services, merchant conduct, and account responsibilities.',
    image: '/src/assets/build_trust.jpg'
  },
  cookies: {
    path: '/cookies.html',
    title: 'Cookie Policy | Nile',
    description: 'Understand how Nile uses cookies, local storage, and browser session technologies for secure commerce experiences.',
    image: '/src/assets/build_trust.jpg'
  },
  'refund-policy': {
    path: '/refund-policy.html',
    title: 'Refund Policy | Nile',
    description: 'Review Nile refund rules for subscriptions, setup services, domain fees, cancellations, and payment disputes.',
    image: '/src/assets/build_trust.jpg'
  },
  dpa: {
    path: '/dpa.html',
    title: 'Data Processing Agreement | Nile',
    description: 'Read Nile data processing terms for privacy, GDPR-aligned operations, and controller-processor responsibilities.',
    image: '/src/assets/build_trust.jpg'
  },
  'merchant-agreement': {
    path: '/merchant-agreement.html',
    title: 'Merchant Agreement | Nile',
    description: 'Review Nile merchant terms for onboarding, payouts, KYC, account use, and operational responsibilities.',
    image: '/src/assets/build_trust.jpg'
  },
  sla: {
    path: '/sla.html',
    title: 'Service Level Agreement | Nile',
    description: 'Review Nile platform uptime commitments, service support expectations, and SLA details.',
    image: '/src/assets/build_trust.jpg'
  }
};

mongoose.set('bufferCommands', false);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/src', express.static(join(rootDir, 'src'), { maxAge: '1h' }));
app.use('/public', express.static(join(rootDir, 'public'), { maxAge: '1h' }));

const staticPages = new Set([
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

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    category: { type: String, default: 'Commerce Growth' },
    categorySlug: { type: String, default: 'commerce-growth', index: true },
    tags: [{ type: String }],
    author: {
      name: { type: String, default: 'Nile Editorial' },
      slug: { type: String, default: 'nile-editorial' },
      role: { type: String, default: 'Commerce infrastructure team' }
    },
    seo: {
      title: String,
      description: String,
      canonical: String
    },
    content: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    publishedAt: Date,
    scheduledAt: Date,
    views: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor'], default: 'admin' },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: Date
  },
  { timestamps: true }
);

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

const articleInput = z.object({
  title: z.string().min(4),
  slug: z.string().optional(),
  excerpt: z.string().max(280).optional(),
  coverImage: z.string().url().or(z.literal('')).optional(),
  category: z.string().min(2).optional(),
  categorySlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z
    .object({
      name: z.string().min(2),
      role: z.string().optional()
    })
    .optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional()
    })
    .optional(),
  content: z.string().min(1),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  scheduledAt: z.string().optional().nullable()
});

let mongoReady = false;
let fallbackArticles = seedArticles();
let fallbackCategories = seedCategories();
let fallbackAdminHash = '';

async function boot({ listen = true } = {}) {
  fallbackAdminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin', 12);

  if (process.env.LOCAL_DEMO_MODE === 'false') {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        dbName: 'nile_booking_2026'
      });
      mongoReady = true;
      await seedAdmin();
      await seedStarterArticles();
      console.log('Blog engine connected to MongoDB.');
    } catch (error) {
      await mongoose.disconnect().catch(() => {});
      mongoReady = false;
      console.log('MongoDB unavailable, using in-memory blog store for this local run.');
    }
  } else {
    mongoReady = false;
    console.log('Local demo mode enabled, using in-memory blog store.');
  }

  if (!listen) return;

  const server = app.listen(port, () => {
    console.log(`Nile local site: http://localhost:${port}`);
    console.log(`Blog: http://localhost:${port}/blog`);
    console.log(`Admin: http://localhost:${port}/admin`);
  });
  server.keepAliveTimeout = 5000;
  server.headersTimeout = 6000;
  server.requestTimeout = 15000;
}

function seedArticles() {
  const now = new Date().toISOString();
  return [
    {
      _id: 'local-1',
      title: 'How Nigerian brands can build a high-converting commerce stack',
      slug: 'nigerian-brands-commerce-stack',
      excerpt:
        'A practical guide to payments, inventory, storefront speed, fulfillment, and customer education for ambitious local brands.',
      coverImage: '/src/assets/storefront_laptop.jpg',
      category: 'Commerce Growth',
      tags: ['commerce', 'payments', 'operations'],
      author: { name: 'Nile Editorial', slug: 'nile-editorial', role: 'Commerce infrastructure team' },
      seo: {
        title: 'Nigerian commerce stack guide | Nile',
        description: 'Build a faster, more reliable commerce stack for payments, inventory, fulfillment, and customer growth.'
      },
      content:
        '<h2>Start with the operating layer</h2><p>Customers experience your brand as one continuous journey. Your storefront, payment confirmation, inventory accuracy, fulfillment updates, and support replies need to work together.</p><h2>Make every article conversion-aware</h2><p>Teach the buyer, answer objections, and place clear calls to action near the decision points.</p>',
      status: 'published',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      views: 142,
      conversions: 9
    },
    {
      _id: 'local-2',
      title: 'The SEO checklist every modern retail founder should use',
      slug: 'retail-founder-seo-checklist',
      excerpt:
        'Technical, editorial, and conversion SEO steps Nile merchants can apply before publishing new product education content.',
      coverImage: '/src/assets/fashion_founder.jpg',
      category: 'SEO',
      tags: ['seo', 'content', 'growth'],
      author: { name: 'Nile Editorial', slug: 'nile-editorial', role: 'Commerce infrastructure team' },
      seo: {
        title: 'Retail founder SEO checklist | Nile',
        description: 'A practical SEO checklist for retail founders publishing product education and growth content.'
      },
      content:
        '<h2>Search intent comes first</h2><p>Every article should answer one clear buyer question and connect naturally to a product, feature, or workflow.</p><h2>Internal links compound</h2><p>Link to relevant guides, solution pages, and calls to action so readers can keep moving without friction.</p>',
      status: 'published',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      views: 87,
      conversions: 5
    },
    {
      _id: 'local-3',
      title: 'Payment methods Nigerian customers expect at checkout',
      slug: 'nigerian-checkout-payment-methods',
      excerpt:
        'What to offer at checkout, how to reduce failed payments, and where payment education belongs in your buying journey.',
      coverImage: '/src/assets/shopping_basket.jpg',
      category: 'Payments',
      tags: ['payments', 'checkout', 'conversion'],
      author: { name: 'Nile Editorial', slug: 'nile-editorial', role: 'Commerce infrastructure team' },
      seo: {
        title: 'Nigerian checkout payment methods | Nile',
        description: 'Learn the payment methods Nigerian customers expect and how to reduce checkout friction.'
      },
      content:
        '<h2>Give buyers familiar options</h2><p>Checkout confidence rises when customers can pay with methods they already trust. Bank transfer, cards, and local payment flows should be clear before the final click.</p><h2>Design for recovery</h2><p>Failed payments should not end the order. Give customers a visible retry path, preserve cart context, and send useful confirmation messages after successful payment.</p><ul><li>Show fees and delivery expectations early.</li><li>Keep confirmation screens specific.</li><li>Connect payment status to inventory and fulfillment.</li></ul>',
      status: 'published',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      views: 214,
      conversions: 17
    },
    {
      _id: 'local-4',
      title: 'How to turn product education into qualified leads',
      slug: 'product-education-qualified-leads',
      excerpt:
        'A Nile playbook for writing guides that answer buyer questions, rank in search, and move readers into sales conversations.',
      coverImage: '/src/assets/creative_studio.jpg',
      category: 'Lead Generation',
      tags: ['content', 'leads', 'sales'],
      author: { name: 'Nile Growth Team', slug: 'nile-growth-team', role: 'Growth strategy' },
      seo: {
        title: 'Product education lead generation playbook | Nile',
        description: 'Use product education content to attract qualified buyers and convert readers into leads.'
      },
      content:
        '<h2>Write for the moment before purchase</h2><p>The best education content meets a buyer when they are comparing options, estimating costs, or trying to avoid operational mistakes.</p><h2>Place CTAs beside intent</h2><p>A reader who just learned how to calculate fulfillment cost is ready for a tool, demo, or setup conversation. Put the next step where the question becomes practical.</p><h2>Measure movement</h2><p>Track scroll depth, CTA clicks, demo starts, and eventual conversions so editorial work can compound into revenue.</p>',
      status: 'published',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      views: 176,
      conversions: 21
    },
    {
      _id: 'local-5',
      title: 'A fulfillment checklist for founders shipping across Lagos',
      slug: 'lagos-fulfillment-checklist',
      excerpt:
        'The operational checks that help stores avoid missed deliveries, duplicate labels, and customer support overload.',
      coverImage: '/src/assets/logistics_truck.jpg',
      category: 'Fulfillment',
      tags: ['shipping', 'operations', 'customers'],
      author: { name: 'Nile Operations', slug: 'nile-operations', role: 'Merchant operations' },
      seo: {
        title: 'Lagos fulfillment checklist for founders | Nile',
        description: 'A practical fulfillment checklist for founders shipping orders across Lagos.'
      },
      content:
        '<h2>Confirm inventory before promising delivery</h2><p>Every delivery promise depends on accurate stock, address quality, courier availability, and payment status. Treat those checks as one workflow.</p><h2>Standardize labels and updates</h2><p>Clear labels reduce handoff mistakes. Automated status messages reduce support questions and make the customer feel the order is moving.</p><ol><li>Validate the address.</li><li>Confirm payment.</li><li>Reserve inventory.</li><li>Print the shipping label.</li><li>Send tracking updates.</li></ol>',
      status: 'published',
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      views: 121,
      conversions: 8
    },
    {
      _id: 'local-6',
      title: 'Draft: Building an editorial calendar for commerce SEO',
      slug: 'commerce-seo-editorial-calendar',
      excerpt:
        'A draft demo article visible inside admin so you can test draft editing, previewing, publishing, and archiving.',
      coverImage: '/src/assets/studio_camera.jpg',
      category: 'SEO',
      tags: ['draft', 'seo', 'planning'],
      author: { name: 'Nile Editorial', slug: 'nile-editorial', role: 'Commerce infrastructure team' },
      seo: {
        title: 'Commerce SEO editorial calendar draft | Nile',
        description: 'A draft demo article for testing the Nile admin publishing workflow.'
      },
      content:
        '<h2>Map content to buyer stages</h2><p>This draft demonstrates unpublished admin content. Publish it from the CMS to make it appear on the public blog feed.</p>',
      status: 'draft',
      publishedAt: undefined,
      createdAt: now,
      updatedAt: now,
      views: 0,
      conversions: 0
    }
  ];
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

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await Admin.findOne({ email });
  if (!existing) {
    await Admin.create({ email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  }
}

async function seedStarterArticles() {
  await Article.bulkWrite(
    seedArticles().map(({ _id, ...article }) => ({
      updateOne: {
        filter: { slug: article.slug },
        update: { $setOnInsert: article },
        upsert: true
      }
    }))
  );
}

function publicArticle(article) {
  const item = article.toObject ? article.toObject() : article;
  const categorySlug = item.categorySlug || makeSlug(item.category || 'Commerce Growth');
  return {
    ...item,
    id: String(item._id),
    categorySlug,
    readingMinutes: Math.max(2, Math.ceil(stripHtml(item.content).split(/\s+/).length / 220)),
    canonical: `${siteUrl}/blog/${item.slug}`
  };
}

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function makeSlug(value) {
  return slugify(value, { lower: true, strict: true, trim: true });
}

async function signSession(admin) {
  return new SignJWT({ sub: String(admin._id || admin.email), email: admin.email, role: admin.role || 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtSecret);
}

async function requireAdmin(req, res, next) {
  const token = req.cookies.nile_admin_session;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
}

function setSessionCookie(res, token) {
  res.cookie('nile_admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

app.get('/healthz', (_req, res) => res.type('text/plain').send('ok'));
app.get('/robots.txt', (_req, res) => {
  res
    .type('text/plain')
    .send(['User-agent: *', 'Allow: /', 'Disallow: /admin', `Sitemap: ${siteUrl}/sitemap.xml`].join('\n'));
});
app.get(['/', '/index.html'], (_req, res) => renderPage(res, 'index'));
app.get('/:page.html', (req, res, next) => {
  const page = req.params.page;
  if (!staticPages.has(page)) return next();
  renderPage(res, page).catch(next);
});
app.get(['/blog', '/blog/'], (_req, res) => renderPage(res, 'blog'));
app.get(['/admin', '/admin/'], (_req, res) => res.sendFile(join(rootDir, 'admin.html')));
app.get('/blog/category/:slug', (req, res) => renderCategoryPage(req, res));
app.get('/blog/:slug', (req, res, next) => renderArticlePage(req, res).catch(next));

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const key = `${req.ip}:${email}`;
  const attempt = loginAttempts.get(key);

  if (attempt?.lockedUntil && attempt.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Too many attempts. Try again shortly.' });
  }

  let admin;
  let passwordHash;
  if (mongoReady) {
    admin = await Admin.findOne({ email });
    if (admin?.lockedUntil && admin.lockedUntil > new Date()) {
      return res.status(429).json({ error: 'Account temporarily locked.' });
    }
    passwordHash = admin?.passwordHash;
  } else if (email === String(process.env.ADMIN_EMAIL || '').toLowerCase()) {
    admin = { email, role: 'admin' };
    passwordHash = fallbackAdminHash;
  }

  const valid = passwordHash ? await bcrypt.compare(password, passwordHash) : false;
  if (!valid) {
    const failed = (attempt?.failed || 0) + 1;
    loginAttempts.set(key, {
      failed,
      lockedUntil: failed >= 5 ? Date.now() + 10 * 60 * 1000 : 0
    });
    if (mongoReady && admin) {
      admin.failedAttempts += 1;
      if (admin.failedAttempts >= 5) admin.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      await admin.save();
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  loginAttempts.delete(key);
  if (mongoReady && admin) {
    admin.failedAttempts = 0;
    admin.lockedUntil = undefined;
    await admin.save();
  }

  setSessionCookie(res, await signSession(admin));
  res.json({ ok: true, email, role: admin.role || 'admin' });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('nile_admin_session', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email, role: req.admin.role });
});

app.get('/api/articles', async (req, res) => {
  const includeDrafts = req.query.status === 'all';
  const category = req.query.category ? makeSlug(String(req.query.category)) : '';
  const mongoQuery = {
    status: includeDrafts ? { $ne: 'archived' } : 'published',
    ...(category ? { categorySlug: category } : {})
  };
  const articles = mongoReady
    ? await Article.find(mongoQuery).sort({ publishedAt: -1, createdAt: -1 }).lean()
    : fallbackArticles.filter((article) => {
        const statusMatch = includeDrafts ? article.status !== 'archived' : article.status === 'published';
        const categoryMatch = !category || (article.categorySlug || makeSlug(article.category || '')) === category;
        return statusMatch && categoryMatch;
      });
  res.json({ articles: articles.map(publicArticle) });
});

app.get('/api/categories', async (_req, res) => {
  const articles = mongoReady ? await Article.find({ status: 'published' }).select('category categorySlug').lean() : fallbackArticles;
  const counts = new Map();
  articles
    .filter((article) => article.status === 'published' || mongoReady)
    .forEach((article) => {
      const slug = article.categorySlug || makeSlug(article.category || 'Commerce Growth');
      counts.set(slug, (counts.get(slug) || 0) + 1);
    });

  const fromArticles = articles.map((article) => ({
    name: article.category || 'Commerce Growth',
    slug: article.categorySlug || makeSlug(article.category || 'Commerce Growth'),
    description: ''
  }));
  const merged = [...fallbackCategories, ...fromArticles].reduce((map, category) => {
    if (!map.has(category.slug)) map.set(category.slug, category);
    return map;
  }, new Map());
  const categories = [...merged.values()]
    .map((category) => ({ ...category, count: counts.get(category.slug) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json({ categories });
});

app.get('/api/articles/:slug', async (req, res) => {
  const slug = req.params.slug;
  let article;
  if (mongoReady) {
    article = await Article.findOneAndUpdate(
      { slug, status: { $in: ['published', 'draft', 'scheduled'] } },
      { $inc: { views: 1 } },
      { new: true }
    );
  } else {
    article = fallbackArticles.find((item) => item.slug === slug);
    if (article) article.views += 1;
  }
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json({ article: publicArticle(article) });
});

app.post('/api/admin/articles', requireAdmin, async (req, res) => {
  const input = articleInput.parse(req.body);
  const slug = makeSlug(input.slug || input.title);
  const payload = toArticlePayload(input, slug);

  if (mongoReady) {
    const article = await Article.create(payload);
    return res.status(201).json({ article: publicArticle(article) });
  }

  const article = {
    ...payload,
    _id: `local-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    conversions: 0
  };
  fallbackArticles.unshift(article);
  res.status(201).json({ article: publicArticle(article) });
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Category name is required' });
  const category = { name, slug: makeSlug(name), description };
  if (!fallbackCategories.some((item) => item.slug === category.slug)) {
    fallbackCategories.push(category);
  }
  res.status(201).json({ category });
});

app.put('/api/admin/articles/:id', requireAdmin, async (req, res) => {
  const input = articleInput.parse(req.body);
  const slug = makeSlug(input.slug || input.title);
  const payload = toArticlePayload(input, slug);

  if (mongoReady) {
    const article = await Article.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    return res.json({ article: publicArticle(article) });
  }

  const index = fallbackArticles.findIndex((item) => item._id === req.params.id || item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Article not found' });
  fallbackArticles[index] = { ...fallbackArticles[index], ...payload, updatedAt: new Date().toISOString() };
  res.json({ article: publicArticle(fallbackArticles[index]) });
});

app.post('/api/admin/articles/:id/archive', requireAdmin, async (req, res) => {
  if (mongoReady) {
    await Article.findByIdAndUpdate(req.params.id, { status: 'archived' });
  } else {
    const article = fallbackArticles.find((item) => item._id === req.params.id || item.id === req.params.id);
    if (article) article.status = 'archived';
  }
  res.json({ ok: true });
});

app.post('/api/cloudinary/signature', requireAdmin, async (req, res) => {
  const cloudinary = await getCloudinary();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = req.body.folder || 'nile-blog';
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET || ''
  );
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature
  });
});

app.get('/sitemap.xml', async (_req, res) => {
  const articles = mongoReady
    ? await Article.find({ status: 'published' }).select('slug updatedAt').lean()
    : fallbackArticles.filter((article) => article.status === 'published');
  const categories = [...new Set(articles.map((article) => article.categorySlug || makeSlug(article.category || '')).filter(Boolean))];
  const staticUrls = Object.values(pageSeo)
    .filter((page) => page.path && page.path !== '/admin')
    .map((page) => page.path);
  const urls = [...new Set([...staticUrls, ...categories.map((slug) => `/blog/category/${slug}`)])]
    .map((path) => `<url><loc>${absoluteUrl(path)}</loc><changefreq>${path.startsWith('/blog') ? 'weekly' : 'monthly'}</changefreq></url>`)
    .join('');
  const articleUrls = articles
    .map((article) => `<url><loc>${absoluteUrl(`/blog/${article.slug}`)}</loc><lastmod>${new Date(article.updatedAt || Date.now()).toISOString()}</lastmod><changefreq>monthly</changefreq></url>`)
    .join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}${articleUrls}</urlset>`);
});

function toArticlePayload(input, slug) {
  const category = input.category || 'Commerce Growth';
  const categorySlug = input.categorySlug ? makeSlug(input.categorySlug) : makeSlug(category);
  return {
    title: input.title,
    slug,
    excerpt: input.excerpt || stripHtml(input.content).slice(0, 220),
    coverImage: input.coverImage || '',
    category,
    categorySlug,
    tags: input.tags || [],
    author: {
      name: input.author?.name || 'Nile Editorial',
      slug: makeSlug(input.author?.name || 'Nile Editorial'),
      role: input.author?.role || 'Commerce infrastructure team'
    },
    seo: {
      title: input.seo?.title || input.title,
      description: input.seo?.description || input.excerpt || stripHtml(input.content).slice(0, 155),
      canonical: `${siteUrl}/blog/${slug}`
    },
    content: input.content,
    status: input.status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    publishedAt: input.status === 'published' ? new Date() : undefined
  };
}

async function getCloudinary() {
  if (cloudinaryApi) return cloudinaryApi;
  const cloudinary = await import('cloudinary');
  cloudinaryApi = cloudinary.v2 || cloudinary.default?.v2;
  cloudinaryApi.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  return cloudinaryApi;
}

async function renderPage(res, pageKey, overrides = {}) {
  const fileName = pageKey === 'index' ? 'index.html' : `${pageKey}.html`;
  const html = await readFile(join(rootDir, fileName), 'utf8');
  const seo = { ...(pageSeo[pageKey] || {}), ...overrides };
  res.type('html').send(applySeo(html, seo));
}

async function renderCategoryPage(req, res) {
  const slug = makeSlug(req.params.slug || '');
  const category = fallbackCategories.find((item) => item.slug === slug);
  const name = category?.name || titleFromSlug(slug);
  await renderPage(res, 'blog', {
    path: `/blog/category/${slug}`,
    title: `${name} Articles | Nile Dispatch`,
    description: `Read Nile Dispatch articles about ${name.toLowerCase()}, commerce operations, growth, payments, fulfillment, and modern storefront strategy.`,
    structuredData: breadcrumbSchema([
      ['Home', '/'],
      ['Blog', '/blog'],
      [name, `/blog/category/${slug}`]
    ])
  });
}

async function renderArticlePage(req, res) {
  const slug = req.params.slug;
  let article;
  if (mongoReady) {
    article = await Article.findOneAndUpdate(
      { slug, status: { $in: ['published', 'draft', 'scheduled'] } },
      { $inc: { views: 1 } },
      { new: true }
    );
  } else {
    article = fallbackArticles.find((item) => item.slug === slug);
    if (article) article.views += 1;
  }
  if (!article) return res.status(404).type('html').send(applySeo(await readFile(join(rootDir, 'article.html'), 'utf8'), {
    path: `/blog/${slug}`,
    title: 'Article not found | Nile Dispatch',
    description: 'This Nile Dispatch article may have moved or been unpublished.',
    robots: 'noindex'
  }));

  const publicItem = publicArticle(article);
  const html = await readFile(join(rootDir, 'article.html'), 'utf8');
  const articleHtml = renderArticleHtml(publicItem);
  const rendered = html.replace('<div data-article-detail></div>', `<div data-article-detail data-server-rendered="true">${articleHtml}</div>`);
  res.type('html').send(applySeo(rendered, {
    path: `/blog/${publicItem.slug}`,
    title: publicItem.seo?.title || `${publicItem.title} | Nile Dispatch`,
    description: publicItem.seo?.description || publicItem.excerpt,
    image: publicItem.coverImage || '/src/assets/shipping_packages.jpg',
    type: 'article',
    robots: publicItem.status === 'published' ? 'index,follow' : 'noindex,nofollow',
    publishedAt: publicItem.publishedAt,
    modifiedAt: publicItem.updatedAt,
    structuredData: [
      articleSchemaJson(publicItem),
      breadcrumbSchema([
        ['Home', '/'],
        ['Blog', '/blog'],
        [publicItem.title, `/blog/${publicItem.slug}`]
      ])
    ]
  }));
}

function applySeo(html, seo = {}) {
  const path = seo.path || '/';
  const canonical = absoluteUrl(path);
  const title = seo.title || 'Nile';
  const description = seo.description || 'Nile is unified commerce infrastructure for ambitious brands.';
  const image = absoluteUrl(seo.image || '/src/assets/hero.png');
  const robots = seo.robots || 'index,follow';
  const structuredData = [
    organizationSchema(),
    websiteSchema(),
    ...(Array.isArray(seo.structuredData) ? seo.structuredData : seo.structuredData ? [seo.structuredData] : [])
  ];
  const meta = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttribute(description)}" />`,
    `<meta name="robots" content="${escapeAttribute(robots)}" />`,
    `<link rel="canonical" href="${escapeAttribute(canonical)}" />`,
    `<meta property="og:type" content="${escapeAttribute(seo.type || 'website')}" />`,
    `<meta property="og:site_name" content="Nile" />`,
    `<meta property="og:title" content="${escapeAttribute(title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(canonical)}" />`,
    `<meta property="og:image" content="${escapeAttribute(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttribute(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}" />`,
    `<meta name="twitter:image" content="${escapeAttribute(image)}" />`,
    seo.publishedAt ? `<meta property="article:published_time" content="${escapeAttribute(new Date(seo.publishedAt).toISOString())}" />` : '',
    seo.modifiedAt ? `<meta property="article:modified_time" content="${escapeAttribute(new Date(seo.modifiedAt).toISOString())}" />` : '',
    `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`
  ]
    .filter(Boolean)
    .join('\n    ');

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta name="description"[\s\S]*?>/i, '')
    .replace(/<meta name="robots"[\s\S]*?>/i, '')
    .replace('</head>', `    ${meta}\n  </head>`);
}

function renderArticleHtml(article) {
  return `
      <span class="blog-eyebrow">${escapeHtml(article.category)}</span>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <span>${escapeHtml(article.author?.name || 'Nile Editorial')}</span>
        <span>${formatDisplayDate(article.publishedAt || article.createdAt)}</span>
        <span>${article.readingMinutes} min read</span>
      </div>
      ${article.coverImage ? `<img class="article-cover" src="${escapeAttribute(article.coverImage)}" alt="${escapeAttribute(article.title)}" />` : ''}
      <div class="article-content">${article.content}</div>
      <div class="article-inline-cta">
        <span class="blog-eyebrow">Next step</span>
        <p>Launch content, payments, fulfillment, and customer growth from one Nile operating layer.</p>
        <a class="btn btn-emerald" href="https://app.nile.ng">Start Building</a>
      </div>`;
}

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nile',
    url: siteUrl,
    logo: absoluteUrl('/src/assets/nile_logo.png'),
    email: 'business@nile.ng',
    sameAs: ['https://www.instagram.com/getnile.co/', 'https://www.tiktok.com/@thewinnerbanjo']
  };
}

function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nile',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/blog?query={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

function articleSchemaJson(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.coverImage ? [absoluteUrl(article.coverImage)] : undefined,
    author: { '@type': 'Person', name: article.author?.name || 'Nile Editorial' },
    publisher: { '@type': 'Organization', name: 'Nile', logo: { '@type': 'ImageObject', url: absoluteUrl('/src/assets/nile_logo.png') } },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`)
  };
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absoluteUrl(path)
    }))
  };
}

function faqSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer
      }
    }))
  };
}

function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
}

function titleFromSlug(slug = '') {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDisplayDate(value) {
  if (!value) return 'Draft';
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

if (process.env.VERCEL) {
  await boot({ listen: false });
} else {
  await boot();
}

export default app;
