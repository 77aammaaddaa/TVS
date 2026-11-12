import { SITE_CONFIG } from '../config/site.js';
import { getLanguage, isTextSafeForLanguage } from './language.js';

const CMS_STORAGE_KEY = 'kleiv8:cms:v2';
const LEGACY_MENU_STORAGE_KEY = 'kleiv8:menu:v1';
const CART_STORAGE_KEY = 'kleiv8:cart:v2';
const LEGACY_CART_STORAGE_KEY = 'kleiv8:cart:v1';
const MENU_UPDATED_EVENT = 'kleiv8:menu-updated';
const CART_UPDATED_EVENT = 'kleiv8:cart-updated';
const CMS_UPDATED_EVENT = 'kleiv8:cms-updated';
const CATEGORIES_UPDATED_EVENT = 'kleiv8:categories-updated';
const SETTINGS_UPDATED_EVENT = 'kleiv8:settings-updated';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readStorage(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key} from local storage.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to persist ${key} in local storage.`, error);
  }
}

function normalizeStatus(item) {
  const rawStatus = String(
    item.status ?? item.status_en ?? item.availability_en ?? item.availability ?? 'Available',
  ).trim().toLowerCase();
  const arabicStatus = String(item.status_ar ?? item.availability_ar ?? '').trim();
  if (['hidden', 'hide', 'inactive'].includes(rawStatus)) return 'Hidden';
  if (
    ['sold out', 'unavailable', 'out of stock', 'false'].includes(rawStatus) ||
    ['غير متاح', 'غير متوفّر', 'نفد'].includes(arabicStatus)
  ) {
    return 'Sold Out';
  }
  return 'Available';
}

function normalizeAllowedAddons(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;|]/u)
      : [];
  return [...new Set(list
    .map((addon) => {
      if (typeof addon === 'string' || typeof addon === 'number') return String(addon).trim();
      if (!isRecord(addon)) return '';
      return String(addon.id ?? addon.addon_id ?? addon.addonId ?? '').trim();
    })
    .filter(Boolean))];
}

function inferMood(category) {
  const value = category.toLowerCase();
  if (['ice', 'frappe', 'juice', 'soda', 'soft drink', 'matcha'].some((part) => value.includes(part))) {
    return 'refresh';
  }
  if (value.includes('coffee') || value.includes('non coffee')) return 'focus';
  return 'chill';
}

function normalizeMenuItem(item) {
  if (!isRecord(item)) return null;

  const id = String(item.id ?? item.item_id ?? item.product_id ?? '').trim();
  const nameEn = String(item.name_en ?? item.name ?? item.title_en ?? '').trim();
  const nameAr = String(item.name_ar ?? item.title_ar ?? '').trim();
  const categoryEn = String(
    item.category_en ?? item.category ?? item.category_name_en ?? item.category_name ?? '',
  ).trim();
  const categoryAr = String(item.category_ar ?? item.category_name_ar ?? '').trim();
  const price = Number(item.price ?? item.price_egp ?? item.priceEGP);
  if (!id || (!nameEn && !nameAr) || !Number.isFinite(price) || price <= 0) return null;

  const descriptionEn = String(item.description_en ?? item.description ?? item.descriptionEn ?? '').trim();
  const descriptionAr = String(item.description_ar ?? item.descriptionAr ?? '').trim();
  const categoryId = String(item.category_id ?? item.categoryId ?? categoryEn ?? categoryAr ?? 'menu').trim();
  const status = normalizeStatus(item);
  const addonList = normalizeAllowedAddons(
    item.allowed_addons_list ?? item.allowed_addons ?? item.allowed_addon_ids,
  );
  const isBestSeller = item.is_best_seller === true ||
    String(item.is_best_seller ?? item.isBestSeller ?? '').toLowerCase() === 'true' ||
    Number(item.sales_rank ?? item.rank) === 1;
  const mood = ['chill', 'focus', 'refresh'].includes(String(item.mood).toLowerCase())
    ? String(item.mood).toLowerCase()
    : inferMood(categoryEn);

  return {
    ...item,
    id,
    category: categoryEn || categoryAr || 'Menu',
    category_id: categoryId,
    category_en: categoryEn,
    category_ar: categoryAr,
    name_en: nameEn,
    name_ar: nameAr,
    description: descriptionEn,
    description_en: descriptionEn,
    description_ar: descriptionAr,
    ingredients_en: String(item.ingredients_en ?? '').trim(),
    ingredients_ar: String(item.ingredients_ar ?? '').trim(),
    serving_notes_en: String(item.serving_notes_en ?? item.serving_notes ?? '').trim(),
    serving_notes_ar: String(item.serving_notes_ar ?? '').trim(),
    price,
    status,
    status_en: String(item.status_en ?? item.availability_en ?? item.status ?? status).trim(),
    status_ar: String(item.status_ar ?? item.availability_ar ?? '').trim(),
    badge: String(item.badge_en ?? item.badge ?? '').trim(),
    badge_en: String(item.badge_en ?? item.badge ?? '').trim(),
    badge_ar: String(item.badge_ar ?? '').trim(),
    image_url: String(item.image_url ?? item.image ?? '').trim(),
    caffeine_level: String(item.caffeine_level ?? 'None').trim(),
    latte_art: item.latte_art === true ||
      (item.latte_art !== false && categoryEn.toLowerCase() === 'hot coffee'),
    mood,
    mood_scores: isRecord(item.mood_scores) ? item.mood_scores : {},
    is_best_seller: isBestSeller,
    orders_count: Math.max(0, Number(item.orders_count ?? item.order_count ?? 0) || 0),
    sales_rank: Number(item.sales_rank ?? item.rank) || 0,
    allowed_addons_list: addonList,
    emoji: String(item.emoji ?? '☕'),
  };
}

function normalizeMenu(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.menu)
      ? payload.menu
      : payload?.data;
  if (!Array.isArray(rows)) {
    throw new TypeError('The menu endpoint response must contain a data array.');
  }
  return rows
    .map(normalizeMenuItem)
    .filter((item) => item && item.status !== 'Hidden');
}

function normalizeCategories(categories, menu) {
  if (Array.isArray(categories) && categories.length) {
    const normalized = categories
      .filter((item) => isRecord(item) && item.active !== false && item.is_active !== false)
      .map((item) => {
        const categoryEn = String(
          item.category_en ?? item.name_en ?? item.category ?? item.name ?? item.id ?? '',
        ).trim();
        const categoryAr = String(item.category_ar ?? item.name_ar ?? '').trim();
        return {
          ...item,
          id: String(item.id ?? item.category_id ?? categoryEn ?? categoryAr).trim(),
          category_en: categoryEn,
          category_ar: categoryAr,
        };
      })
      .filter((item) => item.category_en || item.category_ar);
    if (normalized.length) return normalized;
  }

  const seen = new Set();
  return menu.reduce((result, item) => {
    const id = item.category_id || item.category_en || item.category_ar;
    if (!id || seen.has(id)) return result;
    seen.add(id);
    result.push({
      id,
      category_en: item.category_en,
      category_ar: item.category_ar,
    });
    return result;
  }, []);
}

function normalizeSettings(settings) {
  if (Array.isArray(settings)) {
    return settings.reduce((result, row) => {
      if (!isRecord(row)) return result;
      const key = String(row.key ?? row.name ?? '').trim();
      if (key) result[key] = row.value ?? row.val ?? '';
      return result;
    }, {});
  }
  return isRecord(settings) ? { ...settings } : {};
}

function normalizeCollection(value, alternatives = []) {
  const collection = Array.isArray(value)
    ? value
    : alternatives.find((candidate) => Array.isArray(candidate));
  if (!Array.isArray(collection)) return [];
  return collection.filter((item) =>
    isRecord(item) && item.active !== false && item.is_active !== false && item.status !== 'Hidden'
  );
}

function normalizeAddon(item) {
  const normalized = normalizeMenuItem({
    ...item,
    id: item?.id ?? item?.addon_id ?? item?.addonId,
    name_en: item?.name_en ?? item?.name ?? item?.title_en,
    name_ar: item?.name_ar ?? item?.title_ar,
    category_en: item?.category_en ?? 'Extra',
    category_ar: item?.category_ar ?? 'إضافات',
  });
  return normalized && normalized.status !== 'Hidden' ? normalized : null;
}

function normalizeAddonCatalog(value, menu) {
  if (Array.isArray(value) && value.length) {
    const normalized = value.map(normalizeAddon).filter(Boolean);
    if (normalized.length) return normalized;
  }
  return menu
    .filter((item) => item.category_en.toLowerCase() === 'extra' && item.status !== 'Sold Out')
    .map((item) => ({ ...item, addon_id: item.id }));
}

function makeLineId(itemId, addons, note) {
  const addonIds = addons.map((addon) => addon.id).sort();
  const signature = JSON.stringify([itemId, addonIds, note.trim()]);
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${encodeURIComponent(itemId)}-${(hash >>> 0).toString(36)}`;
}

function normalizeStoredAddons(addons) {
  if (!Array.isArray(addons)) return [];
  return addons
    .filter((addon) => isRecord(addon) && String(addon.id ?? addon.addon_id ?? '').trim())
    .map((addon) => ({
      id: String(addon.id ?? addon.addon_id).trim(),
      name_en: String(addon.name_en ?? addon.name ?? '').trim(),
      name_ar: String(addon.name_ar ?? '').trim(),
      price: Number(addon.price) || 0,
    }));
}

function readCartLines(value) {
  const rows = Array.isArray(value) ? value : value?.items;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((item) => isRecord(item) && String(item.id ?? '').trim())
    .map((item) => {
      const addons = normalizeStoredAddons(item.selectedAddons ?? item.addons);
      const basePrice = Number(item.basePrice ?? item.price);
      const note = String(item.note ?? '').trim();
      const quantity = Number(item.quantity);
      if (!Number.isFinite(basePrice) || basePrice <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        return null;
      }
      const id = String(item.id);
      const lineId = String(item.lineId ?? makeLineId(id, addons, note));
      const price = basePrice + addons.reduce((sum, addon) => sum + addon.price, 0);
      return {
        ...item,
        id,
        lineId,
        basePrice,
        selectedAddons: addons,
        price,
        note,
        quantity,
      };
    })
    .filter(Boolean);
}

function parseDiscountPercent(code) {
  const knownCodes = {
    'KLEIV-SCOOT15': 15,
    SUEZ10: 10,
  };
  return knownCodes[code] ?? 0;
}

class MenuStore extends EventTarget {
  #menu = [];
  #categories = [];
  #settings = {};
  #newsTicker = [];
  #blog = [];
  #addonsCatalog = [];
  #cart = [];
  #updatedAt = '';
  #menuSource = 'fallback';
  #initialized = false;
  #revalidation = null;

  init(fallbackMenu = []) {
    if (!this.#initialized) {
      let normalizedFallback = [];
      try {
        normalizedFallback = normalizeMenu(fallbackMenu);
      } catch (error) {
        console.error('The bundled fallback menu is invalid.', error);
      }

      const cachedBundle = readStorage(CMS_STORAGE_KEY, null);
      try {
        const cachedMenu = cachedBundle ? normalizeMenu(cachedBundle) : [];
        if (cachedMenu.length) {
          this.#loadPayload(cachedBundle, 'cache', false, false);
        } else {
          const legacyMenu = normalizeMenu(readStorage(LEGACY_MENU_STORAGE_KEY, fallbackMenu));
          this.#menu = legacyMenu.length ? legacyMenu : normalizedFallback;
          this.#menuSource = legacyMenu.length ? 'cache' : 'fallback';
          this.#categories = normalizeCategories([], this.#menu);
          this.#addonsCatalog = normalizeAddonCatalog([], this.#menu);
        }
      } catch (error) {
        console.warn('Unable to load the cached menu; using the bundled fallback.', error);
        this.#menu = normalizedFallback;
        this.#menuSource = 'fallback';
        this.#categories = normalizeCategories([], this.#menu);
        this.#addonsCatalog = normalizeAddonCatalog([], this.#menu);
      }

      this.#cart = this.#readCart();
      this.#initialized = true;
      this.#publish();
    }

    return this.#revalidation ??= this.revalidate().finally(() => {
      this.#revalidation = null;
    });
  }

  getMenu() {
    return this.#menu;
  }

  getCategories() {
    return this.#categories;
  }

  getSettings() {
    return this.#settings;
  }

  getNewsTicker() {
    return this.#newsTicker;
  }

  getBlogPosts() {
    return this.#blog;
  }

  getAddonsCatalog() {
    return this.#addonsCatalog;
  }

  getAllowedAddons(menuItemOrId) {
    const item = typeof menuItemOrId === 'string'
      ? this.#menu.find((entry) => entry.id === menuItemOrId)
      : menuItemOrId;
    if (!item || !Array.isArray(item.allowed_addons_list)) return [];
    const allowed = new Set(item.allowed_addons_list);
    return this.#addonsCatalog.filter((addon) => allowed.has(addon.id));
  }

  getCart() {
    return this.#cart;
  }

  getDataStatus() {
    return {
      menuSource: this.#menuSource,
      updatedAt: this.#updatedAt,
      isOnline: typeof navigator === 'undefined' || navigator.onLine,
    };
  }

  isOrderLoggingEnabled() {
    const value = this.#settings.order_logging_enabled ?? this.#settings.orderLoggingEnabled;
    return value === true || String(value).toLowerCase() === 'true';
  }

  applyCoupon(code, subtotal = 0) {
    const normalizedCode = String(code ?? '').trim().toUpperCase();
    if (!normalizedCode) return { ok: false, reason: 'empty-coupon' };

    const configuredCoupons = this.#settings.coupons ?? this.#settings.vouchers ?? [];
    const couponRows = Array.isArray(configuredCoupons)
      ? configuredCoupons
      : isRecord(configuredCoupons)
        ? Object.entries(configuredCoupons).map(([couponCode, value]) => ({
          code: couponCode,
          ...(isRecord(value) ? value : { discount_percent: value }),
        }))
        : [];
    let coupon = couponRows.find((item) =>
      isRecord(item) && String(item.code ?? item.coupon_code ?? '').trim().toUpperCase() === normalizedCode
    );

    if (!coupon) {
      const activeCode = String(
        this.#settings.active_voucher_code ??
        this.#settings.active_coupon_code ??
        this.#settings.coupon_code ??
        '',
      ).trim().toUpperCase();
      if (activeCode !== normalizedCode) return { ok: false, reason: 'invalid-coupon' };
      coupon = {
        code: activeCode,
        discount_percent: this.#settings.active_voucher_discount_percent ??
          this.#settings.active_voucher_percent ??
          this.#settings.discount_percent ??
          parseDiscountPercent(activeCode),
        discount_amount: this.#settings.active_voucher_discount_amount ??
          this.#settings.discount_amount,
        minimum_order: this.#settings.active_voucher_minimum_order,
        active: this.#settings.active_voucher_enabled,
      };
    }

    if (coupon.active === false || coupon.enabled === false) {
      return { ok: false, reason: 'inactive-coupon' };
    }
    const now = Date.now();
    const startsAt = Date.parse(coupon.starts_at ?? coupon.valid_from ?? '');
    const endsAt = Date.parse(coupon.ends_at ?? coupon.valid_until ?? '');
    if ((Number.isFinite(startsAt) && now < startsAt) || (Number.isFinite(endsAt) && now > endsAt)) {
      return { ok: false, reason: 'expired-coupon' };
    }

    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    const minimumOrder = Math.max(0, Number(coupon.minimum_order ?? coupon.min_order ?? 0) || 0);
    if (safeSubtotal < minimumOrder) return { ok: false, reason: 'minimum-order' };

    const percent = Math.max(0, Math.min(100, Number(
      coupon.discount_percent ?? coupon.discountPercentage ?? coupon.percent ?? 0,
    ) || 0));
    const fixedAmount = Math.max(0, Number(coupon.discount_amount ?? coupon.amount ?? 0) || 0);
    if (!percent && !fixedAmount) return { ok: false, reason: 'invalid-coupon' };

    const discountAmount = Math.min(
      safeSubtotal,
      Math.round((fixedAmount || safeSubtotal * percent / 100) * 100) / 100,
    );
    return {
      ok: true,
      code: normalizedCode,
      percent,
      discountAmount,
      total: Math.max(0, safeSubtotal - discountAmount),
    };
  }

  async revalidate() {
    if (!SITE_CONFIG.menuEndpoint) return this.#menu;

    try {
      const response = await fetch(SITE_CONFIG.menuEndpoint, {
        headers: { Accept: 'application/json' },
        cache: 'no-cache',
      });
      if (!response.ok) {
        throw new Error(`Menu request failed with HTTP ${response.status}.`);
      }

      const result = await response.json();
      if (!Array.isArray(result) && result?.success === false) {
        throw new Error(result.error || 'The menu endpoint reported an error.');
      }
      normalizeMenu(result);
      this.#loadPayload(result, 'live');
      return this.#menu;
    } catch (error) {
      console.warn('Menu revalidation failed; keeping the available local menu.', error);
      return this.#menu;
    }
  }

  addToCart(menuItem, selectedAddons = [], note = '') {
    if (!menuItem || !Array.isArray(selectedAddons)) return false;
    const item = this.#menu.find((entry) => entry.id === menuItem.id) ?? menuItem;
    if (item.status === 'Sold Out' || item.status === 'Hidden') return false;

    const normalizedNote = String(note ?? '').trim();
    if (normalizedNote.length > 180 || !isTextSafeForLanguage(normalizedNote, getLanguage())) return false;
    const addons = this.#resolveSelectedAddons(item, selectedAddons);
    if (!addons) return false;
    const lineId = makeLineId(item.id, addons, normalizedNote);
    const existing = this.#cart.find((entry) => entry.lineId === lineId);
    if (existing) {
      existing.quantity += 1;
    } else {
      const basePrice = Number(item.price);
      if (!Number.isFinite(basePrice) || basePrice <= 0) return false;
      this.#cart.push({
        id: item.id,
        lineId,
        name_en: item.name_en,
        name_ar: item.name_ar,
        category: item.category,
        category_en: item.category_en,
        category_ar: item.category_ar,
        description_en: item.description_en,
        description_ar: item.description_ar,
        serving_notes_en: item.serving_notes_en,
        serving_notes_ar: item.serving_notes_ar,
        allowed_addons_list: item.allowed_addons_list,
        basePrice,
        selectedAddons: addons,
        note: normalizedNote,
        price: basePrice + addons.reduce((sum, addon) => sum + addon.price, 0),
        emoji: item.emoji,
        image_url: item.image_url,
        quantity: 1,
      });
    }
    this.#saveCart();
    return true;
  }

  updateCartLineAddons(lineId, selectedAddons = [], note = '') {
    const current = this.#cart.find((item) => item.lineId === lineId);
    if (!current || !Array.isArray(selectedAddons)) return false;
    const item = this.#menu.find((entry) => entry.id === current.id) ?? current;
    const normalizedNote = String(note ?? '').trim();
    if (normalizedNote.length > 180 || !isTextSafeForLanguage(normalizedNote, getLanguage())) return false;
    const addons = this.#resolveSelectedAddons(item, selectedAddons);
    if (!addons) return false;

    const nextLineId = makeLineId(current.id, addons, normalizedNote);
    const duplicate = this.#cart.find((entry) => entry !== current && entry.lineId === nextLineId);
    if (duplicate) {
      duplicate.quantity += current.quantity;
      this.#cart = this.#cart.filter((entry) => entry !== current);
    } else {
      current.lineId = nextLineId;
      current.basePrice = Number(item.price) || current.basePrice;
      current.selectedAddons = addons;
      current.note = normalizedNote;
      current.price = current.basePrice + addons.reduce((sum, addon) => sum + addon.price, 0);
    }
    this.#saveCart();
    return true;
  }

  updateQuantity(lineId, change) {
    const item = this.#cart.find((entry) => entry.lineId === lineId) ??
      this.#cart.find((entry) => entry.id === lineId);
    if (!item || !Number.isInteger(change) || change === 0) return;
    item.quantity += change;
    this.#cart = this.#cart.filter((entry) => entry.quantity > 0);
    this.#saveCart();
  }

  removeCartLine(lineId) {
    const nextCart = this.#cart.filter((entry) => entry.lineId !== lineId);
    if (nextCart.length === this.#cart.length) return;
    this.#cart = nextCart;
    this.#saveCart();
  }

  clearCart() {
    this.#cart = [];
    this.#saveCart();
  }

  subscribe(eventName, callback) {
    this.addEventListener(eventName, callback);
    return () => this.removeEventListener(eventName, callback);
  }

  #resolveSelectedAddons(menuItem, selectedAddons) {
    const allowed = new Map(this.getAllowedAddons(menuItem).map((addon) => [addon.id, addon]));
    const normalized = [];
    for (const selection of selectedAddons) {
      const id = typeof selection === 'string'
        ? selection
        : isRecord(selection)
          ? String(selection.id ?? selection.addon_id ?? '')
          : '';
      const addon = allowed.get(id);
      if (!addon) return null;
      if (!normalized.some((entry) => entry.id === addon.id)) {
        normalized.push({
          id: addon.id,
          name_en: addon.name_en,
          name_ar: addon.name_ar,
          price: addon.price,
        });
      }
    }
    return normalized;
  }

  #loadPayload(payload, source, persist = true, notify = true) {
    const incomingMenu = normalizeMenu(payload);
    if (incomingMenu.length) {
      this.#menu = incomingMenu;
      this.#menuSource = source;
    }

    const categories = normalizeCategories(payload?.categories, this.#menu);
    this.#categories = categories.length ? categories : normalizeCategories([], this.#menu);
    if (payload?.settings !== undefined) this.#settings = normalizeSettings(payload.settings);
    const ticker = payload?.news_ticker ?? payload?.newsTicker ?? payload?.ticker;
    if (Array.isArray(ticker)) this.#newsTicker = normalizeCollection(ticker);
    const blog = payload?.blog ?? payload?.blog_posts ?? payload?.blogPosts;
    if (Array.isArray(blog)) this.#blog = normalizeCollection(blog);
    const addonCatalog = payload?.addons_catalog ?? payload?.addonsCatalog ?? payload?.addons;
    if (Array.isArray(addonCatalog) || incomingMenu.length) {
      this.#addonsCatalog = normalizeAddonCatalog(addonCatalog, this.#menu);
    }
    this.#updatedAt = String(payload?.updated_at ?? payload?.updatedAt ?? this.#updatedAt ?? '').trim();

    if (persist) this.#persist();
    if (notify) this.#publish();
  }

  #readCart() {
    const current = readStorage(CART_STORAGE_KEY, null);
    const cart = readCartLines(current ?? readStorage(LEGACY_CART_STORAGE_KEY, []));
    return cart;
  }

  #persist() {
    writeStorage(CMS_STORAGE_KEY, {
      version: 2,
      updated_at: this.#updatedAt,
      menu: this.#menu,
      categories: this.#categories,
      settings: this.#settings,
      news_ticker: this.#newsTicker,
      blog: this.#blog,
      addons_catalog: this.#addonsCatalog,
      menu_source: this.#menuSource,
    });
  }

  #saveCart() {
    writeStorage(CART_STORAGE_KEY, { version: 2, items: this.#cart });
    this.#dispatch(CART_UPDATED_EVENT, this.#cart);
  }

  #publish() {
    this.#dispatch(MENU_UPDATED_EVENT, this.#menu);
    this.#dispatch(CART_UPDATED_EVENT, this.#cart);
    this.#dispatch(CATEGORIES_UPDATED_EVENT, this.#categories);
    this.#dispatch(SETTINGS_UPDATED_EVENT, this.#settings);
    this.#dispatch(CMS_UPDATED_EVENT, {
      menu: this.#menu,
      categories: this.#categories,
      settings: this.#settings,
      news_ticker: this.#newsTicker,
      blog: this.#blog,
      addons_catalog: this.#addonsCatalog,
      updated_at: this.#updatedAt,
      menu_source: this.#menuSource,
    });
  }

  #dispatch(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export const menuStore = new MenuStore();
export {
  MENU_UPDATED_EVENT,
  CART_UPDATED_EVENT,
  CMS_UPDATED_EVENT,
  CATEGORIES_UPDATED_EVENT,
  SETTINGS_UPDATED_EVENT,
};
