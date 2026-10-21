import { SITE_CONFIG } from '../config/site.js';

const MENU_STORAGE_KEY = 'kleiv8:menu:v1';
const CART_STORAGE_KEY = 'kleiv8:cart:v1';
const MENU_UPDATED_EVENT = 'kleiv8:menu-updated';
const CART_UPDATED_EVENT = 'kleiv8:cart-updated';

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Unable to read ${key} from local storage.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to persist ${key} in local storage.`, error);
  }
}

function normalizeMenu(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(rows)) {
    throw new TypeError('The menu endpoint response must contain a data array.');
  }

  return rows
    .filter((item) => item && item.status !== 'Hidden')
    .map((item) => ({
      id: String(item.id ?? ''),
      name_en: String(item.name_en ?? item.name ?? ''),
      name_ar: String(item.name_ar ?? ''),
      description: String(item.description ?? ''),
      description_ar: String(item.description_ar ?? ''),
      price: Number(item.price),
      status: String(item.status ?? 'Available'),
      category: String(item.category ?? 'Menu'),
      badge: String(item.badge ?? ''),
      image_url: String(item.image_url ?? ''),
      caffeine_level: String(item.caffeine_level ?? 'None'),
      latte_art: item.latte_art === false
        ? false
        : item.latte_art === true || String(item.category ?? '').trim().toLowerCase() === 'coffee',
      mood: ['chill', 'focus', 'refresh'].includes(item.mood) ? item.mood : 'chill',
      mood_scores: item.mood_scores && typeof item.mood_scores === 'object'
        ? item.mood_scores
        : {},
      emoji: String(item.emoji ?? '☕'),
    }))
    .filter((item) => item.id && item.name_en && Number.isFinite(item.price) && item.price > 0);
}

class MenuStore extends EventTarget {
  #menu = [];
  #cart = [];
  #initialized = false;
  #revalidation = null;

  init(fallbackMenu = []) {
    if (!this.#initialized) {
      this.#menu = normalizeMenu(readStorage(MENU_STORAGE_KEY, fallbackMenu));
      this.#cart = this.#readCart();
      this.#initialized = true;
      this.#dispatch(MENU_UPDATED_EVENT, this.#menu);
      this.#dispatch(CART_UPDATED_EVENT, this.#cart);
    }

    return this.#revalidation ??= this.revalidate().finally(() => {
      this.#revalidation = null;
    });
  }

  getMenu() {
    return this.#menu;
  }

  getCart() {
    return this.#cart;
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
      const freshMenu = normalizeMenu(result);
      this.#menu = freshMenu;
      writeStorage(MENU_STORAGE_KEY, freshMenu);
      this.#dispatch(MENU_UPDATED_EVENT, this.#menu);
      return this.#menu;
    } catch (error) {
      console.warn('Menu revalidation failed; keeping the available local menu.', error);
      return this.#menu;
    }
  }

  addToCart(menuItem) {
    if (!menuItem || menuItem.status === 'Sold Out') return;

    const existing = this.#cart.find((item) => item.id === menuItem.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.#cart.push({
        id: menuItem.id,
        name_en: menuItem.name_en,
        name_ar: menuItem.name_ar,
        price: menuItem.price,
        emoji: menuItem.emoji,
        quantity: 1,
      });
    }
    this.#saveCart();
  }

  updateQuantity(itemId, change) {
    const item = this.#cart.find((entry) => entry.id === itemId);
    if (!item) return;
    item.quantity += change;
    this.#cart = this.#cart.filter((entry) => entry.quantity > 0);
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

  #readCart() {
    const cart = readStorage(CART_STORAGE_KEY, []);
    if (!Array.isArray(cart)) return [];
    return cart.filter((item) =>
      item &&
      typeof item.id === 'string' &&
      Number.isFinite(item.price) &&
      item.price > 0 &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    );
  }

  #saveCart() {
    writeStorage(CART_STORAGE_KEY, this.#cart);
    this.#dispatch(CART_UPDATED_EVENT, this.#cart);
  }

  #dispatch(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

export const menuStore = new MenuStore();
export { MENU_UPDATED_EVENT, CART_UPDATED_EVENT };
