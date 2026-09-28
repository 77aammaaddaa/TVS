// ============================================================================
// 🧠 X-CORE ENGINE V14.1 (Native TypeScript Edition)
// The Strategic Risk, Credit Scoring, and Installment Engine
// ============================================================================

// --- 1. X-CONFIG (Default Rules) ---
export const XConfig = {
    creditPolicy: {
        minScoreToEntry: 50,
        startingScore: 500, // Normalized X-Score Base
        creditLimitMultiplier: 5,
        requiredPaymentRatioForNewInvoice: 0.3,
        weights: { identity: 10, income: 30, guarantors: 40, residence: 20 }
    },
    guarantorRules: {
        minGuarantors: 1,
        maxGuarantors: 3,
        minGuarantorScore: 50
    },
    salesTerms: {
        maxDownPaymentRatio: 0.5, // 50% max down payment
        durationTiers: [
            { maxAmount: 100000, maxMonths: 10, docs: "RECEIPTS" },
            { maxAmount: 1000000, maxMonths: 15, docs: "CHECKS" }
        ],
        minInstallment: { daily: 50, monthly: 500 },
        downPaymentLogic: { daily: "DAYS_OF_MONTH", monthly: "ONE_MONTH_PREPAID" }
    }
}

// --- 2. TYPES & INTERFACES ---
export interface CustomerProfile {
    national_id?: string;
    job_type: 'GOV_EMPLOYEE' | 'PRIVATE' | 'SELF_EMPLOYED' | 'NONE';
    housing_type: 'OWNED' | 'RENTED' | 'TEMPORARY';
    monthly_income: number;
    current_installments_total: number;
    guarantor_strength: 'GOV' | 'PRIVATE' | 'NONE';
    late_days_total: number;
    active_contracts: number;
    legal_cases: number;
}

export interface SaleTermsResult {
    downPayment: number;
    maxMonths: number;
    calculatedPeriods: number;
    remainingDebt: number;
    docs: { type: string; description: string };
    error?: string;
}

// --- 3. THE X-CORE ENGINE ---
export const XCore = {

    // ------------------------------------------------------------------------
    // A. CREDIT SCORING (Merged XCore & XScoreEngine logic)
    // ------------------------------------------------------------------------
    evaluateCustomer: (profile: CustomerProfile) => {
        let score = XConfig.creditPolicy.startingScore;
        let riskPenalty = 0;
        const flags: string[] = [];

        // 1. Behavioral & Financial Rules
        if (profile.job_type === 'GOV_EMPLOYEE') score += 120;
        else if (profile.job_type === 'PRIVATE') score += 90;
        else score -= 50;

        if (profile.housing_type === 'OWNED') score += 100;
        else score -= 20;

        // Income to Debt Ratio
        if (profile.monthly_income > 0) {
            const ratio = (profile.current_installments_total / profile.monthly_income) * 100;
            if (ratio < 25) score += 50;
            else if (ratio > 50) score -= 50;
        } else {
            score -= 50;
        }

        // 2. Fraud & Penalty Detection
        if (profile.active_contracts > 3) {
            riskPenalty += 100;
            flags.push("عقود نشطة متعددة (High concurrency)");
        }
        if (profile.late_days_total > 60) {
            riskPenalty += 200;
            flags.push("تأخير مزمن في الدفع");
        }
        if (profile.legal_cases > 0) {
            riskPenalty += 400;
            flags.push("قضايا قانونية نشطة (خطر شديد)");
        }

        score -= riskPenalty;

        // Normalize Score (0 - 1000)
        const finalScore = Math.max(0, Math.min(1000, score));
        
        // Risk Tier Calculation
        let riskLevel = 'F_REJECTED';
        if (finalScore >= 800) riskLevel = 'A_EXCELLENT';
        else if (finalScore >= 600) riskLevel = 'B_GOOD';
        else if (finalScore >= 400) riskLevel = 'C_FAIR';
        else if (finalScore >= 200) riskLevel = 'D_HIGH_RISK';

        return {
            xscore: finalScore,
            riskLevel: riskLevel,
            isFraudulent: riskPenalty >= 300,
            flags: flags,
            approved: finalScore >= (XConfig.creditPolicy.minScoreToEntry * 10) // Scaled up to 1000 base
        };
    },

    // ------------------------------------------------------------------------
    // B. SALES TERMS CALCULATOR (Directly used by POS.tsx)
    // ------------------------------------------------------------------------
    calculateSaleTerms: (
        totalAmount: number, 
        instType: 'monthly' | 'daily', 
        desiredInstValue: number, 
        purchaseDay: number = 1
    ): SaleTermsResult => {
        
        if (totalAmount <= 0) return { error: 'قيمة الفاتورة غير صحيحة.', downPayment: 0, maxMonths: 0, calculatedPeriods: 0, remainingDebt: 0, docs: { type: '', description: '' } };
        if (desiredInstValue <= 0) return { error: 'قيمة القسط المطلوبة غير صحيحة.', downPayment: 0, maxMonths: 0, calculatedPeriods: 0, remainingDebt: 0, docs: { type: '', description: '' } };

        const termsConf = XConfig.salesTerms;
        
        // 1. Min Installment Check
        if (instType === 'daily' && desiredInstValue < termsConf.minInstallment.daily) {
            return { error: `القسط اليومي لا يقل عن ${termsConf.minInstallment.daily} ج.`, downPayment: 0, maxMonths: 0, calculatedPeriods: 0, remainingDebt: 0, docs: { type: '', description: '' } };
        }
        if (instType === 'monthly' && desiredInstValue < termsConf.minInstallment.monthly) {
            return { error: `القسط الشهري لا يقل عن ${termsConf.minInstallment.monthly} ج.`, downPayment: 0, maxMonths: 0, calculatedPeriods: 0, remainingDebt: 0, docs: { type: '', description: '' } };
        }

        // 2. Calculate Initial Down Payment
        let downPayment = 0;
        if (instType === 'monthly') {
            if (termsConf.downPaymentLogic.monthly === 'ONE_MONTH_PREPAID') downPayment = desiredInstValue;
        } else {
            if (termsConf.downPaymentLogic.daily === 'DAYS_OF_MONTH') downPayment = desiredInstValue * purchaseDay;
            else downPayment = desiredInstValue;
        }

        // 3. Cap Down Payment
        const maxDownPayment = totalAmount * termsConf.maxDownPaymentRatio;
        if (downPayment > maxDownPayment) downPayment = maxDownPayment;

        const remainingDebt = totalAmount - downPayment;
        if (remainingDebt <= 0) {
            return { error: 'المقدم يساوي أو يتجاوز قيمة الفاتورة.', downPayment: 0, maxMonths: 0, calculatedPeriods: 0, remainingDebt: 0, docs: { type: '', description: '' } };
        }

        // 4. Calculate Periods & Duration Limits
        const calculatedPeriods = remainingDebt / desiredInstValue; 
        const calculatedMonths = instType === 'daily' ? (calculatedPeriods / 30) : calculatedPeriods;

        let matchedTier = termsConf.durationTiers.find(t => totalAmount <= t.maxAmount);
        if (!matchedTier) matchedTier = termsConf.durationTiers[termsConf.durationTiers.length - 1];

        if (calculatedMonths > matchedTier.maxMonths) {
            return { 
                error: `مرفوض: قدرة العميل (${desiredInstValue} ج) ستجعل مدة التقسيط (${Math.ceil(calculatedMonths)} شهراً) تتخطى الحد الأقصى (${matchedTier.maxMonths} شهراً).`,
                downPayment: 0, maxMonths: 0, calculatedPeriods: 0, remainingDebt: 0, docs: { type: '', description: '' }
            };
        }

        // 5. Build Result
        return {
            downPayment: Math.ceil(downPayment),
            maxMonths: matchedTier.maxMonths,
            calculatedPeriods: Math.ceil(calculatedPeriods),
            remainingDebt: Math.ceil(remainingDebt),
            docs: { 
                type: matchedTier.docs, 
                description: matchedTier.docs === 'CHECKS' ? 'توقيع شيكات بنكية بكامل القيمة الإجمالية كضمان.' : 'توقيع إيصالات أمانة ورقية بقيمة الأقساط.' 
            }
        };
    }
}