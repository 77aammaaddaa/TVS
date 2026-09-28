import { useState, useEffect, useMemo } from "react"
import { 
    TrendingUp, 
    AlertTriangle, 
    Package, 
    DollarSign, 
    Calendar, 
    ArrowUpRight, 
    ArrowDownRight,
    Activity,
    CreditCard,
    Box
} from "lucide-react"

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('month')
    
    // Raw Data States
    const [transactions, setTransactions] = useState<any[]>([])
    const [contracts, setContracts] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])

    const loadData = async () => {
        setIsLoading(true)
        try {
            setTransactions([])
            setContracts([])
            setProducts([])
        } catch (error) {
            console.error("Failed to load reports data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Data Processing & Filtering
    const { 
        filteredRevenue, 
        filteredExpenses, 
        salesCount, 
        lowStockItems, 
        recentTransactions 
    } = useMemo(() => {
        const now = new Date()
        
        // Time Filter Logic
        const isWithinRange = (dateString: string) => {
            if (timeRange === 'all') return true
            const date = new Date(dateString || 0)
            const diffTime = Math.abs(now.getTime() - date.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (timeRange === 'today') return diffDays <= 1
            if (timeRange === 'week') return diffDays <= 7
            if (timeRange === 'month') return diffDays <= 30
            return true
        }

        const validTx = transactions.filter(tx => isWithinRange(tx.created_at || tx.date))
        const validContracts = contracts.filter(c => isWithinRange(c.date || c.created_at))

        const revenue = validTx.filter(tx => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0)
        const expenses = validTx.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0)
        
        const criticalStock = products.filter(p => Number(p.stock) <= 5).sort((a, b) => a.stock - b.stock)
        
        const recent = [...validTx].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5)

        return {
            filteredRevenue: revenue,
            filteredExpenses: expenses,
            salesCount: validContracts.length,
            lowStockItems: criticalStock,
            recentTransactions: recent
        }
    }, [transactions, contracts, products, timeRange])

    const netProfit = filteredRevenue - filteredExpenses

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Activity className="text-blue-600" />
                        التقارير والإحصائيات
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">نظرة شاملة على الأداء المالي وحركة المخزون</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-xl shadow-sm">
                    <Calendar className="w-5 h-5 text-gray-500 ml-1" />
                    <select 
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none pl-4 pr-1 cursor-pointer appearance-none"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as any)}
                    >
                        <option value="today">اليوم</option>
                        <option value="week">آخر 7 أيام</option>
                        <option value="month">آخر 30 يوم</option>
                        <option value="all">كل الأوقات</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className="text-gray-500 font-medium">جاري تحليل البيانات...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Revenue Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                                    <ArrowUpRight className="w-3 h-3" /> دخل
                                </span>
                            </div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-1">إجمالي الإيرادات</h4>
                            <span className="text-2xl font-black text-gray-800">{filteredRevenue.toLocaleString()} <span className="text-sm text-gray-500 font-medium">ج.م</span></span>
                        </div>

                        {/* Net Cash Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${netProfit >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                                    {netProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} صافي
                                </span>
                            </div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-1">السيولة الحالية (الخزينة)</h4>
                            <span className="text-2xl font-black text-gray-800">{netProfit.toLocaleString()} <span className="text-sm text-gray-500 font-medium">ج.م</span></span>
                        </div>

                        {/* Sales Volume Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Package className="w-6 h-6" />
                                </div>
                            </div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-1">حجم المبيعات (فواتير)</h4>
                            <span className="text-2xl font-black text-gray-800">{salesCount} <span className="text-sm text-gray-500 font-medium">عملية</span></span>
                        </div>

                        {/* Alerts Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:border-red-200 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <span className="animate-pulse w-2 h-2 rounded-full bg-red-500 mt-2"></span>
                            </div>
                            <h4 className="text-xs font-semibold text-gray-500 mb-1">نواقص المخزن (حرجة)</h4>
                            <span className="text-2xl font-black text-gray-800">{lowStockItems.length} <span className="text-sm text-gray-500 font-medium">صنف</span></span>
                        </div>
                    </div>

                    {/* Lower Section (2 Columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Left: Recent Transactions */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-gray-800 text-sm">أحدث الحركات المالية</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {recentTransactions.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-200 rounded-lg">لا توجد حركات مالية في هذه الفترة</div>
                                ) : (
                                    recentTransactions.map((tx, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{tx.description || 'حركة مالية'}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(tx.created_at || tx.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                            <div className={`font-bold text-sm flex items-center gap-1 ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.type === 'INCOME' ? '+' : '-'} {Number(tx.amount).toLocaleString()} ج
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right: Low Stock Alerts */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <h3 className="font-bold text-gray-800 text-sm">تنبيهات المخزون الحرجة</h3>
                            </div>
                            <div className="p-5 space-y-4 max-h-[350px] overflow-y-auto custom-scroll pr-2">
                                {lowStockItems.length === 0 ? (
                                    <div className="text-center py-8 text-emerald-600 text-sm font-medium border border-dashed border-emerald-200 bg-emerald-50 rounded-lg">المخزون في حالة جيدة ولا توجد نواقص حرجة</div>
                                ) : (
                                    lowStockItems.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center p-4 bg-red-50/50 rounded-lg border border-red-100 hover:bg-red-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white border border-red-100 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                                                    <Box size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{item.category_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <span className="block text-[10px] text-red-400 font-bold mb-1">المتبقي</span>
                                                <span className="font-black text-base text-red-600 bg-white px-3 py-1 rounded-md border border-red-100 shadow-sm">{item.stock}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    )
}