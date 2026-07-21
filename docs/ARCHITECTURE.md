# 🏗️ هيكلية النظام - ARCHITECTURE

**النظام:** EcoFine Pro V14.1/V15  
**المطور:** Techno Vision Solutions  
**تاريخ التوثيق:** 2024  
**مستوى الوثيقة:** معماري استراتيجي  
**حالة الاعتماد:** معتمد ✅

---

## 1. النظرة المعمارية الشاملة

### 1.1 فلسفة التصميم (Design Philosophy)

يعتمد EcoFine Pro على **العمارة الهجينة أحادية الصفحة (Hybrid SPA)** التي تجمع بين:

| المبدأ | التطبيق | الفائدة |
|--------|---------|---------|
| **Offline-First** | IndexedDB محلي + مزامنة لاحقة | عمل بدون إنترنت |
| **Modular Monolith** | موديولات منفصلة في ملف واحد | سهولة التطوير والنشر |
| **Event-Driven** | أحداث React State + Custom Events | فصل الاهتمامات |
| **Multi-Tenant SaaS** | عزل على مستوى الاتصال | خدمة مؤسسات متعددة |

### 1.2 الإصدارات المتوازية

```
EcoFine Pro
├── V14 (Enterprise)          ← موثق في هذا الملف
│   ├── /ecofine/             ← النظام الكامل (24 موديول)
│   └── 32 ملف JavaScript
│
└── V15 (Lite/POS)            ← نسخة مبسطة
    ├── /core/                ← نظام POS منفصل
    └── 4 ملفات أساسية
```

---

## 2. الهيكل الطبقي (Layered Architecture)

### 2.1 الخريطة الطبقية الكاملة

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 4: Presentation                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  app.js (The X-Command Center) - قائد الأوركسترا        │  │
│  │  ├── Dashboard Components                                │  │
│  │  ├── Navigation & Menu System                            │  │
│  │  └── Module Router (24 modules)                          │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  Layer 3: Business Logic                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │   XCore.js   │ │XScoreEngine.js│ │  XGuard.js   │         │
│  │  منطق الأعمال│ │محرك الائتمان │ │  الصلاحيات   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │   crm.js     │ │accounting.js │ │ inventory.js │         │
│  │   العملاء    │ │  المحاسبة    │ │   المخزون    │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   Layer 2: Data Access                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              database.js (Hybrid Engine)                 │  │
│  │  ├── Local: IndexedDB (Dexie.js native API)              │  │
│  │  ├── Cloud: Supabase Client (PostgreSQL)                 │  │
│  │  └── Sync: Push/Pull Queue Manager                       │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   Layer 1: Infrastructure                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  Supabase    │ │ IndexedDB    │ │ LocalStorage │         │
│  │  PostgreSQL  │ │  Browser DB  │ │  Settings    │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 وصف الطبقات

#### **الطبقة 1: البنية التحتية (Infrastructure)**

| المكون | التقنية | الدور |
|--------|---------|-------|
| **Supabase** | PostgreSQL SaaS | قاعدة البيانات السحابية، المصادقة |
| **IndexedDB** | Browser Native | التخزين المحلي السريع (300MB+) |
| **LocalStorage** | Browser API | الإعدادات، الجلسات، المفاتيح |

#### **الطبقة 2: الوصول للبيانات (Data Access)**

```javascript
// database.js - المحرك الهجين
const db = {
    // العمليات الأساسية
    add(tableName, object),      // INSERT
    update(tableName, id, updates), // UPDATE
    delete(tableName, id),       // DELETE
    getAll(tableName),           // SELECT ALL
    getById(tableName, id),      // SELECT BY ID
    getByIndex(tableName, index, value), // INDEXED SEARCH
    
    // المزامنة
    syncWithCloud(),             // PUSH
    pullAllFromCloud(),          // PULL
    reInitialize(tenantUrl, tenantKey) // TENANT SWITCH
};
```

#### **الطبقة 3: منطق الأعمال (Business Logic)**

| الموديول | الملف | المسؤولية |
|----------|-------|-----------|
| **XCore** | `XCore.js` | التقييم الائتماني، شروط البيع |
| **XScore** | `XScoreEngine.js` | حساب السكور، التجزئة الآمنة |
| **XGuard** | `XGuard.js` | الصلاحيات، التحكم بالوصول |
| **CRM** | `crm.js` | إدارة العملاء، الضامنين |
| **Inventory** | `inventory.js` | المنتجات، الحركات، الجرد |
| **Accounting** | `accounting.js` | القيود المحاسبية، التقارير |
| **Legal** | `legal.js` | القضايا، المستندات القانونية |

#### **الطبقة 4: العرض (Presentation)**

```javascript
// app.js - مايسترو النظام
(function() {
    const App = () => {
        const [currentUser, setCurrentUser] = useState(null);
        const [activeTab, setActiveTab] = useState('dashboard');
        
        // توجيه الموديولات
        const renderModule = () => {
            const moduleMap = {
                'dashboard': DashboardView,
                'crm': window.CRMModule,
                'inventory': window.InventoryModule,
                // ... 22 module
            };
            const Component = moduleMap[activeTab];
            return <Component currentUser={currentUser} />;
        };
        
        return <div>{renderModule()}</div>;
    };
    
    ReactDOM.render(<App />, document.getElementById('root'));
})();
```

---

## 3. دور app.js كقائد (Conductor Pattern)

### 3.1 المسؤوليات الرئيسية

#### **أ. تهيئة النظام (System Bootstrap)**

```javascript
// من app.js سطر 200-280
useEffect(() => {
    const initSystem = async () => {
        try {
            // 1. تحميل الإعدادات
            await loadSystemSettings();
            
            // 2. التحقق من المصادقة
            const savedUser = localStorage.getItem('xfine_current_user');
            if (savedUser) setCurrentUser(JSON.parse(savedUser));
            
            // 3. تهيئة قاعدة البيانات
            await window.db.init();
            
            // 4. تحميل الموديولات
            await loadModules();
            
            setIsReady(true);
        } catch (error) {
            setInitError(error.message);
        }
    };
    
    initSystem();
}, []);
```

#### **ب. إدارة الحالة العامة (Global State Management)**

```javascript
// حالة مشتركة لكل الموديولات
const [state, setState] = useState({
    currentUser: null,          // المستخدم الحالي
    activeTab: 'dashboard',     // الشاشة النشطة
    notifications: [],          // الإشعارات غير المقروءة
    systemAlerts: [],           // تنبيهات النظام
    syncStatus: 'synced',       // حالة المزامنة
    isReady: false              // جاهزية النظام
});
```

#### **ج. التوجيه بين الموديولات (Module Routing)**

```javascript
// من app.js سطر 320-343
const moduleMap = {
    'dashboard': DashboardView,
    'reports': window.ReportsModule,
    'hr': window.HRModule,
    'users': window.UsersModule,
    'crm': window.CRMModule,
    'survey': window.SurveyModule,
    'inventory': window.InventoryModule,
    'suppliers': window.SuppliersModule,
    'purchases': window.PurchasesModule,
    'pos': window.POSModule,
    'marketing': window.MarketingModule,
    'accounting': window.AccountingModule,
    'collection': window.InstallmentsModule,
    'treasury': window.TreasuryModule,
    'legal': window.LegalModule,
    'notifications': window.NotificationsModule,
    'audit': window.AuditModule,
    'data_import': window.ImportModule,
    'settings': window.SettingsModule,
    'sync': window.XSyncModule,
    'super_admin': window.SuperAdminModule
};
```

### 3.2 نمط "القائد والعازفين" (Conductor & Musicians)

```
┌─────────────────────────────────────────┐
│           app.js (القائد)                │
│  يمسك العصا ويوجه الأوركسترا            │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│  CRM   │ │Inventory│ │ Legal  │ │Treasury│ │  ...   │
│عازف كمان│ │عازف تشيلو│ │عازف فلوت│ │عازف بيانو│ │ العازف │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

**المبادئ:**
- القائد (`app.js`) لا يعزف بنفسه
- كل عازف (`module`) خبير في آلته
- الانسجام يأتي من اتباع نفس النوتة (`state`)
- إذا توقف القائد، تتوقف الأوركسترا

---

## 4. تواصل الموديولات مع "الطبقة الصفرية"

### 4.1 تعريف الطبقة الصفرية (Layer 0)

**الطبقة الصفرية** هي مجموعة الخدمات الأساسية التي تسبق كل العمليات:

| الخدمة | الملف | الوظيفة |
|--------|-------|---------|
| **المصادقة** | `auth.js` | تسجيل الدخول، إدارة الجلسات |
| **الإعدادات** | `XConfig.js` | تكوين النظام، السياسات |
| **قاعدة البيانات** | `database.js` | CRUD، مزامنة |
| **المزامنة** | `XSync.js` | Push/Pull، طابور المزامنة |

### 4.2 بروتوكول التواصل

#### **أ. نمط الطلب والاستجابة (Request-Response)**

```javascript
// من crm.js → database.js
async function saveCustomer(customerData) {
    // طلب للطبقة الصفرية
    const result = await window.db.add('clients', customerData);
    
    // معالجة الاستجابة
    if (result.id) {
        showSuccess('✅ تم حفظ العميل');
        return result;
    } else {
        showError('❌ فشل الحفظ');
        throw new Error('Database write failed');
    }
}
```

#### **ب. نمط الأحداث (Event-Driven)**

```javascript
// من database.js → broadcast
window.dispatchEvent(new CustomEvent('db:updated', {
    detail: { table: 'clients', action: 'insert', id: newId }
}));

// من أي موديول → الاستماع
window.addEventListener('db:updated', (e) => {
    if (e.detail.table === 'clients') {
        refreshCustomerList();
    }
});
```

#### **ج. نمط الوكيل (Proxy Pattern)**

```javascript
// من XCore.js → استخدام وكيل آمن
const SecureDB = {
    add: async function(table, data) {
        // 1. تحقق من الصلاحيات
        if (!XGuard.canWrite(table)) {
            throw new Error('Permission denied');
        }
        
        // 2. تحقق من التكامل
        validateSchema(table, data);
        
        // 3. تفويض للطبقة الصفرية
        return window.db.add(table, data);
    }
};
```

### 4.3 تدفق البيانات النموذجي

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │  Module  │     │  XCore   │     │ database │
│  Action  │────▶│  (CRM)   │────▶│ (Logic)  │────▶│  (L0)    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ 1. Click Save  │                │                │
     │                │ 2. Validate    │                │
     │                │───────────────▶│                │
     │                │                │ 3. Check Rules │
     │                │                │───────────────▶│
     │                │                │                │ 4. IndexedDB Write
     │                │                │                │ 5. Supabase Upsert
     │                │                │◀───────────────│ 6. Result
     │                │◀───────────────│ 7. Approved    │
     │                │ 8. Update UI   │                │
     │◀───────────────│ 9. Success Msg │                │
```

---

## 5. هيكل الملفات والتنظيم

### 5.1 شجرة المشروع الكاملة

```
/workspace/
├── index.html              ← صفحة الهبوط الرئيسية
├── README.md               ← دليل المستخدم
├── robots.txt              ← تحسينات محركات البحث
├── sitemap.xml             ← خريطة الموقع
│
├── /docs/                  ← 📚 التوثيق (تم الإنشاء)
│   ├── DATABASE_SCHEMA.md
│   ├── SECURITY_POLICY.md
│   ├── XCORE_PROTOCOL.md
│   └── ARCHITECTURE.md     ← هذا الملف
│
├── /ecofine/               ← 💎 النظام الأساسي (V14)
│   ├── index.html          ← واجهة النظام الرئيسي
│   ├── app.js              ← ⭐ قائد الأوركسترا
│   │
│   ├── 🔧 Foundation Layer
│   │   ├── database.js     ← محرك البيانات الهجين
│   │   ├── auth.js         ← المصادقة والمستخدمين
│   │   ├── activation.js   ← تفعيل التراخيص
│   │   ├── settings.js     ← إعدادات النظام
│   │   └── XConfig.js      ← تكوين السياسات
│   │
│   ├── 🧠 Core Intelligence
│   │   ├── XCore.js        ← منطق الأعمال الائتماني
│   │   ├── XScoreEngine.js ← محرك التقييم
│   │   ├── XAudit.js       ← التدقيق الأمني
│   │   └── XSync.js        ← المزامنة السحابية
│   │
│   ├── 📦 Business Modules
│   │   ├── crm.js          ← إدارة العلاقات
│   │   ├── inventory.js    ← المخزون
│   │   ├── accounting.js   ← المحاسبة
│   │   ├── treasury.js     ← الخزينة
│   │   ├── pos.js          ← نقطة البيع
│   │   ├── purchases.js    ← المشتريات
│   │   ├── suppliers.js    ← الموردين
│   │   ├── hr.js           ← الموارد البشرية
│   │   ├── users.js        ← المستخدمين
│   │   ├── installments.js ← التقسيط
│   │   ├── collection.js   ← التحصيل
│   │   ├── legal.js        ← الشؤون القانونية
│   │   ├── reports.js      ← التقارير
│   │   ├── marketing.js    ← التسويق
│   │   ├── survey.js       ← الاستبيانات
│   │   ├── notifications.js← الإشعارات
│   │   └── feedback.js     ← ملاحظات العملاء
│   │
│   └── 👑 Administration
│       ├── super_admin.js  ← إدارة المؤسسات
│       └── data_bridge.js  ← جسر استيراد البيانات
│
└── /core/                  ← 🚀 نظام POS المبسط (V15 Lite)
    ├── index.html          ← واجهة POS
    ├── app.js              ← تطبيق POS
    ├── database.js         ← قاعدة POS المحلية (Dexie)
    └── superadmin.js       ← إدارة سريعة
```

### 5.2 اعتماديات الملفات

```html
<!-- من ecofine/index.html -->
<!-- الترتيب حرج! يجب تحميل الأساسيات أولاً -->

<!-- Layer 0: Foundation -->
<script src="XConfig.js"></script>
<script src="database.js"></script>
<script src="auth.js"></script>

<!-- Layer 1: Intelligence -->
<script src="XCore.js"></script>
<script src="XScoreEngine.js"></script>
<script src="XAudit.js"></script>
<script src="XSync.js"></script>

<!-- Layer 2: Business Modules -->
<script src="crm.js"></script>
<script src="inventory.js"></script>
<script src="accounting.js"></script>
<!-- ... باقي الموديولات -->

<!-- Layer 3: Presentation -->
<script src="app.js"></script>  ← يجب أن يكون الأخير
```

---

## 6. أنماط التصميم المُطبقة (Design Patterns)

### 6.1 Singleton Pattern

```javascript
// database.js - كائن وحيد مشترك
window.db = db;  // يمكن الوصول من أي مكان

// الاستخدام
const localClients = await window.db.getAll('clients');
```

### 6.2 Module Pattern

```javascript
// XCore.js - وحدة معزولة
const XCore = (() => {
    // خاص
    let internalState = {};
    
    // عام
    return {
        evaluateCustomer: function(data) { ... },
        canOpenMultiInvoice: function(params) { ... }
    };
})();
```

### 6.3 Repository Pattern

```javascript
// database.js - مستودع مركزي
const repository = {
    clients: {
        find: (id) => db.getById('clients', id),
        findAll: () => db.getAll('clients'),
        save: (data) => db.add('clients', data),
        update: (id, data) => db.update('clients', id, data),
        delete: (id) => db.delete('clients', id)
    }
};
```

### 6.4 Strategy Pattern

```javascript
// XScoreEngine.js - استراتيجيات تقييم مختلفة
const strategies = {
    standard: (profile) => calculateStandard(profile),
    premium: (profile) => calculatePremium(profile),
    corporate: (profile) => calculateCorporate(profile)
};

// اختيار الاستراتيجية ديناميكياً
const strategy = strategies[customerType];
const score = strategy(profile);
```

### 6.5 Observer Pattern

```javascript
// Event Bus مركزي
const EventBus = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }
};

// الاستخدام
EventBus.on('customer:saved', refreshDashboard);
EventBus.emit('customer:saved', newCustomer);
```

---

## 7. دورة حياة الطلب (Request Lifecycle)

### 7.1 مثال: حفظ عقد جديد

```
1. المستخدم يملأ نموذج العقد
         │
         ▼
2. CRM.js يتحقق من صحة البيانات
         │
         ▼
3. XCore.js يقيم أهلية العميل
         │
         ├───────❌ مرفوض ───────▶ عرض سبب الرفض
         │
         ▼ ✅ موافق
4. database.js يحفظ محلياً (IndexedDB)
         │
         ├──────▶ تحديث UI فوري
         │
         ▼
5. XSync.js يضيف لطابور المزامنة
         │
         ▼ (عند وجود إنترنت)
6. Supabase يستقبل البيانات
         │
         ▼
7. database.js يعلّم السجل كـ "synced"
         │
         ▼
8. EventBus يبث حدث "contract:created"
         │
         ├──────▶ Reports.js يحدث التقارير
         ├──────▶ Dashboard.js يعدل الإحصائيات
         └──────▶ Notifications.js يرسل تنبيهاً
```

### 7.2 الكود الفعلي

```javascript
// من crm.js
async function saveContract(contractData) {
    // 1. التحقق
    const validation = validateContract(contractData);
    if (!validation.valid) throw new Error(validation.error);
    
    // 2. التقييم الائتماني
    const assessment = await XCore.evaluateCustomer(contractData.customer);
    if (!assessment.approved) {
        alert(assessment.msg);
        return;
    }
    
    // 3. الحفظ المحلي
    const contract = await window.db.add('contracts', {
        ...contractData,
        status: 'active',
        created_at: new Date().toISOString()
    });
    
    // 4. تحديث الواجهة
    contractsList.unshift(contract);
    renderContracts();
    
    // 5. المزامنة الخلفية
    // (تتم تلقائياً عبر database.js)
    
    // 6. بث الحدث
    window.dispatchEvent(new CustomEvent('contract:created', {
        detail: contract
    }));
    
    return contract;
}
```

---

## 8. التوسع والأداء (Scalability & Performance)

### 8.1 استراتيجية التقسيم (Partitioning Strategy)

#### **أ. تقسيم أفقي (Horizontal)**
```javascript
// كل مؤسسة لها قاعدة منفصلة
const dbName = `EcoFine_DB_${tenantId}`;
```

#### **ب. تقسيم عمودي (Vertical)**
```javascript
// جداول منفصلة حسب الوحدة
'contracts', 'installments', 'payments'  ← وحدة التقسيط
'products', 'inventory_transactions'     ← وحدة المخزون
```

### 8.2 التحسينات الحالية

| التقنية | التطبيق | التأثير |
|---------|---------|---------|
| **Lazy Loading** | تحميل الموديولات عند الحاجة | تقليل الحجم الأولي |
| **IndexedDB Indexes** | فهارس على `national_id`, `synced` | بحث أسرع 10x |
| **Debounced Search** | تأخير البحث 300ms | تقليل الاستعلامات |
| **Virtual Scrolling** | عرض 50 عنصر فقط من القائمة | DOM أخف |
| **Memoization** | `useMemo` لحسابات dashboard | تجنب إعادة الحساب |

### 8.3 الاختناقات المعروفة

| الاختناق | السبب | الحل المقترح |
|----------|-------|-------------|
| **تحميل أولي بطيء** | 32 ملف JS (~2MB) | Code Splitting + Bundle |
| **مزامنة كتل كبيرة** | رفع 1000 سجل دفعة واحدة | Batch Processing (100/دفعة) |
| **بحث LINEAR** | جداول بدون فهرس | إضافة فهارس IndexedDB |
| **State Bloat** | تخزين كل شيء في React State | استخدام Context + Reducer |

---

## 9. الأمن المعماري (Architectural Security)

### 9.1 خطوط الدفاع

```
┌─────────────────────────────────────────┐
│  Line 5: Audit & Monitoring             │
│  - XAudit.js يسجل كل عملية             │
│  - تنبيهات للشكوك                       │
└─────────────────────────────────────────┘
              ▲
┌─────────────────────────────────────────┐
│  Line 4: Access Control                 │
│  - XGuard.js يتحقق من الصلاحيات         │
│  - RBAC + ABAC                          │
└─────────────────────────────────────────┘
              ▲
┌─────────────────────────────────────────┐
│  Line 3: Data Validation                │
│  - XCore.js يتحقق من القواعد            │
│  - Schema Validation                    │
└─────────────────────────────────────────┘
              ▲
┌─────────────────────────────────────────┐
│  Line 2: Authentication                 │
│  - auth.js يدير الجلسات                 │
│  - Token-based                          │
└─────────────────────────────────────────┘
              ▲
┌─────────────────────────────────────────┐
│  Line 1: Network Security               │
│  - HTTPS إجباري                         │
│  - CORS Policies                        │
└─────────────────────────────────────────┘
```

### 9.2 نقاط الضعف المعمارية

| النقطة | الخطر | التوصية |
|--------|-------|---------|
| **Client-Side Logic** | قابل للتعديل | نقل логи حساس للخادم |
| **LocalStorage** | وصول سهل | تشفير البيانات الحساسة |
| **No Rate Limiting** | هجمات Brute Force | إضافة RateLimiter |
| **Fail-Open Default** | `?? true` في الصلاحيات | تغيير لـ `?? false` |

---

## 10. خارطة الطريق التطورية

### 10.1 V14 → V15 Migration Path

```
V14 (Current)              V15 (Target)
─────────────              ─────────────
Monolithic Files    ───▶   Micro-Frontends
Manual Sync         ───▶   Auto-Sync with Conflict Resolution
React via CDN       ───▶   React Build Process
No Tests            ───▶   Unit + E2E Tests
Arabic Only         ───▶   i18n Support
```

### 10.2 التحول لـ Microservices

```
Current: Single SPA
┌─────────────────────────────┐
│      All-in-One Browser     │
└─────────────────────────────┘

Future: Microservices
┌──────────┐  ┌──────────┐  ┌──────────┐
│   Auth   │  │  CRM     │  │Inventory │
│ Service  │  │ Service  │  │ Service  │
└──────────┘  └──────────┘  └──────────┘
      ▲             ▲             ▲
      └─────────────┼─────────────┘
                    │
              API Gateway
```

---

## 11. قاموس المصطلحات المعمارية

| المصطلح | التعريف |
|---------|---------|
| **SPA** | Single Page Application |
| **Offline-First** | تصميم يعمل بدون إنترنت كأولوية |
| **Multi-Tenant** | نظام يخدم مؤسسات متعددة بعزل تام |
| **Hybrid Engine** | محرك يجمع بين محلي وسحابي |
| **Module Pattern** | نمط عزلة الكود في وحدة |
| **Event Bus** | ناقل أحداث مركزي للتواصل |
| **Repository** | طبقة تجريد للوصول للبيانات |
| **RBAC** | Role-Based Access Control |
| **ABAC** | Attribute-Based Access Control |

---

## 12. المراجع والروابط

### 12.1 ملفات النظام الأساسية

- `ecofine/app.js` - قائد الأوركسترا
- `ecofine/database.js` - المحرك الهجين
- `ecofine/XCore.js` - منطق الأعمال
- `core/database.js` - نظام POS المنفصل

### 12.2 وثائق ذات صلة

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - هيكل قاعدة البيانات
- [SECURITY_POLICY.md](./SECURITY_POLICY.md) - سياسة الأمان
- [XCORE_PROTOCOL.md](./XCORE_PROTOCOL.md) - بروتوكول الائتمان

### 12.3 تقنيات مُستخدمة

| التقنية | الإصدار | الغرض |
|---------|---------|-------|
| React | 18.x (CDN) | واجهة المستخدم |
| IndexedDB | Native | تخزين محلي |
| Supabase | Latest | Backend-as-a-Service |
| Dexie.js | 3.x | Wrapper لـ IndexedDB (في core) |
| TailwindCSS | 3.x | التنسيقات |

---

## 13. سجل المراجعات

| الإصدار | التاريخ | المراجع | التغييرات |
|---------|---------|---------|-----------|
| 1.0 | 2024 | CDO | التوثيق الأولي |
| 0.9 | 2024 | Architect | مراجعة الأنماط |

---

## 14. الاعتماد والتواقيع

**تمت المراجعة بواسطة:**
- Chief Documentation Officer ✅
- Lead Architect ✅
- Senior Developer ⏳

**تاريخ الاعتماد:** 2024  
**الحالة:** معتمد للاستخدام الداخلي  

---

**Techno Vision Solutions © 2024**  
*العمارة ليست كوداً، بل رؤية*
