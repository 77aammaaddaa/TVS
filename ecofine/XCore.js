/**
 * 🧠 X-CORE Engine V7.5 - إكس القابضة
 * المحرك المركزي لاتخاذ القرار - "عقل النظام"
 * تم البرمجة بناءً على دستور مستر إكس للتقسيط الشرعي وإدارة المخاطر.
 */

const XCore = {
    // ==========================================
    // 1. محرك التقييم الائتماني (Score & Eligibility)
    // ==========================================
    evaluateCustomer: async (customerData) => {
        let score = 0; // العميل يبدأ من 0% (يجب أن يحقق 50% للتأهل)
        let messages = [];

        // أ) قوة الضامنين (الحد الأدنى 1 والحد الأقصى 3)
        const guarantors = customerData.guarantors || [];
        if (guarantors.length < 1) {
            return { approved: false, score: 0, msg: "❌ غير مؤهل: يجب وجود ضامن واحد على الأقل." };
        }
        
        // فحص أهلية كل ضامن (سكور الضامن يجب أن يكون >= 50)
        for(let g of guarantors) {
            if(g.credit_score < 50) {
                 return { approved: false, score: 0, msg: `❌ مرفوض: الضامن ${g.full_name} تقييمه أقل من 50%.` };
            }
        }

        score += (guarantors.length * 15); // كل ضامن مؤهل يرفع السكور بـ 15%
        messages.push(`الضامنين (${guarantors.length}): +${guarantors.length * 15}%`);

        // ب) توثيق الدخل (حكومي/بنكي)
        if (customerData.income_verified) {
            score += 20;
            messages.push("توثيق الدخل (حكومي/رسمي): +20%");
        }

        // ج) الموقع الجغرافي والسمعة (الاستعلام الميداني)
        if (customerData.survey_status === 'verified') {
            score += 15;
            messages.push("تحقق العنوان والسمعة ميدانياً: +15%");
        }

        // د) سجل الالتزام (خصم النقاط)
        if (customerData.past_delays > 10) {
            score -= 10;
            messages.push("سجل تأخير سابق (أكثر من 10 أيام): -10%");
        }

        const finalScore = Math.min(score, 100);
        const approved = finalScore >= 50;

        return {
            approved,
            finalScore,
            msg: approved ? "✅ العميل مؤهل لنظام التقسيط" : "❌ العميل غير مؤهل (التقييم تحت 50%)",
            breakdown: messages
        };
    },

    // ==========================================
    // 2. محرك تعدد الفواتير والسقف الائتماني
    // ==========================================
    canOpenNewInvoice: async (customerId, newInvoiceAmount) => {
        const customer = await db.getById('customers', customerId);
        const journey = await db.getCustomerJourney(customerId);
        
        // أ) فحص فترة الحظر (6 شهور بعد القضايا)
        if (customer.ban_until && new Date(customer.ban_until) > new Date()) {
            return { can: false, msg: `🚫 محظور من التعامل حتى ${customer.ban_until}` };
        }

        // ب) شرط سداد 50% من المديونية الحالية
        const hasPaidHalf = journey.total_debt === 0 || (journey.total_paid >= (0.5 * journey.total_debt));
        if (!hasPaidHalf) {
            return { can: false, msg: "⚠️ يجب سداد 50% على الأقل من مديونيتك الحالية لفتح فاتورة جديدة." };
        }

        // ج) حساب سقف الائتمان بناءً على التقييم
        // المعادلة: (الدخل) * (السكور كنسبة) * (معامل 5)
        const creditLimit = customer.monthly_income * (customer.credit_score / 100) * 5;
        const currentLiability = journey.remaining;

        if ((currentLiability + newInvoiceAmount) > creditLimit) {
            return { can: false, msg: `⚠️ الفاتورة تتخطى سقف ائتمانك (${creditLimit.toLocaleString()} ج).` };
        }

        return { can: true, msg: "✅ العميل مؤهل لفتح الفاتورة." };
    },

    // ==========================================
    // 3. محرك أهلية الضامن (The Iron Guarantor)
    // ==========================================
    checkGuarantorEligibility: async (nationalId) => {
        const person = await db.getByIndex('customers', 'national_id', nationalId);
        
        // 1. لو الشخص غير مسجل إطلاقاً (أول مرة يدخل السيستم)
        if (!person) return { eligible: true, msg: "✅ ضامن جديد (تحت الاستعلام)." };

        // 2. فحص السكور (يجب أن يكون >= 50)
        if (person.credit_score < 50) {
            return { eligible: false, msg: "❌ مرفوض: تقييم الضامن أقل من 50%." };
        }

        // 3. فحص "وحدانية الضمانة" (ضامن لفاتورة واحدة فقط في المرة)
        const allActiveInvoices = await db.getAll('invoices');
        const isAlreadyGuarantor = allActiveInvoices.some(inv => 
            inv.status === 'active' && 
            inv.guarantors?.some(g => g.national_id === nationalId)
        );

        if (isAlreadyGuarantor) {
            return { eligible: false, msg: "❌ مرفوض: الشخص ضامن بالفعل في فاتورة أخرى مفتوحة." };
        }

        return { eligible: true, msg: "✅ الضامن مؤهل." };
    },

    // ==========================================
    // 4. محرك الحسابات المالية (Down Payment & Limits)
    // ==========================================
    calculateFinancing: (totalAmount, saleType, dailyAmount, monthlyAmount) => {
        const purchaseDay = new Date().getDate();
        let downPayment = 0;

        // أ) حساب التقديمة (بدون فوائد تأخير إضافية)
        if (saleType === 'daily') {
            downPayment = dailyAmount * purchaseDay;
        } else {
            downPayment = monthlyAmount; // شهر مقدم
        }

        // ب) قيود المبالغ والمدد
        const isEligible = totalAmount >= 2500;
        const maxMonths = totalAmount > 100000 ? 15 : 10;

        return {
            isEligible,
            downPayment,
            maxMonths,
            minDaily: 50,
            maxDaily: 1000,
            minMonthly: 500
        };
    },

    // ==========================================
    // 5. محرك الرقابة القانونية (The 35/63 Rule)
    // ==========================================
    monitorLegalStatus: (installments, type, creditLimit) => {
        const today = new Date();
        const pending = installments.filter(i => i.status === 'pending');
        
        if (pending.length === 0) return { status: 'SAFE' };

        // جلب أقدم قسط لم يدفع
        const oldestInst = pending.sort((a,b) => new Date(a.due_date) - new Date(b.due_date))[0];
        const delayDays = Math.floor((today - new Date(oldestInst.due_date)) / (1000 * 60 * 60 * 24));

        if (delayDays <= 0) return { status: 'SAFE', days: 0 };

        // حساب إجمالي المديونية الحالية
        const totalOwed = pending.reduce((sum, inst) => sum + Number(inst.amount), 0);

        // سقف المديونية: التوقف عن زيادة عداد التأخير إذا وصلنا للسقف
        if (totalOwed >= creditLimit) {
            return { status: 'CAPPED', days: oldestInst.last_recorded_delay || delayDays };
        }

        // تحديد الحالة القانونية
        if (type === 'daily' && delayDays >= 35) return { status: 'LEGAL', days: delayDays };
        if (type === 'monthly' && delayDays >= 63) return { status: 'LEGAL', days: delayDays };

        return { status: 'OVERDUE', days: delayDays };
    },

    // ==========================================
    // 6. محرك القضايا والجدولة (Final Constraints)
    // ==========================================
    getSecurityConfig: (totalAmount) => {
        const config = totalAmount > 100000 
            ? { type: 'شيك بريدي/بنكي', count: 5 } 
            : { type: 'وصل أمانة', count: 6 };
        
        return {
            ...config,
            maxCasesPerPerson: 6, // 6 قضايا لكل فاتورة
            absoluteMaxPerId: 12  // 6 كمشتري + 6 كضامن
        };
    },

    canReschedule: (customer) => {
        if (!customer.last_reschedule) return true;
        const lastDate = new Date(customer.last_reschedule);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return lastDate < oneYearAgo; // مرة واحدة كل سنة
    }
};

window.XCore = XCore;
