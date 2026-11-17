import { SITE_CONFIG } from '../config/site.js';
import { isTextSafeForLanguage, formatNumber, formatPrice, getLanguage, itemName } from './language.js';
import { menuStore } from './menu-store.js';

function isValidCartItem(item, lang) {
  if (
    !item ||
    !Number.isFinite(item.price) ||
    item.price <= 0 ||
    !Number.isInteger(item.quantity) ||
    item.quantity <= 0
  ) {
    return false;
  }
  const currentItem = menuStore.getMenu().find((entry) => entry.id === item.id);
  if (
    !currentItem ||
    currentItem.status !== 'Available' ||
    item.status !== 'Available' ||
    item.cartValidation ||
    Math.abs(Number(item.basePrice ?? item.price) - currentItem.price) > 0.01
  ) {
    return false;
  }
  if (!Array.isArray(item.selectedAddons ?? [])) return false;
  const selectedAddons = item.selectedAddons ?? [];
  const allowedAddons = menuStore.getAllowedAddons(currentItem);
  const addonTotal = selectedAddons.reduce((sum, addon) => {
    const currentAddon = allowedAddons.find((entry) => entry.id === addon.id);
    if (!currentAddon || Math.abs(currentAddon.price - addon.price) > 0.01) return Number.NaN;
    return sum + currentAddon.price;
  }, 0);
  if (
    !Number.isFinite(addonTotal) ||
    Math.abs(item.price - currentItem.price - addonTotal) > 0.01
  ) {
    return false;
  }
  if (item.note && !isTextSafeForLanguage(item.note, lang)) return false;
  return Array.isArray(item.selectedAddons ?? []);
}

function createOrderId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `kleiv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function logOrder(payload) {
  if (!menuStore.isOrderLoggingEnabled()) return;
  try {
    void fetch(SITE_CONFIG.menuEndpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error) => {
      console.error('Unable to submit the order record to the cafe menu service.', error);
    });
  } catch (error) {
    console.error('Unable to submit the order record to the cafe menu service.', error);
  }
}

export function checkoutViaWhatsApp(cart, customerNotes = '', couponCode = '') {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { ok: false, reason: 'empty-cart' };
  }

  const lang = getLanguage();
  const arabic = lang === 'ar';
  const note = typeof customerNotes === 'string' ? customerNotes.trim() : '';
  if (!isTextSafeForLanguage(note, lang)) {
    return { ok: false, reason: 'note-language-mismatch' };
  }

  const validItems = cart.filter((item) => isValidCartItem(item, lang));
  if (validItems.length !== cart.length || validItems.length === 0) {
    return { ok: false, reason: 'invalid-cart' };
  }

  const subtotal = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const coupon = couponCode ? menuStore.applyCoupon(couponCode, subtotal) : null;
  if (couponCode && !coupon?.ok) {
    return { ok: false, reason: 'invalid-coupon' };
  }
  const discount = coupon?.ok ? coupon.discountAmount : 0;
  const total = Math.max(0, subtotal - discount);

  const lines = arabic ? [
    '*طلب جديد من قائمة كليف ٨*',
    '_اطلب وادفع عند الكاشير_',
    '',
    ...validItems.flatMap((item, index) => {
      const addons = item.selectedAddons ?? [];
      return [
        `${formatNumber(index + 1, lang)}. ${itemName(item, lang)}`,
        `   السعر الأساسي: ${formatPrice(item.basePrice ?? item.price, lang)}`,
        ...addons.map((addon) => `   إضافة: ${itemName(addon, lang)} (${formatPrice(addon.price, lang)})`),
        `   ${formatNumber(item.quantity, lang)} × ${formatPrice(item.price, lang)} = ${formatPrice(item.price * item.quantity, lang)}`,
        ...(item.note ? [`   ملاحظة: ${item.note}`] : []),
      ];
    }),
    '',
    `المجموع قبل الخصم: ${formatPrice(subtotal, lang)}`,
    ...(discount ? [`الخصم: −${formatPrice(discount, lang)}`] : []),
    `*الإجمالي: ${formatPrice(total, lang)}*`,
  ] : [
    `*New ${SITE_CONFIG.name} 8 counter order*`,
    '_Order and pay at the cashier_',
    '',
    ...validItems.flatMap((item, index) => {
      const addons = item.selectedAddons ?? [];
      return [
        `${formatNumber(index + 1, lang)}. ${itemName(item, lang)}`,
        `   Base price: ${formatPrice(item.basePrice ?? item.price, lang)}`,
        ...addons.map((addon) => `   Add-on: ${itemName(addon, lang)} (${formatPrice(addon.price, lang)})`),
        `   ${formatNumber(item.quantity, lang)} × ${formatPrice(item.price, lang)} = ${formatPrice(item.price * item.quantity, lang)}`,
        ...(item.note ? [`   Note: ${item.note}`] : []),
      ];
    }),
    '',
    `Subtotal: ${formatPrice(subtotal, lang)}`,
    ...(discount ? [`Discount (${coupon.code}): −${formatPrice(discount, lang)}`] : []),
    `*Total: ${formatPrice(total, lang)}*`,
  ];

  if (note) lines.push('', arabic ? `ملاحظة للباريستا: ${note}` : `Barista note: ${note}`);
  lines.push('', arabic ? 'تم إرسال الطلب عبر قائمة كليف الرقمية.' : `Generated via the ${SITE_CONFIG.name} digital menu.`);

  const url = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener,noreferrer');

  logOrder({
    action: 'submit_order',
    order_id: createOrderId(),
    submitted_at: new Date().toISOString(),
    currency: 'EGP',
    language: lang,
    items: validItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      base_price: item.basePrice ?? item.price,
      add_ons: (item.selectedAddons ?? []).map((addon) => ({
        id: addon.id,
        price: addon.price,
      })),
      note: item.note ?? '',
    })),
    subtotal,
    coupon_code: coupon?.ok ? coupon.code : '',
    discount,
    total,
    customer_note: note,
  });

  return { ok: true, subtotal, discount, total, url };
}
