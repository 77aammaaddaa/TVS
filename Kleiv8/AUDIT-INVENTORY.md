# AUDIT INVENTORY — KLEIV 8

تاريخ الجرد: 2026-11-13  
نطاق المشروع: `C:\Users\ELJOK\Documents\mk7x\TVS\Kleiv8`  
جذر Git الفعلي: `C:\Users\ELJOK\Documents\mk7x\TVS` (المشروع مجلد فرعي باسم `Kleiv8`).

هذه هي المرحلة الأولى فقط. لم تُنقل أو تُحذف أو تُعدّل ملفات المشروع. أُجري `git status` قبل الجرد؛ كانت الشجرة تحتوي على 16 ملفًا متعقبًا معدّلًا و6 ملفات غير متعقبة. لم يُنشأ commit لأن المرحلة لا تتضمن نقلًا ولأن المرحلة الثانية تنتظر موافقة المستخدم.

## الشجرة الحالية

استُثنيت المجلدات `.git` و`node_modules` و`dist` و`.astro` و`.next`، وحدّ العمق 6 مستويات. أُضيف `AUDIT-INVENTORY.md` إلى الشجرة أدناه بوصفه ملف هذا التقرير.

```text
.
├── Kleiv8
│   ├── Kleiv
│   │   ├── 01_Architecture_and_Config
│   │   │   └── 01_System_Architecture_and_Cloudflare_Setup.docx
│   │   ├── 02_Backend_and_Database
│   │   │   └── 02_Backend_Google_Sheets_and_Apps_Script_Engine.docx
│   │   ├── 03_UI_UX_and_Audio
│   │   │   └── 03_UI_UX_Components_Motion_and_Audio_Specs.docx
│   │   ├── 04_AI_Agent_Prompts
│   │   │   ├── 04_Master_Prompt_for_Local_AI_Coding_Agent.docx
│   │   │   └── 05_Astro_Menu_Cart_and_Pages_Code.docx
│   │   ├── مشروع كيلف بحث_.docx
│   │   ├── code.gs
│   │   ├── Kleiv8 db menu.xlsx
│   │   ├── NEW MENU.xlsx
│   │   ├── unnamed (1).jpg
│   │   └── unnamed (2).jpg
│   ├── كليف لايت هاوس تيست.devtools
│   ├── نسخة من Kleiv identity presentation_.pptx
│   ├── نسخة من Kleiv identity presentation_(1).pptx
│   ├── AUDIT-ROADMAP.md
│   ├── Cost.sheet.kleiv8 v.4.3.1.xlsx
│   ├── Kleiv-Animation-Lab.html
│   ├── Kleiv-Intro.html
│   ├── Kleiv-Motion-V2.css
│   ├── Kleiv-Svgs-Animated.js
│   ├── Kleiv8 db menu.gs
│   ├── kleiv8_server_sync_and_code_roadmap_v5.md
│   ├── kleiv8.pages.dev-20261113T000259.json
│   ├── Kleiv8.report.xlsx
│   ├── Kliev illustrations SVG.html
│   ├── loyality stickers a3.pdf
│   ├── loyalty card 3 levels 20x10.pdf
│   ├── loyalty card 3 levels.pdf
│   └── VOUCHER 8x5.pdf
├── Kleiv8 - Web Project & AI Agent Blueprints
├── public
│   ├── data
│   │   └── default-menu.json
│   ├── images
│   │   └── kleiv
│   │       ├── balance-pause.png
│   │       ├── barista-craft.png
│   │       ├── croissant-lounger.png
│   │       ├── iced-cup-slogan.png
│   │       ├── iced-cup.png
│   │       ├── infinity-mark.png
│   │       ├── melting-ice.png
│   │       ├── slow-moment.png
│   │       └── wavy-pattern.png
│   └── favicon.svg
├── src
│   ├── components
│   │   ├── AsmrPrompt.astro
│   │   ├── BlogSection.astro
│   │   ├── BrandMark.astro
│   │   ├── CartDrawer.astro
│   │   ├── Header.astro
│   │   ├── LatteArtModal.astro
│   │   ├── MoodSlider.astro
│   │   ├── NewsTicker.astro
│   │   ├── ProductModal.astro
│   │   ├── QuickList.astro
│   │   ├── Splash.astro
│   │   ├── StoryDoodles.astro
│   │   └── VibeCanvas.astro
│   ├── config
│   │   ├── site.js
│   │   ├── story-doodles.js
│   │   └── visual-assets.js
│   ├── layouts
│   │   └── Layout.astro
│   ├── pages
│   │   ├── 404.astro
│   │   └── index.astro
│   ├── scripts
│   │   ├── asmr-engine.js
│   │   ├── audio-controller.js
│   │   ├── doodles.js
│   │   ├── i18n.js
│   │   ├── kleiv-svg.js
│   │   ├── language.js
│   │   ├── menu-store.js
│   │   └── order-handler.js
│   ├── styles
│   │   └── global.css
│   └── env.d.ts
├── svg
│   ├── 01_infinity_loop_trace.png
│   ├── 01_infinity_loop_transparent.png
│   ├── 01_infinity_loop.png
│   ├── 02_melting_ice_trace.png
│   ├── 02_melting_ice_transparent.png
│   ├── 02_melting_ice.png
│   ├── 03_person_with_box_trace.png
│   ├── 03_person_with_box_transparent.png
│   ├── 03_person_with_box.png
│   ├── 04_croissant_lounger_trace.png
│   ├── 04_croissant_lounger_transparent.png
│   ├── 04_croissant_lounger.png
│   ├── 04_croissant_lounger.svg
│   ├── 05_barista_craft_trace.png
│   ├── 05_barista_craft_transparent.png
│   ├── 05_barista_craft.png
│   ├── 06_balance_girl_trace.png
│   ├── 06_balance_girl_transparent.png
│   ├── 06_balance_girl.png
│   ├── 07_iced_cup_with_slogan_trace.png
│   ├── 07_iced_cup_with_slogan_transparent.png
│   ├── 07_iced_cup_with_slogan.png
│   ├── 08_iced_cup_solo_trace.png
│   ├── 08_iced_cup_solo_transparent.png
│   ├── 08_iced_cup_solo.png
│   ├── 09_organic_wavy_pattern_trace.png
│   ├── 09_organic_wavy_pattern_transparent.png
│   ├── 09_organic_wavy_pattern.png
│   ├── Balance-Girl.svg
│   ├── Barista-Craft.svg
│   ├── Croissant-Lounger.svg
│   ├── gemini-code-1792690676675.js
│   ├── Iced-Cup-Slogan.svg
│   ├── Iced-Cup-Solo.svg
│   ├── Infinity-Loop.svg
│   ├── kleiv_vector_animation_studio_upgraded_experience_v3_0.html
│   ├── Kleiv-Doodles-System-Dark.html
│   ├── Kleiv-Motion (1).css
│   ├── Kleiv-Motion.css
│   ├── Kleiv-Svgs (1).js
│   ├── Kleiv-Svgs (2).js
│   ├── Kleiv-Svgs (3).js
│   ├── Kleiv-Svgs (4).js
│   ├── Kleiv-Svgs.js
│   ├── Melting-Ice.svg
│   ├── Person-With-Box.svg
│   ├── wavy_pattern_cutout.png
│   └── Wavy-Pattern.svg
├── .gitignore
├── .node-version
├── AUDIT-INVENTORY.md
├── astro.config.mjs
├── package-lock.json
├── package.json
├── README.md
└── tailwind.config.mjs
```

## إعدادات المشروع

| الملف | النتيجة |
|---|---|
| `package.json` | Astro `^7.4.1`، Tailwind CSS / `@tailwindcss/vite` `^4.3.3`، JavaScript modules، Node `>=22.22.0`. الأوامر: `dev`, `build`, `preview`, `check`. |
| `astro.config.mjs` | `output: 'static'` مع Tailwind Vite plugin. |
| `tailwind.config.mjs` | مستخدم من `src/styles/global.css` عبر `@config "../../tailwind.config.mjs";`. |
| `tsconfig*.json` | لا يوجد ملف tsconfig في جذر المشروع؛ مجلد `.astro` المولّد مستثنى من الجرد. |

بحث الاستيرادات والتصديرات في `src/` على امتدادات `.astro`, `.js`, `.mjs`, `.ts` أعاد 116 مطابقة في 26 ملفًا. حُسب جدول (أ) من مسارات الاستيراد المحلية الفعلية؛ العدّ هو عدد عبارات الاستيراد التي تستهدف الملف، وتُحسب الاستيرادات المتكررة داخل المكوّن أكثر من مرة.

## (أ) ملفات `src/` وعدد مرات استيرادها

| الملف | مرات الاستيراد | المستورِد / ملاحظة |
|---|---:|---|
| `src/components/AsmrPrompt.astro` | 1 | `src/layouts/Layout.astro` |
| `src/components/BlogSection.astro` | 1 | `src/pages/index.astro` |
| `src/components/BrandMark.astro` | 2 | `Header.astro`, `pages/index.astro` |
| `src/components/CartDrawer.astro` | 1 | `src/layouts/Layout.astro` |
| `src/components/Header.astro` | 1 | `src/layouts/Layout.astro` |
| `src/components/LatteArtModal.astro` | 1 | `src/layouts/Layout.astro` |
| `src/components/MoodSlider.astro` | 1 | `src/pages/index.astro` |
| `src/components/NewsTicker.astro` | 1 | `src/layouts/Layout.astro` |
| `src/components/ProductModal.astro` | 1 | `src/layouts/Layout.astro` |
| `src/components/QuickList.astro` | 1 | `src/pages/index.astro` |
| `src/components/Splash.astro` | 1 | `src/layouts/Layout.astro` |
| `src/components/StoryDoodles.astro` | 1 | `src/pages/index.astro` |
| `src/components/VibeCanvas.astro` | 1 | `src/pages/index.astro` |
| `src/config/site.js` | 3 | `pages/index.astro`, `scripts/menu-store.js`, `scripts/order-handler.js` |
| `src/config/story-doodles.js` | 1 | `components/StoryDoodles.astro` |
| `src/config/visual-assets.js` | 2 | `components/BrandMark.astro`, `pages/index.astro` |
| `src/env.d.ts` | 0 | تعريفات أنواع عامة؛ صفر استيرادات لا يعني أنه يتيم. |
| `src/layouts/Layout.astro` | 2 | `pages/404.astro`, `pages/index.astro` |
| `src/pages/404.astro` | 0 | صفحة Astro مستقلة لمسار 404. |
| `src/pages/index.astro` | 0 | نقطة دخول الصفحة الرئيسية، وليست يتيمة. |
| `src/scripts/asmr-engine.js` | 7 | AsmrPrompt, Header, LatteArtModal, QuickList, StoryDoodles, VibeCanvas, audio-controller |
| `src/scripts/audio-controller.js` | 0 | غلاف تصدير قديم لـ `asmr-engine.js`؛ لا مستورد له داخل `src/`. |
| `src/scripts/doodles.js` | 7 | CartDrawer, ProductModal, QuickList (مرتان), VibeCanvas (مرتان), visual-assets |
| `src/scripts/i18n.js` | 0 | ملف فارغ (0 بايت)، مرشح واضح للأرشفة. |
| `src/scripts/kleiv-svg.js` | 2 | Splash, StoryDoodles؛ يستورد مكتبة SVG النشطة من `svg/Kleiv-Svgs.js`. |
| `src/scripts/language.js` | 16 | مستخدم من المكوّنات، Layout، ومخازن الطلبات والقائمة؛ هو ملف الترجمة الحالي. |
| `src/scripts/menu-store.js` | 9 | ثمانية مكونات و`order-handler.js`. |
| `src/scripts/order-handler.js` | 1 | `components/CartDrawer.astro` |
| `src/styles/global.css` | 1 | `src/layouts/Layout.astro` |

**نتيجة اليتامى:** لا توجد مكونات `.astro` يتيمة. يوجد ملف سكربت فارغ وغلاف صوتي بلا مستوردين. ملفات الصفحات وتعريف الأنواع مستثناة من اعتبار الصفر يتيمًا لأنها نقاط دخول/تعريفات.

## (ب) ملفات `public/` ومواضع الإشارة إليها

| الملف | مذكور في المصدر؟ | موضع الاستخدام |
|---|---|---|
| `public/data/default-menu.json` | نعم | عشرة import sites في BlogSection, NewsTicker, Header, CartDrawer, ProductModal, QuickList (مرتان), StoryDoodles, VibeCanvas (مرتان). |
| `public/favicon.svg` | نعم | `src/layouts/Layout.astro`؛ favicon وshortcut icon. |
| `public/images/kleiv/balance-pause.png` | نعم، مرجع فقط | مُعرّف في `src/config/visual-assets.js`؛ لا يوجد استدعاء مباشر للخاصية أو لمساعد الرسومات الذي يربطها. |
| `public/images/kleiv/barista-craft.png` | نعم، مرجع غير مباشر | مُعرّف في `visual-assets.js` داخل `illustrationForMenuItem`؛ لا توجد استدعاءات للمساعد داخل المشروع. |
| `public/images/kleiv/croissant-lounger.png` | نعم | `src/pages/index.astro` (رسم Hero)، وكذلك mapping داخل `visual-assets.js`. |
| `public/images/kleiv/iced-cup-slogan.png` | نعم | `src/pages/index.astro`؛ صورة Hero الإنجليزية الافتراضية. |
| `public/images/kleiv/iced-cup.png` | نعم | `src/pages/index.astro`؛ بديل Hero عند العربية، وموجود في mapping. |
| `public/images/kleiv/infinity-mark.png` | نعم | `src/components/BrandMark.astro` عبر `visual-assets.js`. |
| `public/images/kleiv/melting-ice.png` | نعم | `src/pages/index.astro` (رسم Hero)، وكذلك mapping في `visual-assets.js`. |
| `public/images/kleiv/slow-moment.png` | نعم | `src/pages/index.astro`؛ رسم قسم طريقة الطلب. |
| `public/images/kleiv/wavy-pattern.png` | نعم | `src/styles/global.css` في `hero::before` و`hero-art::before`، إضافةً إلى تعريفه في `visual-assets.js`. |

> «مذكور» تعني وجود مرجع نصي في المصدر؛ لا تعني وحدها أن المتصفح يحمّل الملف فعليًا. لا ينبغي نقل `balance-pause.png` أو `barista-craft.png` قبل إزالة/تحديث مراجع `visual-assets.js` أو حسم استخدامها.

## (ج) صور `public/images/kleiv/`

كل الملفات هنا PNG، لذلك فحص `.cls-1` لا ينطبق عليها. لا توجد ملفات SVG في هذا المجلد. لم توجد بصمات SHA-256 متطابقة بين الصور التسع داخله.

| الصورة | الأبعاد | الحجم | `.cls-1` | الاستخدام الفعلي |
|---|---:|---:|---|---|
| `balance-pause.png` | 480×778 | 43,914 بايت | غير منطبق | غير مؤكد؛ تعريف config فقط دون مستدعٍ. |
| `barista-craft.png` | 735×460 | 67,666 بايت | غير منطبق | غير محمّلة حاليًا حسب مسارات الاستدعاء؛ مرتبطة بمساعد غير مستدعٍ. |
| `croissant-lounger.png` | 735×455 | 58,469 بايت | غير منطبق | نعم؛ رسم Hero. |
| `iced-cup-slogan.png` | 640×590 | 65,010 بايت | غير منطبق | نعم؛ صورة Hero الإنجليزية. |
| `iced-cup.png` | 355×435 | 46,475 بايت | غير منطبق | نعم؛ صورة Hero العربية. |
| `infinity-mark.png` | 655×320 | 40,967 بايت | غير منطبق | نعم؛ قناع علامة البراند. |
| `melting-ice.png` | 440×290 | 32,201 بايت | غير منطبق | نعم؛ رسم Hero. |
| `slow-moment.png` | 475×575 | 37,435 بايت | غير منطبق | نعم؛ قسم طريقة الطلب. |
| `wavy-pattern.png` | 768×1575 | 151,131 بايت | غير منطبق | نعم؛ مستخدم مرتين في CSS. الحجم يتجاوز 100KB، لكنه ليس داخل مجلد `doodles/` أو `illustrations/` ويُستخدم كخلفية. |

لا تنطبق عتبة الأيقونات الصغيرة (<200px و<8KB) على أي من هذه الصور.

## (د) ملفات جذر المشروع والتهيئة

| الملف | التصنيف | الدليل |
|---|---|---|
| `.gitignore` | نشط | يستثني `node_modules/`, `dist/`, `.astro/` وملفات البيئة. |
| `.node-version` | نشط | يحدد Node `22.22.0`، وهو متوافق مع `engines` في `package.json`. |
| `astro.config.mjs` | نشط | تهيئة Astro وإخراج static وTailwind Vite plugin. |
| `package.json` | نشط | تعريف المشروع واعتمادياته وأوامر التشغيل والبناء. |
| `package-lock.json` | نشط — لا يُلمس | تثبيت إصدارات الاعتماديات. |
| `README.md` | نشط | توثيق المشروع الحالي وتشغيله وبيانات CMS. |
| `tailwind.config.mjs` | نشط | مستورد صراحةً عبر `@config` في `src/styles/global.css`. |
| `AUDIT-INVENTORY.md` | نشط — تقرير هذه المرحلة | ينشأ بطلب المستخدم، ولا يُؤرشف. |

لا يوجد ملف `.txt` أو `tsconfig*.json` في جذر Astro. المجلد `Kleiv8 - Web Project & AI Agent Blueprints` فارغ حاليًا.

## ملاحظات إضافية قبل المرحلة الثانية

هذه الملفات خارج جذر `src/` و`public/`؛ أُدرجت هنا لأنها تؤثر على خطة الترتيب:

- `svg/Kleiv-Svgs.js` **نشط**: يستورده `src/scripts/kleiv-svg.js`. مكانه المقترح بعد موافقة المستخدم `src/assets/` مع تحديث import.
- نسخ `svg/Kleiv-Svgs (1).js` و`svg/Kleiv-Svgs (2).js` متطابقة ببصمة SHA-256 مع الملف النشط. لا تُستبدل النسخة النشطة؛ النسختان الإضافيتان مرشحتان لـ`duplicates/`.
- `svg/Kleiv-Svgs (3).js` و`svg/Kleiv-Svgs (4).js` متطابقتان، وغير مستوردتين من `src/`؛ النسخة `(4)` أحدث بثانية.
- `svg/Kleiv-Motion.css` و`svg/Kleiv-Motion (1).css` متطابقتان وغير مستوردتين من `src/`؛ النسخة `(1)` أحدث.
- ثماني صور `*_transparent.png` في `svg/` مطابقة ببصمة SHA-256 لصورها العامة في `public/images/kleiv/`: infinity، melting ice، person/slow moment، croissant، barista، balance، iced cup slogan، iced cup solo. تُحفظ صور `public/` النشطة، وتُدرس نسخ المصدر ضمن الأرشفة.
- ملفات `.svg` العشرة في `svg/` لا تُستورد في `src/`، ولا تحتوي فئات Illustrator الافتراضية `.cls-1`. توجد أيضًا رسوم trace/PNG وملفات HTML/CSS تجريبية غير مرتبطة ببناء الموقع؛ مرشحة للأرشفة مع الاحتفاظ بها.
- `src/config/visual-assets.js` يحتوي الدالة `illustrationForMenuItem` بلا مستدعٍ. يلزم حسمها قبل اعتبار `balance-pause.png` و`barista-craft.png` أصولًا قابلة للأرشفة.
- `src/scripts/language.js` هو ملف الترجمة الفعلي، وليس `i18n.js`؛ البنية المطلوبة في المرحلة الثانية يمكن أن تنقله إلى `src/scripts/stores/i18n-store.js` بعد تحديث جميع الاستيرادات.
- `Kleiv8/Kleiv/code.gs` هو مصدر Apps Script المشار إليه في README، فيبقى نشطًا. أما `Kleiv8/Kleiv8 db menu.gs` فنسخة مختلفة غير مستوردة؛ مرشحة لـ`old-configs/`.
- `Kleiv8/kleiv8_server_sync_and_code_roadmap_v5.md` هو مستند خارطة v5 الحالية، فيبقى. `Kleiv8/AUDIT-ROADMAP.md` أقدم ويصف بنية Vite/Vanilla مختلفة؛ مرشح لـ`docs/`.
- بقية ملفات Office/PDF/HTML ولقطة `kleiv8.pages.dev-20261113T000259.json` داخل `Kleiv8/` ليست ضمن بناء Astro. تبقى بلا حذف؛ يمكن نقلها إلى فئات الأرشيف بعد الموافقة، مع المحافظة على ملفات البيانات المرجعية.
- لا يُضاف `/_archive/` إلى `.gitignore` في هذه المرحلة؛ الخيار مؤجل كما طلب المستخدم.

## بوابة المتابعة

لم يبدأ أي نقل، ولم يُنشأ commit. قبل أول نقل في المرحلة الثانية سأعيد فحص `git status`، ثم أنشئ commit `chore: pre-archive snapshot` ضمن مجلد `Kleiv8` فقط لتجنب إدخال مشاريع الأشقاء الموجودة في جذر Git `TVS`. سأنتظر موافقة صريحة (`GO`) قبل ذلك.
