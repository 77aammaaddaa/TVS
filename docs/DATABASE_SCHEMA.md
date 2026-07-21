# 🗄️ مخطط قاعدة البيانات - DATABASE_SCHEMA

**النظام:** EcoFine Pro V14.1  
**المطور:** Techno Vision Solutions  
**تاريخ التوثيق:** 2024  
**حالة الوثيقة:** مسودة تقنية (بناءً على تحليل الكود الفعلي)

---

## ⚠️ تحذير أمني هام

> **هذا المستند يوثق الواقع البرمجي الحالي للنظام.**  
> تم اكتشاف أن البيانات الحساسة (مثل كلمات المرور والرقم القومي) تُخزن **بدون تشفير** في قواعد البيانات المحلية والسحابية.  
> **لا يجوز استخدام هذا النظام في بيئة إنتاجية** حتى يتم تطبيق بروتوكولات التشفير الموضحة في قسم "التوصيات الأمنية".

---

## 1. نظرة معمارية عامة

### 1.1 الهيكل الهجين (Hybrid Architecture)

يعتمد النظام على بنية تخزين هجينة تجمع بين:

| الطبقة | التقنية | الغرض |
|--------|---------|-------|
| **Local Layer** | IndexedDB (V15) | تخزين محلي سريع، عمل Offline-First |
| **Cloud Layer** | Supabase (PostgreSQL) | مزامنة سحابية، Multi-Tenant SaaS |
| **Sync Engine** | XSync.js | محرك مزامنة ثنائي الاتجاه (Push/Pull) |

### 1.2 فصل المؤسسات (Tenant Isolation)

```javascript
// آلية العزل في الكود الفعلي (database.js سطر 20-38)
reInitialize: async function(tenantUrl, tenantKey) {
    window._supabase = supabase.createClient(tenantUrl, tenantKey);
    // كل مؤسسة لها URL و API Key خاصين
}
```

**آلية العزل الحالية:**
- ✅ **عزل على مستوى الاتصال:** كل مؤسسة لها Supabase Client منفصل
- ⚠️ **عزل على مستوى البيانات:** يعتمد على `tenant_id` في الجداول السحابية
- ❌ **لا يوجد Row Level Security (RLS)** مفعل في الكود المفحوص

---

## 2. جداول قاعدة البيانات المحلية (IndexedDB)

### 2.1 قائمة الجداول الكاملة (V15)

تم استخراج القائمة من `database.js` (الأسطر 56-83):

#### **الطبقة التأسيسية (Layer 0 - Foundation)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `licenses` | `id` | - | تراخيص المؤسسات |
| `organizations` | `id` | - | بيانات المؤسسات |
| `branches` | `id` | - | الفروع |
| `devices` | `id` | - | الأجهزة المسجلة |

#### **وحدة الموارد البشرية (Module 1 - HR)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `employees` | `id` | `national_id` (unique) | بيانات الموظفين |
| `roles` | `id` | - | الأدوار |
| `permissions` | `id` | - | الصلاحيات |
| `role_permissions` | `id` | - | ربط الأدوار بالصلاحيات |
| `users` | `id` | - | حسابات المستخدمين |
| `attendance` | `id` | - | الحضور والانصراف |
| `hr_transactions` | `id` | - | المعاملات المالية للموظفين |
| `tasks` | `id` | `synced`, `last_updated` | المهام |
| `task_updates` | `id` | - | تحديثات المهام |

#### **وحدة إدارة العلاقات (Module 2 - CRM)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `clients` | `id` | `national_id` (unique) | العملاء |
| `guarantors` | `id` | `national_id` (unique) | الضامنين |
| `client_surveys` | `id` | - | استبيانات العملاء |

#### **وحدة الموردين والمشتريات (Module 3 - Suppliers)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `suppliers` | `id` | - | الموردين |
| `supplier_performance` | `id` | - | تقييم أداء الموردين |
| `purchase_invoices` | `id` | - | فواتير الشراء |
| `purchase_items` | `id` | - | أصناف المشتريات |
| `purchase_returns` | `id` | - | مرتجعات المشتريات |

#### **وحدة المخزون (Module 4 - Inventory)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `products` | `id` | - | المنتجات |
| `categories` | `id` | - | التصنيفات |
| `inventory_transactions` | `id` | - | حركات المخزون |
| `inventory_audits` | `id` | - | جرد المخزون |
| `inventory_audit_items` | `id` | - | أصناف الجرد |

#### **وحدة العقود والتقسيط (Module 5 - Contracts & Installments)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `contracts` | `id` | `synced`, `last_updated` | العقود |
| `contract_items` | `id` | - | أصناف العقود |
| `contract_guarantors` | `id` | - | ضامني العقود |
| `installments` | `id` | `synced`, `last_updated` | الأقساط |

#### **وحدة الخزينة (Module 6 - Treasury)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `vaults` | `id` | - | الخزائن |
| `payments` | `id` | `synced`, `last_updated` | المدفوعات |
| `expenses` | `id` | - | المصروفات |
| `vault_transactions` | `id` | - | حركات الخزائن |

#### **وحدة الشؤون القانونية (Module 7 - Legal)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `legal_documents` | `id` | - | المستندات القانونية |
| `legal_cases` | `id` | - | القضايا القانونية |
| `legal_attachments` | `id` | - | مرفقات القضايا |

#### **وحدة الائتمان اللامركزي (Module 8 - EcoCredit)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `network_identities` | `id` | - | الهويات الشبكية |
| `network_credit_metrics` | `id` | - | مقاييس الائتمان الشبكي |
| `network_risk_events` | `id` | - | أحداث المخاطر |
| `store_reports` | `id` | - | تقارير المتاجر |

#### **وحدات إضافية (Modules 9-10)**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `modules` | `id` | - | الموديولات |
| `organization_modules` | `id` | - | ربط المؤسسات بالموديولات |
| `delivery_zones` | `id` | - | مناطق التوصيل |
| `delivery_orders` | `id` | - | طلبات التوصيل |
| `delivery_tracking` | `id` | - | تتبع التوصيل |

#### **جداول التدقيق والنظام**
| الجدول | المفتاح الأساسي | فهارس إضافية | الوصف |
|--------|----------------|--------------|-------|
| `audit_logs` | `id` (autoIncrement) | `synced`, `last_updated` | سجلات التدقيق |
| `system_alerts` | `id` (autoIncrement) | `synced`, `last_updated` | تنبيهات النظام |
| `system_settings` | `id` | - | إعدادات النظام |
| `sync_queue` | `id` (autoIncrement) | `synced`, `last_updated` | طابور المزامنة |

#### **جداول قديمة (Legacy - للتوافق فقط)**
| الجدول | المفتاح الأساسي | الوصف |
|--------|----------------|-------|
| `customers` | `id` | عملاء (نسخة قديمة) |
| `invoices` | `id` | فواتير (نسخة قديمة) |
| `treasury` | `id` | خزينة (نسخة قديمة) |
| `purchases` | `id` | مشتريات (نسخة قديمة) |
| `inventory_logs` | `id` | سجلات مخزون (نسخة قديمة) |
| `surveys` | `id` | استبيانات (نسخة قديمة) |
| `coupons` | `id` | كوبونات خصم |
| `flash_sales` | `id` | عروض سريعة |

---

## 3. هيكل الجداول السحابية (Supabase)

### 3.1 نمط التصميم

```javascript
// نموذج البيانات المزامن (database.js سطر 142-166)
add: async function(tableName, object) {
    object.id = crypto.randomUUID() || `id-${Date.now()}`;
    object.last_updated = new Date().toISOString();
    object.synced = false;
    
    // الحفظ المحلي أولاً
    await this._toLocal(tableName, object);
    
    // الرفع للسحابة إذا كان متصلاً
    if (navigator.onLine && window._supabase) {
        const { error } = await window._supabase.from(tableName).upsert([object]);
    }
}
```

### 3.2 الحقول القياسية (Standard Fields)

كل جدول في النظام يحتوي على الحقول التالية:

| الحقل | النوع | الوصف | إلزامي |
|-------|------|-------|--------|
| `id` | UUID/String | المعرف الفريد | ✅ نعم |
| `last_updated` | ISO 8601 Timestamp | آخر تحديث | ✅ نعم |
| `synced` | Boolean | حالة المزامنة | ✅ نعم |
| `tenant_id` | UUID | معرف المؤسسة (في السحابة) | ⚠️ يعتمد على الجدول |
| `created_at` | ISO 8601 Timestamp | تاريخ الإنشاء | ❌ اختياري |
| `created_by` | UUID | معرف المستخدم المنشئ | ❌ اختياري |

---

## 4. البيانات الحساسة وأنواعها

### 4.1 الحقول الحساسة المكتشفة

تم تحليل الكود الفعلي واكتشاف الحقول الحساسة التالية:

#### **أ. الهوية الوطنية (National ID)**
```javascript
// موجود في: clients, guarantors, customers, employees
// النوع: String (14 رقم)
// الفهرسة: unique index
// مثال: "29001010101010"
```

**المواقع في الكود:**
- `database.js` سطر 113-120: فهرسة `national_id`
- `crm.js` سطر 188-189: إدخال الرقم القومي
- `XCore.js` سطر 93, 177: التحقق من صحة الرقم (14 رقم)
- `collection.js` سطر 114: عرض الرقم القومي

#### **ب. كلمات المرور (Passwords)**
```javascript
// ⚠️ تحذير أمني حرج: تخزين كنص صريح
// موجود في: users, auth.js
// النوع: String
// مثال: "password123" (بدون Hash!)
```

**المواقع في الكود:**
- `auth.js` سطر 164: مقارنة مباشرة `user.password === credentials.password`
- `crm.js` سطر 423: تحقق بكلمة مرور نصية صريحة

#### **ج. البيانات المالية**
```javascript
// موجود في: contracts, installments, payments
// الحقول: total, amount, price, stock
// النوع: Number/Float
```

#### **د. بيانات الاتصال**
```javascript
// موجود في: clients, employees, suppliers
// الحقول: phone, address, email
// النوع: String
```

### 4.2 أنواع البيانات المستخدمة

| نوع البيانات | JavaScript Type | أمثلة |
|-------------|-----------------|-------|
| **UUID** | String | `crypto.randomUUID()` |
| **Timestamp** | ISO 8601 String | `new Date().toISOString()` |
| **National ID** | String (14 digit) | `"29001010101010"` |
| **Boolean** | Boolean | `true/false` |
| **Numeric** | Number | `price`, `stock`, `total` |
| **JSON Object** | Object | `invoice_data_json`, `data_payload` |

---

## 5. علاقات الجداول (Entity Relationships)

### 5.1 مخطط العلاقات الرئيسي

```
┌─────────────────┐         ┌──────────────────┐
│ organizations   │ 1────N  │ branches         │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ 1                         │ 1
         │                           │
         ▼ N                         ▼ N
┌─────────────────┐         ┌──────────────────┐
│ users           │◄────────│ employees        │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌──────────────────┐
│ contracts       │◄────────│ clients          │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ 1                         │ N
         │                           │
         ▼ N                         ▼ N
┌─────────────────┐         ┌──────────────────┐
│ installments    │         │ guarantors       │
└─────────────────┘         └──────────────────┘
```

### 5.2 العلاقات التفصيلية

#### **العقد والأقساط (Contracts → Installments)**
```javascript
// contract_id يربط القسط بالعقد
// contract_items تربط المنتجات بالعقد
```

#### **العملاء والضامنين (Clients → Guarantors)**
```javascript
// contract_guarantors جدول وسيط
// guarantor.national_id يرتبط بـ clients.national_id
```

#### **المخزون والحركات (Products → Inventory Transactions)**
```javascript
// inventory_transactions.product_id → products.id
// كل حركة مخزون تشير لمنتج واحد
```

---

## 6. بروتوكول المزامنة (Sync Protocol)

### 6.1 دورة المزامنة

```javascript
// من database.js سطر 280-359

// 1. Push (رفع التغييرات المحلية)
syncWithCloud: async function() {
    tablesToPush = ['branches', 'employees', 'contracts', ...];
    unSynced = allLocal.filter(item => !item.synced);
    for (item of unSynced) {
        await supabase.from(table).upsert([item]);
        item.synced = true;
    }
}

// 2. Pull (سحب التحديثات السحابية)
pullAllFromCloud: async function() {
    tablesToPull = ['branches', 'employees', 'contracts', ...];
    for (table of tablesToPull) {
        const { data } = await supabase.from(table).select('*');
        for (item of data) {
            item.synced = true;
            await _toLocal(table, item);
        }
    }
}
```

### 6.2 طابور المزامنة (Sync Queue)

```javascript
// جدول sync_queue
{
    id: autoIncrement,
    operation_type: 'insert_sale' | 'update' | 'delete',
    entity_id: UUID,
    data_payload: Object,
    attempts: Number,
    last_attempt: Timestamp
}
```

**آلية العمل:**
1. أي عملية CRUD تضيف سجل في `sync_queue` مع `synced = false`
2. خلفية دورية (كل 10 ثواني) تعالج الطابور
3. بعد النجاح: `synced = true` وحذف من الطابور
4. بعد 5 محاولات فاشلة: تخطي السجل

---

## 7. قاعدة بيانات POS المنفصلة (Core System)

### 7.1 هيكل قاعدة POS (Dexie.js)

من `core/database.js`:

```javascript
db.version(1).stores({
    local_inventory: 'id, product_name, price, stock, cloud_product_id',
    local_sales: 'invoice_id, timestamp',
    sync_queue: '++id, operation_type, entity_id, attempts, last_attempt'
});
```

### 7.2 جداول POS

| الجدول | الحقول الرئيسية | الوصف |
|--------|----------------|-------|
| `local_inventory` | `id`, `product_name`, `price`, `stock`, `cloud_product_id` | مخزون محلي |
| `local_sales` | `invoice_id`, `timestamp`, `items`, `total` | مبيعات محلية |
| `sync_queue` | `operation_type`, `entity_id`, `data_payload`, `attempts` | طابور مزامنة |

### 7.3 التكامل مع السحابة

```javascript
// من core/database.js سطر 250-294
async function processInsertSale(task, tenantId) {
    // إدراج الفاتورة
    const cloudData = {
        tenant_id: tenantId,
        invoice_data_json: task.data_payload,
        total: task.data_payload.total,
        created_at: new Date().toISOString()
    };
    
    await supabase.from('cloud_sales').insert([cloudData]);
    
    // تحديث المخزون السحابي
    for (const item of task.data_payload.items) {
        await supabase
            .from('cloud_inventory')
            .update({ stock: product.stock - item.qty })
            .eq('id', item.id)
            .eq('tenant_id', tenantId);
    }
}
```

---

## 8. التشفير ومعالجة البيانات الحساسة

### 8.1 التجزئة (Hashing) - XScoreEngine

```javascript
// من XScoreEngine.js سطر 102-107
const hashNationalId = async (nationalId) => {
    const msgBuffer = new TextEncoder().encode(nationalId.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
```

**الاستخدام:**
- `network_credit` جدول يستخدم `hashed_national_id` بدلاً من الرقم القومي الصريح
- لا يمكن عكس الهاش (One-Way Function)

### 8.2 ⚠️ الثغرات الأمنية المكتشفة

| الثغرة | الموقع | الخطر | الحالة |
|--------|--------|-------|--------|
| كلمات مرور كنص صريح | `auth.js:164`, `crm.js:423` | 🔴 حرج | غير مشفرة |
| National ID صريح | `clients`, `guarantors` | 🟠 عالي | غير مشفر |
| بيانات مالية غير مشفرة | `contracts`, `payments` | 🟠 عالي | غير مشفرة |
| مفاتيح API في الكود | `XSync.js:222` | 🔴 حرج | مكشوفة |

---

## 9. التوصيات والإصلاحات المطلوبة

### 9.1 إصلاحات عاجلة (Critical)

#### **أ. تشفير كلمات المرور**
```javascript
// ❌ الحالي (غير آمن)
if (user.password === credentials.password) { ... }

// ✅ المطلوب (bcrypt أو Argon2)
const hashedPassword = await bcrypt.hash(credentials.password, 10);
// تخزين hashedPassword بدلاً من password
```

#### **ب. تشفير الرقم القومي**
```javascript
// ✅ تطبيق hashing في جميع الجداول
client.national_id_hash = await hashNationalId(client.national_id);
// عدم تخزين national_id الصريح إلا مشفراً بتشفير قابل للعكس (AES-256)
```

#### **ج. تفعيل Row Level Security (RLS)**
```sql
-- في Supabase
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON clients
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 9.2 تحسينات البنية

#### **أ. إضافة حقول إلزامية**
```javascript
// إضافة لجميع الجداول
{
    tenant_id: UUID,        // لعزل المؤسسات
    created_by: UUID,       // لتتبع المستخدم
    updated_by: UUID,       // لآخر محدث
    version: Number,        // للإصدار (Optimistic Locking)
    is_deleted: Boolean     // للحذف الناعم (Soft Delete)
}
```

#### **ب. فهارس إضافية**
```javascript
// تحسين الأداء
createIndex('tenant_id')      // لعزل أسرع
createIndex('created_at')     // للترتيب الزمني
createIndex('status')         // لفلترة الحالة
```

---

## 10. قاموس المصطلحات

| المصطلح | المعنى |
|---------|--------|
| **Tenant** | مؤسسة مشتركة في النظام SaaS |
| **Synced** | حالة المزامنة بين المحلي والسحابي |
| **Offline-First** | تصميم يعمل بدون إنترنت أولاً |
| **Upsert** | Update أو Insert حسب وجود السجل |
| **RLS** | Row Level Security (أمان على مستوى الصف) |
| **UUID** | معرف فريد عالمي (128-bit) |
| **ISO 8601** | معيار تنسيق التاريخ والوقت |

---

## 11. المراجع

- `ecofine/database.js` - المحرك الهجين الرئيسي
- `core/database.js` - نظام POS المنفصل
- `ecofine/XScoreEngine.js` - محرك التشفير والتقييم
- `ecofine/XSync.js` - محرك المزامنة
- `ecofine/auth.js` - نظام المصادقة
- `ecofine/crm.js` - إدارة علاقات العملاء

---

## 12. سجل التعديلات

| الإصدار | التاريخ | التعديلات |
|---------|---------|-----------|
| 1.0 | 2024 | المسودة الأولية بناءً على تحليل V14.1 |

---

**تم التوثيق بواسطة:** Chief Documentation Officer  
**المراجعة القادمة:** بعد تطبيق إصلاحات الأمان  
**حالة الاعتماد:** ⚠️ وثيقة تقنية داخلية فقط
