/**
 * 🧠 X-Core Engine V7.0 - العقل المفكر لنظام إكس القابضة
 * الوصف: المحرك المركزي لإدارة المخاطر، الائتمان، الحسابات الشرعية، والشؤون القانونية.
 * تم تصميمه للعمل بكفاءة قصوى (Turbo) على متصفحات الأجهزة المحمولة (Redmi 10).
 */

const XCore = {
    // =====================================================================
    // 1. محرك الأوزان النسبية والتقييم (The 100% Weighted Matrix)
    // =====================================================================
    calculateCreditScore: (buyerData, guarantors = []) => {
        // أ) محور بيانات المشتري (الوزن: 20%)
        // يعتمد على اكتمال وصحة البيانات (الرقم القومي، الهاتف، العنوان)
        const isDataComplete = buyerData.national_id && buyerData.phone && buyerData.address_details;
        const buyerBase = isDataComplete ? 100 : 40; 
        const scoreA = buyerBase * 0.20;

        // ب) محور القدرة المالية والوظيفة (الوزن: 30%)
        let financeBase = 50; // نقطة أساس
        if (buyerData.job_type === 'حكومي') financeBase += 30;
        if (buyerData.income_verified) financeBase += 20; // التوثيق يكمل الـ 100
        const scoreB = Math.min(financeBase, 100) * 0.30;

        // ج) محور الاستعلام والسكن (الوزن: 10%)
        let housingBase = 50;
        if (buyerData.housing_type === 'تمليك') housingBase += 30;
        if (buyerData.survey_status === 'recommended') housingBase += 20;
        const scoreC = Math.min(housingBase, 100) * 0.10;

        // د) محور درع الضمان (الوزن: 40%)
        let scoreD = 0;
        if (guarantors.length > 0) {
            // حساب متوسط تقييم الضامنين
            const totalGScore = guarantors.reduce((sum, g) => sum + (Number(g.credit_score) || 0), 0);
            let avgGScore = totalGScore / 3; // القسمة على 3 (العدد المثالي للضامنين)
            
            // عقوبة المخاطرة إذا كان عدد الضامنين أقل من 3 (باستثناء الموظف الحكومي)
            if (guarantors.length < 3 && buyerData.job_type !== 'حكومي') {
                avgGScore = avgGScore * (guarantors.length / 3); 
            }
            scoreD = Math.min(avgGScore, 100) * 0.40;
        }

        // حساب المجموع النهائي والتأكد من عدم تخطي الـ 100%
        const finalScore = Math.round(scoreA + scoreB + scoreC + scoreD);
        
        return {
            score: Math.min(finalScore, 100),
            isEligible: finalScore >= 50,
            breakdown: { data: scoreA, finance: scoreB, housing: scoreC, guarantors: scoreD },
            msg: finalScore >= 50 ? '✅ مؤهل للتقسيط' : '🚫 غير مؤهل (أقل من 50%)'
        };
    },

    // =====================================================================
    // 2. محرك وحدانية الدور وأهلية الضامن (Identity & Eligibility Engine)
    // =====================================================================
    checkPersonEligibility: async (nationalId, roleRequested = 'buyer') => {
        const customers = await db.getAll('customers') || [];
        const invoices = await db.getAll('invoices') || [];
        
        // أ) التحقق من وجود حظر قانوني (فترة التبريد 6 شهور)
        const personData = customers.find(c => c.national_id === nationalId);
        if (personData?.legal_ban_until && new Date(personData.legal_ban_until) > new Date()) {
            return { eligible: false, msg: `🚫 محظور من التعامل حتى ${personData.legal_ban_until}` };
        }

        // ب) فحص التواجد في عمليات نشطة (كمشتري أو ضامن)
        let isActiveBuyer = false;
        let isActiveGuarantor = false;

        invoices.filter(inv => inv.status === 'active').forEach(inv => {
            if (inv.customer_national_id === nationalId) isActiveBuyer = true;
            if (inv.guarantors?.some(g => g.national_id === nationalId)) isActiveGuarantor = true;
        });

        // تطبيق قواعد المنع الصارمة
        if (isActiveBuyer && roleRequested === 'buyer') {
            // يمكن أن يكون مشتري مرة ثانية فقط إذا تم اجتياز شروط "تعدد الفواتير" (يُفحص لاحقاً)
            return { eligible: true, requiresMultiInvoiceCheck: true };
        }
        
        if (isActiveBuyer && roleRequested === 'guarantor') {
            return { eligible: true, msg: "✅ مسموح له بالضمان بجانب فاتورته المفتوحة." };
        }

        if (isActiveGuarantor && roleRequested === 'guarantor') {
            return { eligible: false, msg: "🚫 مرفوض: يضمن شخصاً آخر حالياً، لا يمكنه ضمان شخصين." };
        }

        // ج) لو الدور المطلوب ضامن، يجب التحقق من سكوره التاريخي
        if (roleRequested === 'guarantor' && personData && personData.credit_score < 50) {
            return { eligible: false, msg: `🚫 مرفوض: تقييم الضامن (${personData.credit_score}%) أقل من 50%.` };
        }

        return { eligible: true, msg: "✅ متاح ومؤهل." };
    },

    // =====================================================================
    // 3. محرك تعدد الفواتير والسقف الائتماني (Multi-Invoice & Credit Limit)
    // =====================================================================
    canOpenMultiInvoice: (customerScore, monthlyIncome, currentDebt, totalPaid, newAmount) => {
        // أ) شرط السداد (يجب أن يكون قد سدد 50% على الأقل من مديونيته الحالية)
        const isPaidEnough = totalPaid >= (currentDebt * 0.5);
        if (!isPaidEnough) return { can: false, msg: "⚠️ يجب سداد 50% من المديونية الحالية لفتح فاتورة جديدة." };

        // ب) حساب الحد الائتماني (Multiplier = 5 months as default)
        const creditLimit = monthlyIncome * (customerScore / 100) * 5; 
        const projectedDebt = (currentDebt - totalPaid) + newAmount;

        if (projectedDebt > creditLimit) {
            return { can: false, msg: `⚠️ تتخطى الحد الائتماني. المتاح لك: ${Math.max(0, creditLimit - (currentDebt - totalPaid))} ج.` };
        }

        return { can: true, msg: "✅ مؤهل لفتح الفاتورة الإضافية." };
    },

    // =====================================================================
    // 4. المحرك المالي والشرعي (Financial & Sharia Logic)
    // =====================================================================
    calculateSaleTerms: (totalAmount, saleType, installmentValue) => {
        // أ) القيود الأساسية
        if (totalAmount < 2500) throw new Error("⚠️ الحد الأدنى للفاتورة 2500 ج.");
        if (saleType === 'daily' && (installmentValue < 50 || installmentValue > 1000)) throw new Error("⚠️ القسط اليومي يجب أن يكون بين 50 و 1000 ج.");
        if (saleType === 'monthly' && installmentValue < 500) throw new Error("⚠️ القسط الشهري لا يقل عن 500 ج.");

        // ب) المدد القصوى
        const maxMonths = totalAmount >= 100000 ? 15 : 10;
        const requestedMonths = (totalAmount / installmentValue) / (saleType === 'daily' ? 30 : 1);
        
        if (requestedMonths < 2) throw new Error("⚠️ الحد الأدنى لمدة التقسيط شهرين.");
        if (requestedMonths > maxMonths) throw new Error(`⚠️ تتخطى الحد الأقصى للمدة (${maxMonths} شهور).`);

        // ج) حساب التقديمة (Down Payment) بناءً على يوم الشراء
        const purchaseDay = new Date().getDate();
        let downPayment = saleType === 'daily' ? (installmentValue * purchaseDay) : installmentValue;

        // د) تحديد الوثائق القانونية المطلوبة
        const docs = totalAmount >= 100000 ? { type: 'شيكات', count: 5 } : { type: 'وصلات أمانة', count: 6 };

        return { downPayment, maxMonths, docs, isApproved: true };
    },

    // =====================================================================
    // 5. محرك الرقابة والتأخير (The Delay & Legal Tracker)
    // =====================================================================
    processDelaysAndLegal: (saleType, delayDays, currentLiability, maxLiability) => {
        let action = 'NONE';
        let penaltyDays = delayDays; // عدد الأيام التي تُضاف لمدة العقد

        // توقف العداد إذا وصلت المديونية للحد الأقصى
        if (currentLiability >= maxLiability) {
            penaltyDays = 0; // يتوقف العداد
            return { action: 'CAPPED', penaltyDays, msg: "وصل للحد الأقصى للمديونية، تم إيقاف العداد." };
        }

        // نقاط التحول القانوني
        if (saleType === 'daily' && delayDays > 35) action = 'LEGAL_ACTION';
        if (saleType === 'monthly' && delayDays > 63) action = 'LEGAL_ACTION';

        // نظام التحذيرات
        if (action !== 'LEGAL_ACTION' && delayDays > 0 && delayDays % 10 === 0) {
            action = 'WARNING';
        }

        return { action, penaltyDays };
    },

    // =====================================================================
    // 6. محرك الجدولة (Reschedule Guard)
    // =====================================================================
    canReschedule: (lastRescheduleDate) => {
        if (!lastRescheduleDate) return true; // لم يقم بالجدولة من قبل
        
        const lastDate = new Date(lastRescheduleDate);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        return lastDate <= oneYearAgo; // يسمح إذا مر عام كامل
    }
};

// تثبيت المحرك في النطاق العام للمتصفح
window.XCore = XCore;
