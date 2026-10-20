import { SITE_CONFIG } from '../config/site.js';

const formatEgp = (amount) =>
  new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2 }).format(amount);

export function checkoutViaWhatsApp(cart, customerNotes = '') {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { ok: false, reason: 'empty-cart' };
  }

  const validItems = cart.filter((item) =>
    item &&
    typeof item.name_en === 'string' &&
    Number.isFinite(item.price) &&
    item.price > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
  if (validItems.length === 0) {
    return { ok: false, reason: 'invalid-cart' };
  }

  const total = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lines = [
    `*New Kleiv 8 counter order*`,
    `_Order and pay at the cashier_`,
    '',
    ...validItems.flatMap((item, index) => [
      `${index + 1}. ${item.name_en}${item.name_ar ? ` (${item.name_ar})` : ''}`,
      `   ${item.quantity} × ${formatEgp(item.price)} EGP = ${formatEgp(item.price * item.quantity)} EGP`,
    ]),
    '',
    `*Total: ${formatEgp(total)} EGP*`,
  ];
  if (customerNotes.trim()) lines.push('', `Note: ${customerNotes.trim()}`);
  lines.push('', `Generated via ${SITE_CONFIG.name} digital menu.`);

  const url = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return { ok: true, total, url };
}
