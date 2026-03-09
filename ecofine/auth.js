// auth.js - محرك الحماية وتوزيع الصلاحيات (X-Guard V6)

const XGuard = {
    // تعريف الأدوار (Roles) وصلاحيات كل دور
    roles: {
        'CEO': {
            label: 'المدير العام',
            access: ['all'], // مسموح له بكل شيء
            color: 'bg-slate-900'
        },
        'MODERATOR': {
            label: 'مدير صفحات / مبيعات',
            access: ['crm', 'inventory', 'pos'], // لا يرى الخزينة أو القانونية
            color: 'bg-blue-600'
        },
        'COLLECTOR': {
            label: 'محصل ميداني',
            access: ['collection', 'crm'], // يرى العملاء لتحصيل المبالغ فقط
            color: 'bg-green-600'
        },
        'LAWYER': {
            label: 'المستشار القانوني',
            access: ['legal', 'crm'],
            color: 'bg-red-600'
        }
    },

    // دالة التحقق من الصلاحية
    canAccess: (userRole, moduleId) => {
        const permissions = XGuard.roles[userRole]?.access;
        if (!permissions) return false;
        return permissions.includes('all') || permissions.includes(moduleId);
    }
};

window.XGuard = XGuard;
