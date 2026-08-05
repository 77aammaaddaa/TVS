corebalance-os/
├── vite.config.ts             # إعدادات Vite واختصارات المسارات
├── tsconfig.json              # قواعد التايب سكريبت والـ Path Aliases
├── package.json               # الحزم والمكتبات المعتمدة
├── index.html                 # الهيكل الرئيسي وضبط الـ Viewport للموبايل
│
└── src/
    ├── main.tsx               # [مرحلة 10] نقطة الانطلاق الرئيسية
    ├── App.tsx                # [مرحلة 10] الحاوية الكبرى وتوجيه الصفحات
    ├── index.css              # [مرحلة 1] أنماط Tailwind وتنسيقات اللمس
    │
    ├── types/                 # [مرحلة 2] عقود الأنواع (لا تتغير)
    │   └── index.ts           # تجميعة كل الـ Interfaces (Entity, Asset, Tx, Liability)
    │
    ├── db/                    # [مرحلة 3] قواعد البيانات المحلية
    │   ├── schema.ts          # جداول ومخطط Dexie.js
    │   ├── dexie.ts           # تهيئة الاتصال المحلي IndexedDB
    │   └── seed.ts            # دالة الحقن الأولي للداتا المرجعية (0_Config)
    │
    ├── logic/                 # [مرحلة 4] المحركات الحسابية الصافية (Pure Math)
    │   ├── sve.ts             # محرك التقييم الذكي للأصول (Hardware, Knowledge, Digital)
    │   ├── isolation.ts       # جدار عزل الكيانات ومنع الخلط المالي
    │   └── metrics.ts         # حساب Net Worth, Runway Index, Debt Ratio
    │
    ├── store/                 # [مرحلة 5] إدارة الحالة المركزية
    │   └── useAppStore.ts     # Zustand Store للتحكم في الكيان والسيولة
    │
    ├── hooks/                 # [مرحلة 6] خطوط الاتصال التفاعلية
    │   ├── useTx.ts           # معالجة المعاملات والخصم الذري من الخصوم
    │   ├── useAssets.ts       # تتبع أرصدة الخزائن والأجهزة
    │   └── useLiabilities.ts  # تتبع الجمعيات والديون والمستحقات
    │
    └── components/            
        ├── ui/                # [مرحلة 7] العناصر الأساسية الذرية
        │   ├── Button.tsx     # زر مخصص للموبايل
        │   ├── Input.tsx      # خانات الإدخال
        │   ├── Modal.tsx      # النوافذ المنبثقة
        │   └── Card.tsx       # كروت عرض البيانات
        │
        ├── layout/            # [مرحلة 7] شرائط التنقل الإدارية
        │   ├── TopNav.tsx     # مبدل الكيانات (Person / TVS / Mkank Store)
        │   └── BottomNav.tsx  # شريط التنقل السفلي للموبايل (4 أزرار)
        │
        ├── forms/             # [مرحلة 8] النماذج الإدخالية
        │   ├── QuickTxForm.tsx# نموذج الإدخال السريع (FAB)
        │   ├── AssetForm.tsx  # نموذج إضافة أصل جديد
        │   └── DebtForm.tsx   # نموذج إضافة دَيْن أو جمعية
        │
        ├── dashboard/         # [مرحلة 8] مكونات الداشبورد
        │   ├── NetWorthCard.tsx  # كارت إجمالي الثروة والنمو
        │   ├── RunwayWidget.tsx   # مؤشر أمان التشغيل
        │   └── RecentTxList.tsx   # قائمة آخر المعاملات اليومية
        │
        └── pages/             # [مرحلة 9] الصفحات المجمعة الرئيسية
            ├── Dashboard.tsx  # شاشة الداشبورد التشغيلية
            ├── TxPage.tsx     # شاشة سجل الحركات والتصفية
            ├── AssetPage.tsx  # شاشة الأصول ومحرك SVE
            ├── DebtPage.tsx   # شاشة إدارة المديونيات
            └── ConfigPage.tsx # شاشة الإعدادات والداتا سيت




            