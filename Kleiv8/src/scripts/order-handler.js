import { SITE_CONFIG } from '../config/site.js';
import { formatNumber, formatPrice, getLanguage, itemName } from './language.js';

export function checkoutViaWhatsApp(cart, customerNotes = '') {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { ok: false, reason: 'empty-cart' };
  }

  const lang = getLanguage();
  const arabic = lang === 'ar';
  const validItems = cart.filter((item) =>
    item &&
    Number.isFinite(item.price) &&
    item.price > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
  if (validItems.length === 0) {
    return { ok: false, reason: 'invalid-cart' };
  }

  const total = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const note = typeof customerNotes === 'string' ? customerNotes.trim() : '';
  const wrongLanguagePattern = arabic
    ? /[A-Za-z]/u
    : /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;
  if (wrongLanguagePattern.test(note)) {
    return { ok: false, reason: 'note-language-mismatch' };
  }

  const lines = arabic ? [
    `*طلب جديد من قائمة كليف ٨*`,
    `_اطلب وادفع عند الكاشير_`,
    '',
    ...validItems.flatMap((item, index) => [
      `${formatNumber(index + 1, lang)}. ${itemName(item, lang)}`,
      `   ${formatNumber(item.quantity, lang)} × ${formatPrice(item.price, lang)} = ${formatPrice(item.price * item.quantity, lang)}`,
    ]),
    '',
    `*الإجمالي: ${formatPrice(total, lang)}*`,
  ] : [
    `*New ${SITE_CONFIG.name} 8 counter order*`,
    `_Order and pay at the cashier_`,
    '',
    ...validItems.flatMap((item, index) => [
      `${formatNumber(index + 1, lang)}. ${itemName(item, lang)}`,
      `   ${formatNumber(item.quantity, lang)} × ${formatPrice(item.price, lang)} = ${formatPrice(item.price * item.quantity, lang)}`,
    ]),
    '',
    `*Total: ${formatPrice(total, lang)}*`,
  ];
  if (note) lines.push('', arabic ? `ملاحظة للباريستا: ${note}` : `Barista note: ${note}`);
  lines.push('', arabic ? 'تم إرسال الطلب عبر قائمة كليف الرقمية.' : `Generated via the ${SITE_CONFIG.name} digital menu.`);

  const url = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return { ok: true, total, url };
}
