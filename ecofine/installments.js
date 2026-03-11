/**
 * 📅 installments.js - محرك إدارة العقود والأقساط (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: تتبع مواعيد السداد، حساب الأيام التأخيرية ديناميكياً، والتحصيل المرن، مع ربط كامل بالخزينة.
 */

const { useState, useEffect, useMemo } = React;

const InstallmentsModule = ({ currentUser }) => {
    const [installments, setInstallments] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending'); // pending, paid, overdue
    
    // شاشة الدفع (Modal)
    const [selectedInst, setSelectedInst] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // ==========================================
    // 1. جلب البيانات والربط الشبكي
    // ==========================================
    const loadData = async () => {
        try {
            const [instData, invData, custData] = await Promise.all([
                window.db.getAll('installments').catch(() => []),
                window.db.getAll('invoices').catch(() => []),
                window.db.getAll('customers').catch(() => [])
            ]);
            setInstallments(instData || []);
            setInvoices(invData || []);
            setCustomers(custData || []);
        } catch (err) {
            console.error("خطأ في جلب بيانات الأقساط:", err);
        }
    };

    useEffect(() => { loadData(); }, []);

    // ==========================================
    // 2. المحرك المحاسبي لحساب أيام التأخير
    // ==========================================
    const calculateDueDetails = (inst) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(inst.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = today - dueDate;
        const delayDays = (diffTime > 0 && inst.status !== 'paid') ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
        
        const baseAmount = Number(inst.amount);
        const paidAmount = Number(inst.paid_amount || 0);
        
        // حساب قيمة أيام التأخير (القسط على 30 يوم)
        const dailyRate = baseAmount / 30;
        const delayPenalty = delayDays * dailyRate;
        
        // الصافي المطلوب سداده اليوم
        const netRequired = (baseAmount + delayPenalty) - paidAmount;

        return {
            delayDays,
            delayPenalty: Math.round(delayPenalty),
            baseAmount,
            paidAmount,
            netRequired: Math.round(netRequired),
            isOverdue: delayDays > 0
        };
    };

    // ==========================================
    // 3. معالجة وتجهيز القوائم (Data Mapping)
    // ==========================================
    const enrichedInstallments = useMemo(() => {
        return installments.map(inst => {
            const customer = customers.find(c => c.id === inst.customer_id);
            const invoice = invoices.find(inv => inv.id === inst.invoice_id);
            const math = calculateDueDetails(inst);
            
            // تحديد الحالة الفعلية لعرضها
            let displayStatus = inst.status;
            if (displayStatus === 'pending' && math.isOverdue) displayStatus = 'overdue';

            return {
                ...inst,
                customerName: customer ? customer.full_name : 'عميل غير محدد',
                customerPhone: customer ? customer.phone : '',
                invoiceRef: invoice ? invoice.id.slice(0, 8).toUpperCase() : 'N/A',
                math,
                displayStatus
            };
        });
    }, [installments, customers, invoices]);

    // الفلترة والبحث
    const filteredList = useMemo(() => {
        return enrichedInstallments.filter(inst => {
            const matchesSearch = inst.customerName.includes(searchQuery) || inst.invoiceRef.includes(searchQuery);
            const matchesStatus = filterStatus === 'all' ? true : inst.displayStatus === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    }, [enrichedInstallments, searchQuery, filterStatus]);

    // إحصائيات علوية للداشبورد
    const stats = useMemo(() => {
        let totalExpected = 0;
        let totalOverdueAmount = 0;
        let overdueCount = 0;

        enrichedInstallments.forEach(inst => {
            if (inst.status === 'pending') {
                totalExpected += inst.math.netRequired;
                if (inst.math.isOverdue) {
                    totalOverdueAmount += inst.math.netRequired;
                    overdueCount++;
                }
            }
        });

        return { totalExpected, totalOverdueAmount, overdueCount };
    }, [enrichedInstallments]);

    // ==========================================
    // 4. تنفيذ عملية التحصيل (Payment Execution)
    // ==========================================
    const handlePayment = async (e) => {
        e.preventDefault();
        const payVal = Number(paymentAmount);
        
        if (payVal <= 0) return alert("⚠️ يجب إدخال مبلغ صحيح أكبر من الصفر.");
        if (payVal > selectedInst.math.netRequired) return alert(`⚠️ المبلغ المدخل أكبر من المطلوب (${selectedInst.math.netRequired} ج).`);

        setIsProcessing(true);
        try {
            const newPaidTotal = selectedInst.math.paidAmount + payVal;
            const isFullyPaid = newPaidTotal >= selectedInst.math.netRequired;

            // 1. تحديث سجل القسط
            await window.db.update('installments', selectedInst.id, {
                paid_amount: newPaidTotal,
                status: isFullyPaid ? 'paid' : 'pending',
                payment_date: isFullyPaid ? new Date().toISOString() : null
            });

            // 2. تسجيل الفلوس في الخزينة
            await window.db.add('treasury', {
                type: 'INCOME',
                amount: payVal,
                description: `تحصيل قسط فاتورة ${selectedInst.invoiceRef} للعميل ${selectedInst.customerName} ${selectedInst.math.delayDays > 0 ? `(شمل ${selectedInst.math.delayDays} أيام تأخير)` : ''}`,
                created_at: new Date().toISOString(),
                user: currentUser?.username || 'النظام'
            });

            // 3. المراقبة الأمنية (Audit Log)
            if (window.XAudit) {
                window.XAudit.log('تحصيل قسط', 'وحدة العقود والأقساط', `تم تحصيل مبلغ ${payVal} ج.م من العميل ${selectedInst.customerName}`, 'info', currentUser?.username);
            }

            // المزامنة الفورية
            if (navigator.onLine && typeof window.db.syncWithCloud === 'function') {
                window.db.syncWithCloud();
            }

            alert("✅ تم التحصيل وتحديث الخزينة بنجاح!");
            setSelectedInst(null);
            setPaymentAmount('');
            loadData();
        } catch (err) {
            console.error(err);
            alert("❌ حدث خطأ أثناء التحصيل.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            
            {/* 📊 داشبورد المحصل (Stats) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden border border-slate-800">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> متوقع تحصيله (بالمتأخرات)
                        </p>
                        <h3 className="text-3xl font-black">{stats.totalExpected.toLocaleString()} <span className="text-sm font-normal opacity-50">ج.م</span></h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">الديون المتأخرة النشطة</p>
                    <h3 className="text-2xl font-black text-red-600">{stats.totalOverdueAmount.toLocaleString()} <span className="text-xs text-red-400">ج.م</span></h3>
                </div>
                <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-red-500">أقساط كسرت الموعد</p>
                    <h3 className="text-2xl font-black text-red-700">{stats.overdueCount} <span className="text-xs opacity-70">قسط</span></h3>
                </div>
            </div>

            {/* 🔍 أدوات البحث والفلترة */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center sticky top-2 z-10">
                <div className="flex-1 w-full relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input 
                        type="text" 
                        placeholder="ابحث باسم العميل أو رقم الفاتورة..." 
                        className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-blue-500 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                    <button onClick={() => setFilterStatus('pending')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === 'pending' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}>مستحق ⏳</button>
                    <button onClick={() => setFilterStatus('overdue')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === 'overdue' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}>متأخر 🚨</button>
                    <button onClick={() => setFilterStatus('paid')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${filterStatus === 'paid' ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500'}`}>مسدد ✅</button>
                </div>
            </div>

            {/* 📋 قائمة الأقساط (الجدول الذكي) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredList.map(inst => (
                    <div key={inst.id} className={`bg-white p-6 rounded-[2rem] border shadow-sm relative overflow-hidden flex flex-col transition-all hover:shadow-md ${inst.displayStatus === 'overdue' ? 'border-red-200' : inst.displayStatus === 'paid' ? 'border-green-200 opacity-60' : 'border-slate-100'}`}>
                        
                        {/* شريط الحالة */}
                        <div className={`absolute top-0 right-0 left-0 h-1.5 ${inst.displayStatus === 'overdue' ? 'bg-red-500' : inst.displayStatus === 'paid' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        
                        <div className="flex justify-between items-start mb-4 mt-2">
                            <div>
                                <h4 className="font-black text-slate-800 text-sm">{inst.customerName}</h4>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">فاتورة: {inst.invoiceRef}</span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md" dir="ltr">{new Date(inst.due_date).toLocaleDateString('ar-EG')}</span>
                                </div>
                            </div>
                            <span className="text-xl">{inst.displayStatus === 'overdue' ? '🚨' : inst.displayStatus === 'paid' ? '✅' : '⏳'}</span>
                        </div>

                        {/* الحسابات الديناميكية */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mb-5 flex-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold">القسط الأساسي:</span>
                                <span className="font-black text-slate-800">{inst.math.baseAmount.toLocaleString()} ج</span>
                            </div>
                            
                            {inst.math.delayDays > 0 && inst.status !== 'paid' && (
                                <div className="flex justify-between items-center text-xs bg-red-50 p-2 rounded-xl border border-red-100">
                                    <span className="text-red-600 font-black text-[10px]">أيام تأخير ({inst.math.delayDays} يوم):</span>
                                    <span className="font-black text-red-700">+{inst.math.delayPenalty.toLocaleString()} ج</span>
                                </div>
                            )}

                            {inst.math.paidAmount > 0 && (
                                <div className="flex justify-between items-center text-xs bg-green-50 p-2 rounded-xl border border-green-100">
                                    <span className="text-green-600 font-black text-[10px]">ما تم سداده مسبقاً:</span>
                                    <span className="font-black text-green-700">-{inst.math.paidAmount.toLocaleString()} ج</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                                <span className="text-slate-800 font-black uppercase text-[10px]">الصافي المطلوب:</span>
                                <span className="font-black text-blue-700 text-lg">{inst.math.netRequired.toLocaleString()} <span className="text-[10px]">ج.م</span></span>
                            </div>
                        </div>

                        {/* زر الإجراء */}
                        {inst.status !== 'paid' ? (
                            <button 
                                onClick={() => { setSelectedInst(inst); setPaymentAmount(inst.math.netRequired); }}
                                className={`w-full py-4 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${inst.displayStatus === 'overdue' ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                            >
                                تحصيل الأموال 💰
                            </button>
                        ) : (
                            <div className="w-full py-4 text-center rounded-xl font-black text-xs bg-green-50 text-green-600 border border-green-100">
                                تم السداد بالكامل
                            </div>
                        )}
                    </div>
                ))}

                {filteredList.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <span className="text-5xl mb-4 opacity-50">📂</span>
                        <p className="text-slate-500 font-black text-sm uppercase tracking-widest">لا توجد سجلات تطابق بحثك</p>
                    </div>
                )}
            </div>

            {/* 🚀 نافذة التحصيل المرنة (Payment Modal) */}
            {selectedInst && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 relative">
                        
                        {/* الهيدر */}
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
                            <div className="relative z-10">
                                <h3 className="font-black text-lg">تحصيل قسط عميل</h3>
                                <p className="text-[10px] text-blue-400 font-bold mt-1 tracking-widest uppercase">{selectedInst.customerName}</p>
                            </div>
                            <button onClick={() => setSelectedInst(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-500 relative z-10 transition-colors">✕</button>
                        </div>

                        <form onSubmit={handlePayment} className="p-6 md:p-8 space-y-6">
                            
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">الصافي الفعلي المطلوب (شامل التأخير)</p>
                                <p className="text-4xl font-black text-blue-600">{selectedInst.math.netRequired.toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span></p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">المبلغ المُستلم من العميل (يقبل الدفع الجزئي)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        required 
                                        min="1"
                                        max={selectedInst.math.netRequired}
                                        className="w-full pl-4 pr-12 py-5 bg-white border border-slate-300 rounded-2xl font-black text-2xl text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        autoFocus
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">ج.م</span>
                                </div>
                                <p className="text-[9px] font-bold text-amber-600 mt-2 flex items-center gap-1">
                                    <span>💡</span> إذا دفع العميل مبلغاً أقل، سيظل القسط (مستحق) بالباقي.
                                </p>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isProcessing}
                                className="w-full py-5 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <span className="animate-spin text-xl">⏳</span> : <span className="text-xl">💰</span>}
                                {isProcessing ? 'جاري ترحيل الأموال للخزينة...' : 'تأكيد الدفع وطباعة إيصال'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

window.InstallmentsModule = InstallmentsModule;
