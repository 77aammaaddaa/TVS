import { useState, useEffect } from "react";
import { 
    Clock, 
    Wallet, 
    AlertCircle, 
    CheckCircle, 
    Lock, 
    Unlock, 
    History, 
    User, 
    Loader2 
} from "lucide-react";
import { shiftsAPI, type ShiftRecord } from "@/services/api";
// Assuming you have a vaults API to fetch available vaults for the dropdown
import { vaultsAPI, type VaultRecord } from "@/services/api"; 
import type { User as AuthUser } from "@/types/auth";

interface ShiftsPageProps {
    currentUser: AuthUser;
}

export default function ShiftsPage({ currentUser }: ShiftsPageProps) {
    const isManagement = ['OWNER', 'MODERATOR', 'ACCOUNTANT'].includes(currentUser.role);
    
    const [activeTab, setActiveTab] = useState<"my_shift" | "history">("my_shift");
    const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
    const [historicalShifts, setHistoricalShifts] = useState<ShiftRecord[]>([]);
    const [vaults, setVaults] = useState<VaultRecord[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form States
    const [openVaultId, setOpenVaultId] = useState("");
    const [openBalance, setOpenBalance] = useState<number | "">("");
    const [closeBalance, setCloseBalance] = useState<number | "">("");
    const [closeNotes, setCloseNotes] = useState("");

    const loadActiveShift = async () => {
        try {
            const res = await shiftsAPI.getActive();
            setActiveShift(res.data.shift);
        } catch (err: any) {
            console.error(err);
        }
    };

    const loadVaults = async () => {
        try {
            const res = await vaultsAPI.list(); // Assumes this endpoint exists
            setVaults(res.data.vaults || []);
        } catch (err: any) {
            console.error(err);
        }
    };

    const loadHistory = async () => {
        if (!isManagement) return;
        setLoading(true);
        try {
            const res = await shiftsAPI.getHistory();
            setHistoricalShifts(res.data.shifts || []);
        } catch (err: any) {
            setError(err.message || "فشل تحميل سجل الورديات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadActiveShift();
        loadVaults();
        if (activeTab === "history") {
            loadHistory();
        }
    }, [activeTab]);

    const handleOpenShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!openVaultId || openBalance === "") return setError("الرجاء تحديد الخزينة والرصيد الافتتاحي");
        
        setActionLoading(true);
        setError(null);
        try {
            const res = await shiftsAPI.open({ 
                vault_id: openVaultId, 
                starting_balance: Number(openBalance) 
            });
            setActiveShift(res.data.shift);
            setSuccess("تم فتح الوردية بنجاح");
            setOpenVaultId("");
            setOpenBalance("");
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "فشل في فتح الوردية");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeShift) return;
        if (closeBalance === "") return setError("الرجاء إدخال الرصيد الفعلي للإغلاق");

        setActionLoading(true);
        setError(null);
        try {
            await shiftsAPI.close(activeShift.id, { 
                actual_closing_balance: Number(closeBalance),
                notes: closeNotes
            });
            setActiveShift(null);
            setSuccess("تم إغلاق الوردية وتوريد العهدة بنجاح");
            setCloseBalance("");
            setCloseNotes("");
            if (isManagement && activeTab === "history") loadHistory();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "فشل في إغلاق الوردية");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans animate-in fade-in" dir="rtl">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Clock className="text-blue-600" />
                        إدارة الورديات والعهد
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        إدارة استلام وتسليم الخزينة وتتبع العجز والزيادة
                    </p>
                </div>

                {isManagement && (
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("my_shift")}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === "my_shift" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            ورديتي الحالية
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === "history" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <History className="w-4 h-4" />
                            سجل الورديات
                        </button>
                    </div>
                )}
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center gap-3 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}
            {success && (
                <div className="p-4 mb-6 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl flex items-center gap-3 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 shrink-0" /> {success}
                </div>
            )}

            {/* Tab: My Shift */}
            {activeTab === "my_shift" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Status Card */}
                    <div className="bg-white rounded-3xl shadow-sm border p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                        {activeShift ? (
                            <>
                                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
                                    <Unlock className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">الوردية مفتوحة</h3>
                                <p className="text-slate-500 mb-8">أنت الآن تستخدم خزينة العمليات</p>
                                
                                <div className="w-full bg-slate-50 rounded-2xl p-6 text-right space-y-4 border border-slate-100">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                        <span className="text-slate-500 text-sm font-bold">وقت الفتح</span>
                                        <span className="font-mono text-slate-800 font-bold" dir="ltr">
                                            {new Date(activeShift.opened_at).toLocaleString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm font-bold">الرصيد الافتتاحي</span>
                                        <span className="font-black text-lg text-slate-800">
                                            {activeShift.starting_balance.toLocaleString()} ج.م
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6">
                                    <Lock className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-2">الوردية مغلقة</h3>
                                <p className="text-slate-500">يجب فتح وردية جديدة للبدء في إجراء العمليات المالية</p>
                            </>
                        )}
                    </div>

                    {/* Action Form */}
                    <div className="bg-white rounded-3xl shadow-sm border p-8">
                        {activeShift ? (
                            // Close Shift Form
                            <form onSubmit={handleCloseShift} className="space-y-6">
                                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg">إغلاق الوردية الحالية</h3>
                                        <p className="text-xs text-slate-500 font-bold">تسليم العهدة وترحيل الرصيد</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-2">الرصيد الفعلي بالخزينة *</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="0.00"
                                            value={closeBalance}
                                            onChange={(e) => setCloseBalance(e.target.value ? Number(e.target.value) : "")}
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ج.م</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-2">ملاحظات الإغلاق (اختياري)</label>
                                    <textarea
                                        rows={3}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="اكتب أي ملاحظات عن العجز أو الزيادة إن وجدت..."
                                        value={closeNotes}
                                        onChange={(e) => setCloseNotes(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                                    إغلاق الوردية وترحيل العهدة
                                </button>
                                <p className="text-[10px] text-center text-slate-400 font-bold mt-4">
                                    بمجرد الإغلاق، سيتم تحويل الرصيد الفعلي تلقائياً إلى الخزينة الرئيسية وتسجيل أي عجز بالذمة المالية.
                                </p>
                            </form>
                        ) : (
                            // Open Shift Form
                            <form onSubmit={handleOpenShift} className="space-y-6">
                                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Unlock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg">فتح وردية جديدة</h3>
                                        <p className="text-xs text-slate-500 font-bold">استلام درج النقدية وبدء العمل</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-2">الخزينة المستلمة *</label>
                                    <div className="relative">
                                        <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <select
                                            required
                                            className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            value={openVaultId}
                                            onChange={(e) => setOpenVaultId(e.target.value)}
                                        >
                                            <option value="">اختر درج النقدية...</option>
                                            {vaults.filter(v => !v.is_main_vault).map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-2">الرصيد الافتتاحي المستلم *</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="0.00"
                                            value={openBalance}
                                            onChange={(e) => setOpenBalance(e.target.value ? Number(e.target.value) : "")}
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ج.م</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4"
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
                                    فتح الوردية
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: History (Management Only) */}
            {isManagement && activeTab === "history" && (
                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center p-20">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : historicalShifts.length === 0 ? (
                        <div className="text-center p-20 text-slate-500 font-bold text-sm">
                            لا توجد ورديات مغلقة حتى الآن
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scroll">
                            <table className="w-full text-sm text-right whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black">
                                    <tr>
                                        <th className="p-4">تاريخ الوردية</th>
                                        <th className="p-4">الموظف</th>
                                        <th className="p-4">الخزينة</th>
                                        <th className="p-4 text-left">الافتتاحي</th>
                                        <th className="p-4 text-left">النظام المتوقع</th>
                                        <th className="p-4 text-left">الفعلي المستلم</th>
                                        <th className="p-4 text-center">الفارق</th>
                                        <th className="p-4">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {historicalShifts.map((s) => (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-mono text-xs text-slate-500" dir="ltr">
                                                {new Date(s.closed_at!).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}<br/>
                                                {new Date(s.closed_at!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                                        <User className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                    <span className="truncate max-w-[120px]">{s.employee?.person?.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-500">{s.vault?.name}</td>
                                            <td className="p-4 text-left">{s.starting_balance.toLocaleString()}</td>
                                            <td className="p-4 text-left text-slate-400">{s.expected_closing_balance?.toLocaleString()}</td>
                                            <td className="p-4 text-left">{s.actual_closing_balance?.toLocaleString()}</td>
                                            <td className="p-4 text-center">
                                                {s.difference_amount === 0 ? (
                                                    <span className="text-emerald-500">0</span>
                                                ) : (s.difference_amount ?? 0) < 0 ? (
                                                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                                        {s.difference_amount?.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                                        +{s.difference_amount?.toLocaleString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {s.shortage_status === 'عجز' ? (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                        <AlertCircle className="w-3 h-3" /> عجز
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                        <CheckCircle className="w-3 h-3" /> متطابق
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}