import app from '../server/src/index';

// معالج الطلبات لضمان تطابق مسارات Express مع Vercel
export default function handler(req: any, res: any) {
  // إذا قام Vercel باقتطاع /api من الرابط، نعيد إضافتها ليتعرف عليها Express
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
}
