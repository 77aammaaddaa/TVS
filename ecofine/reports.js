/**
 * 📊 reports.js - مركز التقارير والاستخبارات (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: استخراج وتحليل البيانات، تقفيل الورديات، إصدار تقارير PDF، ومراقبة أداء الموظفين.
 */

const { useState, useEffect, useMemo } = React;

const ReportsModule = ({ currentUser }) => {
    const [isLoading, setIsLoading] = useState(true);
    
    // قواعد البيانات
    const [treasury, setTreasury] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [products, setProducts] = useState([]);
    const [installments, setInstallments] = useState([]);
    
    // إعدادات التقرير
    const [reportType, setReportType] = useState('shift'); // shift, inventory, sales, collection
    const [dateRange, setDateRange] = useState({ 
        from: new Date().toISOString().split('T')[0], 
        to: new Date().toISOString().split('T')[0] 
    });

    // ⛔ حماية سيادية: هذه الشاشة للمالك (OWNER) والمدير (MANAGER) فقط
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MANAGER') {
        if (window.XAudit) window.XAudit.log('وصول مرفوض', 'التقارير', `حاول ${currentUser?.username} فتح التقارير`, 'critical', currentUser?.username);
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[2.5rem] border border-red-100">
                <span className="text-6xl mb-4">⛔</span>
                <h2 className="text-xl font-black text-red-600">وصول غير مصرح به</h2>
                <p className="text-xs text-red-400 font-bold mt-2">تقارير المؤسسة مصرح بها للإدارة العليا فقط.</p>
            </div>
        );
    }

    // ==========================================
    // 1. جلب البيانات من محركات النظام
    // ==========================================
    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [tData, invData, pData, instData] = await Promise.all([
                window.db.getAll('treasury').catch(() => []),
                window.db.getAll('invoices').catch(() => []),
                window.db.getAll('products').catch(() => []),
                window.db.getAll('installments').catch(() => [])
            ]);
            setTreasury(tData || []);
            setInvoices(invData || []);
            setProducts(pData || []);
            setInstallments(instData || []);
        } catch (err) {
            console.error("خطأ في جلب بيانات التقارير:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadAllData(); }, []);

    // ==========================================
    // 2. محرك توليد التقارير (Report Generator Engine)
    // ==========================================
    const generateReportData = useMemo(() => {
        if (isLoading) return null;

        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        // فلترة البيانات حسب التاريخ
        const filteredTreasury = treasury.filter(t => {
            const d = new Date(t.created_at);
            return d >= fromDate && d <= toDate;
        });

        const filteredInvoices = invoices.filter(inv => {
            const d = new Date(inv.date);
            return d >= fromDate && d <= toDate;
        });

        // --- أ. تقرير الوردية والخزينة (Shift & Cash) ---
        if (reportType === 'shift') {
            let totalIncome = 0;
            let totalExpense = 0;
            const userPerformance = {};

            filteredTreasury.forEach(t => {
                const amt = Number(t.amount);
                const user = t.user || 'غير محدد';
                
                if (!userPerformance[user]) userPerformance[user] = { income: 0, expense: 0, ops: 0 };
                userPerformance[user].ops += 1;

                if (t.type === 'INCOME') {
                    totalIncome += amt;
                    userPerformance[user].income += amt;
                } else {
                    totalExpense += amt;
                    userPerformance[user].expense += amt;
                }
            });

            return { totalIncome, totalExpense, netCash: totalIncome - totalExpense, userPerformance, transactions: filteredTreasury };
        }

        // --- ب. تقرير المبيعات (Sales Analytics) ---
        if (reportType === 'sales') {
            let totalSales = 0;
            let cashSales = 0;
            let installmentSales = 0;
            let totalItemsSold = 0;

            filteredInvoices.forEach(inv => {
                const total = Number(inv.total);
                totalSales += total;
                inv.items?.forEach(item => totalItemsSold += item.qty);

                if (inv.type === 'cash' || inv.type === 'shipping') cashSales += total;
                else if (inv.type === 'installment') installmentSales += total;
            });

            return { totalSales, cashSales, installmentSales, totalItemsSold, invoiceCount: filteredInvoices.length, invoices: filteredInvoices };
        }

        // --- ج. تقرير الجرد (Inventory Valuation) ---
        if (reportType === 'inventory') {
            let totalValue = 0;
            let totalItems = 0;
            const minStockAlert = window.XConfig?.inventory?.globalMinStock || 3;
            const lowStockItems = [];

            products.forEach(p => {
                const stock = Number(p.stock);
                totalItems += stock;
                totalValue += (stock * Number(p.cost_price || 0));
                
                if (stock <= minStockAlert) lowStockItems.push(p);
            });

            // ترتيب النواقص من الأقل للأكثر
            lowStockItems.sort((a, b) => a.stock - b.stock);

            return { totalValue, totalItems, lowStockItems, allProducts: products };
        }

    }, [reportType, dateRange, treasury, invoices, products, installments, isLoading]);

    // ==========================================
    // 3. أمر الطباعة كـ PDF (Print Logic)
    // ==========================================
    const handlePrint = () => {
        window.print();
        if (window.XAudit) {
            window.XAudit.log('إصدار تقرير', 'التقارير', `تم طباعة تقرير من نوع: ${reportType}`, 'info', currentUser?.username);
        }
    };

    if (isLoading) return <div className="p-20 text-center text-slate-400 font-black animate-pulse">جاري تحليل البيانات واستخراج التقرير... ⏳</div>;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            
            {/* 🎛️ شريط التحكم (لا يظهر في الطباعة) */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
                    
                    <div className="w-full md:w-auto flex-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">نوع التقرير الاستراتيجي</label>
                        <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            <option value="shift">💰 تقرير الوردية والخزينة (تقفيل الكاشير)</option>
                            <option value="sales">📈 تقرير المبيعات وحجم العمل</option>
                            <option value="inventory">📦 تقرير الجرد والنواقص (لا يتأثر بالتاريخ)</option>
                        </select>
                    </div>

                    <div className="w-full md:w-auto flex gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">من تاريخ</label>
                            <input 
                                type="date" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                value={dateRange.from}
                                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">إلى تاريخ</label>
                            <input 
                                type="date" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                value={dateRange.to}
                                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handlePrint}
                        className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span>🖨️</span> طباعة / حفظ PDF
                    </button>
                </div>
            </div>

            {/* 📄 قالب التقرير (يظهر في الواجهة والطباعة) */}
            {generateReportData && (
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-lg print:border-none print:shadow-none print:m-0 print:p-0" id="printable-report">
                    
                    {/* ترويسة التقرير (Header) */}
                    <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 mb-1">{window.XConfig?.identity?.storeName || 'إكس القابضة'}</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {reportType === 'shift' ? 'تقرير حركة الخزينة وترييح الوردية' : reportType === 'sales' ? 'تقرير المبيعات الشامل' : 'تقرير الجرد وتقييم المخزون'}
                            </p>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] font-bold text-slate-400">تاريخ الإصدار: <span className="text-slate-800" dir="ltr">{new Date().toLocaleString('ar-EG')}</span></p>
                            {reportType !== 'inventory' && (
                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                    الفترة: من <span className="text-slate-800">{dateRange.from}</span> إلى <span className="text-slate-800">{dateRange.to}</span>
                                </p>
                            )}
                            <p className="text-[10px] font-bold text-slate-400 mt-1">بواسطة: <span className="text-slate-800">{currentUser?.username}</span></p>
                        </div>
                    </div>

                    {/* محتوى تقرير الوردية */}
                    {reportType === 'shift' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">إجمالي المقبوضات (IN)</p>
                                    <p className="text-2xl font-black text-green-600">{generateReportData.totalIncome.toLocaleString()} ج</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">إجمالي المصروفات (OUT)</p>
                                    <p className="text-2xl font-black text-red-600">{generateReportData.totalExpense.toLocaleString()} ج</p>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">صافي الدرج المفترض</p>
                                    <p className="text-2xl font-black">{generateReportData.netCash.toLocaleString()} ج</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-800 border-r-4 border-slate-900 pr-3 mb-4">أداء المستخدمين (الكاشير)</h4>
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-100 text-slate-500 font-black">
                                        <tr>
                                            <th className="p-3">اسم الموظف</th>
                                            <th className="p-3">عدد العمليات</th>
                                            <th className="p-3 text-green-600">تحصيل (IN)</th>
                                            <th className="p-3 text-red-600">صرف (OUT)</th>
                                            <th className="p-3 text-slate-900">الصافي المُسجل للعهدة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {Object.entries(generateReportData.userPerformance).map(([user, data]) => (
                                            <tr key={user}>
                                                <td className="p-3">{user}</td>
                                                <td className="p-3">{data.ops} عملية</td>
                                                <td className="p-3 text-green-600">{data.income.toLocaleString()}</td>
                                                <td className="p-3 text-red-600">{data.expense.toLocaleString()}</td>
                                                <td className="p-3 text-slate-900 bg-slate-50">{(data.income - data.expense).toLocaleString()} ج.م</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* محتوى تقرير المبيعات */}
                    {reportType === 'sales' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">إجمالي الفواتير</p>
                                    <p className="text-xl font-black text-blue-900">{generateReportData.totalSales.toLocaleString()} ج</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">مبيعات كاش/شحن</p>
                                    <p className="text-xl font-black text-slate-700">{generateReportData.cashSales.toLocaleString()} ج</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">مبيعات قسط (آجل)</p>
                                    <p className="text-xl font-black text-amber-700">{generateReportData.installmentSales.toLocaleString()} ج</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">عدد الفواتير</p>
                                    <p className="text-xl font-black text-slate-700">{generateReportData.invoiceCount} عقد</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* محتوى تقرير الجرد */}
                    {reportType === 'inventory' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 text-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">التقييم المالي للمخزون (بالتكلفة)</p>
                                    <p className="text-3xl font-black">{generateReportData.totalValue.toLocaleString()} ج.م</p>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">إجمالي القطع في المستودع</p>
                                    <p className="text-3xl font-black text-slate-800">{generateReportData.totalItems.toLocaleString()} <span className="text-sm">قطعة</span></p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-red-600 border-r-4 border-red-600 pr-3 mb-4 flex items-center gap-2">
                                    <span>🚨</span> قائمة النواقص الحرجة (تحتاج طلب شراء فوراً)
                                </h4>
                                <table className="w-full text-right text-xs border border-slate-100">
                                    <thead className="bg-red-50 text-red-700 font-black">
                                        <tr>
                                            <th className="p-3">اسم الصنف</th>
                                            <th className="p-3">التصنيف</th>
                                            <th className="p-3 text-center">الرصيد الفعلي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                        {generateReportData.lowStockItems.length > 0 ? generateReportData.lowStockItems.map(p => (
                                            <tr key={p.id}>
                                                <td className="p-3">{p.name}</td>
                                                <td className="p-3">{p.category || 'عام'}</td>
                                                <td className={`p-3 text-center text-lg ${p.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>{p.stock}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="p-6 text-center text-slate-400">لا توجد نواقص في المخزن حالياً.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* تذييل الطباعة */}
                    <div className="hidden print:block mt-20 pt-10 border-t-2 border-slate-900 text-center">
                        <div className="grid grid-cols-2 gap-10">
                            <div>
                                <p className="text-xs font-black text-slate-800 mb-8">توقيع المُعد (الكاشير/المحاسب)</p>
                                <p>_______________________</p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 mb-8">اعتماد المدير العام (CEO)</p>
                                <p>_______________________</p>
                            </div>
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 mt-10">تم استخراج هذا التقرير آلياً من نظام Eco Fine Pro (Enterprise V12.0) - تطوير Techno Vision Solutions</p>
                    </div>

                </div>
            )}
        </div>
    );
};

window.ReportsModule = ReportsModule;
