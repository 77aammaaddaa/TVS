/**
 * 🔔 notifications.js - مركز التنبيهات والإنذارات المبكرة (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: مراقبة النواقص، الديون المتأخرة، وإرسال تنبيهات لحظية للإدارة.
 */

// ==========================================
// 1. المحرك الخلفي للمراقبة (X-Alerts Engine)
// يمكن استدعاؤه مع بداية تشغيل النظام أو مع كل عملية دخول
// ==========================================
window.XAlerts = {
    scanSystemHealth: async () => {
        if (!window.db) return;
        try {
            const [products, installments, customers, existingAlerts] = await Promise.all([
                window.db.getAll('products').catch(() => []),
                window.db.getAll('installments').catch(() => []),
                window.db.getAll('customers').catch(() => []),
                window.db.getAll('system_alerts').catch(() => []) // جدول التنبيهات
            ]);

            const today = new Date().toISOString().split('T')[0];
            let newAlerts = [];

            // 1. فحص نواقص المخزون
            const minStock = window.XConfig?.inventory?.globalMinStock || 3;
            products.forEach(p => {
                if (Number(p.stock) <= minStock) {
                    const isCrit = Number(p.stock) === 0;
                    const alertId = `INV_${p.id}_${today}`; // لمنع تكرار الإشعار في نفس اليوم
                    
                    if (!existingAlerts.some(a => a.ref_id === alertId)) {
                        newAlerts.push({
                            ref_id: alertId,
                            title: isCrit ? 'نفذت الكمية 🚨' : 'نواقص مخزن 📦',
                            message: `الصنف (${p.name}) رصيده الحالي ${p.stock}. يرجى عمل طلب شراء.`,
                            type: isCrit ? 'critical' : 'warning',
                            module_link: 'inventory',
                            created_at: new Date().toISOString(),
                            status: 'unread'
                        });
                    }
                }
            });

            // 2. فحص الديون والعملاء المتأخرين
            const legalThreshold = window.XConfig?.legalPolicy?.thresholds?.monthly || 35;
            installments.filter(i => i.status === 'pending').forEach(inst => {
                const due = new Date(inst.due_date);
                const now = new Date();
                const delayDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));

                if (delayDays >= legalThreshold) {
                    const customer = customers.find(c => c.id === inst.customer_id);
                    const alertId = `DEBT_${inst.id}_${today}`;

                    if (!existingAlerts.some(a => a.ref_id === alertId)) {
                        newAlerts.push({
                            ref_id: alertId,
                            title: 'تحذير قانوني ⚖️',
                            message: `العميل (${customer?.full_name || 'مجهول'}) متأخر في السداد لمدة ${delayDays} يوم. يجب اتخاذ إجراء.`,
                            type: 'critical',
                            module_link: 'collection',
                            created_at: new Date().toISOString(),
                            status: 'unread'
                        });
                    }
                }
            });

            // حفظ التنبيهات الجديدة في القاعدة
            for (let alert of newAlerts) {
                await window.db.add('system_alerts', alert);
            }

            return newAlerts.length; // إرجاع عدد التنبيهات الجديدة لتحديث عداد الجرس العُلوي
        } catch (err) {
            console.error("فشل الفحص الآلي للنظام:", err);
            return 0;
        }
    }
};

// ==========================================
// 2. الواجهة المرئية لمركز التنبيهات (Notifications UI)
// ==========================================
const { useState, useEffect, useMemo } = React;

const NotificationsModule = ({ currentUser }) => {
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('unread'); // unread, all

    const loadAlerts = async () => {
        setIsLoading(true);
        try {
            // تشغيل الفحص الآلي أولاً لتحديث الداتا
            await window.XAlerts.scanSystemHealth();
            const data = await window.db.getAll('system_alerts');
            setAlerts((data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadAlerts(); }, []);

    const filteredAlerts = useMemo(() => {
        if (filter === 'unread') return alerts.filter(a => a.status === 'unread');
        return alerts;
    }, [alerts, filter]);

    const markAsRead = async (id) => {
        try {
            await window.db.update('system_alerts', id, { status: 'read' });
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'read' } : a));
        } catch (err) {
            console.error("فشل تحديث الإشعار");
        }
    };

    const markAllAsRead = async () => {
        const unread = alerts.filter(a => a.status === 'unread');
        for (let u of unread) {
            await window.db.update('system_alerts', u.id, { status: 'read' });
        }
        loadAlerts();
    };

    const getAlertStyle = (type, status) => {
        const opacity = status === 'read' ? 'opacity-50 grayscale' : 'opacity-100 shadow-md';
        if (type === 'critical') return `bg-red-50 border-red-200 text-red-800 ${opacity}`;
        if (type === 'warning') return `bg-amber-50 border-amber-200 text-amber-800 ${opacity}`;
        return `bg-blue-50 border-blue-200 text-blue-800 ${opacity}`;
    };

    if (isLoading) return <div className="p-20 text-center text-slate-400 font-black animate-pulse">جاري فحص شرايين النظام وجمع التنبيهات... ⏳</div>;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in max-w-4xl mx-auto">
            
            {/* الهيدر وشريط التحكم */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-2 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center text-2xl shadow-lg relative">
                        🔔
                        {alerts.filter(a => a.status === 'unread').length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black border-2 border-white animate-bounce">
                                {alerts.filter(a => a.status === 'unread').length}
                            </span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">مركز المراقبة والتنبيهات</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ذكاء اصطناعي تشغيلي (AI-Ops)</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
                        <button onClick={() => setFilter('unread')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'unread' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>الجديد 🔴</button>
                        <button onClick={() => setFilter('all')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500'}`}>الأرشيف 🗄️</button>
                    </div>
                    {filter === 'unread' && filteredAlerts.length > 0 && (
                        <button onClick={markAllAsRead} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-2xl text-[10px] font-black shadow-md transition-colors whitespace-nowrap">
                            مقروء للكل ✔️
                        </button>
                    )}
                </div>
            </div>

            {/* قائمة التنبيهات */}
            <div className="space-y-3">
                {filteredAlerts.map(alert => (
                    <div key={alert.id} className={`p-5 rounded-[2rem] border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${getAlertStyle(alert.type, alert.status)}`}>
                        <div className="flex items-start gap-4">
                            <span className="text-3xl mt-1">{alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                            <div>
                                <h4 className="font-black text-sm mb-1">{alert.title}</h4>
                                <p className="text-xs font-bold leading-relaxed opacity-90">{alert.message}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest mt-2 opacity-60" dir="ltr">
                                    {new Date(alert.created_at).toLocaleString('ar-EG')}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto shrink-0 mt-4 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-200/50">
                            {alert.status === 'unread' && (
                                <button onClick={() => markAsRead(alert.id)} className="flex-1 md:flex-none px-5 py-3 bg-white/50 hover:bg-white rounded-xl text-[10px] font-black transition-colors">
                                    تأكيد المعرفة ✔️
                                </button>
                            )}
                            <button onClick={() => alert("سيتم التوجيه إلى قسم: " + alert.module_link)} className="flex-1 md:flex-none px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black shadow-md hover:bg-slate-800 transition-colors">
                                اتخاذ إجراء ➔
                            </button>
                        </div>
                    </div>
                ))}

                {filteredAlerts.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
                        <span className="text-5xl mb-4 opacity-50">✨</span>
                        <p className="text-slate-500 font-black text-sm uppercase tracking-widest">النظام مستقر تماماً</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">لا توجد نواقص حرجة أو عملاء متأخرين حالياً.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

window.NotificationsModule = NotificationsModule;
