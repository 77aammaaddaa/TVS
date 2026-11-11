const DEFAULT_MENU_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwzfZyiX-3-tlTLIE8HvUPI6CYh00Yoxj22zl1engCFdfBiQPzzSUVXdamOpngPy7J0/exec';
const configuredMenuEndpoint = import.meta.env.PUBLIC_MENU_ENDPOINT;

export const SITE_CONFIG = Object.freeze({
  name: 'KLEIV',
  symbol: '∞',
  tagline: 'Enjoy Coffee, Enjoy Vibes.',
  subtagline: 'Specialty Coffee & Good Moments · Suez, Egypt',
  location: 'Suez, Egypt',
  currency: 'EGP',
  whatsappNumber: '201023328432',
  menuEndpoint: typeof configuredMenuEndpoint === 'string'
    ? configuredMenuEndpoint.trim()
    : DEFAULT_MENU_ENDPOINT,
  socialLinks: [
    { name: 'Instagram', url: 'https://www.instagram.com/kleiv.eg/' },
    { name: 'Facebook', url: 'https://web.facebook.com/kleiv.eg/' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@kleiv.eg' },
  ],
});