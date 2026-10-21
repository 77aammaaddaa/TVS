export const SITE_CONFIG = Object.freeze({
  name: 'KLEIV',
  symbol: '∞',
  tagline: 'Enjoy Coffee, Enjoy Vibes.',
  subtagline: 'Specialty Coffee & Good Moments · Suez, Egypt',
  location: 'Suez, Egypt',
  currency: 'EGP',
  whatsappNumber: '201023328432',
  menuEndpoint: import.meta.env.PUBLIC_MENU_ENDPOINT?.trim() ?? '',
  socialLinks: [
    { name: 'Instagram', url: 'https://www.instagram.com/kleiv.eg/' },
    { name: 'Facebook', url: 'https://web.facebook.com/kleiv.eg/' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@kleiv.eg' },
  ],
});