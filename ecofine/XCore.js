/**
 * 🧠 X-CORE Engine V8.0 - الإصدار التجاري العالمي
 * المحرك مرتبط كلياً بملف XConfig لضمان قابلية التخصيص لكل مؤسسة.
 */

const XCore = {
    // ==========================================
    // 1. محرك التقييم الائتماني (Scoring)
    // ==========================================
    evaluateCustomer: async (customerData) => {
        const conf = window.XConfig.creditPolicy;
        let score = conf.startingScore;
        let messages = [`نقطة البداية: ${score}%`];

        const guarantors = customerData.guarantors || [];
        const gRules = window.XConfig.guarantorRules;

        // فحص الحد الأدنى للضامنين
        if (guarantors.length < gRules.minGuarantors) {
            return { approved: false, score: 0, msg: `❌ الحد الأدنى ${gRules.minGuarantors} ضامن.` };
        }
        
        // فحص أهلية الضامنين بناءً على إعدادات العميل
        for(let g of guarantors) {
            if(g.credit_score < gRules.minGuarantorScore) {
                 return { approved: false, score: 0, msg: `❌ الضامن ${g.full_name} تقييمه أقل من ${gRules.minGuarantorScore}%.` };
            }
        }

        // حساب الأوزان النسبية من الإعدادات
        score += (guarantors.length * (conf.weights.guarantors / gRules.maxGuarantors));
        
        if (customerData.income_verified) score += conf.weights.income;
        if (customerData.survey_status === 'verified') score += conf.weights.residence;

        const finalScore = Math.min(score, 100);
        const approved = finalScore >= conf.minScoreToEntry;

        return {
            approved,
            finalScore,
            msg: approved ? "✅ مؤهل للتقسيط" : `❌ التقييم تحت ${conf.minScoreToEntry}%`,
            breakdown: messages
        };
    },

    // ==========================================
    // 2. محرك تعدد الفواتير والسقف الائتماني
    // ==========================================
    canOpenNewInvoice: async (customerId, newInvoiceAmount) => {
        const conf = window.XConfig;
        const customer = await db.getById('customers', customerId);
        const journey = await db.getCustomerJourney(customerId);
        
        // فحص الحظر القانوني
        if (customer.ban_until && new Date(customer.ban_until) > new Date()) {
            return { can: false, msg: `🚫 محظور حتى ${customer.ban_until}` };
        }

        // شرط سداد نسبة معينة (افتراضياً 50% أو حسب ما نحدده مستقبلاً)
        const hasPaidHalf = journey.total_debt === 0 || (journey.total_paid >= (0.5 * journey.total_debt));
        if (!hasPaidHalf) {
            return { can: false, msg: "⚠️ يجب سداد 50% من المديونية الحالية." };
        }

        // سقف الائتمان بناءً على Multiplier من الإعدادات
        const creditLimit = customer.monthly_income * (customer.credit_score / 100) * conf.creditPolicy.creditLimitMultiplier;
        const currentLiability = journey.remaining;

        if ((currentLiability + newInvoiceAmount) > creditLimit) {
            return { can: false, msg: `⚠️ تخطى سقف الائتمان المسموح (${creditLimit.toLocaleString()} ${conf.identity.currency}).` };
        }

        return { can: true, msg: "✅ مؤهل للفاتورة." };
    },

    // ==========================================
    // 3. محرك أهلية الضامن (Iron Guarantor)
    // ==========================================
    checkGuarantorEligibility: async (nationalId) => {
        const gRules = window.XConfig.guarantorRules;
        const person = await db.getByIndex('customers', 'national_id', nationalId);
        
        if (!person) return { eligible: true, msg: "✅ ضامن جديد." };

        if (person.credit_score < gRules.minGuarantorScore) {
            return { eligible: false, msg: `❌ تقييم الضامن أقل من ${gRules.minGuarantorScore}%.` };
        }

        if (gRules.requireOneActiveOnly) {
            const allActiveInvoices = await db.getAll('invoices');
            const isAlreadyGuarantor = allActiveInvoices.some(inv => 
                inv.status === 'active' && inv.guarantors?.some(g => g.national_id === nationalId)
            );
            if (isAlreadyGuarantor) return { eligible: false, msg: "❌ ضامن بالفعل في فاتورة مفتوحة." };
        }

        return { eligible: true, msg: "✅ الضامن مؤهل." };
    },

    // ==========================================
    // 4. الحسابات والرقابة القانونية (Advanced Logic)
    // ==========================================
    calculateFinancing: (totalAmount, saleType, dailyAmount, monthlyAmount) => {
        const terms = window.XConfig.salesTerms;
        const purchaseDay = new Date().getDate();
        let downPayment = 0;

        if (saleType === 'daily') {
            downPayment = terms.downPaymentLogic.daily === "DAYS_OF_MONTH" ? (dailyAmount * purchaseDay) : dailyAmount;
        } else {
            downPayment = monthlyAmount;
        }

        // البحث في مصفوفة المدد (Tiers) من الإعدادات
        const tier = terms.durationTiers.find(t => totalAmount <= t.maxAmount) || terms.durationTiers[terms.durationTiers.length - 1];

        return {
            isEligible: totalAmount >= terms.minInvoiceAmount,
            downPayment,
            maxMonths: tier.maxMonths,
            docsNeeded: tier.docs
        };
    },

    monitorLegalStatus: (installments, type, creditLimit) => {
        const legal = window.XConfig.legalPolicy;
        const today = new Date();
        const pending = installments.filter(i => i.status === 'pending');
        
        if (pending.length === 0) return { status: 'SAFE' };

        const oldestInst = pending.sort((a,b) => new Date(a.due_date) - new Date(b.due_date))[0];
        const delayDays = Math.floor((today - new Date(oldestInst.due_date)) / (1000 * 60 * 60 * 24));

        if (delayDays <= 0) return { status: 'SAFE', days: 0 };

        if (legal.stopDelayCounterAtLimit) {
            const totalOwed = pending.reduce((sum, inst) => sum + Number(inst.amount), 0);
            if (totalOwed >= creditLimit) return { status: 'CAPPED', days: delayDays };
        }

        const threshold = type === 'daily' ? legal.thresholds.daily : legal.thresholds.monthly;
        if (delayDays >= threshold) return { status: 'LEGAL', days: delayDays };

        return { status: 'OVERDUE', days: delayDays };
    }
};

window.XCore = XCore;
