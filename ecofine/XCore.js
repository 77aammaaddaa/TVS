/**
 * 🧠 X-CORE Engine V12.0 - العقل الاستراتيجي ومحرك المخاطر
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: التقييم الائتماني، اتخاذ قرارات التقسيط المتقدمة، حساب الزكاة، والمراقبة القانونية.
 */

const XCore = {
    // ==========================================
    // 1. محرك التقييم الائتماني (X-Score Calculator)
    // ==========================================
    evaluateCustomer: (customerData) => {
        const conf = window.XConfig?.creditPolicy || { startingScore: 0, minScoreToEntry: 50, weights: { identity: 10, income: 30, guarantors: 40, residence: 20 } };
        let score = conf.startingScore || 0;
        let messages = [`نقطة البداية: ${score}%`];

        const guarantors = customerData.guarantors || [];
        const gRules = window.XConfig?.guarantorRules || { minGuarantors: 1, minGuarantorScore: 50, maxGuarantors: 3 };

        // فحص الحد الأدنى للضامنين
        if (guarantors.length < gRules.minGuarantors) {
            return { approved: false, score: 0, msg: `❌ مرفوض: يفتقر للحد الأدنى من الضامنين (${gRules.minGuarantors}).` };
        }
        
        // فحص أهلية الضامنين
        for (let g of guarantors) {
            if (g.credit_score && g.credit_score < gRules.minGuarantorScore) {
                 return { approved: false, score: 0, msg: `❌ مرفوض: الضامن تقييمه الائتماني ضعيف (أقل من ${gRules.minGuarantorScore}%).` };
            }
        }

        // حساب الأوزان النسبية
        const guarantorWeight = (guarantors.length / gRules.maxGuarantors) * (conf.weights?.guarantors || 40);
        score += Math.min(guarantorWeight, conf.weights?.guarantors || 40);
        
        if (customerData.job_type === 'GOV_EMPLOYEE' || customerData.monthly_income > 3000) score += (conf.weights?.income || 30);
        if (customerData.residence_type === 'OWNED' || customerData.survey_status === 'verified') score += (conf.weights?.residence || 20);
        if (customerData.national_id && customerData.national_id.length === 14) score += (conf.weights?.identity || 10);

        const finalScore = Math.min(Math.round(score), 100);
        const approved = finalScore >= conf.minScoreToEntry;

        return {
            approved,
            finalScore,
            msg: approved ? "✅ مؤهل للائتمان والتقسيط." : `❌ التقييم (${finalScore}%) أقل من الحد الأدنى للشركة (${conf.minScoreToEntry}%).`,
            breakdown: messages
        };
    },

    // ==========================================
    // 2. محرك قرار تعدد الفواتير والسقف المالي (يستخدمه POS.js)
    // ==========================================
    canOpenMultiInvoice: (creditScore, monthlyIncome, currentDebt, totalPaid, newInvoiceTotal) => {
        const conf = window.XConfig?.creditPolicy || { minScoreToEntry: 50, creditLimitMultiplier: 5 };
        const minScore = conf.minScoreToEntry;
        
        // 1. فحص السكور الأساسي
        if (creditScore < minScore) {
            return { can: false, msg: `مرفوض: السكور الائتماني للعميل (${creditScore}) أقل من الحد الأدنى للشركة (${minScore}).` };
        }

        // 2. إذا لم يكن هناك دخل مسجل، نعتمد على السجل السابق كضمان
        const incomeToUse = monthlyIncome > 0 ? monthlyIncome : (totalPaid > 0 ? totalPaid / 2 : 1000);

        // 3. حساب السقف الائتماني الآمن للعميل
        // المعادلة: الدخل الشهري × المعامل × (نسبة السكور)
        const multiplier = conf.creditLimitMultiplier || 5;
        const maxCreditLimit = (incomeToUse * multiplier) * (creditScore / 100);

        // 4. فحص تخطي السقف
        if ((currentDebt + newInvoiceTotal) > maxCreditLimit) {
            return { 
                can: false, 
                msg: `مرفوض: إجمالي المديونية (${Math.round(currentDebt + newInvoiceTotal).toLocaleString()} ج) سيتخطى السقف الآمن للعميل (${Math.round(maxCreditLimit).toLocaleString()} ج).` 
            };
        }

        // 5. فحص الالتزام السابق (يجب أن يكون قد سدد 30% على الأقل من ديونه القديمة لفتح فاتورة جديدة)
        if (currentDebt > 0 && totalPaid < (currentDebt * 0.3)) {
            return { can: false, msg: "مرفوض: العميل لديه مديونية عالية ولم يسدد نسبة كافية من أقساطه القديمة لفتح عقد جديد." };
        }

        return { can: true, msg: "✅ العميل مؤهل ائتمانياً. السقف المالي يسمح بإتمام العملية." };
    },

    // ==========================================
    // 3. حاسبة شروط البيع والمقدم التلقائي (يستخدمه POS.js)
    // ==========================================
    calculateSaleTerms: (totalAmount, instType, desiredInstValue, purchaseDay) => {
        if (!totalAmount || !desiredInstValue || desiredInstValue <= 0) {
            return { error: "مدخلات الحساب غير صحيحة، تأكد من إدخال قدرة العميل على الدفع." };
        }

        let downPayment = 0;
        const termsConf = window.XConfig?.salesTerms || { downPaymentLogic: { monthly: 'ONE_MONTH_PREPAID', daily: 'DAYS_OF_MONTH' } };
        const logic = instType === 'monthly' ? termsConf.downPaymentLogic?.monthly : termsConf.downPaymentLogic?.daily;

        // حساب المقدم
        if (instType === 'monthly') {
            if (logic === 'ONE_MONTH_PREPAID') downPayment = desiredInstValue;
            else if (logic === 'PERCENTAGE') downPayment = totalAmount * 0.20; // 20% افتراضي
            else downPayment = 0; // مرن
        } else if (instType === 'daily') {
            if (logic === 'DAYS_OF_MONTH') downPayment = desiredInstValue * (purchaseDay || 1);
            else downPayment = desiredInstValue; // قسط يومي واحد
        }

        // تأمين: المقدم يجب ألا يتخطى 50% آلياً لتجنب الأخطاء، إلا إذا تم التعديل يدوياً
        if (downPayment >= totalAmount * 0.5) downPayment = totalAmount * 0.5;

        const remainingDebt = totalAmount - downPayment;
        const calculatedPeriods = remainingDebt / desiredInstValue; // شهور أو أيام
        const calculatedMonths = instType === 'daily' ? (calculatedPeriods / 30) : calculatedPeriods;

        // تحديد الحد الأقصى للمدة
        const tiers = termsConf.durationTiers || [
            { maxAmount: 100000, maxMonths: 10, docs: "RECEIPTS" },
            { maxAmount: 1000000, maxMonths: 15, docs: "CHECKS" }
        ];

        let matchedTier = tiers.find(t => totalAmount <= t.maxAmount) || tiers[tiers.length - 1];

        if (calculatedMonths > matchedTier.maxMonths) {
            return { 
                error: `مرفوض: قدرة العميل الحالية (${desiredInstValue} ج) ستجعل مدة التقسيط تتخطى الحد الأقصى (${matchedTier.maxMonths} شهور) لهذا المبلغ.` 
            };
        }

        return {
            downPayment: Math.ceil(downPayment),
            maxMonths: matchedTier.maxMonths,
            calculatedMonths: Math.ceil(calculatedPeriods), // إرجاع عدد الأقساط (سواء شهور أو أيام)
            docs: { 
                type: matchedTier.docs, 
                description: matchedTier.docs === 'CHECKS' ? 'توقيع شيكات بنكية بكامل القيمة الإجمالية كضمان.' : 'توقيع إيصالات أمانة ورقية بقيمة الأقساط.' 
            }
        };
    },

    // ==========================================
    // 4. الرقابة القانونية للمتعثرين (Legal Monitor)
    // ==========================================
    monitorLegalStatus: (installments, type, creditLimit) => {
        const legal = window.XConfig?.legalPolicy || { thresholds: { daily: 35, monthly: 63 }, stopDelayCounterAtLimit: true };
        const today = new Date();
        const pending = installments.filter(i => i.status === 'pending');
        
        if (pending.length === 0) return { status: 'SAFE', days: 0 };

        const oldestInst = pending.sort((a,b) => new Date(a.due_date) - new Date(b.due_date))[0];
        const delayDays = Math.floor((today - new Date(oldestInst.due_date)) / (1000 * 60 * 60 * 24));

        if (delayDays <= 0) return { status: 'SAFE', days: 0 };

        // إيقاف العداد إذا تخطت المديونية سقف الائتمان أو تحولت لقضية
        if (legal.stopDelayCounterAtLimit) {
            const totalOwed = pending.reduce((sum, inst) => sum + Number(inst.amount), 0);
            if (totalOwed >= creditLimit) return { status: 'CAPPED', days: delayDays };
        }

        const threshold = type === 'daily' ? legal.thresholds?.daily : legal.thresholds?.monthly;
        if (delayDays >= threshold) return { status: 'LEGAL', days: delayDays };

        return { status: 'OVERDUE', days: delayDays };
    }
};

window.XCore = XCore;
