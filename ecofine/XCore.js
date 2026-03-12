/**
 * 🧠 X-CORE Engine V12.1 - العقل الاستراتيجي ومحرك المخاطر
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: التقييم الائتماني المتكامل، اتخاذ قرارات التقسيط، حساب الزكاة، والمراقبة القانونية.
 * تاريخ آخر تحديث: 2026-03-13
 * 
 * التغييرات الرئيسية في هذا الإصدار:
 * - تحسين معالجة الأخطاء والتحقق من صحة المدخلات.
 * - دمج فحص أهلية الضامن (وحدانية الدور، الحظر) باستخدام قاعدة البيانات.
 * - ضمان عدم تجاوز مجموع الأوزان 100 في التقييم.
 * - إعادة هيكلة الدوال لزيادة الوضوح وسهولة الصيانة.
 * - إضافة توثيق كامل بـ JSDoc.
 * - تجميد الكائن بعد التصدير لمنع التعديل.
 * - الاعتماد على XConfig مع قيم افتراضية آمنة.
 */

(function() {
    "use strict";

    // التأكد من وجود window و db و XConfig (اختياري)
    if (typeof window === 'undefined') {
        console.error('XCore: بيئة التشغيل غير مدعومة (يتطلب window).');
        return;
    }

    // ==========================================
    // دوال مساعدة داخلية
    // ==========================================

    /**
     * التحقق من وجود الكائنات المطلوبة وتسجيل تحذير.
     */
    function checkDependencies() {
        if (!window.db) {
            console.warn('XCore: قاعدة البيانات (db) غير متوفرة. بعض الوظائف قد لا تعمل.');
        }
        if (!window.XConfig) {
            console.warn('XCore: ملف XConfig غير محمل. سيتم استخدام القيم الافتراضية.');
        }
    }

    /**
     * جلب الإعدادات من XConfig أو استخدام القيم الافتراضية.
     */
    function getConfig() {
        const defaults = {
            creditPolicy: {
                startingScore: 0,
                minScoreToEntry: 50,
                weights: { identity: 10, income: 30, guarantors: 40, residence: 20 },
                creditLimitMultiplier: 5,
                requiredPaymentRatioForNewInvoice: 0.3  // 30% حد أدنى للسداد قبل فتح فاتورة جديدة
            },
            guarantorRules: {
                minGuarantors: 1,
                minGuarantorScore: 50,
                maxGuarantors: 3
            },
            salesTerms: {
                downPaymentLogic: { monthly: 'ONE_MONTH_PREPAID', daily: 'DAYS_OF_MONTH' },
                durationTiers: [
                    { maxAmount: 100000, maxMonths: 10, docs: "RECEIPTS" },
                    { maxAmount: 1000000, maxMonths: 15, docs: "CHECKS" }
                ],
                minInstallment: { daily: 50, monthly: 500 },
                maxDownPaymentRatio: 0.5  // 50% حد أقصى للمقدم
            },
            legalPolicy: {
                thresholds: { daily: 35, monthly: 63 },
                stopDelayCounterAtLimit: true
            }
        };
        return window.XConfig ? { ...defaults, ...window.XConfig } : defaults;
    }

    // ==========================================
    // المحرك الرئيسي
    // ==========================================
    const XCore = {

        // ==========================================
        // 1. محرك التقييم الائتماني (X-Score Calculator)
        // ==========================================

        /**
         * تقييم العميل وحساب درجته الائتمانية.
         * @param {Object} customerData - بيانات العميل (من crm.js).
         * @param {Array} customerData.guarantors - قائمة الضامنين (كل ضامن له credit_score).
         * @param {string} customerData.job_type - نوع الوظيفة (GOV_EMPLOYEE, PRIVATE, etc).
         * @param {number} customerData.monthly_income - الدخل الشهري.
         * @param {string} customerData.residence_type - نوع السكن (OWNED, RENTED).
         * @param {string} customerData.survey_status - حالة الاستعلام الميداني (verified, pending, rejected).
         * @param {string} customerData.national_id - الرقم القومي.
         * @returns {Object} { approved, finalScore, msg, breakdown }
         */
        evaluateCustomer: function(customerData) {
            try {
                // التحقق من المدخلات الأساسية
                if (!customerData || typeof customerData !== 'object') {
                    throw new Error('بيانات العميل غير صالحة.');
                }

                const conf = getConfig().creditPolicy;
                const gRules = getConfig().guarantorRules;
                let score = conf.startingScore || 0;
                const breakdown = [];

                // استخراج الضامنين
                const guarantors = Array.isArray(customerData.guarantors) ? customerData.guarantors : [];

                // 1. فحص الحد الأدنى للضامنين
                if (guarantors.length < gRules.minGuarantors) {
                    return {
                        approved: false,
                        finalScore: 0,
                        msg: `❌ مرفوض: يفتقر للحد الأدنى من الضامنين (${gRules.minGuarantors}).`,
                        breakdown: []
                    };
                }

                // 2. فحص أهلية الضامنين (سكور فقط هنا، الوحدانية والحظر يُفحص في دوال منفصلة)
                for (let g of guarantors) {
                    if (g.credit_score && g.credit_score < gRules.minGuarantorScore) {
                        return {
                            approved: false,
                            finalScore: 0,
                            msg: `❌ مرفوض: الضامن ${g.full_name || ''} تقييمه الائتماني ضعيف (أقل من ${gRules.minGuarantorScore}%).`,
                            breakdown: []
                        };
                    }
                }

                // 3. حساب الأوزان (مع ضمان عدم تجاوز كل وزن حده الأقصى)
                const weights = conf.weights || { identity: 10, income: 30, guarantors: 40, residence: 20 };

                // وزن الضامنين
                let guarantorContribution = 0;
                if (guarantors.length > 0) {
                    // متوسط سكور الضامنين
                    const avgGScore = guarantors.reduce((sum, g) => sum + (Number(g.credit_score) || 50), 0) / guarantors.length;
                    // الضرب في (عدد الضامنين / الحد الأقصى) مع عقوبة إذا قل العدد
                    const ratio = Math.min(guarantors.length / gRules.maxGuarantors, 1);
                    guarantorContribution = (avgGScore * ratio) * (weights.guarantors / 100);
                    // لكن نريد مساهمة من 0 إلى weights.guarantors، نضرب في 100؟
                    // الأسهل: نأخذ نسبة من الوزن
                    guarantorContribution = (avgGScore / 100) * weights.guarantors * ratio;
                }
                score += Math.min(guarantorContribution, weights.guarantors);
                breakdown.push(`الضامنون: +${Math.round(guarantorContribution)}`);

                // وزن الدخل والوظيفة
                let incomeContribution = 0;
                if (customerData.job_type === 'GOV_EMPLOYEE' || (customerData.monthly_income || 0) > 3000) {
                    incomeContribution = weights.income;
                } else if ((customerData.monthly_income || 0) > 2000) {
                    incomeContribution = weights.income * 0.7;
                } else {
                    incomeContribution = weights.income * 0.3;
                }
                score += incomeContribution;
                breakdown.push(`الدخل: +${Math.round(incomeContribution)}`);

                // وزن السكن والاستعلام
                let residenceContribution = 0;
                if (customerData.residence_type === 'OWNED') {
                    residenceContribution = weights.residence;
                } else if (customerData.residence_type === 'RENTED' && customerData.survey_status === 'verified') {
                    residenceContribution = weights.residence * 0.8;
                } else {
                    residenceContribution = weights.residence * 0.4;
                }
                score += residenceContribution;
                breakdown.push(`السكن: +${Math.round(residenceContribution)}`);

                // وزن الهوية (الرقم القومي)
                let identityContribution = 0;
                if (customerData.national_id && customerData.national_id.length === 14) {
                    identityContribution = weights.identity;
                } else {
                    identityContribution = 0;
                }
                score += identityContribution;
                breakdown.push(`الهوية: +${Math.round(identityContribution)}`);

                // المجموع النهائي
                const finalScore = Math.min(Math.round(score), 100);
                const approved = finalScore >= conf.minScoreToEntry;

                return {
                    approved,
                    finalScore,
                    msg: approved ? "✅ مؤهل للائتمان والتقسيط." : `❌ التقييم (${finalScore}%) أقل من الحد الأدنى للشركة (${conf.minScoreToEntry}%).`,
                    breakdown
                };
            } catch (error) {
                console.error('XCore.evaluateCustomer error:', error);
                return {
                    approved: false,
                    finalScore: 0,
                    msg: '⚠️ حدث خطأ في نظام التقييم.',
                    breakdown: []
                };
            }
        },

        // ==========================================
        // 2. فحص أهلية الضامن (مع قاعدة البيانات)
        // ==========================================

        /**
         * التحقق من إمكانية قبول شخص كضامن بناءً على سجله ووحدانية الدور.
         * @param {string} nationalId - الرقم القومي للضامن المحتمل.
         * @returns {Promise<Object>} { eligible, msg, personData }
         */
        checkGuarantorEligibility: async function(nationalId) {
            try {
                if (!window.db) {
                    throw new Error('قاعدة البيانات غير متوفرة.');
                }
                if (!/^\d{14}$/.test(nationalId)) {
                    return { eligible: false, msg: 'الرقم القومي غير صحيح.' };
                }

                // جلب جميع العملاء والفواتير النشطة
                const [allCustomers, allInvoices] = await Promise.all([
                    window.db.getAll('customers').catch(() => []),
                    window.db.getAll('invoices').catch(() => [])
                ]);

                const person = allCustomers.find(c => c.national_id === nationalId);

                // 1. فحص الحظر القانوني
                if (person?.legal_ban_until && new Date(person.legal_ban_until) > new Date()) {
                    return { eligible: false, msg: `🚫 محظور من التعامل حتى ${person.legal_ban_until}` };
                }

                // 2. فحص السكور الائتماني (إذا كان موجوداً في قاعدة البيانات)
                if (person && person.credit_score < (getConfig().guarantorRules.minGuarantorScore)) {
                    return { eligible: false, msg: `🚫 مرفوض: تقييم الضامن (${person.credit_score}%) أقل من الحد المسموح.` };
                }

                // 3. فحص وحدانية الدور: هل هو ضامن حالي في أي فاتورة نشطة؟
                const activeInvoices = allInvoices.filter(inv => inv.status === 'active');
                const isCurrentlyGuarantor = activeInvoices.some(inv =>
                    inv.guarantors?.some(g => g.national_id === nationalId)
                );
                if (isCurrentlyGuarantor) {
                    return { eligible: false, msg: '🚫 مرفوض: هذا الشخص ضامن بالفعل في فاتورة أخرى مفتوحة.' };
                }

                // 4. (اختياري) يمكن أن يكون مشتري حالي وضامن في نفس الوقت - مسموح
                return {
                    eligible: true,
                    msg: person ? '✅ ضامن مستوفي الشروط.' : '✅ ضامن جديد (يحتاج استكمال بيانات).',
                    personData: person || null
                };
            } catch (error) {
                console.error('XCore.checkGuarantorEligibility error:', error);
                return { eligible: false, msg: '⚠️ خطأ في التحقق من أهلية الضامن.' };
            }
        },

        // ==========================================
        // 3. محرك قرار تعدد الفواتير والسقف المالي
        // ==========================================

        /**
         * يتحقق من إمكانية فتح فاتورة جديدة لعميل لديه فاتورة نشطة حالياً.
         * @param {number} creditScore - التقييم الائتماني الحالي للعميل.
         * @param {number} monthlyIncome - الدخل الشهري.
         * @param {number} currentDebt - إجمالي المديونية الحالية (الدين المتبقي).
         * @param {number} totalPaid - إجمالي المدفوع حتى الآن على الدين الحالي.
         * @param {number} newInvoiceTotal - قيمة الفاتورة الجديدة.
         * @returns {Object} { can, msg, creditLimit }
         */
        canOpenMultiInvoice: function(creditScore, monthlyIncome, currentDebt, totalPaid, newInvoiceTotal) {
            try {
                const conf = getConfig().creditPolicy;
                const minScore = conf.minScoreToEntry;

                // 1. فحص السكور الأساسي
                if (creditScore < minScore) {
                    return { can: false, msg: `مرفوض: السكور الائتماني للعميل (${creditScore}) أقل من الحد الأدنى (${minScore}).` };
                }

                // 2. حساب الدخل المعتمد (إذا كان الدخل غير معروف، نستخدم السجل السابق)
                const incomeToUse = (monthlyIncome > 0) ? monthlyIncome : (totalPaid > 0 ? totalPaid / 2 : 1000);

                // 3. حساب السقف الائتماني
                const multiplier = conf.creditLimitMultiplier || 5;
                const maxCreditLimit = (incomeToUse * multiplier) * (creditScore / 100);

                // 4. فحص تخطي السقف (نستخدم المديونية الحالية + الجديدة)
                if ((currentDebt + newInvoiceTotal) > maxCreditLimit) {
                    return {
                        can: false,
                        msg: `مرفوض: إجمالي المديونية (${Math.round(currentDebt + newInvoiceTotal).toLocaleString()} ج) سيتخطى السقف الآمن (${Math.round(maxCreditLimit).toLocaleString()} ج).`
                    };
                }

                // 5. فحص الالتزام السابق: يجب أن يكون قد سدد نسبة معينة من ديونه القديمة
                const requiredRatio = conf.requiredPaymentRatioForNewInvoice || 0.3;
                if (currentDebt > 0 && totalPaid < (currentDebt * requiredRatio)) {
                    return { can: false, msg: `مرفوض: يجب سداد ${requiredRatio*100}% على الأقل من المديونية الحالية لفتح فاتورة جديدة.` };
                }

                return { can: true, msg: '✅ العميل مؤهل. السقف المالي يسمح بإتمام العملية.', creditLimit: maxCreditLimit };
            } catch (error) {
                console.error('XCore.canOpenMultiInvoice error:', error);
                return { can: false, msg: '⚠️ خطأ في تقييم الأهلية.' };
            }
        },

        // ==========================================
        // 4. حاسبة شروط البيع والمقدم التلقائي
        // ==========================================

        /**
         * حساب شروط التقسيط (المقدم، المدة، الوثائق المطلوبة).
         * @param {number} totalAmount - قيمة الفاتورة.
         * @param {string} instType - نوع التقسيط ('monthly' أو 'daily').
         * @param {number} desiredInstValue - قيمة القسط التي يقدر العميل على دفعه.
         * @param {number} purchaseDay - يوم الشراء (1-31).
         * @returns {Object} { downPayment, maxMonths, calculatedPeriods, docs, error }
         */
        calculateSaleTerms: function(totalAmount, instType, desiredInstValue, purchaseDay) {
            try {
                // التحقق من المدخلات
                if (!totalAmount || totalAmount <= 0) {
                    return { error: 'قيمة الفاتورة غير صحيحة.' };
                }
                if (!desiredInstValue || desiredInstValue <= 0) {
                    return { error: 'قيمة القسط المطلوبة غير صحيحة.' };
                }
                if (!instType || !['monthly', 'daily'].includes(instType)) {
                    return { error: 'نوع التقسيط غير معروف.' };
                }

                const termsConf = getConfig().salesTerms;
                const minInst = termsConf.minInstallment || { daily: 50, monthly: 500 };

                // التحقق من الحد الأدنى للقسط
                if (instType === 'daily' && desiredInstValue < minInst.daily) {
                    return { error: `القسط اليومي لا يقل عن ${minInst.daily} ج.` };
                }
                if (instType === 'monthly' && desiredInstValue < minInst.monthly) {
                    return { error: `القسط الشهري لا يقل عن ${minInst.monthly} ج.` };
                }

                // التحقق من يوم الشراء
                const day = (purchaseDay && purchaseDay >= 1 && purchaseDay <= 31) ? purchaseDay : 1;

                // حساب المقدم
                let downPayment = 0;
                const logic = instType === 'monthly'
                    ? termsConf.downPaymentLogic?.monthly
                    : termsConf.downPaymentLogic?.daily;

                if (instType === 'monthly') {
                    if (logic === 'ONE_MONTH_PREPAID') {
                        downPayment = desiredInstValue;
                    } else if (logic === 'PERCENTAGE') {
                        downPayment = totalAmount * 0.2; // 20% افتراضي
                    } else {
                        downPayment = 0;
                    }
                } else { // daily
                    if (logic === 'DAYS_OF_MONTH') {
                        downPayment = desiredInstValue * day;
                    } else {
                        downPayment = desiredInstValue;
                    }
                }

                // تطبيق الحد الأقصى للمقدم
                const maxDownPayment = totalAmount * (termsConf.maxDownPaymentRatio || 0.5);
                if (downPayment > maxDownPayment) {
                    downPayment = maxDownPayment;
                }

                const remainingDebt = totalAmount - downPayment;
                if (remainingDebt <= 0) {
                    return { error: 'المقدم يساوي أو يتجاوز قيمة الفاتورة.' };
                }

                // حساب عدد الأقساط (أيام أو شهور)
                const calculatedPeriods = remainingDebt / desiredInstValue; // قد يكون كسراً

                // تحويل الأيام إلى أشهر للمقارنة مع المدة القصوى
                const calculatedMonths = instType === 'daily' ? (calculatedPeriods / 30) : calculatedPeriods;

                // تحديد الشريحة المناسبة (حسب قيمة الفاتورة)
                const tiers = termsConf.durationTiers || [
                    { maxAmount: 100000, maxMonths: 10, docs: 'RECEIPTS' },
                    { maxAmount: 1000000, maxMonths: 15, docs: 'CHECKS' }
                ];
                let matchedTier = tiers.find(t => totalAmount <= t.maxAmount);
                if (!matchedTier) matchedTier = tiers[tiers.length - 1];

                // التحقق من المدة
                if (calculatedMonths > matchedTier.maxMonths) {
                    return {
                        error: `مرفوض: قدرة العميل (${desiredInstValue} ج) ستجعل مدة التقسيط (${Math.ceil(calculatedMonths)} شهراً) تتخطى الحد الأقصى (${matchedTier.maxMonths} شهراً).`
                    };
                }

                // وصف الوثائق
                let docsDescription = '';
                if (matchedTier.docs === 'CHECKS') {
                    docsDescription = 'توقيع شيكات بنكية بكامل القيمة الإجمالية كضمان.';
                } else {
                    docsDescription = 'توقيع إيصالات أمانة ورقية بقيمة الأقساط.';
                }

                return {
                    downPayment: Math.ceil(downPayment),
                    maxMonths: matchedTier.maxMonths,
                    calculatedPeriods: Math.ceil(calculatedPeriods), // عدد الأقساط (أيام أو شهور)
                    docs: { type: matchedTier.docs, description: docsDescription },
                    remainingDebt: Math.ceil(remainingDebt)
                };
            } catch (error) {
                console.error('XCore.calculateSaleTerms error:', error);
                return { error: '⚠️ خطأ في حساب شروط البيع.' };
            }
        },

        // ==========================================
        // 5. الرقابة القانونية للمتعثرين
        // ==========================================

        /**
         * مراقبة حالة التأخير للعميل وتحديد الإجراء المناسب.
         * @param {Array} installments - قائمة الأقساط الخاصة بالعميل.
         * @param {string} type - نوع التقسيط ('daily' أو 'monthly').
         * @param {number} creditLimit - الحد الائتماني للعميل (اختياري).
         * @returns {Object} { status, days, msg }
         */
        monitorLegalStatus: function(installments, type, creditLimit = Infinity) {
            try {
                const legal = getConfig().legalPolicy;
                const today = new Date();

                // الأقساط المعلقة فقط
                const pending = (installments || []).filter(i => i.status === 'pending');
                if (pending.length === 0) {
                    return { status: 'SAFE', days: 0, msg: 'لا توجد أقساط متأخرة.' };
                }

                // أقدم قسط معلق
                const oldestInst = pending.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
                const dueDate = new Date(oldestInst.due_date);
                const delayDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

                if (delayDays <= 0) {
                    return { status: 'SAFE', days: 0, msg: 'لا توجد أقساط متأخرة.' };
                }

                // إيقاف العداد إذا تخطت المديونية سقف الائتمان
                if (legal.stopDelayCounterAtLimit) {
                    const totalOwed = pending.reduce((sum, inst) => sum + Number(inst.amount), 0);
                    if (totalOwed >= creditLimit) {
                        return { status: 'CAPPED', days: delayDays, msg: 'وصل إلى الحد الأقصى للمديونية، تم إيقاف عداد التأخير.' };
                    }
                }

                const threshold = type === 'daily' ? legal.thresholds?.daily : legal.thresholds?.monthly;
                if (delayDays >= threshold) {
                    return { status: 'LEGAL', days: delayDays, msg: `تأخير ${delayDays} يوم - تجاوز الحد القانوني، يوصى باتخاذ إجراء قانوني.` };
                }

                return { status: 'OVERDUE', days: delayDays, msg: `تأخير ${delayDays} يوم - تحت المراقبة.` };
            } catch (error) {
                console.error('XCore.monitorLegalStatus error:', error);
                return { status: 'ERROR', days: 0, msg: '⚠️ خطأ في مراقبة الحالة.' };
            }
        },

        // ==========================================
        // 6. حاسبة الزكاة (لأغراض التقارير المالية)
        // ==========================================

        /**
         * حساب الزكاة المستحقة على الأموال المستثمرة.
         * @param {number} totalWealth - إجمالي المال الذي حال عليه الحول.
         * @param {number} zakatRate - نسبة الزكاة (افتراضي 0.025 أي 2.5%).
         * @returns {Object} { zakatDue, nisabMet, msg }
         */
        calculateZakat: function(totalWealth, zakatRate = 0.025) {
            try {
                const nisab = 85 * 2.5; // 85 جرام ذهب * سعر الجرام تقريباً (يمكن تحديثه من XConfig)
                const actualNisab = window.XConfig?.zakat?.nisabValue || nisab;
                if (totalWealth < actualNisab) {
                    return { zakatDue: 0, nisabMet: false, msg: 'المال لا يبلغ النصاب، لا زكاة عليك.' };
                }
                const zakat = totalWealth * zakatRate;
                return { zakatDue: Math.round(zakat), nisabMet: true, msg: `الزكاة المستحقة: ${Math.round(zakat)} ج` };
            } catch (error) {
                console.error('XCore.calculateZakat error:', error);
                return { zakatDue: 0, nisabMet: false, msg: '⚠️ خطأ في حساب الزكاة.' };
            }
        }
    };

    // التحقق من التبعيات
    checkDependencies();

    // تجميد الكائن لمنع التعديل
    window.XCore = Object.freeze(XCore);

})();
