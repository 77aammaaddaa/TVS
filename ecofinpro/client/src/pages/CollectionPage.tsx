import { useState, useEffect, useMemo, useCallback } from "react"
import { 
    Wallet, CheckCircle, ArrowDownCircle, ArrowUpCircle, 
    Calendar, X, AlertCircle, MessageCircle, Printer, TrendingUp, 
    Loader2, Radar
} from "lucide-react"
import { walletsAPI, collectionsAPI, WalletSummary } from "@/services/api"

// Helper to calculate legal/delay status (Radar Logic)
const getRadarStatus = (dueDate: string) => {
    const daysLate = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysLate > 90) return { status: 'LEGAL', label: '🚨 ملف في الشؤون القانونية', color: 'bg-red-600', days: daysLate }
    if (daysLate > 30) return { status: 'OVERDUE', label: '⚠️ متأخر عن السداد', color: 'bg-amber-500', days: daysLate }
    if (daysLate > 0) return { status: 'DELAYED', label: '⏳ تأخير بسيط', color: 'bg-yellow-600', days: daysLate }
    return { status: 'ACTIVE', label: '✅ منتظم في السداد', color: 'bg-slate-800', days: 0 }
}

export default function CollectionPage({ currentUser }: any) {
    const [activeTab, setActiveTab] = useState<'installments' | 'wallet'>('installments')
    const [isLoading, setIsLoading] = useState(true)
    
    // Customer Selection (from collection.js)
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState('')

    // Data States
    const [allInstallments, setAllInstallments] = useState<any[]>([])
    const [walletData, setWalletData] = useState<WalletSummary | null>(null)
    
    // Modals
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [selectedInstallment, setSelectedInstallment] = useState<any>(null)
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)
    const [paymentForm, setPaymentForm] = useState({ amount: "", lateFee: "0", method: "CASH" })

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
    const [expenseForm, setExpenseForm] = useState({ amount: "", description: "" })
    const [isProcessingExpense, setIsProcessingExpense] = useState(false)

    // 1. Fetch Wallet Data
    const fetchWallet = useCallback(async () => {
        try {
            const data = await walletsAPI.getMyWallet()
            setWalletData(data)
        } catch (error) {
            console.error("Failed to load wallet:", error)
        }
    }, [])

    const fetchInstallments = useCallback(async () => {
        try {
            // ✅ Secure API call via Express Backend
            const data = await collectionsAPI.getPendingInstallments()
            
            if (data) {
                setAllInstallments(data)
                
                // Extract unique customers
                const uniqueCustomersMap = new Map()
                data.forEach((inst: any) => {
                    const cust = inst.contracts?.customers
                    if (cust && !uniqueCustomersMap.has(cust.id)) {
                        uniqueCustomersMap.set(cust.id, cust)
                    }
                })
                setCustomers(Array.from(uniqueCustomersMap.values()))
            }
        } catch (error: any) {
            console.error("Failed to load installments:", error)
            alert("❌ فشل في تحميل الأقساط: " + (error.message || "تأكد من صلاحياتك"))
        }
    }, [])

    useEffect(() => {
        const init = async () => {
            setIsLoading(true)
            await Promise.all([fetchWallet(), fetchInstallments()])
            setIsLoading(false)
        }
        init()
    }, [fetchWallet, fetchInstallments])

    // Radar Focus: Filter installments for the selected customer
    const customerInstallments = useMemo(() => {
        if (!selectedCustomerId) return []
        return allInstallments.filter(i => i.contracts?.customer_id === selectedCustomerId)
    }, [selectedCustomerId, allInstallments])

    const selectedCustomer = useMemo(() => {
        if (!selectedCustomerId || customerInstallments.length === 0) return null
        return customerInstallments[0]?.contracts?.customers || null
    }, [selectedCustomerId, customerInstallments])

    // Open Payment Modal
    const openPaymentModal = (inst: any) => {
        const remainingForInst = Number(inst.amount) - Number(inst.paid_amount || 0)
        setSelectedInstallment(inst)
        setPaymentForm({
            amount: remainingForInst > 0 ? String(remainingForInst) : "",
            lateFee: "0",
            method: "CASH"
        })
        setIsPaymentModalOpen(true)
    }

    // Process Collection
    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!walletData?.wallet) return alert("المحفظة غير متاحة حالياً")
        
        setIsProcessingPayment(true)
        try {
            const totalAmount = Number(paymentForm.amount) + Number(paymentForm.lateFee || 0)
            
            await collectionsAPI.recordCollection({
                contract_id: selectedInstallment.contract_id,
                amount: totalAmount,
                wallet_id: walletData.wallet.id
            })

            alert("✅ تم تسجيل التحصيل بنجاح وتحديث المحفظة")
            setIsPaymentModalOpen(false)
            fetchWallet()
            fetchInstallments()
        } catch (err: any) {
            alert("❌ فشل في تسجيل الدفع: " + (err.message || "خطأ غير متوقع"))
        } finally {
            setIsProcessingPayment(false)
        }
    }

    // Process Expense
    const handleConfirmExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!walletData?.wallet) return
        
        setIsProcessingExpense(true)
        try {
            await walletsAPI.recordExpense({
                wallet_id: walletData.wallet.id,
                amount: Number(expenseForm.amount),
                description: expenseForm.description
            })
            alert("✅ تم تسجيل المصروف وخصمه من المحفظة")
            setIsExpenseModalOpen(false)
            setExpenseForm({ amount: "", description: "" })
            fetchWallet()
        } catch (err: any) {
            alert("❌ " + err.message)
        } finally {
            setIsProcessingExpense(false)
        }
    }

    // Calculations
    const totalExpected = allInstallments.reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount || 0)), 0)
    const walletBalance = walletData?.wallet?.balance || 0
    const dailyCollected = walletData?.dailySummary?.totalCollectedToday || 0

    // Radar status for selected customer
    const radarStatus = useMemo(() => {
        if (customerInstallments.length === 0) return null
        const earliestDueDate = customerInstallments[0].due_date
        return getRadarStatus(earliestDueDate)
    }, [customerInstallments])

    return (
        <div className="font-sans animate-in fade-in duration-500 pb-20" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Radar className="text-blue-600 w-7 h-7" />
                        رادار التحصيل ومحفظتي
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">الكشف الفوري عن حالة العملاء، إدارة الأقساط، ومتابعة السيولة النقدية بالدرج</p>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 text-white p-6 rounded-2xl border border-gray-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" /> رصيد المحفظة الحالي
                    </h4>
                    <span className="text-3xl font-bold">{Number(walletBalance).toLocaleString()} <span className="text-sm text-gray-400 font-medium">ج.م</span></span>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500"></div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" /> إجمالي الأقساط المعلقة
                    </h4>
                    <span className="text-3xl font-bold text-gray-800">{totalExpected.toLocaleString()} <span className="text-sm text-gray-500 font-medium">ج.م</span></span>
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
                    <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" /> محصل اليوم
                    </h4>
                    <span className="text-3xl font-bold text-blue-700">{dailyCollected.toLocaleString()} <span className="text-sm text-blue-400 font-medium">ج.م</span></span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Controls & Tabs */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between gap-4 items-center">
                    <div className="flex bg-gray-200/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                        <button onClick={() => setActiveTab('installments')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'installments' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                            الأقساط والرادار
                        </button>
                        <button onClick={() => setActiveTab('wallet')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'wallet' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                            حركات المحفظة
                        </button>
                    </div>

                    <div className="flex w-full md:w-auto gap-3">
                        {activeTab === 'installments' && (
                            <div className="relative w-full md:w-80">
                                <select 
                                    className="w-full p-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all text-sm font-medium bg-white text-gray-700"
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                >
                                    <option value="">-- اختر العميل لبدء التحصيل --</option>
                                    {customers.map((cust: any) => (
                                        <option key={cust.id} value={cust.id}>{cust.full_name} ({cust.national_id || 'بدون رقم'})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {activeTab === 'wallet' && (
                            <button onClick={() => setIsExpenseModalOpen(true)} className="bg-red-50 text-red-700 border border-red-100 px-4 py-2.5 rounded-xl font-semibold hover:bg-red-600 hover:text-white transition-all shrink-0 flex items-center gap-1.5 text-sm">
                                <ArrowUpCircle className="w-4 h-4" /> سحب مصروف
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Rendering */}
                <div className="p-6">
                    {activeTab === 'installments' ? (
                        <div className="space-y-6">
                            {!selectedCustomerId && !isLoading && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                    <div className="text-6xl mb-4">💰</div>
                                    <p className="text-xs font-bold uppercase tracking-widest">في انتظار تحديد العميل لبدء التحصيل</p>
                                </div>
                            )}

                            {/* Customer Radar */}
                            {selectedCustomer && radarStatus && (
                                <div className={`p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden transition-colors duration-500 ${radarStatus.color}`}>
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-black mb-1">{selectedCustomer.full_name}</h2>
                                            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
                                                الوضع الحالي: {radarStatus.label}
                                            </p>
                                        </div>
                                        <div className="bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-md text-center">
                                            <span className="block text-[8px] font-black uppercase">سكور الالتزام</span>
                                            <span className="text-xl font-black">{selectedCustomer.credit_score || 50}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                                        <div>
                                            <p className="text-[10px] opacity-60 font-bold uppercase">إجمالي المديونية</p>
                                            <p className="text-2xl font-black">
                                                {customerInstallments.reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount || 0)), 0).toLocaleString()} ج.م
                                            </p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] opacity-60 font-bold uppercase">أيام التأخير</p>
                                            <p className={`text-2xl font-black ${radarStatus.days > 0 ? 'animate-pulse' : ''}`}>
                                                {radarStatus.days} يوم
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Installments List (The Hit List) */}
                            {selectedCustomerId && (
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b bg-slate-50">
                                        <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">الأقساط المنتظرة ({customerInstallments.length})</h4>
                                    </div>
                                    <div className="divide-y max-h-96 overflow-y-auto custom-scroll">
                                        {customerInstallments.length === 0 ? (
                                            <div className="p-10 text-center text-slate-400 font-bold text-xs italic">
                                                لا يوجد أقساط معلقة.. العميل سدد بالكامل 🥳
                                            </div>
                                        ) : (
                                            customerInstallments.map((inst, idx) => {
                                                const remainingAmt = Number(inst.amount) - Number(inst.paid_amount || 0)
                                                return (
                                                    <div key={inst.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-black text-slate-800">{remainingAmt.toLocaleString()} ج.م</p>
                                                            <p className="text-[10px] text-slate-400 font-bold">تاريخ الاستحقاق: {new Date(inst.due_date).toLocaleDateString('ar-EG')}</p>
                                                            {idx === 0 && <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">القسط القادم</span>}
                                                            {inst.status === 'PARTIALLY_PAID' && <span className="text-[8px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase mr-1">مدفوع جزئياً</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => openPaymentModal(inst)}
                                                                className="bg-green-600 text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center gap-1"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" /> تحصيل الآن
                                                            </button>
                                                            <button className="bg-gray-50 text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all" title="إرسال كشف حساب واتساب">
                                                                <MessageCircle className="w-4 h-4" />
                                                            </button>
                                                            <button className="bg-gray-50 text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all" title="طباعة إيصال">
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Wallet Transactions Feed */
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 mb-4">سجل العمليات الأخيرة</h3>
                            {walletData?.transactions?.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    لا توجد حركات مالية مسجلة في المحفظة بعد.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {walletData?.transactions?.slice(0, 50).map((tx) => {
                                        const isCredit = tx.transaction_type === 'COLLECTION' || tx.transaction_type === 'COMMISSION'
                                        return (
                                            <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                        {isCredit ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800 text-sm">
                                                            {tx.transaction_type === 'COLLECTION' ? 'تحصيل قسط' : 
                                                             tx.transaction_type === 'COMMISSION' ? 'عمولة تحصيل' : 
                                                             tx.transaction_type === 'ADJUSTMENT' ? `مصروف: ${tx.description || 'غير محدد'}` : 'تسليم للخزنة'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(tx.created_at).toLocaleString('ar-EG')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className={`font-bold text-lg ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isCredit ? '+' : '-'}{Number(tx.amount).toLocaleString()} ج.م
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedInstallment && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <CheckCircle className="text-blue-600 w-5 h-5" /> 
                                تفاصيل تحصيل الدفعة
                            </h3>
                            {!isProcessingPayment && (
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div className="p-6 bg-blue-50/30 border-b border-gray-100 text-sm">
                            <div className="grid grid-cols-2 gap-y-4">
                                <div>
                                    <p className="text-gray-500 text-xs font-semibold mb-1">اسم العميل</p>
                                    <p className="font-bold text-gray-800">{selectedInstallment.contracts?.customers?.full_name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs font-semibold mb-1">رقم العقد</p>
                                    <p className="font-bold text-gray-800" dir="ltr">#{selectedInstallment.contract_id.slice(0,8)}</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmPayment} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">المبلغ المدفوع (المحصل فعلياً) <span className="text-red-500">*</span></label>
                                <input 
                                    required 
                                    type="number" 
                                    min="1"
                                    className="w-full p-3 bg-white border border-blue-200 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-lg text-blue-700 font-bold outline-none transition-all" 
                                    value={paymentForm.amount} 
                                    onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                                    disabled={isProcessingPayment}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">غرامة تأخير (اختياري)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-medium outline-none focus:border-blue-500 transition-all" 
                                    value={paymentForm.lateFee} 
                                    onChange={e => setPaymentForm({...paymentForm, lateFee: e.target.value})} 
                                    disabled={isProcessingPayment}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">طريقة الدفع</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-medium outline-none focus:border-blue-500 transition-all"
                                    value={paymentForm.method}
                                    onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                                    disabled={isProcessingPayment}
                                >
                                    <option value="CASH">كاش (نقداً)</option>
                                    <option value="BANK_TRANSFER">تحويل بنكي / محفظة</option>
                                    <option value="POS">ماكينة POS</option>
                                </select>
                            </div>

                            <div className="pt-4 mt-2 flex justify-end gap-3 border-t border-gray-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsPaymentModalOpen(false)} 
                                    disabled={isProcessingPayment}
                                    className="px-5 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    إلغاء
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={!paymentForm.amount || isProcessingPayment}
                                    className="px-6 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isProcessingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    {isProcessingPayment ? "جاري التأكيد..." : "تأكيد الدفع والتسجيل"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in zoom-in-95">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <ArrowUpCircle className="text-red-600 w-5 h-5" /> تسجيل سحب/مصروف
                            </h3>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleConfirmExpense} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">المبلغ المراد سحبه (ج.م) <span className="text-red-500">*</span></label>
                                <input required type="number" min="1" max={Number(walletBalance)} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-base text-red-600 font-bold outline-none focus:border-red-500" 
                                    value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} disabled={isProcessingExpense} />
                                <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    أقصى حد متاح للسحب هو رصيد المحفظة الحالي
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">وصف المصروف (السبب) <span className="text-red-500">*</span></label>
                                <textarea required className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 min-h-[80px]" placeholder="مثال: فاتورة كهرباء، شراء مستلزمات..."
                                    value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} disabled={isProcessingExpense} />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsExpenseModalOpen(false)} disabled={isProcessingExpense} className="px-5 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700">إلغاء</button>
                                <button type="submit" disabled={isProcessingExpense} className="px-6 py-2.5 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
                                    {isProcessingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد سحب المبلغ"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}