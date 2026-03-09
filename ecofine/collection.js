/**
 * 💰 collection.js - مديول التحصيل والرقابة المالية (EcoFine V8.0)
 * الوظيفة: محرك إدخال دفعات الأقساط مع كشف راداري لوضع العميل (تأخير، مديونية، إنذارات).
 * متوافق تماماً مع شاشات Redmi 10 و Redmi 14C.
 */

const { useState, useEffect, useMemo, useCallback } = React;

const CollectionModule = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [customerSummary, setCustomerSummary] = useState(null);
    const [pendingInstallments, setPendingInstallments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentData, setPaymentData] = useState({ amount: '', notes: '', date: new Date().toISOString().split('T')[0] });

    // 1. تحميل قائمة العملاء الذين لديهم فواتير نشطة فقط
    const loadActiveCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            const allInvoices = await db.getAll('invoices');
            const activeInvoices = allInvoices.filter(inv => inv.status === 'active');
            const customerIds = [...new Set(activeInvoices.map(inv => inv.customer_id))];
            
            const allCustomers = await db.getAll('customers');
            const filtered = allCustomers.filter(c => customerIds.includes(c.id));
            setCustomers(filtered);
        } catch (err) { console.error("Error loading customers:", err); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { loadActiveCustomers(); }, [loadActiveCustomers]);

    // 2. محرك الكشف الراداري عن حالة العميل عند الاختيار
    useEffect(() => {
        if (!selectedId) {
            setCustomerSummary(null);
            setPendingInstallments([]);
            return;
        }

        const fetchDetails = async () => {
            const [invoices, allInstallments, customer] = await Promise.all([
                db.getAll('invoices'),
                db.getAll('installments'),
                db.getById('customers', selectedId)
            ]);

            const customerInvoices = invoices.filter(inv => inv.customer_id === selectedId && inv.status === 'active');
            const customerInst = allInstallments.filter(inst => inst.customer_id === selectedId && inst.status === 'pending');

            // حساب المديونية الإجمالية المتبقية
            const totalRemaining = customerInst.reduce((sum, i) => sum + Number(i.amount), 0);

            // استشارة X-CORE للتحقق من وضع التأخير والقانونية
            const creditLimit = customer.monthly_income * (customer.credit_score / 100) * window.XConfig.creditPolicy.creditLimitMultiplier;
            // نأخذ أول فاتورة نشطة للفحص (في حال تعدد الفواتير)
            const legalStatus = window.XCore.monitorLegalStatus(customerInst, customerInvoices[0]?.saleType || 'monthly', creditLimit);

            setCustomerSummary({
                name: customer.full_name,
                score: customer.credit_score,
                totalRemaining,
                status: legalStatus.status,
                delayDays: legalStatus.days,
                activeInvoicesCount: customerInvoices.length
            });
            setPendingInstallments(customerInst.sort((a,b) => new Date(a.due_date) - new Date(b.due_date)));
        };

        fetchDetails();
    }, [selectedId]);

    // 3. تنفيذ عملية الدفع
    const handlePayment = async (instId, amount) => {
        if (!confirm(`تأكيد تحصيل مبلغ ${amount} ج.م؟`)) return;

        try {
            // تحديث حالة القسط
            await db.update('installments', instId, { 
                status: 'paid', 
                payment_date: paymentData.date,
                notes: paymentData.notes 
            });

            // إضافة سجل للخزينة (Treasury)
            await db.add('treasury', {
                type: 'INCOME',
                category: 'INSTALLMENT_PAYMENT',
                amount: Number(amount),
                customer_id: selectedId,
                date: paymentData.date,
                description: `تحصيل قسط من ${customerSummary.name}`
            });

            alert("✅ تم تسجيل الدفع بنجاح وتحديث الخزينة");
            setSelectedId(''); // إعادة تعيين الواجهة
            loadActiveCustomers();
        } catch (err) { alert("❌ فشل في تسجيل الدفع: " + err.message); }
    };

    return (
        <div className="space-y-6 animate-in pb-20">
            
            {/* أ) شريط البحث والاختيار */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">ابحث واختر العميل لبدء التحصيل</label>
                <select 
                    className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none focus:ring-2 focus:ring-slate-900"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                >
                    <option value="">-- اضغط للاختيار من العملاء النشطين --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.national_id})</option>)}
                </select>
            </div>

            {/* ب) الكشف الراداري (Customer Radar) */}
            {customerSummary && (
                <div className="space-y-4 animate-in slide-in-from-bottom-5">
                    
                    {/* بطاقة الحالة القانونية والمالية */}
                    <div className={`p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden transition-colors duration-500 ${
                        customerSummary.status === 'LEGAL' ? 'bg-red-600' : 
                        customerSummary.status === 'OVERDUE' ? 'bg-amber-500' : 'bg-slate-900'
                    }`}>
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black mb-1">{customerSummary.name}</h2>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
                                    الوضع الحالي: {
                                        customerSummary.status === 'LEGAL' ? '🚨 ملف في الشؤون القانونية' : 
                                        customerSummary.status === 'OVERDUE' ? '⚠️ متأخر عن السداد' : 
                                        customerSummary.status === 'CAPPED' ? '🛑 وصل لسقف المديونية' : '✅ منتظم في السداد'
                                    }
                                </p>
                            </div>
                            <div className="bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-md text-center">
                                <span className="block text-[8px] font-black uppercase">سكور الالتزام</span>
                                <span className="text-xl font-black">{customerSummary.score}%</span>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
                            <div>
                                <p className="text-[10px] opacity-60 font-bold uppercase">إجمالي المديونية</p>
                                <p className="text-2xl font-black">{customerSummary.totalRemaining.toLocaleString()} ج.م</p>
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] opacity-60 font-bold uppercase">أيام التأخير</p>
                                <p className={`text-2xl font-black ${customerSummary.delayDays > 0 ? 'animate-pulse' : ''}`}>
                                    {customerSummary.delayDays} يوم
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* قائمة الأقساط المستحقة (The Hit List) */}
                    <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                        <div className="p-6 border-b bg-slate-50">
                            <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest">الأقساط المنتظرة ({pendingInstallments.length})</h4>
                        </div>
                        <div className="divide-y max-h-96 overflow-y-auto custom-scroll">
                            {pendingInstallments.map((inst, idx) => (
                                <div key={inst.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-slate-800">{inst.amount.toLocaleString()} ج.م</p>
                                        <p className="text-[10px] text-slate-400 font-bold">تاريخ الاستحقاق: {inst.due_date}</p>
                                        {idx === 0 && <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">القسط القادم</span>}
                                    </div>
                                    <button 
                                        onClick={() => handlePayment(inst.id, inst.amount)}
                                        className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-lg shadow-green-200 active:scale-95 transition-all"
                                    >
                                        تحصيل الآن ✅
                                    </button>
                                </div>
                            ))}
                            {pendingInstallments.length === 0 && (
                                <div className="p-10 text-center text-slate-400 font-bold text-xs italic">
                                    لا يوجد أقساط معلقة.. العميل سدد بالكامل 🥳
                                </div>
                            )}
                        </div>
                    </div>

                    {/* خيارات إضافية (مستقبلية) */}
                    <div className="grid grid-cols-2 gap-4">
                        <button className="bg-white p-4 rounded-2xl border text-[10px] font-black text-blue-600 shadow-sm flex items-center justify-center gap-2 active:scale-95">
                            💬 إرسال كشف حساب واتساب
                        </button>
                        <button className="bg-white p-4 rounded-2xl border text-[10px] font-black text-slate-600 shadow-sm flex items-center justify-center gap-2 active:scale-95">
                            📄 طباعة إيصال سداد
                        </button>
                    </div>
                </div>
            )}

            {/* في حال عدم اختيار عميل */}
            {!selectedId && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <div className="text-6xl mb-4">💰</div>
                    <p className="text-xs font-bold uppercase tracking-widest">في انتظار تحديد العميل لبدء التحصيل</p>
                </div>
            )}
        </div>
    );
};

window.CollectionModule = CollectionModule;
