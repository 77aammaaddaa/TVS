/**
 * 🎛️ X-CONFIG Manager - لوحة تحكم النظام السيادية (Enterprise V11.5)
 * النظام: Eco Fine Pro | تطوير: Techno Vision Solutions (Mr. X)
 * الوظيفة: إعدادات النظام، قواعد الائتمان، وروابط "الماستر" المركزية.
 */

const XConfig = {
    // ==========================================
    // 1. الهوية التجارية (Branding & Localization)
    // ==========================================
    identity: {
        storeName: "Eco Fine Pro - Enterprise", 
        currency: "ج.م",
        language: "ar-EG",
        themeColor: "#0f172a", 
        logoUrl: "./assets/logo.png"
    },

    // ==========================================
    // 2. أوضاع التشغيل (Operating Modes)
    // ==========================================
    modes: {
        financingType: "SHARIA", // الخيارات: [SHARIA, CONVENTIONAL, LEASING]
        businessModel: "RETAIL_INSTALLMENTS", 
        calculationMethod: "DAYS_ACCUMULATION", 
    },

    // ==========================================
    // 3. سياسة الائتمان والتقييم (Credit Scoring)
    // ==========================================
    creditPolicy: {
        minScoreToEntry: 50, 
        startingScore: 0,   
        creditLimitMultiplier: 5, 
        weights: {
            identity: 10,    
            income: 30,      
            guarantors: 40,  
            residence: 20    
        }
    },

    // ==========================================
    // 4. قوانين الضامنين (Guarantor Rules)
    // ==========================================
    guarantorRules: {
        minGuarantors: 1,
        maxGuarantors: 3,
        allowGuarantorAsBuyer: true, 
        minGuarantorScore: 50,       
        requireOneActiveOnly: true,  
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
        durationTiers: [
            { maxAmount: 100000, maxMonths: 10, docs: "RECEIPTS" },
            { maxAmount: 1000000, maxMonths: 15, docs: "CHECKS" }
        ],
        dailyLimit: { min: 50, max: 1000 },
        monthlyLimit: { min: 500, max: 50000 },
        downPaymentLogic: {
            daily: "DAYS_OF_MONTH", 
            monthly: "ONE_MONTH_PREPAID" 
        }
    },

    // ==========================================
    // 6. الرقابة القانونية (Legal & Collection)
    // ==========================================
    legalPolicy: {
        thresholds: { daily: 35, monthly: 63 },
        warningInterval: 10, 
        banPeriodDays: 180,  
        maxCasesPerPerson: 6,
        stopDelayCounterAtLimit: true 
    },

    // ==========================================
    // 7. محرك المزايا (Feature Toggles)
    // ==========================================
    features: {
        whatsappNotifications: true,
        pdfContractGeneration: true,
        fieldSurveyModule: true,
        inventoryManagement: true,
        reScheduling: true, 
        rescheduleLimitYears: 1 
    },

    // ==========================================
    // 8. مفاتيح السحابة المركزية (Master Cloud Keys) ☁️
    // يستخدمها ملف activation.js فقط للتحقق من الرخص
    // ==========================================
    masterCloud: {
        url: "https://pyrcpouvcvjkgpjyuafz.supabase.co",
        key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk"
    }
}; 

// تثبيت الإعدادات في النطاق العام للوصول إليها من كل الموديولات
window.XConfig = XConfig;
