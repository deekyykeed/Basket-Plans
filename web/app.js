import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from './config.js';

// ---------------------------------------------------------------
// Identity
// ---------------------------------------------------------------
// The shopper has no account. A random token kept in localStorage is what
// lets them keep editing the basket they built, and stops anyone else
// editing it just because they can see the code.
const TOKEN_KEY = 'bp_session_token';
const BASKET_KEY = 'bp_basket';

function getToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

const sessionToken = getToken();

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: false },
  global: { headers: { 'x-basket-token': sessionToken } },
});

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
const state = {
  store: null,
  products: [],
  categories: [],
  activeCategory: null,
  search: '',
  /** product id -> { product, quantity } */
  items: new Map(),
  basketId: null,
  code: null,
};

const el = (id) => document.getElementById(id);
const money = (amount, currency = state.store?.currency || config.currency) =>
  `${currency} ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const subtotal = () =>
  Math.round(
    [...state.items.values()].reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0) * 100,
  ) / 100;

// ---------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------
function saveLocal() {
  const payload = {
    basketId: state.basketId,
    code: state.code,
    storeId: state.store?.id ?? null,
    items: [...state.items.values()].map(({ product, quantity }) => ({ product, quantity })),
  };
  localStorage.setItem(BASKET_KEY, JSON.stringify(payload));
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(BASKET_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearLocal() {
  localStorage.removeItem(BASKET_KEY);
}

// ---------------------------------------------------------------
// Sync — the basket row is what gives the code its meaning
// ---------------------------------------------------------------
let syncTimer = null;
let syncing = false;
let syncAgain = false;

function scheduleSync() {
  clearTimeout(syncTimer);
  setSyncState('Saving…');
  syncTimer = setTimeout(sync, 600);
}

function setSyncState(text, kind = '') {
  const node = el('sync-state');
  node.textContent = text;
  node.dataset.state = kind;
}

async function sync() {
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;

  const items = [...state.items.values()].map(({ product, quantity }) => ({
    product_id: product.id,
    name: product.name,
    quantity,
    unit_price: Number(product.price),
  }));

  try {
    if (items.length === 0) {
      // An emptied basket is cancelled rather than left as a live code.
      if (state.basketId) {
        await supabase.from('shared_baskets').update({ status: 'cancelled' }).eq('id', state.basketId);
      }
      state.basketId = null;
      state.code = null;
      clearLocal();
      setSyncState('');
      return;
    }

    const payload = {
      items,
      subtotal: subtotal(),
      currency: state.store?.currency || config.currency,
      store_id: state.store?.id ?? null,
    };

    if (state.basketId) {
      const { error } = await supabase.from('shared_baskets').update(payload).eq('id', state.basketId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('shared_baskets')
        .insert({ ...payload, session_token: sessionToken, status: 'draft' })
        .select('id, code')
        .single();
      if (error) throw error;
      state.basketId = data.id;
      revealCode(data.code);
    }

    saveLocal();
    renderBasket();
    setSyncState(`Code ready — send ${state.code} to WhatsApp`);
  } catch (error) {
    console.error('Basket sync failed:', error);
    setSyncState('Could not save your basket. It will retry.', 'error');
    // Keep the local copy so nothing the shopper tapped is lost.
    saveLocal();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, 4000);
  } finally {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      scheduleSync();
    }
  }
}

/** Types the code out a character at a time, so it reads as something the
 *  basket generated rather than a value that was always there. */
function revealCode(code) {
  state.code = code;
  const node = el('code');
  node.textContent = '';
  [...code].forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = char;
    span.style.animationDelay = `${index * 70}ms`;
    span.classList.add('reveal');
    node.appendChild(span);
  });
}

// ---------------------------------------------------------------
// Basket operations
// ---------------------------------------------------------------
function addItem(product) {
  const existing = state.items.get(product.id);
  state.items.set(product.id, {
    product,
    quantity: existing ? existing.quantity + 1 : 1,
  });
  if (navigator.vibrate) navigator.vibrate(8);
  afterBasketChange();
}

function decreaseItem(productId) {
  const existing = state.items.get(productId);
  if (!existing) return;
  if (existing.quantity <= 1) {
    state.items.delete(productId);
  } else {
    state.items.set(productId, { ...existing, quantity: existing.quantity - 1 });
  }
  if (navigator.vibrate) navigator.vibrate(5);
  afterBasketChange();
}

function afterBasketChange() {
  renderBasket();
  renderGrid();
  saveLocal();
  scheduleSync();
}

// ---------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------
function renderShops(stores) {
  const list = el('shop-list');
  list.innerHTML = '';

  if (!stores.length) {
    list.innerHTML =
      '<div class="empty">No shops are set up yet.<br /><code>web/sample-data.sql</code> will seed one to try.</div>';
    return;
  }

  for (const store of stores) {
    const card = document.createElement('button');
    card.className = 'shop-card';
    card.type = 'button';

    const badge = store.logo_url
      ? Object.assign(document.createElement('img'), { src: store.logo_url, alt: '' })
      : Object.assign(document.createElement('div'), {
          className: 'shop-fallback',
          textContent: store.name.charAt(0).toUpperCase(),
        });

    const text = document.createElement('div');
    text.innerHTML = '<strong></strong><span></span>';
    text.querySelector('strong').textContent = store.name;
    text.querySelector('span').textContent = store.description || 'Tap to start a basket';

    card.append(badge, text);
    card.addEventListener('click', () => openStore(store));
    list.appendChild(card);
  }
}

function visibleProducts() {
  const query = state.search.trim().toLowerCase();
  return state.products.filter((product) => {
    if (state.activeCategory && product.category_id !== state.activeCategory) return false;
    if (!query) return true;
    return (
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query)
    );
  });
}

function renderCategories() {
  const nav = el('categories');
  nav.innerHTML = '';
  if (state.categories.length < 2) return;

  const makeChip = (label, id) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = label;
    chip.setAttribute('aria-pressed', String(state.activeCategory === id));
    chip.addEventListener('click', () => {
      state.activeCategory = state.activeCategory === id ? null : id;
      renderCategories();
      renderGrid();
    });
    return chip;
  };

  nav.appendChild(makeChip('All', null));
  for (const category of state.categories) {
    nav.appendChild(makeChip(`${category.icon ?? ''} ${category.name}`.trim(), category.id));
  }
}

function renderGrid() {
  const grid = el('grid');
  const products = visibleProducts();

  el('grid-empty').hidden = products.length > 0;
  if (products.length === 0) {
    el('grid-empty').textContent = state.search
      ? `Nothing matching “${state.search}”.`
      : 'This shop has no products yet.';
  }

  grid.innerHTML = '';
  for (const product of products) {
    const inBasket = state.items.get(product.id);

    const card = document.createElement('button');
    card.className = 'product';
    card.type = 'button';
    card.dataset.inBasket = String(Boolean(inBasket));
    card.setAttribute(
      'aria-label',
      `Add ${product.name}, ${money(product.price)}${inBasket ? `, ${inBasket.quantity} in basket` : ''}`,
    );

    const img = document.createElement('img');
    img.className = 'product-img';
    img.loading = 'lazy';
    img.alt = '';
    img.src = product.image_url || fallbackImage(product.name);
    img.addEventListener('error', () => {
      img.src = fallbackImage(product.name);
    });

    const name = document.createElement('span');
    name.className = 'product-name';
    name.textContent = product.name;

    const sub = document.createElement('span');
    sub.className = 'product-sub';
    sub.textContent = product.quantity_label || '';

    const price = document.createElement('span');
    price.className = 'product-price';
    price.textContent = money(product.price);

    card.append(img, name, sub, price);
    card.addEventListener('click', () => addItem(product));

    if (inBasket) {
      const badge = document.createElement('span');
      badge.className = 'qty-badge';
      badge.textContent = inBasket.quantity;
      card.appendChild(badge);

      const minus = document.createElement('span');
      minus.className = 'qty-minus';
      minus.setAttribute('role', 'button');
      minus.setAttribute('aria-label', `Remove one ${product.name}`);
      minus.textContent = '−';
      minus.addEventListener('click', (event) => {
        event.stopPropagation();
        decreaseItem(product.id);
      });
      card.appendChild(minus);
    }

    grid.appendChild(card);
  }
}

/** A tinted initial, so a product with no photo still reads as a tile. */
function fallbackImage(name) {
  const letter = (name || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#f0ece3"/>
    <text x="50" y="50" font-family="sans-serif" font-size="40" fill="#d97655"
      text-anchor="middle" dominant-baseline="central">${letter}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function renderBasket() {
  const basket = el('basket');
  const items = [...state.items.values()];
  basket.hidden = items.length === 0;
  if (items.length === 0) return;

  const count = items.reduce((n, i) => n + i.quantity, 0);
  el('basket-count').textContent = `${count} item${count === 1 ? '' : 's'}`;
  el('basket-total').textContent = money(subtotal());

  const strip = el('basket-strip');
  strip.innerHTML = '';
  for (const { product, quantity } of items) {
    const cell = document.createElement('div');
    cell.className = 'basket-cell';

    const img = document.createElement('img');
    img.src = product.image_url || fallbackImage(product.name);
    img.alt = product.name;
    cell.appendChild(img);

    if (quantity > 1) {
      const badge = document.createElement('span');
      badge.textContent = quantity;
      cell.appendChild(badge);
    }

    cell.addEventListener('click', () => decreaseItem(product.id));
    strip.appendChild(cell);
  }

  const ready = Boolean(state.code);
  el('copy-btn').disabled = !ready;
  el('share-btn').disabled = !ready;
  if (!ready) el('code').textContent = '······';
}

// ---------------------------------------------------------------
// Handing off to WhatsApp
// ---------------------------------------------------------------
function shareMessage() {
  const items = [...state.items.values()];
  const lines = items.map(
    ({ product, quantity }) => `• ${quantity} × ${product.name}`,
  );

  return [
    `Basket ${state.code}`,
    '',
    `${state.store?.name ?? 'Shop'} — ${items.reduce((n, i) => n + i.quantity, 0)} items`,
    ...lines,
    '',
    `Shop prices: ${money(subtotal())}`,
    '',
    'Please price this basket for me.',
  ].join('\n');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs a secure context; fall back for plain http.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

let toastTimer = null;
function toast(message) {
  const node = el('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 1800);
}

async function markShared() {
  if (!state.basketId) return;
  const { error } = await supabase
    .from('shared_baskets')
    .update({ status: 'shared' })
    .eq('id', state.basketId);
  if (error) console.warn('Could not mark basket as shared:', error.message);
}

// ---------------------------------------------------------------
// Loading
// ---------------------------------------------------------------
async function loadShops() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, slug, description, logo_url, currency')
    .eq('is_active', true)
    .order('name');

  if (error) {
    el('shop-list').innerHTML = `<div class="empty">Could not load shops.<br /><code>${error.message}</code></div>`;
    return [];
  }
  renderShops(data ?? []);
  return data ?? [];
}

async function openStore(store) {
  // Switching shops starts a new basket — a code means one shop's basket.
  if (state.store && state.store.id !== store.id && state.items.size > 0) {
    state.items.clear();
    state.basketId = null;
    state.code = null;
    clearLocal();
  }

  state.store = store;
  state.activeCategory = null;
  state.search = '';
  el('search').value = '';

  el('shop-view').hidden = true;
  el('catalogue-view').hidden = false;
  el('store-name').textContent = store.name;
  el('store-meta').textContent = store.description || '';
  const logo = el('store-logo');
  logo.hidden = !store.logo_url;
  if (store.logo_url) logo.src = store.logo_url;

  history.replaceState(null, '', `?shop=${encodeURIComponent(store.slug)}`);

  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, quantity_label, image_url, category_id, is_available')
    .eq('store_id', store.id)
    .eq('is_available', true)
    .order('featured', { ascending: false })
    .order('name');

  if (error) {
    el('grid-empty').hidden = false;
    el('grid-empty').textContent = `Could not load products: ${error.message}`;
    return;
  }

  state.products = data ?? [];

  const categoryIds = [...new Set(state.products.map((p) => p.category_id).filter(Boolean))];
  if (categoryIds.length) {
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, icon, display_order')
      .in('id', categoryIds)
      .order('display_order');
    state.categories = categories ?? [];
  } else {
    state.categories = [];
  }

  renderCategories();
  renderGrid();
  renderBasket();
}

/** Puts back a basket the shopper left behind, code and all. */
async function restoreBasket(stores) {
  const saved = loadLocal();
  if (!saved?.items?.length || !saved.storeId) return false;

  const store = stores.find((s) => s.id === saved.storeId);
  if (!store) return false;

  await openStore(store);

  state.items = new Map(
    saved.items.map(({ product, quantity }) => [product.id, { product, quantity }]),
  );
  state.basketId = saved.basketId;

  // Only trust the saved code if the row is still ours and still open.
  if (saved.basketId) {
    const { data } = await supabase
      .from('shared_baskets')
      .select('id, code, status')
      .eq('id', saved.basketId)
      .maybeSingle();

    if (data && ['draft', 'shared'].includes(data.status)) {
      revealCode(data.code);
    } else {
      // Already claimed or gone — the next edit starts a fresh code.
      state.basketId = null;
      state.code = null;
    }
  }

  renderGrid();
  renderBasket();
  if (!state.code) scheduleSync();
  return true;
}

// ---------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------
el('back-to-shops').addEventListener('click', () => {
  el('catalogue-view').hidden = true;
  el('shop-view').hidden = false;
  history.replaceState(null, '', location.pathname);
});

let searchTimer = null;
el('search').addEventListener('input', (event) => {
  clearTimeout(searchTimer);
  const value = event.target.value;
  searchTimer = setTimeout(() => {
    state.search = value;
    renderGrid();
  }, 120);
});

el('copy-btn').addEventListener('click', async () => {
  const ok = await copyToClipboard(shareMessage());
  toast(ok ? 'Basket copied — paste it in WhatsApp' : 'Copy failed, select the code instead');
  if (ok) markShared();
});

el('share-btn').addEventListener('click', () => {
  markShared();
  const text = encodeURIComponent(shareMessage());
  window.open(`https://wa.me/${config.whatsappNumber}?text=${text}`, '_blank', 'noopener');
});

(async function start() {
  const stores = await loadShops();
  const restored = await restoreBasket(stores);

  if (!restored) {
    const wanted = new URLSearchParams(location.search).get('shop');
    const store = wanted ? stores.find((s) => s.slug === wanted) : null;
    if (store) await openStore(store);
    else if (stores.length === 1) await openStore(stores[0]);
  }
})();
