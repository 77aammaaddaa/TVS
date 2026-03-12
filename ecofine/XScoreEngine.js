/**
 * 🧠 XScoreEngine.js - محرك التقييم الائتماني اللامركزي (Decentralized Credit Engine V14.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الفلسفة: Event-Driven, Rule-Based, Offline-First, Privacy-Preserving
 */

const XScoreEngine = (() => {

    // ==========================================
    // 1. القواعد (Rules Modules)
    // ==========================================
    const Rules = {
        Job: (jobType) => {
            const scores = { 'government': 120, 'private': 90, 'self_employed': 60, 'unstable': 20, 'none': -100 };
            return scores[jobType] || 0;
        },
        
        Housing: (housingType) => {
            const scores = { 'owned': 100, 'old_rent': 70, 'new_rent': 40, 'temporary': -20 };
            return scores[housingType] || 0;
        },

        IncomeRatio: (income, installmentAmt = 0) => {
            if (!income || income === 0) return -50;
            if (installmentAmt === 0) return 30; // لديه دخل ولا توجد أقساط حالية
            const ratio = (installmentAmt / income) * 100;
            if (ratio < 25) return 50;
            if (ratio < 40) return 20;
            if (ratio > 50) return -50;
            return 0;
        },

        Guarantor: (guarantorStrength) => {
            const scores = { 'government': 50, 'private': 30, 'none': -50 };
            return scores[guarantorStrength] || 0;
        },

        Behavioral: (lateDays) => {
            if (lateDays === 0) return 150;
            if (lateDays < 10) return -10;
            if (lateDays < 30) return -80;
            if (lateDays > 90) return -300;
            return -200;
        },

        Activity: (lastActivityDays) => {
            if (lastActivityDays <= 30) return 20;
            if (lastActivityDays > 365) return -20; // عميل خامل
            return 0;
        },

        AddressRisk: (defaultersAtAddress) => {
            // فكرة عبقرية: إذا كان العنوان مسجل به متعثرين سابقين
            if (defaultersAtAddress >= 3) return -150;
            if (defaultersAtAddress > 0) return -50;
            return 0;
        }
    };

    // ==========================================
    // 2. كشف الاحتيال (Fraud Detection)
    // ==========================================
    const FraudDetector = {
        check: (profile) => {
            let riskPenalty = 0;
            let flags = [];

            if (profile.active_contracts > 3) {
                riskPenalty += 100;
                flags.push("High concurrent contracts");
            }
            if (profile.late_days_total > 60) {
                riskPenalty += 200;
                flags.push("Chronic late payments");
            }
            if (profile.legal_cases > 0) {
                riskPenalty += 400; // خطر شديد
                flags.push("Active legal cases");
            }

            return { penalty: riskPenalty, isFraudulent: riskPenalty >= 300, flags };
        }
    };

    // ==========================================
    // 3. تطبيع النتيجة وتحديد الفئة (Normalizer & Risk Tiers)
    // ==========================================
    const normalizeScore = (score) => Math.max(0, Math.min(1000, score));

    const getRiskLevel = (score) => {
        if (score >= 800) return 'A_EXCELLENT';
        if (score >= 600) return 'B_GOOD';
        if (score >= 400) return 'C_FAIR';
        if (score >= 200) return 'D_HIGH_RISK';
        return 'F_REJECTED';
    };

    // ==========================================
    // 4. التشفير اللامركزي (Privacy & Hashing)
    // ==========================================
    // تحويل الرقم القومي إلى كود مشفر لا يمكن عكسه (SHA-256) لمشاركته مع الشبكة بأمان
    const hashNationalId = async (nationalId) => {
        const msgBuffer = new TextEncoder().encode(nationalId.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // ==========================================
    // 5. المحرك الأساسي (Core Calculator)
    // ==========================================
    const calculateXScore = (profile) => {
        let score = 500; // نقطة البداية (BASE_SCORE)
        const details = {}; // سجل الحسابات للشفافية

        // 1. العوامل الشخصية
        const jobPoints = Rules.Job(profile.job_type);
        const housePoints = Rules.Housing(profile.housing_type);
        score += jobPoints;
        score += housePoints;
        details.job = jobPoints;
        details.housing = housePoints;

        // 2. العوامل المالية
        const incomePoints = Rules.IncomeRatio(profile.monthly_income, profile.current_installments_total);
        const guarantorPoints = Rules.Guarantor(profile.guarantor_strength);
        score += incomePoints;
        score += guarantorPoints;
        details.income = incomePoints;
        details.guarantor = guarantorPoints;

        // 3. السلوك والدفع
        const behaviorPoints = Rules.Behavioral(profile.late_days_total);
        score += behaviorPoints;
        details.behavior = behaviorPoints;

        // 4. تقييم المخاطر الجغرافية (Address Risk)
        if (profile.address_defaulters !== undefined) {
            const addressPoints = Rules.AddressRisk(profile.address_defaulters);
            score += addressPoints;
            details.address_risk = addressPoints;
        }

        // 5. خصم الاحتيال (Fraud Deduction)
        const fraudResult = FraudDetector.check(profile);
        score -= fraudResult.penalty;
        details.fraud_penalty = -fraudResult.penalty;

        // تطبيع النتيجة النهائية
        const finalScore = normalizeScore(score);

        return {
            xscore: finalScore,
            risk_level: getRiskLevel(finalScore),
            is_fraudulent: fraudResult.isFraudulent,
            fraud_flags: fraudResult.flags,
            breakdown: details // مفيد جداً لعرضه لمدير الائتمان لمعرفة سبب التقييم
        };
    };

    // ==========================================
    // 6. معالج الأحداث (Event Processor)
    // ==========================================
    const processEvent = async (event) => {
        /**
         * event = { client_id, type: 'EARLY_PAYMENT' | 'LATE_PAYMENT' | 'NEW_CONTRACT', value: ... }
         */
        try {
            // 1. جلب بيانات العميل الحالية من القاعدة المحلية
            const client = await window.db.getById('clients', event.client_id);
            if (!client) return;

            // 2. تحديث السجل بناءً على الحدث
            if (event.type === 'EARLY_PAYMENT') {
                client.credit_score = normalizeScore((client.credit_score || 500) + 5);
            } 
            else if (event.type === 'LATE_PAYMENT') {
                client.late_days_total = (client.late_days_total || 0) + event.value; // value = number of late days
            }
            else if (event.type === 'NEW_CONTRACT') {
                client.active_contracts = (client.active_contracts || 0) + 1;
            }

            // 3. إعادة حساب التقييم الشامل (Full Recalculation)
            const evaluation = calculateXScore(client);
            client.credit_score = evaluation.xscore;
            client.risk_level = evaluation.risk_level;

            // 4. حفظ العميل محلياً
            await window.db.update('clients', client.id, client);

            // 5. دفع البيانات للشبكة المركزية (Sync)
            await NetworkSync.pushUpdate(client);

            return evaluation;

        } catch (err) {
            console.error("XScore Event Error:", err);
        }
    };

    // ==========================================
    // 7. مزامنة الشبكة المركزية (Network Sync)
    // ==========================================
    const NetworkSync = {
        pushUpdate: async (clientProfile) => {
            // لا نعمل Push إلا لو كان هناك إنترنت ومفاتيح الماستر موجودة
            if (!navigator.onLine || !window.XConfig?.masterCloud?.url) return;

            try {
                // 1. تشفير الرقم القومي لضمان الخصوصية التامة
                const hashedId = await hashNationalId(clientProfile.national_id);

                // 2. تجهيز الـ Payload اللامركزي (بدون أسماء أو عناوين)
                const syncPayload = {
                    hashed_national_id: hashedId,
                    xscore: clientProfile.credit_score,
                    total_contracts: (clientProfile.active_contracts || 0) + (clientProfile.previous_contracts || 0),
                    active_contracts: clientProfile.active_contracts || 0,
                    late_days: clientProfile.late_days_total || 0,
                    legal_cases: clientProfile.legal_cases || 0,
                    risk_level: clientProfile.risk_level || 'C_FAIR',
                    last_update: new Date().toISOString()
                };

                // 3. الإرسال إلى شبكة EcoCredit المركزية (Master DB)
                const masterDb = window.supabase.createClient(window.XConfig.masterCloud.url, window.XConfig.masterCloud.key);
                
                // عملية Upsert (تحديث إذا كان موجود، إدخال إذا كان جديد)
                await masterDb.from('network_credit').upsert(syncPayload, { onConflict: 'hashed_national_id' });
                
                console.log(`☁️ XScore: Synced hashed profile [${hashedId.substring(0,8)}...] successfully.`);
            } catch (err) {
                console.warn("☁️ XScore Sync Failed (Will retry later):", err.message);
            }
        },

        pullScore: async (nationalId) => {
            // سحب التقييم من الشبكة المركزية لعميل جديد يزور المتجر لأول مرة
            if (!navigator.onLine || !window.XConfig?.masterCloud?.url) return null;

            try {
                const hashedId = await hashNationalId(nationalId);
                const masterDb = window.supabase.createClient(window.XConfig.masterCloud.url, window.XConfig.masterCloud.key);
                
                const { data, error } = await masterDb.from('network_credit')
                                              .select('*')
                                              .eq('hashed_national_id', hashedId)
                                              .single();
                
                if (error || !data) return null;
                return data; // يرجع { xscore, risk_level, late_days ... }
            } catch (err) {
                return null;
            }
        }
    };

    // ==========================================
    // الواجهة العامة للمحرك (Public API)
    // ==========================================
    return {
        calculate: calculateXScore,
        processEvent: processEvent,
        network: NetworkSync,
        utils: { hashNationalId }
    };

})();

// إتاحة المحرك عالمياً للنظام
window.XScoreEngine = XScoreEngine;
