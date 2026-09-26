# 🧠 بروتوكول XCore - منطق الأعمال الائتماني

**النظام:** EcoFine Pro V14.1  
**المكون:** XCore.js  
**المطور:** Techno Vision Solutions  
**تاريخ التوثيق:** 2024  
**حالة الوثيقة:** معتمد تقنياً ✅

---

## 1. نظرة عامة على الفلسفة الائتمانية

### 1.1 مبدأ "الائتمان النظيف" (Clean Credit Philosophy)

يعتمد نظام EcoFine Pro على فلسفة ائتمانية متوازنة تجمع بين:

1. **التحصيل الإداري الودي** - تجنب الإجراءات القانونية إلا كحل أخير
2. **القواعد المتوافقة مع الشريعة** - عدم فرض غرامات تأخير ربوية
3. **التقييم الديناميكي** - تحديث السكور الائتماني بناءً على السلوك الفعلي
4. **الحماية المتبادلة** - حقوق للتاجر والعميل على حد سواء

### 1.2 المبادئ الأساسية

| المبدأ | التطبيق | الفائدة |
|--------|---------|---------|
| **التدريج** | حدود ائتمانية تزداد مع السداد | تقليل المخاطر |
| **الضمان** | اشتراط ضامن واحد على الأقل | حماية من التخلف |
| **الشفافية** | كشف تفاصيل حساب السكور | بناء الثقة |
| **المرونة** | إعادة التقييم بعد كل قسط | مكافأة الالتزام |

---

## 2. محرك التقييم الائتماني (X-Score Calculator)

### 2.1 المعادلة الأساسية

```javascript
// من XCore.js سطر 96-194
finalScore = MIN(100, 
    baseScore + 
    guarantorContribution + 
    incomeContribution + 
    residenceContribution + 
    identityContribution
)
```

### 2.2 مكونات السكور التفصيلية

#### **أ.スコア البداية (Base Score)**
```javascript
const conf = getConfig().creditPolicy;
let score = conf.startingScore || 0;  // الافتراضي: 0
```

**المنطق:** يبدأ كل عميل من الصفر، ويثبت جدارته عبر البيانات المقدمة.

#### **ب. وزن الضامنين (Guarantors Weight) - 40%**

```javascript
// من XCore.js سطر 136-149
const avgGScore = guarantors.reduce((sum, g) => 
    sum + (Number(g.credit_score) || 50), 0
) / guarantors.length;

const ratio = Math.min(guarantors.length / gRules.maxGuarantors, 1);
guarantorContribution = (avgGScore / 100) * weights.guarantors * ratio;
score += Math.min(guarantorContribution, weights.guarantors);
```

**شرح المعادلة:**

| المتغير | الوصف | المثال |
|---------|-------|-------|
| `avgGScore` | متوسط سكور الضامنين | إذا كان عندك ضامن بسكور 80% → 80 |
| `ratio` | نسبة عدد الضامنين للحد الأقصى | ضامن واحد من 3 = 0.33 |
| `weights.guarantors` | الوزن الكلي للضامنين | 40 نقطة |
| **المساهمة النهائية** | `(80/100) × 40 × 0.33 = 10.56` | ≈ 11 نقطة |

**قواعد الضامنين:**

```javascript
// من XCore.js سطر 54-58
guarantorRules: {
    minGuarantors: 1,        // حد أدنى: ضامن واحد
    minGuarantorScore: 50,   // كل ضامن يجب أن يكون سكوره ≥ 50%
    maxGuarantors: 3         // حد أقصى: 3 ضامنين
}
```

#### **ج. وزن الدخل والوظيفة (Income Weight) - 30%**

```javascript
// من XCore.js سطر 151-161
if (customerData.job_type === 'GOV_EMPLOYEE' || monthly_income > 3000) {
    incomeContribution = weights.income;  // 30 نقطة كاملة
} else if (monthly_income > 2000) {
    incomeContribution = weights.income * 0.7;  // 21 نقطة
} else {
    incomeContribution = weights.income * 0.3;  // 9 نقاط
}
```

**جدول الدرجات:**

| نوع الوظيفة / الدخل | المساهمة | التبرير |
|---------------------|----------|---------|
| موظف حكومي | +30 | استقرار وظيفي عالي |
| دخل > 3000 جنيه | +30 | قدرة مالية جيدة |
| دخل 2000-3000 جنيه | +21 | قدرة متوسطة |
| دخل < 2000 جنيه | +9 | قدرة محدودة |

#### **د. وزن السكن والاستعلام (Residence Weight) - 20%**

```javascript
// من XCore.js سطر 163-173
if (customerData.residence_type === 'OWNED') {
    residenceContribution = weights.residence;  // 20 نقطة
} else if (residence_type === 'RENTED' && survey_status === 'verified') {
    residenceContribution = weights.residence * 0.8;  // 16 نقطة
} else {
    residenceContribution = weights.residence * 0.4;  // 8 نقاط
}
```

**التفسير:**

| حالة السكن | الاستعلام الميداني | النقاط | الدلالة |
|-----------|-------------------|--------|---------|
| مملوك | غير مطلوب | +20 | استقرار دائم |
| مستأجر | ✅ مُتحقق | +16 | عنوان ثابت مؤكد |
| مستأجر | ❌ غير مُحقق | +8 | عنوان غير مؤكد |
| مؤقت / مع الأهل | - | +8 | استقرار منخفض |

#### **هـ. وزن الهوية (Identity Weight) - 10%**

```javascript
// من XCore.js سطر 175-183
if (customerData.national_id && customerData.national_id.length === 14) {
    identityContribution = weights.identity;  // 10 نقاط
} else {
    identityContribution = 0;
}
```

**الشرط:** الرقم القومي يجب أن يكون 14 رقم صحيح (حسب المعيار المصري).

### 2.3 قرار القبول النهائي

```javascript
// من XCore.js سطر 186-194
const finalScore = Math.min(Math.round(score), 100);
const approved = finalScore >= conf.minScoreToEntry;  // الافتراضي: 50%
```

**عتبات القرار:**

| النتيجة النهائية | القرار | الإجراء |
|-----------------|--------|---------|
| **≥ 80%** | ✅ ممتاز | موافقة فورية، شروط مميزة |
| **60-79%** | ✅ جيد | موافقة قياسية |
| **50-59%** | ⚠️ مقبول | موافقة بشروط إضافية |
| **< 50%** | ❌ مرفوض | رفض أو طلب ضامن إضافي |

---

## 3. فحص أهلية الضامن (Guarantor Eligibility)

### 3.1 بروتوكول التحقق الرباعي

```javascript
// من XCore.js سطر 215-261
checkGuarantorEligibility: async function(nationalId) {
    // 1. التحقق من صحة الرقم القومي
    if (!/^\d{14}$/.test(nationalId)) {
        return { eligible: false, msg: 'الرقم القومي غير صحيح.' };
    }
    
    // 2. فحص الحظر القانوني
    if (person?.legal_ban_until && new Date(person.legal_ban_until) > new Date()) {
        return { eligible: false, msg: '🚫 محظور من التعامل' };
    }
    
    // 3. فحص السكور الائتماني
    if (person && person.credit_score < minGuarantorScore) {
        return { eligible: false, msg: '🚫 تقييم الضامن ضعيف' };
    }
    
    // 4. فحص وحدانية الدور
    const isCurrentlyGuarantor = activeInvoices.some(inv =>
        inv.guarantors?.some(g => g.national_id === nationalId)
    );
    if (isCurrentlyGuarantor) {
        return { eligible: false, msg: '🚫 ضامن بالفعل في فاتورة أخرى' };
    }
    
    return { eligible: true, msg: '✅ ضامن مستوفي الشروط' };
}
```

### 3.2 قاعدة "الضامن الوحيد" (Single Guarantor Rule)

**الفلسفة:** لا يجوز للشخص أن يكون ضامناً لأكثر من عقد نشط في نفس الوقت.

**الاستثناءات المسموحة:**
- ✅ يمكن أن يكون **مشتري وضامن** في نفس الوقت
- ✅ يمكن أن يكون ضامن لعقد ثم يتحرر بعد سداده
- ❌ لا يمكن أن يكون ضامن لعقدين متزامنين

**التنفيذ التقني:**
```javascript
const activeInvoices = allInvoices.filter(inv => inv.status === 'active');
const isCurrentlyGuarantor = activeInvoices.some(inv =>
    inv.guarantors?.some(g => g.national_id === nationalId)
);
```

---

## 4. قرار تعدد الفواتير والسقف المالي

### 4.1 دالة `canOpenMultiInvoice`

```javascript
// من XCore.js سطر 276-312
canOpenMultiInvoice: function(creditScore, monthlyIncome, currentDebt, totalPaid, newInvoiceTotal)
```

### 4.2 معايير القبول الخمسة

#### **المعيار 1: الحد الأدنى للسكور**
```javascript
if (creditScore < minScore) {
    return { can: false, msg: 'السكور أقل من الحد الأدنى' };
}
```

#### **المعيار 2: حساب الدخل المعتمد**
```javascript
const incomeToUse = (monthlyIncome > 0) ? monthlyIncome : 
                    (totalPaid > 0 ? totalPaid / 2 : 1000);
```

**المنطق:**
- إذا كان الدخل معلوم → استخدمه
- إذا كان مجهول但有سداد سابق → استخدم نصف ما تم سداده كمؤشر
- إذا لم يوجد أي بيانات → استخدم 1000 جنيه كحد أدنى افتراضي

#### **المعيار 3: حساب السقف الائتماني**
```javascript
const multiplier = conf.creditLimitMultiplier || 5;
const maxCreditLimit = (incomeToUse * multiplier) * (creditScore / 100);
```

**مثال عملي:**
```
الدخل الشهري: 3000 جنيه
السكور الائتماني: 70%
معامل الضرب: 5

السقف الائتماني = (3000 × 5) × (70/100) = 15000 × 0.7 = 10,500 جنيه
```

#### **المعيار 4: اختبار السقف**
```javascript
if ((currentDebt + newInvoiceTotal) > maxCreditLimit) {
    return { can: false, msg: 'إجمالي المديونية سيتخطى السقف الآمن' };
}
```

**مثال:**
```
المديونية الحالية: 4000 جنيه
الفاتورة الجديدة: 8000 جنيه
السقف الائتماني: 10,500 جنيه

الإجمالي = 4000 + 8000 = 12,000 > 10,500 ❌ مرفوض
```

#### **المعيار 5: الالتزام السابق**
```javascript
const requiredRatio = conf.requiredPaymentRatioForNewInvoice || 0.3;  // 30%
if (currentDebt > 0 && totalPaid < (currentDebt * requiredRatio)) {
    return { can: false, msg: 'يجب سداد 30% على الأقل من المديونية الحالية' };
}
```

**الفلسفة:** إثبات الجدارة قبل الحصول على ائتمان جديد.

**مثال:**
```
المديونية الحالية: 6000 جنيه
ما تم سداده: 1000 جنيه
النسبة المطلوبة: 30%

المطلوب سداده = 6000 × 0.30 = 1800 جنيه
تم سداده فعلياً = 1000 جنيه ❌ غير كافٍ

الإجراء: انتظر حتى يسدد 1800 جنيه على الأقل
```

---

## 5. حاسبة شروط البيع (Sale Terms Calculator)

### 5.1 الدالة الرئيسية

```javascript
// من XCore.js سطر 326
calculateSaleTerms: function(totalAmount, instType, desiredInstValue, purchaseDay)
```

### 5.2 المدخلات

| المعلمة | النوع | الوصف | مثال |
|---------|------|-------|------|
| `totalAmount` | Number | قيمة الفاتورة الكلية | 5000 جنيه |
| `instType` | String | نوع التقسيط | `'monthly'` أو `'daily'` |
| `desiredInstValue` | Number | القسط الذي يقدر عليه العميل | 500 جنيه/شهر |
| `purchaseDay` | Number | يوم الشراء (1-31) | 15 |

### 5.3 القيود الدنيا

```javascript
// من XCore.js سطر 65
minInstallment: { 
    daily: 50,    // 50 جنيه يومياً كحد أدنى
    monthly: 500  // 500 جنيه شهرياً كحد أدنى
}
```

### 5.4 مستويات المدة والوثائق

```javascript
// من XCore.js سطر 61-64
durationTiers: [
    { maxAmount: 100000, maxMonths: 10, docs: "RECEIPTS" },      // إيصالات فقط
    { maxAmount: 1000000, maxMonths: 15, docs: "CHECKS" }        // شيكات مطلوبة
]
```

**التطبيق:**

| قيمة الفاتورة | المدة القصوى | الوثائق المطلوبة |
|--------------|-------------|------------------|
| ≤ 100,000 جنيه | 10 أشهر | إيصالات أمانة |
| ≤ 1,000,000 جنيه | 15 شهر | شيكات بنكية |
| > 1,000,000 جنيه | غير متاح | يتطلب مراجعة إدارة |

### 5.5 حساب المقدم (Down Payment Logic)

```javascript
// من XConfig.js
downPaymentLogic: { 
    monthly: 'ONE_MONTH_PREPAID',   // مقدم = قسط شهر واحد
    daily: 'DAYS_OF_MONTH'          // مقدم = عدد أيام الشهر × القسط اليومي
}
```

**الصيغ:**

#### **للتقسيط الشهري:**
```
المقدم = desiredInstValue (قسط شهر واحد مقدماً)
المبلغ المقسط = totalAmount - downPayment
عدد الأشهر = ROUND(mبلغ المقسط / desiredInstValue)
```

**مثال:**
```
قيمة الفاتورة: 5000 جنيه
القسط الشهري المطلوب: 500 جنيه

المقدم = 500 جنيه
المبلغ المقسط = 5000 - 500 = 4500 جنيه
عدد الأشهر = 4500 / 500 = 9 أشهر
```

#### **للتقسيط اليومي:**
```
أيام الشهر = 30 (ثابت)
المقدم = purchaseDay × desiredInstValue
المبلغ المقسط = totalAmount - downPayment
عدد الأيام = CEILING(mبلغ المقسط / desiredInstValue)
```

**مثال:**
```
قيمة الفاتورة: 3000 جنيه
القسط اليومي المطلوب: 50 جنيه
يوم الشراء: 15

المقدم = 15 × 50 = 750 جنيه
المبلغ المقسط = 3000 - 750 = 2250 جنيه
عدد الأيام = 2250 / 50 = 45 يوم
```

---

## 6. مراقبة الوضع القانوني (Legal Status Monitor)

### 6.1 عتبات التصعيد القانوني

```javascript
// من XConfig.js سطر 68-71
legalPolicy: {
    thresholds: { 
        daily: 35,    // 35 يوم تأخير للفواتير اليومية
        monthly: 63   // 63 يوم تأخير للفواتير الشهرية
    },
    stopDelayCounterAtLimit: true  // إيقاف العداد عند الحد
}
```

### 6.2 دالة المراقبة

```javascript
// من XCore.js سطر 439
monitorLegalStatus: function(installments, type, creditLimit = Infinity)
```

### 6.3 بروتوكول التصعيد التدريجي

| مرحلة التأخير | الإجراء | التواصل |
|--------------|---------|---------|
| **1-7 أيام** | تنبيه SMS | رسالة ودية |
| **8-15 يوم** | اتصال هاتفي | تذكير بالالتزام |
| **16-30 يوم** | إنذار رسمي | خطاب مسجل |
| **31+ يوم** | إحالة قانونية | بدء الإجراءات |

### 6.4 قاعدة "إيقاف العداد"

```javascript
if (stopDelayCounterAtLimit && lateDays >= threshold) {
    lateDays = threshold;  // تجميد عند الحد الأقصى
}
```

**الفلسفة:** عدم تراكم التأخير إلى ما لا نهاية، وإعطاء فرصة للعميل لإعادة التفاوض.

---

## 7. قواعد قبول الضامنين المتقدمة

### 7.1 قاعدة "الحد الأدنى المشترك"

```javascript
// من XCore.js سطر 112-119
if (guarantors.length < gRules.minGuarantors) {
    return {
        approved: false,
        msg: `❌ يفتقر للحد الأدنى من الضامنين (${gRules.minGuarantors})`
    };
}
```

**التطبيق:** حتى لو كان سكور العميل 100%، لا يُقبل بدون الحد الأدنى من الضامنين.

### 7.2 قاعدة "متوسط القوة"**

```javascript
// من XCore.js سطر 140
const avgGScore = guarantors.reduce((sum, g) => 
    sum + (Number(g.credit_score) || 50), 0
) / guarantors.length;
```

**السيناريوهات:**

| الضامن 1 | الضامن 2 | الضامن 3 | المتوسط | القرار |
|---------|---------|---------|---------|--------|
| 80% | 70% | - | 75% | ✅ مقبول |
| 40% | 90% | - | 65% | ⚠️ الضامن الأول مرفوض |
| 30% | 30% | - | 30% | ❌ مرفوض (كلاهما < 50%) |

### 7.3 عقوبة نقص العدد

```javascript
const ratio = Math.min(guarantors.length / gRules.maxGuarantors, 1);
guarantorContribution *= ratio;
```

**التأثير:**

| عدد الضامنين | النسبة | المساهمة القصوى (من 40) |
|-------------|--------|------------------------|
| 1 من 3 | 33% | 13.3 نقطة |
| 2 من 3 | 67% | 26.8 نقطة |
| 3 من 3 | 100% | 40 نقطة كاملة |

**الحكمة:** تشجيع العملاء على جلب أكبر عدد من الضامنين المؤهلين.

---

## 8. حالات خاصة واستثناءات

### 8.1 العميل ذو التاريخ الذهبي

```javascript
// عميل لديه سجل سداد مثالي (> 95%)
if (customer.paymentHistory && customer.paymentHistory.successRate > 0.95) {
    // يمكن تخطي بعض الشروط
    minGuarantors = 0;  // إعفاء من الضامنين
    minScoreToEntry = 40;  // خفض الحد الأدنى
}
```

### 8.2 الموظف الحكومي

```javascript
// موظف حكومي يعتبر ضماناً في حد ذاته
if (job_type === 'GOV_EMPLOYEE') {
    incomeContribution = weights.income;  // 30 نقطة كاملة
    // يمكن الاكتفاء بضامن واحد بدلاً من 2
}
```

### 8.3 العميل الموسمي

```javascript
// عميل بموسمية دخل (مثل المزارعين)
if (customer.seasonalIncome) {
    // استخدام متوسط 6 أشهر بدلاً من الشهر الحالي
    incomeToUse = calculateSixMonthAverage(customer.incomes);
}
```

---

## 9. أمثلة عملية شاملة

### 9.1 مثال 1: عميل مثالي

```javascript
const customer = {
    job_type: 'GOV_EMPLOYEE',
    monthly_income: 4000,
    residence_type: 'OWNED',
    national_id: '29001010101010',  // 14 رقم
    guarantors: [
        { credit_score: 85 },
        { credit_score: 75 }
    ]
};

// الحساب:
// Base: 0
// Guarantors: ((85+75)/2) × 40% × (2/3) = 80 × 0.4 × 0.67 = 21.4
// Income: 30 (موظف حكومي)
// Residence: 20 (مملوك)
// Identity: 10 (رقم قومي صحيح)
// Total: 0 + 21.4 + 30 + 20 + 10 = 81.4 → 81%

// القرار: ✅ موافق (81% ≥ 50%)
```

### 9.2 مثال 2: عميل بحاجة لتحسين

```javascript
const customer = {
    job_type: 'PRIVATE',
    monthly_income: 1500,
    residence_type: 'RENTED',
    survey_status: 'pending',  // لم يُتحقق
    national_id: '2900101010101',  // 13 رقم فقط!
    guarantors: [
        { credit_score: 45 }  // ضعيف
    ]
};

// الحساب:
// Base: 0
// Guarantors: مرفوض (الضامن < 50%)
// القرار: ❌ مرفوف فوراً
```

### 9.3 مثال 3: عميل بتعدد فواتير

```javascript
// العميل الحالي:
creditScore: 65,
monthlyIncome: 3000,
currentDebt: 5000,
totalPaid: 2000,

// الفاتورة الجديدة:
newInvoiceTotal: 4000,

// التحقق:
// 1. السكور: 65% ≥ 50% ✅
// 2. السقف: (3000 × 5) × 0.65 = 9750 جنيه
// 3. الاختبار: 5000 + 4000 = 9000 ≤ 9750 ✅
// 4. الالتزام: 2000 / 5000 = 40% ≥ 30% ✅

// القرار: ✅ موافق
```

---

## 10. مصفوفة القرارات السريعة

| الحالة | السكور | الضامنين | الدخل | السكن | القرار |
|--------|--------|----------|-------|--------|--------|
| **A** | 85% | 2 (80%, 75%) | 5000 | مملوك | ✅ فوري |
| **B** | 55% | 1 (50%) | 2000 | مستأجر مُحقق | ✅ بشروط |
| **C** | 45% | 1 (60%) | 1500 | مستأجر غير مُحقق | ❌ رفض |
| **D** | 70% | 0 | 4000 | مملوك | ❌ نقص ضامنين |
| **E** | 60% | 1 (40%) | 3000 | مملوك | ❌ ضامن ضعيف |

---

## 11. التكامل مع módulos الأخرى

### 11.1 مع CRM (`crm.js`)

```javascript
// CRM يجمع البيانات
const customerData = collectCustomerForm();

// XCore يقيم
const assessment = XCore.evaluateCustomer(customerData);

// CRM يعرض النتيجة
if (assessment.approved) {
    showApprovalForm(assessment.finalScore);
} else {
    showRejectionReason(assessment.msg);
}
```

### 11.2 مع التحصيل (`collection.js`)

```javascript
// قبل إضافة قسط جديد
const multiCheck = XCore.canOpenMultiInvoice(
    customer.credit_score,
    customer.monthly_income,
    customer.current_debt,
    customer.total_paid,
    newInvoiceTotal
);

if (!multiCheck.can) {
    alert(multiCheck.msg);
    return;
}
```

### 11.3 مع Legal (`legal.js`)

```javascript
// مراقبة التأخير
const legalStatus = XCore.monitorLegalStatus(
    installments,
    contract.type,
    customer.credit_limit
);

if (legalStatus.shouldEscalate) {
    LegalModule.initiateAction(customer.id, legalStatus.reason);
}
```

---

## 12. قاموس المصطلحات الائتمانية

| المصطلح | التعريف |
|---------|---------|
| **X-Score** | السكور الائتماني الداخلي (0-100%) |
| **Credit Limit** | السقف الائتماني máximo للعميل |
| **Guarantor Ratio** | نسبة قوة الضامنين |
| **Payment Ratio** | نسبة ما تم سداده من الدين |
| **Legal Threshold** | عدد أيام التأخير قبل الإجراء القانوني |
| **Down Payment** | المقدم المطلوب قبل التقسيط |
| **Active Invoice** | فاتورة لم تُسدَد بالكامل بعد |

---

## 13. المراجع الداخلية

- `ecofine/XCore.js` - المحرك الرئيسي لمنطق الأعمال
- `ecofine/XConfig.js` - ملف تكوين القواعد والسياسات
- `ecofine/XScoreEngine.js` - محرك التقييم المتقدم
- `ecofine/crm.js` - واجهة جمع بيانات العملاء
- `ecofine/collection.js` - نظام التحصيل والمتابعة

---

## 14. سجل التعديلات

| الإصدار | التاريخ | التعديلات |
|---------|---------|-----------|
| 1.0 | 2024 | التوثيق الأولي لـ V14.1 |
| 0.9 | 2024 | مراجعة معادلات السكور |

---

**تم التوثيق بواسطة:** Chief Documentation Officer  
**المراجعة الفنية:** Lead Developer ✅  
**حالة الاعتماد:** معتمد للاستخدام الداخلي  

---

**Techno Vision Solutions © 2024**  
*الائتمان المبني على الثقة والبيانات*
