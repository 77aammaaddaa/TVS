import { useState, useEffect } from 'react';
import { 
    Clock, 
    Wallet, 
    ShoppingCart, 
    Package, 
    AlertTriangle,
    CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, HomeDashboardData } from '@/services/api';
import type { User } from '@/types/auth';

export default function HomePage({ currentUser }: { currentUser: User }) {
    const navigate = useNavigate();
    const [data, setData] = useState<HomeDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardAPI.getHomeData().then(res => {
            setData(res);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-2xl">
                    {currentUser.full_name?.charAt(0) || currentUser.username.charAt(0)}
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-800">مرحباً بك، {currentUser.full_name || currentUser.username}</h1>
                    <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">{currentUser.role}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Cashier Operations Widget */}
                {(data?.role === 'CASHIER' || data?.role === 'OWNER') && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <ShoppingCart className="text-blue-500 w-5 h-5" /> وردية المبيعات
                            </h3>
                        </div>
                        {data?.cashier?.activeShift ? (
                            <div className="space-y-3">
                                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> الوردية مفتوحة
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                                    <span className="text-gray-500 text-sm font-bold">مبيعاتك اليوم</span>
                                    <span className="text-xl font-black text-blue-600">{data.cashier.todaySales.toLocaleString()} ج.م</span>
                                </div>
                                <button onClick={() => navigate('/pos')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">الانتقال لنقطة البيع</button>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-sm font-bold text-gray-400 mb-4">ليس لديك وردية مفتوحة حالياً</p>
                                <button onClick={() => navigate('/shifts')} className="py-2.5 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">فتح وردية جديدة</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Collector Operations Widget */}
                {(data?.role === 'COLLECTOR' || data?.role === 'OWNER') && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <Wallet className="text-emerald-500 w-5 h-5" /> محفظة التحصيل
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <span className="text-gray-500 text-sm font-bold">الرصيد الحالي بالمحفظة</span>
                                <span className="text-xl font-black text-gray-800">{data?.collector?.walletBalance.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between items-center pb-2">
                                <span className="text-gray-500 text-sm font-bold">ما تم تحصيله اليوم</span>
                                <span className="text-lg font-black text-emerald-600">+{data?.collector?.todayCollections.toLocaleString()} ج.م</span>
                            </div>
                            <button onClick={() => navigate('/collection')} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                                <CreditCard className="w-4 h-4" /> تحصيل قسط جديد
                            </button>
                        </div>
                    </div>
                )}

                {/* Warehouse Operations Widget */}
                {data?.warehouse && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <Package className="text-amber-500 w-5 h-5" /> حالة المخزون
                        </h3>
                        <div className="flex flex-col items-center justify-center h-32 bg-amber-50 rounded-xl border border-amber-100 mb-4">
                            <AlertTriangle className="text-amber-500 w-8 h-8 mb-2" />
                            <span className="text-3xl font-black text-amber-700">{data.warehouse.lowStockCount}</span>
                            <span className="text-xs font-bold text-amber-600 mt-1 uppercase">أصناف قاربت على النفاذ</span>
                        </div>
                        <button onClick={() => navigate('/inventory')} className="w-full py-3 bg-amber-100 text-amber-800 rounded-xl font-bold text-sm hover:bg-amber-200 transition-colors">مراجعة المخزن</button>
                    </div>
                )}
            </div>
        </div>
    );
}