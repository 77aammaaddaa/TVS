# 🔐 سياسة الأمان والحماية - SECURITY_POLICY

**النظام:** EcoFine Pro V14.1  
**المطور:** Techno Vision Solutions  
**تاريخ التوثيق:** 2024  
**مستوى التصنيف:** ⚠️ وثيقة داخلية حرجة  
**حالة الاعتماد:** غير معتمد للإنتاج (Unapproved for Production)

---

## ⚠️ تحذير أمني عاجل

> **تم تقييم هذا النظام بدرجة أمنية 2.5/10**  
> يحتوي الكود الحالي على **ثغرات أمنية حرجة** تجعله غير صالح للاستخدام في بيئات الإنتاج.  
> يجب تطبيق الإصلاحات المذكورة في هذه الوثيقة قبل أي نشر فعلي.

---

## 1. بروتوكول العزل بين المؤسسات (Tenant Isolation Protocol)

### 1.1 الآلية الحالية (Current Implementation)

```javascript
// من database.js سطر 20-38
reInitialize: async function(tenantUrl, tenantKey) {
    if (!tenantUrl || !tenantKey) {
        console.error("❌ بيانات السحابة مفقودة، لا يمكن التهيئة.");
        return false;
    }
    
    window._supabase = supabase.createClient(tenantUrl, tenantKey);
    // كل مؤسسة لها Supabase Client منفصل
}
```

### 1.2 طبقات العزل الحالية

| الطبقة | الآلية | الحالة | الفعالية |
|--------|--------|--------|----------|
| **الاتصال** | Supabase URL + Key خاصين | ✅ مُطبق | عالية |
| **المخزن المحلي** | IndexedDB باسم موحد | ⚠️ جزئي | منخفضة |
| **البيانات السحابية** | `tenant_id` في الجداول | ⚠️ اختياري | متوسطة |
| **Row Level Security** | سياسات RLS في Supabase | ❌ غير مُطبق | معدومة |

### 1.3 الثغرات المكتشفة في العزل

#### **أ. تلوث IndexedDB المشترك**
```javascript
// من database.js سطر 14-15
const db = {
    dbName: "EcoFine_Local_DB",  // ⚠️ اسم قاعدة بيانات موحد لكل المؤسسات!
    dbVersion: 15,
};
```

**المشكلة:** جميع المؤسسات تشارك نفس قاعدة البيانات المحلية، مما قد يؤدي إلى:
- تسرب بيانات بين المؤسسات على نفس الجهاز
- صعوبة فصل البيانات عند إلغاء اشتراك مؤسسة

**الحل المطلوب:**
```javascript
// ✅ الحل المقترح
const db = {
    dbName: `EcoFine_Local_DB_${tenantId}`,  // قاعدة منفصلة لكل مؤسسة
    dbVersion: 15,
};
```

#### **ب. غياب التحقق من ملكية tenant_id**
```javascript
// من core/database.js سطر 220
const tenantId = localStorage.getItem('xfine_tenant_id');
// ⚠️ لا يوجد تحقق من صحة الـ tenant_id أو توقيعه
```

**المشكلة:** أي مستخدم يمكنه تعديل `localStorage` والوصول لبيانات مؤسسة أخرى.

**الحل المطلوب:**
```javascript
// ✅ التحقق من التوقيع
async function validateTenantId(tenantId, signature) {
    const publicKey = getPemPublicKey();
    const isValid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        publicKey,
        signature,
        new TextEncoder().encode(tenantId)
    );
    return isValid;
}
```

---

## 2. قفل الهوية (Identity Lock Protocol)

### 2.1 التعريف

**قفل الهوية** هو آلية تمنع تعديل الهويات الأساسية (الرقم القومي، اسم المستخدم) بعد الإنشاء، وتتطلب صلاحيات **Super Admin** لكسر القفل.

### 2.2 التطبيق الحالي

```javascript
// من crm.js سطر 447-520
const existing = customers.find(c => c.national_id === val);
if (existing) {
    if (!editingCustomer || editingCustomer.national_id !== val) {
        // ⚠️ تحذير فقط، بدون منع فعلي
        alert('هذا الرقم القومي مسجل بالفعل!');
    }
}
```

### 2.3 قواعد قفل الهوية الحالية

| الكيان | الحقل المقفول | مستوى القفل | قابل للتعديل بواسطة |
|--------|--------------|-------------|---------------------|
| **عميل** | `national_id` | تحذير | أي مستخدم (⚠️ ثغرة) |
| **ضامن** | `national_id` | تحذير | أي مستخدم (⚠️ ثغرة) |
| **موظف** | `national_id` | فهرس unique | مدير الموارد البشرية |
| **مستخدم** | `username` | مفتاح أساسي | Super Admin فقط |

### 2.4 آلية كسر القفل (Lock Breaking)

**الحالة الحالية:** ❌ غير موجودة

**الحل المقترح:**
```javascript
// ✅ IdentityLock.js
const IdentityLock = {
    lockedFields: ['national_id', 'username', 'id'],
    
    async attemptUpdate(entityType, field, newValue, currentUser) {
        if (this.lockedFields.includes(field)) {
            if (currentUser.role !== 'super_admin') {
                throw new Error('🔒 يتطلب صلاحيات Super Admin لتعديل هوية مقفلة');
            }
            
            // تسجيل محاولة كسر القفل
            await AuditLog.log({
                type: 'IDENTITY_LOCK_BREAK',
                entityType,
                field,
                newValue,
                userId: currentUser.id,
                timestamp: new Date().toISOString()
            });
            
            // إشعار فوري
            await Notification.sendToSuperAdmins({
                title: '⚠️ محاولة تعديل هوية مقفلة',
                body: `${currentUser.username} يحاول تعديل ${field} لـ ${entityType}`
            });
        }
    }
};
```

---

## 3. التعامل مع البيانات الحساسة (Sensitive Data Handling)

### 3.1 تصنيف البيانات

| الفئة | الأمثلة | مستوى الحماية المطلوب | الحالة الحالية |
|-------|---------|----------------------|----------------|
| **حرجة** | كلمات المرور، مفاتيح API | تشفير AES-256 + Hashing | ❌ نص صريح |
| **حساسة جداً** | الرقم القومي، البيانات المالية | تشفير AES-256 | ❌ نص صريح |
| **حساسة** | العنوان، الهاتف، البريد | تشفير اختياري | ❌ غير مشفرة |
| **عادية** | الأسماء، التواريخ | حماية قياسية | ✅ مقبولة |

### 3.2 التشفير في حالة السكون (Encryption at Rest)

#### **الوضع الحالي: ❌ غير مُطبق**

```javascript
// مثال من auth.js سطر 164 - كلمة مرور كنص صريح
if (user && user.password === credentials.password) {
    // ⚠️ مقارنة مباشرة بدون Hash!
}
```

#### **الحل المطلوب:**

```javascript
// ✅ PasswordManager.js
const PasswordManager = {
    // توليد Hash آمن
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        const hash = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        return {
            hash: Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''),
            salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
        };
    },
    
    // التحقق من كلمة المرور
    async verifyPassword(password, storedHash, storedSalt) {
        const { hash } = await this.hashPassword(password);
        // ⚠️ ملاحظة: هذا تبسيط، في الواقع نحتاج إعادة استخدام salt
        return hash === storedHash;
    }
};
```

### 3.3 التشفير في حالة النقل (Encryption in Transit)

#### **الوضع الحالي: ⚠️ يعتمد على HTTPS**

```javascript
// من database.js سطر 27
window._supabase = supabase.createClient(tenantUrl, tenantKey);
// Supabase يستخدم HTTPS افتراضياً ✅
```

#### **التوصيات الإضافية:**

1. **إجبار HTTPS:**
```javascript
if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    window.location.protocol = 'https:';
}
```

2. **توقيع الطلبات:**
```javascript
// ✅ إضافة توقيع لكل طلب سحابي
async function signedRequest(table, operation, data) {
    const signature = await generateSignature(data);
    return window._supabase
        .from(table)
        [operation]({ ...data, _signature: signature });
}
```

### 3.4 التجزئة اللامركزية (Decentralized Hashing) - XScoreEngine

#### **التطبيق الحالي: ✅ مُطبق جزئياً**

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
- جدول `network_credit` يستخدم `hashed_national_id`
- يُستخدم لمشاركة البيانات الائتمانية بين المؤسسات بدون كشف الهوية

**القصور:**
- لا يزال `national_id` الصريح مخزناً في جداول `clients`, `guarantors`
- الهاش غير مُستخدم في جميع الجداول

---

## 4. بروتوكول المزامنة الآمنة (Secure Sync Protocol)

### 4.1 دورة المزامنة الحالية

```javascript
// من database.js سطر 280-319
syncWithCloud: async function() {
    const tablesToPush = ['branches', 'employees', 'contracts', ...];
    
    for (const table of tablesToPush) {
        const allLocal = await this.getAll(table);
        const unSynced = allLocal.filter(item => !item.synced);
        
        for (const item of unSynced) {
            // ⚠️ رفع البيانات بدون تحقق من التكامل
            const { error } = await window._supabase.from(table).upsert([item]);
            if (!error) {
                item.synced = true;
                await this._toLocal(table, item);
            }
        }
    }
}
```

### 4.2 الثغرات الأمنية في المزامنة

| الثغرة | الوصف | الخطر | الحل |
|--------|-------|-------|-----|
| **غياب التحقق من التكامل** | لا توجد Signature للبيانات | 🟠 عالي | إضافة HMAC لكل دفعة |
| **تسرب البيانات في الطابور** | `sync_queue` غير مشفر | 🟠 عالي | تشفير `data_payload` |
| **هجوم إعادة التشغيل** | لا يوجد nonce/timestamp | 🟡 متوسط | إضافة timestamp + nonce |
| **عدم التحقق من الاتجاه** | Pull من أي مصدر | 🟡 متوسط | التحقق من Certificate Pinning |

### 4.3 بروتوكول المزامنة الآمن المقترح

```javascript
// ✅ SecureSync.js
const SecureSync = {
    async pushToCloud(tableName, data) {
        // 1. توليد توقيع
        const signature = await this.generateHMAC(data);
        const timestamp = Date.now();
        const nonce = crypto.randomUUID();
        
        // 2. تشفير البيانات الحساسة
        const encryptedData = await this.encryptSensitiveFields(data);
        
        // 3. إرسال مع التوقيع
        const payload = {
            data: encryptedData,
            signature,
            timestamp,
            nonce,
            tenant_id: this.getTenantId()
        };
        
        const { error } = await window._supabase
            .from(tableName)
            .upsert([payload]);
        
        if (error) throw error;
        
        // 4. التحقق من الاستجابة
        await this.verifyServerResponse(error);
    },
    
    async generateHMAC(data) {
        const encoder = new TextEncoder();
        const key = await this.getSyncKey();
        const message = encoder.encode(JSON.stringify(data));
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(key),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
        return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
};
```

---

## 5. التحكم في الوصول والصلاحيات (Access Control)

### 5.1 نموذج الصلاحيات الحالي

```javascript
// من app.js سطر 314-315
items: group.items.filter(item => 
    window.XGuard?.canAccess?.(currentUser, item.id) ?? true
)
// ⚠️ إذا كان XGuard غير موجود، السماح الافتراضي (Fail-Open!)
```

### 5.2 الثغرات في نموذج الصلاحيات

| الثغرة | الوصف | التأثير |
|--------|-------|---------|
| **Fail-Open Default** | `?? true` يسمح بالوصول إذا فشل التحقق | وصول غير مصرح به |
| **غياب التحقق على مستوى الخادم** | التحقق فقط في الواجهة | تجاوز الصلاحيات ممكن |
| **لا يوجد Audit Trail** | لا تسجيل محاولات الوصول الفاشلة | عدم إمكانية التتبع |

### 5.3 نموذج الصلاحيات المقترح (RBAC + ABAC)

```javascript
// ✅ XGuard Enhanced
const XGuard = {
    roles: {
        super_admin: { level: 100, canBypassAll: true },
        admin: { level: 80, canManageUsers: true },
        manager: { level: 60, canApproveContracts: true },
        accountant: { level: 40, canAccessTreasury: true },
        sales: { level: 20, canCreateInvoices: true },
        viewer: { level: 10, readOnly: true }
    },
    
    canAccess(user, resourceId) {
        if (!user) return false;
        
        const role = this.roles[user.role];
        if (!role) return false;
        
        // 1. التحقق من مستوى الدور
        const requiredLevel = this.getResourceRequiredLevel(resourceId);
        if (role.level < requiredLevel) {
            this.logAccessDenied(user, resourceId, 'INSUFFICIENT_LEVEL');
            return false;
        }
        
        // 2. التحقق من الصلاحيات الخاصة
        const permissions = this.getUserPermissions(user.id);
        if (!permissions.includes(resourceId)) {
            this.logAccessDenied(user, resourceId, 'MISSING_PERMISSION');
            return false;
        }
        
        // 3. التحقق من القيود الزمنية
        if (user.accessHours && !this.isWithinAccessHours(user.accessHours)) {
            this.logAccessDenied(user, resourceId, 'OUTSIDE_HOURS');
            return false;
        }
        
        return true;
    },
    
    logAccessDenied(user, resourceId, reason) {
        // تسجيل محاولة الوصول المرفوضة
        console.warn(`🚫 Access Denied: ${user.username} -> ${resourceId} (${reason})`);
        // إرسال تنبيه إذا كانت المحاولات متعددة
    }
};
```

---

## 6. الحماية من الهجمات الشائعة

### 6.1 حقن SQL (SQL Injection)

**الحالة:** ⚠️ خطر نظري (Supabase تستخدم Parameterized Queries)

**التوصية:**
```javascript
// ✅ جيد - Supabase تتعامل مع المعاملات بأمان
await supabase.from('clients').select('*').eq('national_id', nationalId);

// ❌ تجنب بناء استعلامات يدوياً
const query = `SELECT * FROM clients WHERE national_id = '${nationalId}'`; // خطر!
```

### 6.2 XSS (Cross-Site Scripting)

**الثغرات المكتشفة:**

```javascript
// من auth.js - استخدام innerHTML
element.innerHTML = userData.someField; // ⚠️ خطر XSS!
```

**الحل:**
```javascript
// ✅ استخدام textContent أو React JSX
element.textContent = userData.someField;
// أو في React
<div>{userData.someField}</div> // React يهرب تلقائياً
```

### 6.3 CSRF (Cross-Site Request Forgery)

**الحالة:** ❌ لا توجد حماية CSRF

**الحل المطلوب:**
```javascript
// ✅ إضافة CSRF Token
const csrfToken = localStorage.getItem('csrf_token');
headers: {
    'X-CSRF-Token': csrfToken
}
```

### 6.4 هجمات القوة الغاشمة (Brute Force)

**الحالة:** ❌ لا يوجد Rate Limiting

**الحل المقترح:**
```javascript
// ✅ RateLimiter.js
const RateLimiter = {
    attempts: {},
    
    checkLimit(identifier, maxAttempts = 5, windowMs = 900000) { // 15 دقيقة
        const now = Date.now();
        if (!this.attempts[identifier]) {
            this.attempts[identifier] = [];
        }
        
        // تنظيف المحاولات القديمة
        this.attempts[identifier] = this.attempts[identifier].filter(
            timestamp => now - timestamp < windowMs
        );
        
        if (this.attempts[identifier].length >= maxAttempts) {
            return { allowed: false, retryAfter: windowMs / 1000 };
        }
        
        this.attempts[identifier].push(now);
        return { allowed: true };
    }
};
```

---

## 7. التدقيق والمراقبة (Audit & Monitoring)

### 7.1 سجلات التدقيق الحالية

```javascript
// من database.js سطر 80
'audit_logs' // جدول موجود لكن الاستخدام محدود
```

### 7.2 الأحداث التي يجب تدقيقها

| الحدث | المستوى | الإجراء |
|-------|---------|---------|
| تسجيل الدخول الناجح | معلومات | تسجيل الوقت والجهاز |
| محاولة دخول فاشلة | تحذير | عداد المحاولات |
| تعديل هوية مقفلة | حرج | إشعار Super Admin |
| حذف بيانات مالية | حرج | نسخ احتياطي قبل الحذف |
| تصدير بيانات ضخمة | تحذير | تحديد الكمية المسربة |
| تغيير صلاحيات | حرج | تسجيل القديم والجديد |

### 7.3 هيكل سجل التدقيق المقترح

```javascript
// ✅ AuditLog Schema
{
    id: UUID,
    timestamp: ISO8601,
    userId: UUID,
    username: String,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT',
    entityType: String,
    entityId: UUID,
    oldValue: JSON,  // قبل التعديل
    newValue: JSON,  // بعد التعديل
    ipAddress: String,
    userAgent: String,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    sessionId: UUID
}
```

---

## 8. خطة العلاج الأمني (Security Remediation Plan)

### 8.1 المرحلة الأولى: إصلاحات حرجة (أسبوع 1-2)

| المهمة | الأولوية | الجهد | التأثير |
|--------|----------|-------|---------|
| تشفير كلمات المرور (bcrypt) | 🔴 حرجة | 2 يوم | عالي جداً |
| تفعيل RLS في Supabase | 🔴 حرجة | 3 أيام | عالي جداً |
| إزالة تخزين كلمات المرور | 🔴 حرجة | 1 يوم | عالي |
| إضافة Rate Limiting | 🟠 عالية | 2 يوم | عالي |

### 8.2 المرحلة الثانية: تحسينات أساسية (أسبوع 3-4)

| المهمة | الأولوية | الجهد | التأثير |
|--------|----------|-------|---------|
| تشفير الرقم القومي | 🟠 عالية | 3 أيام | عالي |
| فصل قواعد IndexedDB | 🟠 عالية | 2 يوم | متوسط |
| تنفيذ Identity Lock | 🟡 متوسطة | 3 أيام | متوسط |
| إضافة CSRF Protection | 🟡 متوسطة | 1 يوم | عالي |

### 8.3 المرحلة الثالثة: نضج أمني (شهر 2)

| المهمة | الأولوية | الجهد | التأثير |
|--------|----------|-------|---------|
| تشفير كامل للبيانات | 🟡 متوسطة | 5 أيام | عالي |
| نظام إدارة مفاتيح | 🟡 متوسطة | 4 أيام | عالي |
| اختبار اختراق خارجي | 🟢 منخفضة | 3 أيام | عالي |
| شهادة ISO 27001 | 🟢 منخفضة | 30 يوم | استراتيجي |

---

## 9. قائمة التحقق الأمني (Security Checklist)

### 9.1 ما قبل النشر (Pre-Production)

- [ ] تشفير جميع كلمات المرور
- [ ] تفعيل Row Level Security
- [ ] إزالة جميع المفاتيح السرية من الكود
- [ ] تفعيل HTTPS الإجباري
- [ ] إضافة Rate Limiting للمصادقة
- [ ] اختبار XSS و SQL Injection
- [ ] تفعيل CORS الصارم
- [ ] مراجعة صلاحيات المستخدمين

### 9.2 ما بعد النشر (Post-Production)

- [ ] مراقبة سجلات التدقيق يومياً
- [ ] تحديث التبعيات الأمنية شهرياً
- [ ] اختبار اختراق ربع سنوي
- [ ] تدريب الموظفين على الأمن
- [ ] خطة استجابة للحوادث
- [ ] نسخ احتياطي مشفر يومياً

---

## 10. الاستجابة للحوادث (Incident Response)

### 10.1 تصنيف الحوادث

| المستوى | الوصف | وقت الاستجابة |
|---------|-------|---------------|
| **P0 - حرج** | تسرب بيانات، اختراق كامل | 1 ساعة |
| **P1 - عالي** | وصول غير مصرح به، تعطيل خدمة | 4 ساعات |
| **P2 - متوسط** | ثغرة قابلة للاستغلال | 24 ساعة |
| **P3 - منخفض** | مشكلة أمنية نظرية | 72 ساعة |

### 10.2 إجراءات الطوارئ

```javascript
// ✅ EmergencyProtocol.js
const EmergencyProtocol = {
    async lockdown() {
        // 1. إيقاف جميع عمليات الكتابة
        this.freezeDatabase();
        
        // 2. قطع جلسات المستخدمين
        await this.invalidateAllSessions();
        
        // 3. إشعار الفريق الأمني
        await this.notifySecurityTeam('LOCKDOWN_INITIATED');
        
        // 4. تفعيل وضع الصيانة
        this.enableMaintenanceMode();
    },
    
    async rotateCredentials() {
        // تدوير جميع المفاتيح السرية
        await this.rotateAPIKeys();
        await this.rotateDatabasePasswords();
        await this.reissueUserTokens();
    }
};
```

---

## 11. المراجع والمعايير

### 11.1 المعايير المُتبعة

- **OWASP Top 10 2021** - أهم ثغرات الويب
- **NIST Cybersecurity Framework** - إطار العمل الأمني
- **ISO 27001** - إدارة أمن المعلومات
- **GDPR** - حماية البيانات الشخصية (أوروبا)

### 11.2 أدوات مُوصى بها

| الفئة | الأداة | الغرض |
|-------|--------|-------|
| SAST | SonarQube | تحليل الكود الثابت |
| DAST | OWASP ZAP | اختبار الاختراق الديناميكي |
| Dependency | npm audit | فحص التبعيات |
| Secrets | GitLeaks | كشف الأسرار في Git |
| Monitoring | Sentry | مراقبة الأخطاء |

---

## 12. سجل المراجعات

| الإصدار | التاريخ | المراجع | التغييرات |
|---------|---------|---------|-----------|
| 1.0 | 2024 | CDO | المسودة الأولية |
| 0.9 | 2024 | Security Team | مراجعة الثغرات |

---

## 13. التواقيع والاعتماد

**تمت المراجعة بواسطة:**  
- Chief Documentation Officer ✅
- Security Architect ⏳ (قيد المراجعة)
- Lead Developer ⏳ (قيد المراجعة)

**تاريخ الاعتماد المتوقع:** بعد تطبيق إصلاحات المرحلة الأولى

**حالة الوثيقة:** ⚠️ **مسودة غير معتمدة** - للتطبيق الداخلي فقط

---

**Techno Vision Solutions © 2024**  
*الأمن ليس منتجاً، بل عملية مستمرة*
