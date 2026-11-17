# خطة وتحليل مراحل تعديل كود مشروع KLEIV ∞ لاستقبال بيانات السيرفر الكاملة (v5.0-CMS)

هذا المستند يوثق التحليل الهندسي الدقيق لمستودع المشروع [GitHub — 77aammaaddaa/TVS/tree/main/Kleiv8](https://github.com/77aammaaddaa/TVS/tree/main/Kleiv8) ويحدد مراحل تعديل الكود ملفاً بملف لربطه بالكامل مع مخرجات سكريبت السيرفر المحدث `Code.gs (v5.0-CMS)` وقاعدة البيانات [Kleiv8 db menu](https://docs.google.com/spreadsheets/d/1znajOKcCGYSoAJy8qFNFCEQpU7yKLvI0Sfsqei7xVYw/edit).

---

## أولاً: تحليل الفجوة بين كود المستودع الحالي واستجابة السيرفر `Code.gs v5.0`

عند فحص ملفات `Kleiv8/src/` الحالية في المستودع، تبيّن أن الكود الحالي مبني على معمارية الإصدار الأول (`v1`) التي كانت تتوقع مصفوفة أصناف بسيطة فقط، بينما يضخ السيرفر الجديد (`v5.0-CMS`) حزمة متكاملة تضم 8 كائنات رئيسية:

| الحقل القادم من السيرفر (`Code.gs v5.0`) | حالة استقباله في كود `Kleiv8/src/` الحالي | التعديل المطلوب في الواجهة |
| :--- | :--- | :--- |
| `settings` (حالة الفتح `is_open_now`، الازدحام `crowd_status`، الإشغال `occupancy_percent`، الكوبونات) | غير مستخدم في `menu-store.js` | تخزين `settings` في `menu-store.js` وبث حدث `SETTINGS_UPDATED_EVENT` لتحديث الهيدر والسلة |
| `news_ticker` (شريط العروض والكوبونات المتحرك) | لا يوجد مكون له في `src/components/` | إنشاء مكون `NewsTicker.astro` أعلى `Header.astro` يقرأ من `menuStore.getNewsTicker()` |
| `categories` (الـ 12 قسماً باللغتين العربية والإنجليزية) | ثابت وقت البناء في `QuickList.astro` | تحديث أزرار الفلترة ديناميكياً في `QuickList.astro` عند وصول بيانات الشيت أو تبديل اللغة |
| `data[].orders_count` & `is_best_seller` (عدد الطلبات وترتيب الأكثر مبيعاً) | يتم تجاهله في `normalizeMenu()` داخل `menu-store.js` | تمرير `orders_count` و`is_best_seller` و`sales_rank` وعرض شارة `🔥 الأكثر مبيعاً` |
| `data[].allowed_addons_list` & `addons_catalog` (إضافات وصوصات كل قطعة) | السلة تجمع الأصناف بـ `item.id` فقط بدون إضافات | تعديل `menu-store.js` لبناء مفتاح سطر فريد `lineId = id + addons + note` وفتح نافذة التخصيص `ProductModal.astro` |
| `data[].ingredients_ar / en` & `story_ar / en` | يقرأ `description` فقط ويعرضه على الكارت مباشرة | إخفاء الوصف من بطاقة شريط السينما `35mm` (عرض الاسم والسعر فقط) وإظهار القصة والمكونات داخل نافذة تفاصيل المنتج |
| `blog` (مقالات مدونة كليف ثنائية اللغة) | لا يوجد مكون له في `src/components/` | إنشاء مكون `BlogSection.astro` يعرض المقالات ويربط كل مقال بمشروبه المميز |
| `updated_at` (توقيت آخر مزامنة والعمل أوفلاين) | يحفظ الأصناف فقط بدون طابع زمني | حفظ الحزمة الكاملة في `localStorage` مع `updated_at` وعرض شارة `يعمل أوفلاين · آخر تحديث`، وإرسال الطلبات عبر `doPost` إلى `sales_log` |

---

## ثانياً: المراحل الـ 6 لتنفيذ التعديلات في كود المشروع بالكامل

### المرحلة 1: تأسيس الاتصال وتحديث البيانات الأولية (`Config & Offline Seed`)

الهدف من هذه المرحلة هو ضمان عمل الموقع فوراً (Offline-First) بالـ 82 صنفاً الحقيقية حتى قبل اكتمال طلب الشبكة، وضمان اتصال الواجهة برابط `Code.gs` دائماً.

1. **تحديث ملف [src/config/site.js](https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/config/site.js):**
   - ضبط `menuEndpoint` ليقرأ `import.meta.env.PUBLIC_MENU_ENDPOINT` أو `PUBLIC_MENU_API_URL` مع وضع رابط Google Apps Script الفعلي كقيمة افتراضية مباشرة حتى لا يعود لنص فارغ `''`.
   - إضافة القيم الافتراضية لبيانات السويس ثنائية اللغة (`location_ar`, `location_en`, `openingHours_ar`, `openingHours_en`).

2. **تحديث ملف [public/data/default-menu.json](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/public/data/default-menu.json):**
   - استبدال الـ 8 أصناف التجريبية القديمة (`k8-espresso-01`) بالـ **82 صنفاً الكاملة** المستخرجة من تبويب `db` بمعرفاتها الصحيحة (`KL-ICF-01` إلى `KL-DST-05`) وأسعارها الفعلية وحقول `orders_count` و`allowed_addons` و`doodle_key`.

3. **إنشاء محرك اللغة [src/scripts/i18n-store.js](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/tree/main/Kleiv8/src/scripts):**
   - إدارة اللغة الحالية (`ar` أو `en`) وحفظها في `localStorage` تحت مفتاح `kleiv8:lang:v5`.
   - تغيير اتجاه الصفحة `document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'` و`document.documentElement.lang = lang` وإطلاق حدث `kleiv8:lang-changed` لتحديث كافة المكونات لحظياً.

---

### المرحلة 2: ترقية مخزن البيانات والمزامنة الأوفلاين والسلة الذكية (`src/scripts/menu-store.js` & `order-handler.js`)

هذه المرحلة هي القلب البرمجي الذي يستقبل حزمة JSON الكاملة من `Code.gs v5.0` ويوزعها على الواجهة.

1. **تحديث دالة `normalizeMenu(payload)` في [src/scripts/menu-store.js](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/scripts/menu-store.js):**
   - الاحتفاظ بجميع الحقول الجديدة لكل صنف:
     - `category_en`, `category_ar`
     - `story_en`, `story_ar`, `ingredients_en`, `ingredients_ar`, `serving_notes_en`, `serving_notes_ar`
     - `orders_count`, `sales_rank`, `is_best_seller`
     - `doodle_key`, `allowed_addons`, `allowed_addons_list`
   - الفرز التلقائي تنازلياً حسب `orders_count` ليتصدر الأكثر مبيعاً.

2. **إضافة مخازن لحزمة الـ CMS الكاملة في `MenuStore`:**
   - حفظ واسترجاع الكائنات الإضافية القادمة من السيرفر في `localStorage` (`kleiv8:cms-bundle:v5`):
     - `#settings`: إعدادات الفتح/الإغلاق، مؤشر الازدحام (`crowd_status`, `occupancy_percent`), والكوبونات الفعالة.
     - `#categories`: قائمة الـ 12 قسماً ثنائية اللغة.
     - `#newsTicker`: عناصر شريط الأخبار والعروض العلوي.
     - `#blog`: مقالات مدونة كليف ثنائية اللغة.
     - `#addonsCatalog`: قائمة الإضافات والصوصات (من قسم `Extra` في الشيت + صوصات اللوتس والنوتيلا والوايت شوكليت بالبندق).
     - `#lastUpdatedAt`: الطابع الزمني لآخر تحديث ناجح من السيرفر لعرضه للمستخدم في وضع الأوفلاين.

3. **ترقية منطق السلة (`Cart Line-Item Architecture`) لربط الإضافات بكل قطعة مستقلة:**
   - بدلاً من البحث عن المنتج بـ `item.id` فقط، يتم توليد معرف سطر فريد لكل قطعة مضافة:
     ```javascript
     const addonKey = selectedAddons.map(a => a.id).sort().join('+');
     const lineId = `${menuItem.id}::${addonKey}::${customNote.trim()}`;
     ```
   - هذا يسمح للعميل بإضافة **وافل شوكولاتة بصوص اللوتس** في سطر مستقل، وإضافة **وافل شوكولاتة آخر بميكس وايت شوكليت وبندق ونوتيلا** في سطر ثانٍ مستقل، مع دالة `updateCartLineAddons(oldLineId, newAddons, newNote)` لتعديل إضافات أي قطعة من داخل السلة مباشرة.
   - إضافة دالة `applyCoupon(code)` التي تتحقق من الكوبون مقابل `settings.active_voucher_code` (`KLEIV-SCOOT15` بخصم 15% أو `SUEZ10` بخصم 10%).

4. **تحديث [src/scripts/order-handler.js](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/scripts/order-handler.js):**
   - تنسيق رسالة الواتساب باللغة المختارة لتشمل تحت كل قطعة قائمة الإضافات المربوطة بها وسعرها وملاحظتها الخاصة، يليها سطر خصم الكوبون والإجمالي النهائي.
   - إرسال طلب خلفية (`fetch(SITE_CONFIG.menuEndpoint, { method: 'POST', mode: 'no-cors', body: JSON.stringify(orderPayload) })`) لتسجيل الطلب تلقائياً في تبويب `sales_log` داخل الشيت ورفع عداد المبيعات `orders_count`.

---

### المرحلة 3: بناء شريط الأخبار الحي، مؤشر الازدحام، وحالة الفتح/الإغلاق (`NewsTicker.astro` & `Header.astro`)

1. **إنشاء مكون `src/components/NewsTicker.astro`:**
   - يُدرج في `src/layouts/Layout.astro` أعلى `Header.astro`.
   - يستمع لحدث `MENU_UPDATED_EVENT` و`kleiv8:lang-changed`، ويعرض رسائل تبويب `news_ticker` في شريط متحرك ناعم، مع زر تفاعلي بجانب كل عرض يحتوي على كود خصم لتفعيله في السلة بضغطة واحدة.

2. **تحديث مكون [src/components/Header.astro](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/components/Header.astro):**
   - إضافة **شارة حالة الكافيه الحية (`#store-status-pill`):** تقرأ `settings.is_open_now` وتعرض `🟢 مفتوح الآن` أو `🔴 مغلق حالياً` مع مواعيد العمل من الشيت.
   - إضافة **مؤشر المود والازدحام (`#crowd-mood-pill`):** يقرأ `settings.crowd_status` و`settings.occupancy_percent` ويعرض حالة المكان (هادئ للمذاكرة 30% / أجواء رايقة 65% / كامل العدد 90%).
   - إضافة **مؤشر الأوفلاين وآخر تحديث (`#sync-timestamp`):** يعرض `⚡ يعمل أوفلاين · آخر تحديث من السيرفر: ...`.
   - إضافة **زر تبديل اللغة (`#lang-toggle`):** للتبديل الفوري بين `عربي` و`EN`.

---

### المرحلة 4: نظام الرسومات المتجهة الهجين (`kleiv-svgs.js`) وتطوير الأنترو والقصة التفاعلية الطويلة (`Splash.astro` & `StoryDoodles.astro`)

1. **إنشاء وحدة الرسومات المتجهة المعزولة `src/scripts/kleiv-svgs.js` وتحديث [src/styles/global.css](https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/styles/global.css):**
   - تضمين الرسومات الـ 7 الأصلية بعد عزل كلاساتها إلى `.k-bg` و`.k-ink` (لمنع تصادم `.cls-1`) وتفكيك مساراتها إلى طبقات `<g>` قابلة للتحريك.
   - إضافة كلاس **الدمج الهجين (`.svg-hybrid-draw.anim-live`)** الذي يجمع بين رسم الحواف الحبري (`stroke-dashoffset` من 1800 إلى 0 مع تلاشي `fill-opacity`) وبين فيزياء الطبقات الحية (حركة الشوبك الطائر، مكعبات الثلج، خيوط البخار، وتموج حروف الشعار).

2. **تحديث [src/components/Splash.astro](https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/components/Splash.astro):**
   - استبدال صورة الـ PNG الثابتة برسمة `infinity` المتجهة المزودة بقناع الرسم اللولبي (`#infinity-draw-mask`) لتُرسَم حركة اللانهاية الحقيقية بانسيابية عند فتح الموقع.

3. **تحويل [src/components/StoryDoodles.astro](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/components/StoryDoodles.astro) و[src/config/story-doodles.js](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/config/story-doodles.js) إلى رحلة قصصية طويلة مع التمرير (`Long Scrollytelling Chapters`):**
   - تحويل الشخصيات إلى **5 فصول قصصية ممتدة رأسياً** تتفاعل مع نزول المستخدم في الصفحة عبر `IntersectionObserver`.
   - كل فصل يفعّل رسم الحواف الهجين للرسمة المتجهة الخاصة به عند ظهوره على الشاشة، ويحكي فصلاً من قصة كليف باللغتين، ويعرض تحته **3 مشروبات/مخبوزات حقيقية من الشيت** بمعرفاتها الصحيحة (`KL-HCF-01`, `KL-BKR-01`, `KL-ICF-02`, `KL-MTC-04`, `KL-HCF-12`) مع زر فتح نافذة التخصيص والإضافة للسلة.

---

### المرحلة 5: تطوير شريط السينما التفاعلي `35mm` ونافذة تفاصيل المنتج والإضافات والسلة (`VibeCanvas.astro`, `ProductModal.astro`, `CartDrawer.astro`)

1. **تطوير شريط السينما في [src/components/VibeCanvas.astro](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/components/VibeCanvas.astro):**
   - **تبسيط البطاقة (Minimalist Card):** تعرض البطاقة في الشريط **الرسمة المتجهة + اسم المنتج + السعر + شارة الترتيب في المبيعات (`🔥 #1`) فقط** بدون ازدحام نصوص الوصف.
   - **التحكم اليدوي + الحركة التلقائية البطيئة:** تحويل حاوية الشريط إلى مسار قابل للسحب بالماوس واللمس يميناً ويساراً (`Pointer Drag + Prev/Next Buttons`)، مع مؤقت `requestAnimationFrame` يحرك الشريط تلقائياً ببطء شديد عندما يتركه المستخدم ويتوقف فوراً عند اللمس أو التمرير.
   - **النقر على البطاقة:** يفتح نافذة `ProductModal.astro` الخاصة بهذا المنتج.

2. **إنشاء نافذة تفاصيل المنتج وتخصيص الإضافات `src/components/ProductModal.astro`:**
   - تعرض عند الضغط على أي بطاقة:
     - الرسمة المتجهة المتحركة + اسم المنتج باللغتين + عدد مرات طلبه (`orders_count`).
     - **الوصف التسويقي القصصي** (من عمود الوصف في `db`) + **المكونات الدقيقة بالجرام والمللي وطريقة التقديم** (من تبويب `الوصف والمكونات`).
     - **قائمة الإضافات والصوصات المسموحة للمنتج (`allowed_addons_list`):** مثل صوص لوتس، ميكس شوكولاتة وايت وبندق، صوص نوتيلا، صوص بستاشيو، سوفت آيس كريم، كريمة خفق، دبل شوت إسبريسو، أو علبة كانز تيك أواي.
     - حقل ملاحظة خاصة بالقطعة + زر الإضافة للسلة (أو حفظ التعديل إذا فُتحت النافذة من داخل السلة).

3. **تطوير [src/components/QuickList.astro](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/components/QuickList.astro) و[src/components/CartDrawer.astro](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/components/CartDrawer.astro):**
   - في `QuickList.astro`: إعادة بناء أزرار التصنيفات الـ 12 ديناميكياً من `menuStore.getCategories()` باللغة المختارة، مع خيار الفرز حسب الأكثر مبيعاً.
   - في `CartDrawer.astro`: عرض كل قطعة مضافة مع قائمة إضافاتها المربوطة بها، وإضافة زر **`✏️ تعديل الإضافات`** لكل قطعة داخل السلة، وإضافة **حقل إدخال وتطبيق كوبون الخصم (`#coupon-input`)** أعلى إجمالي السلة.

---

### المرحلة 6: إنشاء قسم مدونة كليف الحي (`BlogSection.astro`) وربط الصفحة الرئيسية (`index.astro`)

1. **إنشاء مكون `src/components/BlogSection.astro`:**
   - يسحب المقالات المنشورة من `menuStore.getBlogPosts()` (القادمة من تبويب `blog` في الشيت).
   - يعرض بطاقات المقالات باللغة المختارة (`title_ar/en`, `summary_ar/en`, `read_time_mins`)، وعند الضغط على المقال يفتح نافذة قراءة المقال الكامل مع زر لطلب المشروب المرتبط بالمقال.

2. **تجميع المكونات في [src/pages/index.astro](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/pages/index.astro) و[src/layouts/Layout.astro](https://www.google.com/search?q=https://github.com/77aammaaddaa/TVS/blob/main/Kleiv8/src/layouts/Layout.astro):**
   - ترتيب الأقسام في الصفحة:
     1. `NewsTicker.astro` (شريط العروض والكوبونات الحي)
     2. `Header.astro` (الهيدر مع حالة الفتح ومؤشر الازدحام والأوفلاين ومبدل اللغة)
     3. `Hero Section` (بالرسومات المتجهة الهجينة)
     4. `MoodSlider.astro` (محدد المزاج)
     5. `VibeCanvas.astro` (شريط السينما التفاعلي 35mm بالبطاقات المختصرة)
     6. `StoryDoodles.astro` (رحلة الفصول القصصية الـ 5 الطويلة مع التمرير)
     7. `QuickList.astro` (الكتالوج الكامل بـ 12 قسماً وبحث فوري)
     8. `BlogSection.astro` (مدونة كليف من قاعدة البيانات)
     9. `ProductModal.astro` + `CartDrawer.astro` + `LatteArtModal.astro` + `AsmrPrompt.astro`.

---

## ثالثاً: ملخص الملفات التي سيتم تعديلها أو إضافتها في `Kleiv8/`

| المسار داخل `Kleiv8/` | نوع الإجراء | الوظيفة الرئيسية بعد التعديل |
| :--- | :---: | :--- |
| `src/config/site.js` | **تعديل** | ربط رابط `Code.gs` الفعلي وإضافة إعدادات اللغتين |
| `public/data/default-menu.json` | **تحديث كامل** | تضمين الـ 82 صنفاً الحقيقية من تبويب `db` للعمل أوفلاين فوراً |
| `src/scripts/i18n-store.js` | **ملف جديد** | إدارة التبديل اللحظي بين العربية (`RTL`) والإنجليزية (`LTR`) |
| `src/scripts/kleiv-svgs.js` | **ملف جديد** | الرسومات الـ 7 المتجهة المفككة لطبقات معزولة الكلاسات |
| `src/scripts/menu-store.js` | **ترقية شاملة** | استقبال حزمة `Code.gs v5.0` الكاملة، كاش الأوفلاين، وإدارة السلة بالإضافات والكوبونات |
| `src/scripts/order-handler.js` | **ترقية** | توليد رسالة واتساب مفصلة بالإضافات لكل قطعة + إرسال `doPost` لتبويب `sales_log` |
| `src/components/NewsTicker.astro` | **ملف جديد** | شريط الأخبار والعروض والكوبونات الحي أعلى الموقع |
| `src/components/Header.astro` | **ترقية** | إضافة مؤشر الازدحام، حالة الفتح/الإغلاق، توقيت الأوفلاين، وزر اللغة |
| `src/components/Splash.astro` | **ترقية** | أنيميشن قناع رسم اللانهاية الحقيقي + الدمج الهجين |
| `src/components/VibeCanvas.astro` | **ترقية شاملة** | شريط 35mm قابل للسحب يميناً ويساراً + حركة بطيئة تلقائية + بطاقات مختصرة (اسم وسعر فقط) |
| `src/components/ProductModal.astro` | **ملف جديد** | نافذة الوصف التسويقي، المكونات، وتخصيص/تعديل الإضافات لكل قطعة |
| `src/components/StoryDoodles.astro` | **ترقية شاملة** | 5 فصول قصصية ممتدة مع التمرير (`Scrollytelling`) مربوطة بمشروبات الشيت |
| `src/components/QuickList.astro` | **ترقية** | توليد أزرار الـ 12 قسماً ديناميكياً والترتيب حسب الأكثر مبيعاً |
| `src/components/CartDrawer.astro` | **ترقية شاملة** | عرض الإضافات المربوطة بكل قطعة + زر تعديل الإضافات + حقل كوبون الخصم |
| `src/components/BlogSection.astro` | **ملف جديد** | عرض مقالات مدونة كليف المسحوبة من تبويب `blog` في الشيت |
| `src/layouts/Layout.astro` & `src/pages/index.astro` | **ترقية** | ربط المكونات الجديدة وتطبيق الأنيميشن الهجين في `global.css` |
