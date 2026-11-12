# خارطة الطريق – Eco Fine Pro

> آخر تحديث: 2026-09-01 | الإصدار الحالي: 15.0.0 (هيكل أولي) | الجيل المستقر: V14.1 (CDN/Babel)

## الرؤية
تحويل Eco Fine Pro من تطبيق React عبر CDN + Babel في المتصفح (V14) إلى تطبيق Vite + React 19 + TypeScript حديث (V15) قابل للبناء والاختبار والنشر الثابت، مع الحفاظ على العمل Offline-first (IndexedDB) والمزامنة متعددة المستأجرين عبر Supabase.

## الحالة الحالية (باختصار)
- V14: كل منطق العمل (~11k سطر في 36 ملف JS) يعمل كملفات ثابتة فقط.
- V15: `src/` يحوي صفحة واحدة + `Login.tsx` غير مربوط، و`npm run build` يفشل.
- لا اختبارات فعلية، مفاتيح Supabase وPIN مكشوفة في الكود.

---

## المرحلة 0 – إصلاح عاجل (v15.0.1)
الهدف: المستودع يُبنى ويُنظَّف.
- [ ] نقل `baseUrl`/`paths` داخل `compilerOptions` في `tsconfig.app.json`
- [ ] إصلاح أنواع `e` في `src/pages/Login.tsx`
- [ ] ربط `routes.tsx` و`Login.tsx` بـ `main.tsx`
- [ ] ضبط ESLint لتجاهل ملفات V14 القديمة (`ignores`)
- [ ] حذف `ecofine.rar`, `corebalance-os/dist`, `0`, `1]`, `__pycache__`, `.roo`, `.continue` من Git
- [ ] إضافة GitHub Actions: `npm ci` → `lint` → `build`

## المرحلة 1 – الأمان (v15.1.0)
- [ ] نقل `MASTER_SUPABASE_URL/KEY` إلى `.env` (`VITE_MASTER_SUPABASE_URL`, `VITE_MASTER_SUPABASE_KEY`) وتدوير المفتاح
- [ ] مراجعة سياسات RLS في Supabase (Master + Tenants)
- [ ] إزالة `SECRET_PIN` الثابت من `app.js` واستبداله بصلاحية دور (role)
- [ ] استبدال مقارنة كلمات المرور النصية في `auth.js` بـ Supabase Auth أو hashing
- [ ] إزالة مفتاح/salt التشفير الثابت من `src/lib/crypto.ts` (اشتقاق من جلسة المستخدم)
- [ ] إضافة `integrity` hashes أو التخلص من CDN بالكامل

## المرحلة 2 – نقل طبقة البيانات (v15.2.0)
- [ ] `src/core/db/` : إعادة كتابة `database.js` (IndexedDB) بـ TypeScript مع أنواع لكل مخزن
- [ ] `src/core/sync/` : ترحيل `XSync.js` و`sync_queue`
- [ ] `src/core/config/` : ترحيل `XConfig.js` كـ typed config + متغيرات بيئة
- [ ] `src/core/audit/` : ترحيل `X-Audit.js`
- [ ] إضافة Vitest واختبارات لطبقة البيانات

## المرحلة 3 – المصادقة والتراخيص (v15.3.0)
- [ ] `auth.js` → `src/modules/auth/`
- [ ] `activation.js` → `src/modules/activation/` (تفعيل الترخيص وتهيئة Tenant Supabase)
- [ ] `users.js` + الأدوار والصلاحيات
- [ ] `super_admin.js` → `src/modules/super-admin/`

## المرحلة 4 – الوحدات التجارية الأساسية (v15.4.0 – v15.6.0)
| الإصدار | الوحدات | الملفات المصدر |
|---|---|---|
| 15.4.0 | POS، المخزون، الموردون، المشتريات | `pos.js`, `inventory.js`, `suppliers.js`, `purchases.js` |
| 15.5.0 | CRM، الأقساط، التحصيل، التقييم الائتماني | `crm.js`, `installments.js`, `collection.js`, `XScoreEngine.js`, `XCore.js` |
| 15.6.0 | المحاسبة، الخزائن، التقارير | `accounting.js`, `treasury.js`, `reports.js` |
- [ ] اختبارات وحدة لـ `XScoreEngine` (منطق حسابي نقي)
- [ ] اختبارات E2E (Playwright) لمسار: بيع → عقد تقسيط → تحصيل قسط

## المرحلة 5 – الوحدات المساعدة (v15.7.0)
- [ ] HR والحضور (`hr.js`, `attendance.js`)
- [ ] الشؤون القانونية (`legal.js`)
- [ ] التسويق والاستبيانات (`marketing.js`, `survey.js`)
- [ ] الإشعارات والإعدادات واللغات (`notifications.js`, `settings.js`, `lang.js`, `locales/`)

## المرحلة 6 – الإطلاق V15 المستقر (v15.8.0 → v16.0.0)
- [ ] إزالة ملفات V14 من الجذر ونقلها إلى `archive/legacy-v14/` (خارج Git)
- [ ] PWA كامل (Service Worker، manifest، Offline cache)
- [ ] تحسين الأداء (code-splitting لكل وحدة)
- [ ] توثيق المستخدم والمطور
- [ ] إصدار v16.0.0

---

## مبادئ الترحيل
1. لا تُنقل وحدة إلا بعد أن تُبنى وتمر اختباراتها.
2. كل وحدة في `src/modules/<name>/` تحتوي: `index.ts`, `components/`, `hooks/`, `types.ts`, `__tests__/`.
3. لا أسرار في الكود؛ `.env.example` فقط.
4. كل PR يجب أن ينجح فيه `npm run lint && npm run build`.

## ملاحظات مؤجلة / أفكار
- خدمات سيرفر (`sqlite.js`, `redis.js`, `qdrant.js`) مؤجلة حتى تظهر حاجة فعلية (وفق README).
- `corebalance-os/` مشروع منفصل – يُقرَّر لاحقاً فصله إلى مستودع مستقل.
