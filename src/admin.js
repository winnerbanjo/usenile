const loginPanel = document.querySelector('[data-login-panel]');
const adminPanel = document.querySelector('[data-admin-panel]');
const loginForm = document.querySelector('[data-login-form]');
const loginMessage = document.querySelector('[data-login-message]');
const articleForm = document.querySelector('[data-article-form]');
const articleList = document.querySelector('[data-admin-article-list]');
const editorMessage = document.querySelector('[data-editor-message]');
const editorTitle = document.querySelector('[data-editor-title]');
const logoutButton = document.querySelector('[data-logout]');
const newButton = document.querySelector('[data-new-article]');
const previewButton = document.querySelector('[data-preview-article]');
const archiveButton = document.querySelector('[data-archive-article]');
const metricPosts = document.querySelector('[data-metric-posts]');
const metricViews = document.querySelector('[data-metric-views]');
const metricConversions = document.querySelector('[data-metric-conversions]');
const trafficTopViews = document.querySelector('[data-traffic-top-views]');
const trafficList = document.querySelector('[data-traffic-list]');
const categorySelect = document.querySelector('[data-category-select]');
const categoryForm = document.querySelector('[data-category-form]');
const categoryList = document.querySelector('[data-admin-category-list]');
const categoryMessage = document.querySelector('[data-category-message]');
const visualEditor = document.querySelector('[data-visual-editor]');
const editorHtml = document.querySelector('[data-editor-html]');
const coverImageInput = document.querySelector('[data-cover-image-input]');
const coverImageFile = document.querySelector('[data-cover-image-file]');
const uploadCoverButton = document.querySelector('[data-upload-cover]');
const uploadMessage = document.querySelector('[data-upload-message]');
const coverPreview = document.querySelector('[data-cover-preview]');
const coverPreviewImg = document.querySelector('[data-cover-preview-img]');

let articles = [];
let categories = [];

initAdmin();

async function initAdmin() {
  loginForm.addEventListener('submit', login);
  articleForm.addEventListener('submit', saveArticle);
  categoryForm.addEventListener('submit', addCategory);
  logoutButton.addEventListener('click', logout);
  newButton.addEventListener('click', resetEditor);
  previewButton.addEventListener('click', previewArticle);
  archiveButton.addEventListener('click', archiveArticle);
  uploadCoverButton.addEventListener('click', uploadCoverImage);
  coverImageInput.addEventListener('input', updateCoverPreview);
  visualEditor.addEventListener('input', syncEditorHtml);
  document.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', runEditorCommand));
  document.querySelectorAll('[data-insert]').forEach((button) => button.addEventListener('click', insertEditorBlock));

  try {
    await fetchJson('/api/auth/me');
    showAdmin();
  } catch {
    showLogin();
  }
}

async function login(event) {
  event.preventDefault();
  loginMessage.textContent = 'Signing in...';
  const payload = Object.fromEntries(new FormData(loginForm));
  try {
    await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    loginForm.reset();
    showAdmin();
  } catch (error) {
    loginMessage.textContent = error.message || 'Sign in failed';
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  showLogin();
}

async function showAdmin() {
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  await loadCategories();
  await loadArticles();
  resetEditor();
}

function showLogin() {
  adminPanel.hidden = true;
  loginPanel.hidden = false;
}

async function loadArticles() {
  const data = await fetchJson('/api/articles?status=all');
  articles = data.articles || [];
  renderArticleList();
  renderMetrics();
}

async function loadCategories() {
  const data = await fetchJson('/api/categories');
  categories = data.categories || [];
  renderCategoryOptions();
  renderCategoryList();
}

function renderArticleList() {
  articleList.innerHTML = articles
    .map((article) => `
      <div class="admin-article-row">
        <button type="button" data-edit="${escapeAttribute(article.id)}">
          <span class="article-row-status status-${escapeAttribute(article.status || 'draft')}">${escapeHtml(article.status || 'draft')}</span>
          <span class="article-row-copy">
            <strong>${escapeHtml(article.title)}</strong>
            <span>${escapeHtml(article.category || 'Guide')} · ${formatNumber(article.views || 0)} views</span>
          </span>
        </button>
      </div>
    `)
    .join('');

  articleList.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => editArticle(button.dataset.edit));
  });
}

function renderCategoryOptions(selectedName = categorySelect.value || 'Commerce Growth') {
  categorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeAttribute(category.name)}">${escapeHtml(category.name)}</option>`)
    .join('');
  categorySelect.value = categories.some((category) => category.name === selectedName) ? selectedName : categories[0]?.name || '';
}

function renderCategoryList() {
  categoryList.innerHTML = categories
    .map((category) => `
      <a class="category-row" href="/blog/category/${escapeAttribute(category.slug)}">
        <strong>${escapeHtml(category.name)}</strong>
        <span>${category.count || 0} published · /blog/category/${escapeHtml(category.slug)}</span>
      </a>
    `)
    .join('');
}

function renderMetrics() {
  const publishedArticles = articles.filter((article) => article.status === 'published');
  const totalViews = articles.reduce((sum, article) => sum + Number(article.views || 0), 0);
  const totalConversions = articles.reduce((sum, article) => sum + Number(article.conversions || 0), 0);
  const topArticles = [...articles].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5);

  metricPosts.textContent = String(publishedArticles.length);
  metricViews.textContent = formatNumber(totalViews);
  metricConversions.textContent = formatNumber(totalConversions);
  trafficTopViews.textContent = formatNumber(topArticles[0]?.views || 0);
  trafficList.innerHTML = topArticles.length
    ? topArticles
        .map((article, index) => {
          const views = Number(article.views || 0);
          const share = totalViews ? Math.round((views / totalViews) * 100) : 0;
          return `
            <a class="traffic-row" href="/blog/${escapeAttribute(article.slug)}" target="_blank" rel="noreferrer">
              <span>${index + 1}</span>
              <strong>${escapeHtml(article.title)}</strong>
              <em>${formatNumber(views)} reads · ${share}% of traffic</em>
            </a>
          `;
        })
        .join('')
    : '<p class="traffic-empty">No article reads yet.</p>';
}

function editArticle(id) {
  const article = articles.find((item) => item.id === id);
  if (!article) return;
  editorTitle.textContent = 'Edit article';
  articleForm.id.value = article.id;
  articleForm.title.value = article.title || '';
  articleForm.slug.value = article.slug || '';
  articleForm.excerpt.value = article.excerpt || '';
  renderCategoryOptions(article.category || 'Commerce Growth');
  articleForm.tags.value = (article.tags || []).join(', ');
  articleForm.authorName.value = article.author?.name || 'Nile Editorial';
  articleForm.authorRole.value = article.author?.role || '';
  articleForm.coverImage.value = article.coverImage || '';
  updateCoverPreview();
  articleForm.seoTitle.value = article.seo?.title || '';
  articleForm.seoDescription.value = article.seo?.description || '';
  setEditorContent(article.content || '');
  articleForm.status.value = article.status || 'draft';
  articleForm.scheduledAt.value = article.scheduledAt ? article.scheduledAt.slice(0, 16) : '';
  editorMessage.textContent = '';
}

function resetEditor() {
  articleForm.reset();
  articleForm.id.value = '';
  renderCategoryOptions('Commerce Growth');
  articleForm.authorName.value = 'Nile Editorial';
  articleForm.authorRole.value = 'Commerce infrastructure team';
  articleForm.status.value = 'draft';
  articleForm.coverImage.value = '';
  coverImageFile.value = '';
  updateCoverPreview();
  setEditorContent('<h2>Start with the main idea</h2><p>Write the article here. Use the toolbar for headings, lists, links, and calls to action.</p>');
  editorTitle.textContent = 'Create article';
  editorMessage.textContent = '';
}

async function saveArticle(event) {
  event.preventDefault();
  syncEditorHtml();
  editorMessage.textContent = 'Saving...';
  const payload = articlePayload();
  const id = articleForm.id.value;
  const url = id ? `/api/admin/articles/${id}` : '/api/admin/articles';
  const method = id ? 'PUT' : 'POST';

  try {
    const { article } = await fetchJson(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    editorMessage.textContent = `Saved: ${article.title}`;
    await loadCategories();
    await loadArticles();
    editArticle(article.id);
  } catch (error) {
    editorMessage.textContent = error.message || 'Could not save article';
  }
}

async function addCategory(event) {
  event.preventDefault();
  categoryMessage.textContent = 'Adding...';
  const payload = Object.fromEntries(new FormData(categoryForm));
  try {
    const { category } = await fetchJson('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    categoryForm.reset();
    categoryMessage.textContent = `Added ${category.name}`;
    await loadCategories();
    renderCategoryOptions(category.name);
  } catch (error) {
    categoryMessage.textContent = error.message || 'Could not add category';
  }
}

async function archiveArticle() {
  const id = articleForm.id.value;
  if (!id) return;
  await fetchJson(`/api/admin/articles/${id}/archive`, { method: 'POST' });
  resetEditor();
  await loadCategories();
  await loadArticles();
}

function previewArticle() {
  const slug = articleForm.slug.value || slugify(articleForm.title.value);
  if (slug) window.open(`/blog/${slug}`, '_blank');
}

function articlePayload() {
  const category = articleForm.category.value;
  return {
    title: articleForm.title.value,
    slug: articleForm.slug.value,
    excerpt: articleForm.excerpt.value,
    coverImage: articleForm.coverImage.value,
    category,
    categorySlug: slugify(category),
    tags: articleForm.tags.value.split(',').map((tag) => tag.trim()).filter(Boolean),
    author: {
      name: articleForm.authorName.value,
      role: articleForm.authorRole.value
    },
    seo: {
      title: articleForm.seoTitle.value,
      description: articleForm.seoDescription.value
    },
    content: sanitizeEditorHtml(editorHtml.value),
    status: articleForm.status.value,
    scheduledAt: articleForm.scheduledAt.value || null
  };
}

function runEditorCommand(event) {
  event.preventDefault();
  visualEditor.focus();
  const command = event.currentTarget.dataset.command;
  const value = event.currentTarget.dataset.value || null;
  document.execCommand(command, false, value);
  syncEditorHtml();
}

function insertEditorBlock(event) {
  event.preventDefault();
  visualEditor.focus();
  const type = event.currentTarget.dataset.insert;
  if (type === 'link') {
    const url = window.prompt('Paste the link URL');
    if (!url) return;
    document.execCommand('createLink', false, url);
  }
  if (type === 'image') {
    const url = articleForm.coverImage.value || window.prompt('Paste an image URL');
    if (!url) return;
    document.execCommand('insertHTML', false, `<figure><img src="${escapeAttribute(url)}" alt="" /><figcaption>Image caption</figcaption></figure>`);
  }
  if (type === 'cta') {
    document.execCommand(
      'insertHTML',
      false,
      '<div class="article-inline-cta"><span class="blog-eyebrow">Next step</span><p>Add a clear reader action here.</p><a class="btn btn-emerald" href="https://app.nile.ng">Start Building</a></div>'
    );
  }
  syncEditorHtml();
}

async function uploadCoverImage() {
  const file = coverImageFile.files?.[0];
  if (!file) {
    uploadMessage.textContent = 'Choose an image first.';
    return;
  }

  uploadMessage.textContent = 'Uploading image...';
  uploadCoverButton.disabled = true;

  try {
    const signature = await fetchJson('/api/cloudinary/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: 'nile-blog' })
    });

    const body = new FormData();
    body.append('file', file);
    body.append('api_key', signature.apiKey);
    body.append('timestamp', signature.timestamp);
    body.append('signature', signature.signature);
    body.append('folder', signature.folder);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: 'POST',
      body
    });
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(uploadData.error?.message || 'Cloudinary upload failed');

    articleForm.coverImage.value = uploadData.secure_url;
    updateCoverPreview();
    uploadMessage.textContent = 'Image uploaded and attached.';
  } catch (error) {
    uploadMessage.textContent = error.message || 'Could not upload image.';
  } finally {
    uploadCoverButton.disabled = false;
  }
}

function updateCoverPreview() {
  const url = articleForm.coverImage.value.trim();
  coverPreview.hidden = !url;
  if (url) coverPreviewImg.src = url;
}

function setEditorContent(html) {
  visualEditor.innerHTML = sanitizeEditorHtml(html);
  syncEditorHtml();
}

function syncEditorHtml() {
  editorHtml.value = sanitizeEditorHtml(visualEditor.innerHTML);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

function sanitizeEditorHtml(value) {
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

function slugify(value = '') {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(Number(value || 0));
}
