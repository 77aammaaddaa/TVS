/**
 * 🎛️ X-CONFIG Manager - لوحة تحكم النظام السيادية
 * النظام: Eco Fine Pro V6 | تطوير: M H 4 Tech
 * هذا الملف هو "الريموت كنترول" لكل مؤسسة تستخدم نظام Eco Fine Pro.
 * تم تصميمه ليكون تراكمياً (Cumulative) بحيث تؤثر الإعدادات على بعضها البعض.
 */

const XConfig = {
    // ==========================================
    // 1. الهوية التجارية (Branding & Localization)
    // ==========================================
    identity: {
        storeName: "Eco Fine Pro - النسخة التجارية", // يتغير حسب اسم مؤسسة العميل
        currency: "ج.م", // أو ر.س، د.إ
        language: "ar-EG",
        themeColor: "#0f172a", // اللون الأساسي للبراند (Slate 900)
        logoUrl: "./assets/logo.png"
    },

    // ==========================================
    // 2. أوضاع التشغيل (Operating Modes)
    // ==========================================
    modes: {
        financingType: "SHARIA", // الخيارات: [SHARIA, CONVENTIONAL, LEASING]
        businessModel: "RETAIL_INSTALLMENTS", // الخيارات: [RETAIL, SERVICES, WHOLESALE]
        calculationMethod: "DAYS_ACCUMULATION", // حساب التأخير بالأيام وليس الفوائد
    },

    // ==========================================
    // 3. سياسة الائتمان والتقييم (Credit & Scoring Policy)
    // ==========================================
    creditPolicy: {
        minScoreToEntry: 50, // الحد الأدنى عشان السيستم يقبل يفتح ملف
        startingScore: 0,   // نقطة البداية للعميل الجديد
        creditLimitMultiplier: 5, // (الدخل * السكور * هذا الرقم) = سقف الائتمان
        
        // الأوزان النسبية للتقييم (يجب أن يكون المجموع 100)
        weights: {
            identity: 10,    // صحة البيانات والبطاقة
            income: 30,      // قوة الدخل والتوثيق
            guarantors: 40,  // عدد وقوة الضامنين
            residence: 20    // نوع السكن والتحقق الميداني
        }
    },

    // ==========================================
    // 4. قوانين الضامنين (Guarantor Rules)
    // ==========================================
    guarantorRules: {
        minGuarantors: 1,
        maxGuarantors: 3,
        allowGuarantorAsBuyer: true, // هل ينفع الضامن يشتري هو كمان؟
        minGuarantorScore: 50,       // الضامن اللي تحت 50 مرفوض إجبارياً
        requireOneActiveOnly: true,  // الضامن يضمن عملية واحدة فقط في المرة
        
        // المنطق التراكمي (Interdependent Rules)
        dependency: {
            "GOV_EMPLOYEE": { requiredGuarantors: 2, needsVerification: true },
            "PRIVATE_SECTOR": { requiredGuarantors: 3, needsVerification: true },
            "VIP_CLIENT": { requiredGuarantors: 0, needsVerification: false }
        }
    },

    // ==========================================
    // 5. شروط البيع والمدد (Sales & Terms)
    // ==========================================
    salesTerms: {
        minInvoiceAmount: 2500,
        
        // حدود المدد بناءً على قيمة الفاتورة
        durationTiers: [
            { maxAmount: 100000, maxMonths: 10, docs: "RECEIPTS" },
            { maxAmount: 1000000, maxMonths: 15, docs: "CHECKS" }
        ],

        // حدود الأقساط
        dailyLimit: { min: 50, max: 1000 },
        monthlyLimit: { min: 500, max: 50000 },
        
        // منطق التقديمة (Down Payment)
        downPaymentLogic: {
            daily: "DAYS_OF_MONTH", // يحسب عدد الأيام المنقضية
            monthly: "ONE_MONTH_PREPAID" // يدفع شهر مقدم
        }
    },

    // ==========================================
    // 6. الرقابة القانونية (Legal & Collection)
    // ==========================================
    legalPolicy: {
        // فترات التحول التلقائي للمتعثرين
        thresholds: {
            daily: 35,   // يوم تأخير
            monthly: 63  // يوم تأخير
        },
        
        warningInterval: 10, // إرسال تحذير كل 10 أيام تأخير
        banPeriodDays: 180,  // فترة الحظر (6 شهور) بعد القضايا
        maxCasesPerPerson: 6,
        
        // خيار "تجميد العداد"
        stopDelayCounterAtLimit: true // يتوقف العداد لو المديونية وصلت للسقف
    },

    // ==========================================
    // 7. محرك المزايا (Feature Toggles)
    // ==========================================
    features: {
        whatsappNotifications: true,
        pdfContractGeneration: true,
        fieldSurveyModule: true,
        inventoryManagement: true,
        reScheduling: true, // تفعيل إعادة الجدولة
        rescheduleLimitYears: 1 // مرة كل سنة
    },

    // ==========================================
    // 8. إعدادات السحابة والمزامنة (Cloud Sync) - 🟢 جديد
    // ==========================================
    cloud: {
        url: "https://pyrcpouvcvjkgpjyuafz.supabase.co", // رابط مشروعك على Supabase
        key: "YOUR_ANON_PUBLIC_KEY" // 👈 استبدل هذا بالمفتاح الحقيقي (Anon Public Key) الخاص بمشروعك
    }
};

// تثبيت الإعدادات في النطاق العام للوصول إليها من كل الموديولات
window.XConfig = XConfig;
