# سجل الإصدارات – Eco Fine Pro

الصيغة مبنية على [Keep a Changelog](https://keepachangelog.com/ar/1.1.0/) والترقيم وفق [Semantic Versioning](https://semver.org/lang/ar/).

الأقسام: `Added` إضافة | `Changed` تغيير | `Fixed` إصلاح | `Removed` حذف | `Security` أمان

## [Unreleased]
### Added
- ملفات ROADMAP.md وCHANGELOG.md وWORKLOG.md.

### Known Issues
- `npm run build` يفشل (alias `@/*` خارج `compilerOptions`).
- `npm run lint` يعطي 28 خطأ بسبب ملفات V14 (JSX داخل .js).
- مفاتيح Supabase وPIN ثابت داخل الكود (انظر ROADMAP – المرحلة 1).

---

## [15.0.0] – 2026-08-29
بداية الجيل V15 (Browser-First Hybrid).
### Added
- هيكل Vite + React 19 + TypeScript + Tailwind 4 + shadcn (`src/`, `shared/`, `modules/`).
- تشفير محلي عبر Web Crypto API (`src/lib/crypto.ts`).
- صفحة `Login.tsx` وhook `useAuthLogic` (غير مربوطة بعد).
- `README.md` يصف سياسة الأرشفة ونموذج الأمان.
- شاشة Splash محدثة (`splash.html`).
### Changed
- `.gitignore` يستثني `archive/`, `private/`, `secrets/`, `.env*`, المفاتيح.

## [14.1.0] – 2026-07
### Added
- مشروع `corebalance-os` (Vite) داخل المستودع.
- صفحة `tvs.page` التسويقية مع `robots.txt` و`sitemap.xml`.
- وحدة الحضور `attendance.js` + `attendance.html`.
### Fixed
- إصلاح الشاشة البيضاء في `app.js` وإضافة مكونات لوحة التحكم الناقصة.

## [14.0.0] – 2026-04
Enterprise Multi-Tenant ERP.
### Added
- `XConfig.js`: إعدادات الهوية، أوضاع التمويل (SHARIA/CONVENTIONAL/LEASING)، سياسة الائتمان، قواعد الضامنين، روابط Master Supabase.
- `activation.js`: تفعيل التراخيص وتهيئة Tenant Supabase معزول.
- `XScoreEngine.js`: تقييم ائتماني (EcoCredit Scoring V2).
- `XSync.js`, `X-Audit.js`, `XCore.js`.
- `database.js`: IndexedDB بمخازن لكل كيان + `sync_queue`.
- `schema.sql` (SQLite مرجعي)، stubs `sqlite.js`, `redis.js`, `qdrant.js`, `modules.js`, `initModules.js`.
- `Dockerfile` (nginx:alpine).
- `__tests__/auth.test.js` (placeholder).
- ترجمات `locales/ar,en,fr.json`.

## [13.x] – 2026-03
الجيل الأول الكامل للوحدات (208 commit).
### Added
- POS, CRM, Inventory, Suppliers, Purchases, HR, Accounting, Treasury, Installments, Collection, Legal, Marketing, Survey, Reports, Notifications, Settings, Users, Super Admin, Feedback, Lang.

## [0.1.0] – 2025-06-24
### Added
- أول commit، رفع الملفات الأولية.

[Unreleased]: https://github.com/77aammaaddaa/TVS/compare/e20d083...HEAD
[15.0.0]: https://github.com/77aammaaddaa/TVS/commit/e20d083
