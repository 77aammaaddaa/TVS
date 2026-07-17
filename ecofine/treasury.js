// treasury.js - مديول الخزينة والمصاريف (V4)

const TreasuryModule = () => {
    const [transactions, setTransactions] = React.useState([]);
    const [expenses, setExpenses] = React.useState([]);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
    const [expenseForm, setExpenseForm] = React.useState({ reason: '', amount: '' });

    const loadFinancials = async () => {
        const installments = await db.getAll('installments');
        const exp = await db.getAll('expenses');
        
        // تصفية التحصيلات الناجحة فقط
        const paidInstallments = installments.filter(i => i.status === 'paid');
        setTransactions(paidInstallments);
        setExpenses(exp);
    };

    React.useEffect(() => { loadFinancials(); }, []);

    // الحسابات المالية
    const totalIn = transactions.reduce((sum, item) => sum + item.amount, 0);
    const totalOut = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const balance = totalIn - totalOut;

    const addExpense = async (e) => {
        e.preventDefault();
        if (Number(expenseForm.amount) <= 0) return alert("أدخل مبلغاً صحيحاً");
        
        await db.add('expenses', {
            ...expenseForm,
            date: new Date().toISOString().split('T')[0]
        });
        
        setIsExpenseModalOpen(false);
        setExpenseForm({ reason: '', amount: '' });
        loadFinancials();
        alert("✅ تم تسجيل المصروف وخصمه من الخزينة");
    };

    return (
        <div className="space-y-6">
            {/* بطاقة الرصيد الرئيسي */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-20px] left-[-20px] w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">إجمالي الرصيد الحالي</p>
                <h2 className="text-4xl font-black mb-6">{balance.toLocaleString()} <span className="text-sm font-normal text-slate-400">ج.م</span></h2>
                
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase">إجمالي الداخل (+)</p>
                        <p className="text-green-400 font-black">{totalIn.toLocaleString()} ج</p>
                    </div>
                    <div className="text-left">
                        <p className="text-slate-500 text-[10px] font-bold uppercase">إجمالي المصاريف (-)</p>
                        <p className="text-red-400 font-black">{totalOut.toLocaleString()} ج</p>
                    </div>
                </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm font-black text-slate-700 flex flex-col items-center gap-2"
                >
                    <span className="text-2xl">💸</span>
                    <span>تسجيل مصروف</span>
                </button>
                <button className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm font-black text-slate-700 flex flex-col items-center gap-2 opacity-50">
                    <span className="text-2xl">📊</span>
                    <span>تقرير الوردية</span>
                </button>
            </div>

            {/* سجل العمليات الأخيرة */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b font-black text-sm text-slate-600">آخر التحركات المالية</div>
                <div className="divide-y">
                    {expenses.map(ex => (
                        <div key={ex.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{ex.reason}</p>
                                <p className="text-[10px] text-slate-400">{ex.date} - مصروف</p>
                            </div>
                            <span className="text-red-600 font-black">-{ex.amount} ج</span>
                        </div>
                    ))}
                    {transactions.map(tr => (
                        <div key={tr.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">تحصيل قسط</p>
                                <p className="text-[10px] text-slate-400">{tr.paid_at?.split('T')[0]} - داخل</p>
                            </div>
                            <span className="text-green-600 font-black">+{tr.amount} ج</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* مودال تسجيل المصروف */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up">
                        <h3 className="text-xl font-black text-slate-800 border-b pb-4">تسجيل مصروف جديد</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-500">سبب الصرف (بند المصرف)</label>
                            <input 
                                placeholder="مثلاً: فاتورة كهرباء، رواتب..." 
                                className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl" 
                                value={expenseForm.reason}
                                onChange={e => setExpenseForm({...expenseForm, reason: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">المبلغ</label>
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl font-black text-red-600" 
                                value={expenseForm.amount}
                                onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                            />
                        </div>
                        <div className="flex gap-2 pt-4">
                            <button onClick={addExpense} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black">تأكيد الصرف</button>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="px-6 bg-slate-100 rounded-2xl font-bold text-slate-600">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.TreasuryModule = TreasuryModule;
