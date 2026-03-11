/**
 * 👁️ X-Audit.js - نظام المراقبة الشامل والتحليل الأمني (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: الصندوق الأسود للنظام، يسجل كل الحركات ويرصد التلاعب أو العمليات الحساسة.
 */

// ==========================================
// 🛡️ 1. محرك التعقب الخلفي (X-Audit Engine)
// يمكن استدعاؤه من أي موديول: window.XAudit.log(...)
// ==========================================
window.XAudit = {
    log: async (action, moduleName, details, severity = 'info', username = 'النظام') => {
        if (!window.db) return;
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: action,
                module: moduleName,
                details: details,
                severity: severity, // info, warning, critical
                user: username
            };
            await window.db.add('audit_logs', logEntry);
        } catch (err) {
            console.error("❌ فشل تسجيل حركة المراقبة:", err);
        }
    }
};

// ==========================================
// 📊 2. لوحة تحكم المراقبة السيادية (Audit UI)
// ==========================================
const { useState, useEffect, useMemo } = React;

const AuditModule = ({ currentUser }) => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ user: '', module: '', severity: '', search: '' });

    // ⛔ حماية سيادية: هذه الشاشة للمالك (OWNER) أو مدير النظام (MODERATOR) فقط
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MODERATOR') {
        window.XAudit.log('محاولة وصول غير مصرح بها', 'الأمن', `حاول ${currentUser?.username || 'مجهول'} فتح سجل المراقبة`, 'critical', currentUser?.username);
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[2.5rem] border border-red-100">
                <span className="text-6xl mb-4">⛔</span>
                <h2 className="text-xl font-black text-red-600">منطقة محظورة</h2>
                <p className="text-xs text-red-400 font-bold mt-2">هذا السجل سري للغاية، مصرح للإدارة العليا فقط بالوصول.</p>
            </div>
        );
    }

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const data = await window.db.getAll('audit_logs');
            // ترتيب من الأحدث للأقدم
            setLogs((data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } catch (err) {
            console.error("فشل تحميل السجلات:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadLogs(); }, []);

    // فلترة السجلات
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchUser = filters.user ? log.user === filters.user : true;
            const matchModule = filters.module ? log.module === filters.module : true;
            const matchSeverity = filters.severity ? log.severity === filters.severity : true;
            const matchSearch = filters.search ? (log.action.includes(filters.search) || log.details.includes(filters.search)) : true;
            return matchUser && matchModule && matchSeverity && matchSearch;
        });
    }, [logs, filters]);

    // الإحصائيات السريعة
    const stats = useMemo(() => {
        return {
            total: logs.length,
            critical: logs.filter(l => l.severity === 'critical').length,
            warnings: logs.filter(l => l.severity === 'warning').length,
            today: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length
        };
    }, [logs]);

    const clearLogs = async () => {
        if (currentUser?.role !== 'OWNER') {
            return alert("⛔ المالك فقط يمكنه مسح السجلات.");
        }
        const confirmCode = prompt("⚠️ تحذير: مسح السجلات سيزيل كل الأدلة التاريخية للنظام.\nاكتب 'CONFIRM' للتأكيد:");
        if (confirmCode === 'CONFIRM') {
            try {
                // يفترض وجود دالة clearTable في db أو نمر على العناصر ونحذفها
                const allLogs = await window.db.getAll('audit_logs');
                for (let l of allLogs) await window.db.delete('audit_logs', l.id);
                await window.XAudit.log('مسح سجل المراقبة', 'الأمن', 'تم مسح كامل السجل', 'critical', currentUser.username);
                loadLogs();
            } catch (e) {
                alert("حدث خطأ أثناء مسح السجلات.");
            }
        }
    };

    const severityConfig = {
        info: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'معلومة', icon: 'ℹ️' },
        warning: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'تحذير', icon: '⚠️' },
        critical: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'حرج / خطير', icon: '🚨' }
    };

    // استخراج قائمة المستخدمين والموديولات للفلاتر
    const uniqueUsers = [...new Set(logs.map(l => l.user))];
    const uniqueModules = [...new Set(logs.map(l => l.module))];

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* الهيدر والإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-lg">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إجمالي الحركات</p>
                    <h3 className="text-3xl font-black">{stats.total}</h3>
                </div>
                <div className="bg-red-50 p-5 rounded-[2rem] border border-red-100 shadow-sm">
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">عمليات حرجة (خطيرة)</p>
                    <h3 className="text-3xl font-black text-red-700">{stats.critical}</h3>
                </div>
                <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 shadow-sm">
                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-1">تحذيرات النظام</p>
                    <h3 className="text-3xl font-black text-amber-700">{stats.warnings}</h3>
                </div>
                <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 shadow-sm">
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">حركات اليوم</p>
                    <h3 className="text-3xl font-black text-blue-700">{stats.today}</h3>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                {/* شريط الأدوات والفلاتر */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <span className="text-2xl">👁️</span> سجل المراقبة (Audit Log)
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">تتبع شامل لكل العمليات في إكس القابضة</p>
                        </div>
                        <button onClick={clearLogs} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md transition-colors flex items-center gap-2">
                            <span>🗑️</span> مسح السجل التاريخي
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        <input type="text" placeholder="ابحث في التفاصيل..." className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                        
                        <select className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500" value={filters.severity} onChange={e => setFilters({...filters, severity: e.target.value})}>
                            <option value="">كل مستويات الخطورة</option>
                            <option value="info">معلومة ℹ️</option>
                            <option value="warning">تحذير ⚠️</option>
                            <option value="critical">حرج 🚨</option>
                        </select>

                        <select className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500" value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})}>
                            <option value="">كل المستخدمين</option>
                            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>

                        <select className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500" value={filters.module} onChange={e => setFilters({...filters, module: e.target.value})}>
                            <option value="">كل الموديولات</option>
                            {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                {/* جدول السجلات */}
                <div className="overflow-x-auto w-full">
                    {isLoading ? (
                        <div className="p-20 text-center text-slate-400 font-bold">جاري تحميل الأدلة...</div>
                    ) : (
                        <table className="w-full text-right text-sm whitespace-nowrap">
                            <thead className="bg-white text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="p-5">التاريخ والوقت</th>
                                    <th className="p-5">المستخدم</th>
                                    <th className="p-5">الموديول</th>
                                    <th className="p-5">الحدث / العملية</th>
                                    <th className="p-5">التفاصيل التقنية</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-bold text-slate-700 text-xs">
                                {filteredLogs.length > 0 ? filteredLogs.map(log => {
                                    const conf = severityConfig[log.severity] || severityConfig.info;
                                    return (
                                        <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${log.severity === 'critical' ? 'bg-red-50/30' : ''}`}>
                                            <td className="p-5 text-[10px] text-slate-500" dir="ltr">
                                                {new Date(log.timestamp).toLocaleString('ar-EG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                                            </td>
                                            <td className="p-5">
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-[10px]">{log.user}</span>
                                            </td>
                                            <td className="p-5">
                                                <span className="text-[10px] uppercase text-slate-400">{log.module}</span>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2">
                                                    <span>{conf.icon}</span>
                                                    <span className={`${conf.color}`}>{log.action}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 whitespace-normal min-w-[250px] text-[10px] text-slate-500 leading-relaxed">
                                                {log.details}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">لا توجد سجلات مطابقة للفلاتر</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

window.AuditModule = AuditModule;
