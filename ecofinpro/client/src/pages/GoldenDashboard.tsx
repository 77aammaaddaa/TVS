import { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    Wallet, 
    Landmark,
    ArrowDownRight,
    ArrowUpRight
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Legend
} from 'recharts';
import { dashboardAPI, GoldenDashboardData } from '@/services/api';
import type { User } from '@/types/auth';

export default function GoldenDashboard({ currentUser }: { currentUser: User }) {
    const [data, setData] = useState<GoldenDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardAPI.getGoldenData().then(res => {
            setData(res);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (currentUser.role !== 'OWNER' && currentUser.role !== 'MODERATOR') {
        return <div className="p-10 text-center text-red-600 font-bold bg-red-50 rounded-2xl mx-auto mt-10 max-w-lg border border-red-100">⛔ غير مصرح لك بالوصول للوحة القيادة</div>;
    }

    if (loading || !data) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>;

    const { financials, chartData } = data;

    return (
        <div className="space-y-8 font-sans animate-in fade-in duration-500 pb-10" dir="rtl">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-xl">
                    <TrendingUp className="text-amber-600 w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">اللوحة الذهبية للقيادة</h1>
                    <p className="text-sm font-bold text-gray-500 mt-1">مؤشرات الأداء المالي الحية للمؤسسة</p>
                </div>
            </div>

            {/* Financial Top-Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-900/20">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">إجمالي النقد المتاح</p>
                        <Wallet className="text-emerald-400 w-5 h-5 opacity-50" />
                    </div>
                    <h3 className="text-3xl font-black">{financials.totalCash.toLocaleString()} <span className="text-sm font-medium text-slate-500">ج.م</span></h3>
                    <div className="mt-4 flex gap-4 text-[10px] font-bold text-slate-400">
                        <span>خزائن: {financials.totalVaultCash.toLocaleString()}</span>
                        <span>محافظ: {financials.totalWalletCash.toLocaleString()}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">مستحقات لنا (أقساط)</p>
                        <ArrowUpRight className="text-blue-500 w-5 h-5" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-800">{financials.totalReceivables.toLocaleString()} <span className="text-sm font-medium text-gray-400">ج.م</span></h3>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">مديونيات علينا (موردين)</p>
                        <ArrowDownRight className="text-red-500 w-5 h-5" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-800">{financials.totalPayables.toLocaleString()} <span className="text-sm font-medium text-gray-400">ج.م</span></h3>
                </div>

                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">صافي السيولة المؤسسية</p>
                        <Landmark className="text-amber-500 w-5 h-5" />
                    </div>
                    <h3 className={`text-3xl font-black ${financials.netLiquidity < 0 ? 'text-red-600' : 'text-amber-700'}`}>
                        {financials.netLiquidity.toLocaleString()} <span className="text-sm font-medium opacity-50">ج.م</span>
                    </h3>
                </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-base font-black text-gray-800 mb-6">حركة الإيرادات والمصروفات (آخر 7 أيام)</h3>
                <div className="h-[350px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} dx={-10} />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                            <Bar dataKey="revenue" name="إيرادات" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="expense" name="مصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}