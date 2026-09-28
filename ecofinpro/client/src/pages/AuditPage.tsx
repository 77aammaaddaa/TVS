import { useState, useEffect, useMemo } from "react";
import { auditAPI, AuditLogRecord } from "@/services/api";
import { ShieldCheck, AlertTriangle, Info, Trash2, Search, Activity, ShieldAlert, Key } from "lucide-react";

interface AuditPageProps {
    currentUser: { role: string; username: string; };
}

export default function AuditPage({ currentUser }: AuditPageProps) {
    const [logs, setLogs] = useState<AuditLogRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ user: '', module: '', severity: '', search: '' });

    // Sovereign Protection Gate
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MODERATOR') {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-red-50 rounded-3xl border border-red-100 animate-in fade-in">
                <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
                <h2 className="text-2xl font-black text-red-700">منطقة محظورة أمنياً</h2>
                <p className="text-sm text-red-500 font-bold mt-2 text-center max-w-md">
                    هذا السجل سري للغاية. مصرح للإدارة العليا فقط بالوصول.<br/>
                    تم تسجيل هذه المحاولة في قاعدة البيانات.
                </p>
            </div>
        );
    }

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const { data } = await auditAPI.list();
            setLogs(data.logs);
        } catch (err) {
            console.error("فشل تحميل السجلات:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadLogs(); }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchUser = filters.user ? log.username === filters.user : true;
            const matchModule = filters.module ? log.module === filters.module : true;
            const matchSeverity = filters.severity ? log.severity === filters.severity : true;
            const matchSearch = filters.search ? (log.action.includes(filters.search) || log.details.includes(filters.search)) : true;
            return matchUser && matchModule && matchSeverity && matchSearch;
        });
    }, [logs, filters]);

    const stats = useMemo(() => {
        return {
            total: logs.length,
            critical: logs.filter(l => l.severity === 'critical').length,
            warnings: logs.filter(l => l.severity === 'warning').length,
            today: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length
        };
    }, [logs]);

    const handleClearLogs = async () => {
        if (currentUser?.role !== 'OWNER') {
            return alert("⛔ المالك فقط يمكنه مسح السجلات.");
        }
        const confirmCode = prompt("⚠️ تحذير سيادي: مسح السجلات سيزيل كل الأدلة التاريخية للنظام ولن يمكن استعادتها.\nاكتب 'CONFIRM' للتأكيد:");
        if (confirmCode === 'CONFIRM') {
            try {
                await auditAPI.clear();
                loadLogs();
            } catch (e: any) {
                alert("حدث خطأ أثناء مسح السجلات: " + e.message);
            }
        }
    };

    const uniqueUsers = [...new Set(logs.map(l => l.username).filter(Boolean))];
    const uniqueModules = [...new Set(logs.map(l => l.module).filter(Boolean))];

    const getSeverityConfig = (sev: string) => {
        switch (sev) {
            case 'critical': return { color: 'text-red-600', bg: 'bg-red-50/50', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> };
            case 'warning': return { color: 'text-amber-600', bg: 'bg-amber-50/50', icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> };
            default: return { color: 'text-blue-600', bg: '', icon: <Info className="w-4 h-4 text-blue-600" /> };
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <Activity className="absolute -left-4 -bottom-4 w-24 h-24 text-white/5" />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 relative z-10">إجمالي الحركات</p>
                    <h3 className="text-3xl font-black relative z-10">{stats.total}</h3>
                </div>
                <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm">
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">عمليات حرجة (خطيرة)</p>
                    <h3 className="text-3xl font-black text-red-700">{stats.critical}</h3>
                </div>
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm">
                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-1">تحذيرات النظام</p>
                    <h3 className="text-3xl font-black text-amber-700">{stats.warnings}</h3>
                </div>
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">حركات اليوم</p>
                    <h3 className="text-3xl font-black text-blue-700">{stats.today}</h3>
                </div>
            </div>

            {/* Main Log Area */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                
                {/* Header & Filters */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-xl"><ShieldCheck className="w-6 h-6 text-blue-700" /></div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800">سجل المراقبة (Audit Log)</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">تتبع شامل لكل العمليات المشفرة</p>
                            </div>
                        </div>
                        {currentUser?.role === 'OWNER' && (
                            <button onClick={handleClearLogs} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-2 border border-red-200">
                                <Trash2 className="w-4 h-4" /> مسح السجل
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="relative">
                            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="ابحث في التفاصيل..." className="w-full p-2.5 pr-9 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                        </div>
                        <select className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500 text-slate-600" value={filters.severity} onChange={e => setFilters({...filters, severity: e.target.value})}>
                            <option value="">كل المستويات</option>
                            <option value="info">معلومة</option>
                            <option value="warning">تحذير</option>
                            <option value="critical">حرج (خطير)</option>
                        </select>
                        <select className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500 text-slate-600" value={filters.user} onChange={e => setFilters({...filters, user: e.target.value})}>
                            <option value="">كل المستخدمين</option>
                            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500 text-slate-600" value={filters.module} onChange={e => setFilters({...filters, module: e.target.value})}>
                            <option value="">كل الموديولات</option>
                            {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                {/* Table Area */}
                <div className="overflow-auto flex-1 custom-scroll">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">جاري تحميل السجلات المشفرة...</div>
                    ) : (
                        <table className="w-full text-right whitespace-nowrap">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">التاريخ والوقت</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">المستخدم</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">الموديول</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400">العملية</th>
                                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 w-full">التفاصيل التقنية</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                {filteredLogs.length > 0 ? filteredLogs.map(log => {
                                    const conf = getSeverityConfig(log.severity);
                                    return (
                                        <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${conf.bg}`}>
                                            <td className="p-4 text-[10px] text-slate-500 font-mono" dir="ltr">
                                                {new Date(log.timestamp).toLocaleString('ar-EG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1.5 w-max">
                                                    <Key className="w-3 h-3 text-slate-400" /> {log.username}
                                                </span>
                                            </td>
                                            <td className="p-4"><span className="text-[10px] uppercase text-slate-400 font-black tracking-widest">{log.module}</span></td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {conf.icon} <span className={conf.color}>{log.action}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-normal min-w-[300px] text-[10px] text-slate-500 leading-relaxed font-medium">
                                                {log.details}
                                                {log.ip_address && <div className="mt-1 text-slate-400">IP: <span dir="ltr">{log.ip_address}</span></div>}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 text-sm">لا توجد سجلات مطابقة للفلاتر</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}