/**
 * 📊 accounting.js - محرك الحسابات العامة والزكاة (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: استخراج الأرباح الحقيقية (المحققة نقدياً)، فصل الديون المعدومة، وحساب وعاء الزكاة الشرعي بدقة.
 */

const { useState, useEffect, useMemo } = React;

const AccountingModule = ({ currentUser }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    
    // قواعد البيانات
    const [treasury, setTreasury] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [installments, setInstallments] = useState([]);
    const [products, setProducts] = useState([]);

    // ⛔ حماية سيادية: هذه الشاشة للمالك (OWNER) والمحاسب القانوني فقط
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'ACCOUNTANT') {
        if (window.XAudit) window.XAudit.log('وصول مرفوض', 'الحسابات العامة', `حاول ${currentUser?.username || 'مجهول'} الدخول للميزانية`, 'critical', currentUser?.username);
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[2.5rem] border border-red-100">
                <span className="text-6xl mb-4">⛔</span>
                <h2 className="text-xl font-black text-red-600">أسرار مالية عليا</h2>
                <p className="text-xs text-red-400 font-bold mt-2">لا تملك صلاحية للإطلاع على الميزانية العمومية وحسابات الزكاة.</p>
            </div>
        );
    }

    // ==========================================
    // 1. جلب كل الحركات المالية من شرايين النظام
    // ==========================================
    const loadFinancialData = async () => {
        setIsLoading(true);
        try {
            const [tData, invData, instData, pData] = await Promise.all([
                window.db.getAll('treasury').catch(() => []),
                window.db.getAll('invoices').catch(() => []),
                window.db.getAll('installments').catch(() => []),
                window.db.getAll('products').catch(() => [])
            ]);
            setTreasury(tData || []);
            setInvoices(invData || []);
            setInstallments(instData || []);
            setProducts(pData || []);
        } catch (err) {
            console.error("خطأ في جلب البيانات المحاسبية:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadFinancialData(); }, []);

    // ==========================================
    // 2. المحرك المحاسبي الذكي (Financial Engine)
    // ==========================================
    const financials = useMemo(() => {
        if (isLoading) return null;

        // 1. رصيد الخزينة الفعلي (النقدية السائلة)
        const cashOnHand = treasury.reduce((sum, t) => t.type === 'INCOME' ? sum + Number(t.amount) : sum - Number(t.amount), 0);
        const totalExpenses = treasury.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);

        // 2. تقييم المخزون (بضاعة في المخزن بسعر التكلفة)
        const inventoryValue = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.cost_price || 0)), 0);

        // 3. تحليل الفواتير (الأرباح المحققة مقابل المعلقة)
        let realizedProfit = 0;   // أرباح دخلت الدرج
        let unrealizedProfit = 0; // أرباح في الشارع (أقساط لم تُحصل)
        let totalSalesValue = 0;
        let totalCostOfGoodsSold = 0;

        invoices.forEach(inv => {
            // حساب تكلفة الفاتورة الإجمالية بناءً على تكلفة الأصناف
            let invoiceTotalCost = 0;
            inv.items?.forEach(item => {
                const product = products.find(p => p.id === item.id);
                const cost = product ? Number(product.cost_price) : (item.price * 0.7); // افتراض 70% لو الصنف اتحذف
                invoiceTotalCost += (cost * item.qty);
            });

            const invoiceTotalValue = Number(inv.total);
            const invoiceTotalProfit = invoiceTotalValue - invoiceTotalCost;
            
            totalSalesValue += invoiceTotalValue;
            totalCostOfGoodsSold += invoiceTotalCost;

            // نسبة الربح في هذه الفاتورة (مثلاً 20%)
            const profitMargin = invoiceTotalValue > 0 ? (invoiceTotalProfit / invoiceTotalValue) : 0;

            if (inv.type === 'cash' || inv.type === 'shipping') {
                // مبيعات الكاش والشحن (إذا سُلمت) ربحها محقق 100%
                realizedProfit += invoiceTotalProfit;
            } else if (inv.type === 'installment') {
                // الفواتير القسط: نحسب الربح المحقق بناءً على ما تم تحصيله فقط
                const instsForInv = installments.filter(i => i.invoice_id === inv.id);
                const collectedInstallments = instsForInv.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
                
                // البحث عن المقدم المدفوع في الخزينة لهذه الفاتورة
                const downPaymentEntry = treasury.find(t => t.type === 'INCOME' && t.description.includes(inv.id.slice(0, 8)) && t.description.includes('مقدم'));
                const downPayment = downPaymentEntry ? Number(downPaymentEntry.amount) : 0;

                const totalCollectedForInvoice = collectedInstallments + downPayment;
                const totalPendingForInvoice = invoiceTotalValue - totalCollectedForInvoice;

                // الربح المحقق = المبلغ المحصل × نسبة الربح
                realizedProfit += (totalCollectedForInvoice * profitMargin);
                // الربح المعلق = المتبقي × نسبة الربح
                unrealizedProfit += (totalPendingForInvoice * profitMargin);
            }
        });

        // 4. تحليل الديون (الديون المرجوة مقابل الديون المعدومة)
        const badDebtThreshold = window.XConfig?.legalPolicy?.thresholds?.monthly || 63; // أيام التأخير لاعتبار الدين معدوم مؤقتاً
        let goodDebts = 0;
        let badDebts = 0;
        const today = new Date();

        installments.filter(i => i.status !== 'paid').forEach(inst => {
            const dueDate = new Date(inst.due_date);
            const delayDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            const remainingInstAmt = Number(inst.amount) - Number(inst.paid_amount || 0);

            if (delayDays > badDebtThreshold) {
                badDebts += remainingInstAmt;
            } else {
                goodDebts += remainingInstAmt;
            }
        });

        // صافي الربح الحقيقي = الربح المحقق - المصروفات الإدارية والتشغيلية
        const netRealizedProfit = realizedProfit - totalExpenses;

        // 5. حساب وعاء الزكاة الشرعي
        // الوعاء = السيولة النقدية + البضاعة المعروضة للبيع (بالتكلفة) + الديون المرجوة (الجيدة)
        const zakatBase = cashOnHand + inventoryValue + goodDebts;
        const zakatAmount = zakatBase >= 0 ? (zakatBase * 0.025) : 0;

        return {
            cashOnHand, totalExpenses, inventoryValue, 
            realizedProfit, unrealizedProfit, netRealizedProfit,
            goodDebts, badDebts, totalSalesValue, totalCostOfGoodsSold,
            zakatBase, zakatAmount
        };
    }, [treasury, invoices, installments, products, isLoading]);

    if (isLoading || !financials) {
        return <div className="p-20 text-center text-slate-400 font-black animate-pulse">جاري تجميع الدفاتر المحاسبية... ⏳</div>;
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in relative">
            
            {/* التبويبات العلوية */}
            <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto snap-x custom-scroll sticky top-0 z-20">
                {[
                    {id: 'dashboard', label: 'المركز المالي', icon: '🏦'},
                    {id: 'pnl', label: 'الأرباح والخسائر', icon: '📈'},
                    {id: 'zakat', label: 'وعاء الزكاة (الشرعي)', icon: '🤲'}
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 snap-center flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-[1.5rem] text-[10px] font-black transition-all min-w-[120px] ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <span className="text-xl mb-1">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* 🏦 تبويب المركز المالي (الميزانية العمومية المبسطة) */}
            {activeTab === 'dashboard' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-slate-800">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> إجمالي الأصول (حجم البيزنس الحالي)
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-black mb-1">
                                {(financials.cashOnHand + financials.inventoryValue + financials.goodDebts).toLocaleString()} <span className="text-lg font-normal opacity-50">ج.م</span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-2">مجموع النقدية + بضاعة المخزن + الديون الجيدة في السوق.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg mb-4">💵</div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">النقدية بالخزينة</p>
                            <h3 className="text-2xl font-black text-slate-800">{financials.cashOnHand.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></h3>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg mb-4">📦</div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">تقييم المخزون (بالتكلفة)</p>
                            <h3 className="text-2xl font-black text-slate-800">{financials.inventoryValue.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></h3>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-lg mb-4">📝</div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">الديون المستحقة (مرجوة السداد)</p>
                            <h3 className="text-2xl font-black text-slate-800">{financials.goodDebts.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></h3>
                        </div>
                    </div>
                </div>
            )}

            {/* 📈 تبويب الأرباح والخسائر الحقيقية */}
            {activeTab === 'pnl' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 shadow-sm">
                        <div className="flex items-start gap-4">
                            <span className="text-3xl">💡</span>
                            <div>
                                <h4 className="text-sm font-black text-blue-900 mb-1">محرك الأرباح الذكي (Realized Profit)</h4>
                                <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                                    هذا التقرير لا يخدعك. يتم حساب "الربح المحقق" فقط من الأموال التي دخلت الخزنة فعلياً. 
                                    مبيعات التقسيط التي لم تُحصل بعد تُعتبر "أرباح دفترية معلقة" لحين سدادها.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-[2rem] border border-green-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">إجمالي الأرباح المحققة (نقدي تم قبضه)</p>
                            <h3 className="text-3xl font-black text-green-600 mb-4">{Math.round(financials.realizedProfit).toLocaleString()} <span className="text-sm text-green-400">ج.م</span></h3>
                            
                            <div className="border-t border-slate-100 pt-4 mt-2 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-bold">يُخصم المصروفات الإدارية:</span>
                                    <span className="font-black text-red-500">- {financials.totalExpenses.toLocaleString()} ج</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-black uppercase text-slate-800">صافي الربح الحقيقي القابل للتوزيع:</span>
                                    <span className="font-black text-lg text-slate-900">{Math.round(financials.netRealizedProfit).toLocaleString()} ج</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-amber-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">أرباح دفترية معلقة (أقساط في السوق)</p>
                            <h3 className="text-3xl font-black text-amber-500 mb-4">{Math.round(financials.unrealizedProfit).toLocaleString()} <span className="text-sm text-amber-300">ج.م</span></h3>
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed border-t border-slate-100 pt-4 mt-2">
                                هذه الأموال تمثل هامش الربح المتوقع من الأقساط المتبقية على العملاء. لا ينصح بسحبها كأرباح شخصية إلا بعد تحصيلها الفعلي تجنباً لعجز السيولة.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 🤲 تبويب وعاء الزكاة (الامتثال الشرعي) */}
            {activeTab === 'zakat' && (
                <div className="space-y-6 animate-in fade-in">
                    
                    <div className="bg-emerald-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-[-20%] left-[-10%] text-[150px] opacity-10">🕋</div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h2 className="text-xl font-black mb-2">حاسبة وعاء الزكاة الشرعي</h2>
                                <p className="text-xs text-emerald-200 font-bold leading-relaxed max-w-lg">
                                    "خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا".<br/>
                                    يقوم النظام بحساب الزكاة على (عروض التجارة والسيولة والديون المرجوة) ويستبعد الديون المعدومة (المتأخرة عن فترة التقاضي).
                                </p>
                            </div>
                            <div className="bg-emerald-800 p-5 rounded-3xl border border-emerald-700 w-full md:w-auto text-center shrink-0">
                                <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest mb-1">مقدار الزكاة الواجب إخراجه (2.5%)</p>
                                <h3 className="text-3xl md:text-4xl font-black text-emerald-400">
                                    {Math.round(financials.zakatAmount).toLocaleString()} <span className="text-sm font-normal opacity-70">ج.م</span>
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">تفصيل حساب الوعاء الزكوي</h4>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">💵</span>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">النقدية السائلة</p>
                                        <p className="text-[9px] font-bold text-slate-400">السيولة المتاحة في درج الخزينة</p>
                                    </div>
                                </div>
                                <span className="font-black text-slate-700">{financials.cashOnHand.toLocaleString()} ج</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📦</span>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">عروض التجارة (المخزون)</p>
                                        <p className="text-[9px] font-bold text-slate-400">يُقوّم بسعر التكلفة (الشراء)</p>
                                    </div>
                                </div>
                                <span className="font-black text-slate-700">+ {financials.inventoryValue.toLocaleString()} ج</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🤝</span>
                                    <div>
                                        <p className="text-sm font-black text-blue-900">ديون مرجوة الأداء (جيدة)</p>
                                        <p className="text-[9px] font-bold text-blue-600">أقساط منتظمة عند العملاء</p>
                                    </div>
                                </div>
                                <span className="font-black text-blue-800">+ {financials.goodDebts.toLocaleString()} ج</span>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100 opacity-60">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⚠️</span>
                                    <div>
                                        <p className="text-sm font-black text-red-900">ديون معدومة (مستبعدة من الزكاة)</p>
                                        <p className="text-[9px] font-bold text-red-600">أقساط متأخرة تجاوزت فترة الحظر القانوني</p>
                                    </div>
                                </div>
                                <span className="font-black text-red-800 line-through">{financials.badDebts.toLocaleString()} ج</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase">إجمالي الوعاء الزكوي الخاضع للحول:</span>
                            <span className="text-2xl font-black text-emerald-600">{financials.zakatBase.toLocaleString()} ج</span>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

window.AccountingModule = AccountingModule;
