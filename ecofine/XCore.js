// XCore.js - العقل المفكر لنظام إكس القابضة (V6 - Background Processor)

const XCore = {
    // 1. محرك تقييم المخاطر (Risk Assessment Engine)
    calculateCreditScore: async (customerId) => {
        const journey = await db.getCustomerJourney(customerId);
        const customer = await db.getById('customers', customerId);
        
        let score = 50; // نقطة البداية

        // أ) تأثير الالتزام المالي
        if (journey.delay_days === 0 && journey.total_paid > 0) score += 20;
        if (journey.delay_days > 10) score -= 30;

        // ب) تأثير السكن والوظيفة
        if (customer.housing_type === 'تمليك') score += 10;
        if (customer.job_stability > 2) score += 10; // سنوات العمل

        // ج) ضمان الالتزام
        if (score < 30) return { score, status: 'HIGH_RISK', color: 'red' };
        if (score < 60) return { score, status: 'MEDIUM_RISK', color: 'orange' };
        return { score, status: 'SAFE', color: 'green' };
    },

    // 2. محرك الجدولة الآلية (Auto-Scheduler Engine)
    // هذا المحرك يولد الأقساط بناءً على "يوم التحصيل" المفضل للعميل
    generateInstallments: (totalAmount, months, startDate) => {
        const installments = [];
        const monthlyAmount = totalAmount / months;
        
        for (let i = 1; i <= months; i++) {
            let dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            installments.push({
                amount: monthlyAmount,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending'
            });
        }
        return installments;
    },

    // 3. محرك الرقابة (Audit Engine)
    // يراقب أي تلاعب في الأسعار أو الكميات
    logSecurityEvent: async (userId, action, details) => {
        await db.add('logs', {
            userId,
            action,
            details,
            severity: 'INFO',
            ip: 'local-redmi-10'
        });
    }
};

window.XCore = XCore;
