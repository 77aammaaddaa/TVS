// collection.js - مديول التحصيل ومتابعة الأقساط (V4)

const CollectionModule = () => {
    const [installments, setInstallments] = React.useState([]);
    const [customers, setCustomers] = React.useState([]);
    const [searchTerm, setSearchTerm] = React.useState('');

    const loadData = async () => {
        const inst = await db.getAll('installments');
        const cust = await db.getAll('customers');
        setInstallments(inst);
        setCustomers(cust);
    };

    React.useEffect(() => { loadData(); }, []);

    // دالة التحصيل (تغيير حالة القسط)
    const collectPayment = async (id) => {
        if(!confirm("تأكيد استلام المبلغ وكتابة وصل؟")) return;
        
        try {
            await db.update('installments', id, { 
                status: 'paid', 
                paid_at: new Date().toISOString() 
            });
            alert("✅ تم التحصيل وتحديث سجل العميل");
            loadData();
        } catch (e) { alert("خطأ في التحديث"); }
    };

    // ربط اسم العميل برقم القسط للعرض
    const getCustomerName = (id) => customers.find(c => c.id === id)?.full_name || "عميل غير معروف";

    return (
        <div className="space-y-6">
            {/* فلتر سريع للمحصلين */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <input 
                    type="text" placeholder="ابحث باسم العميل للتحصيل..." 
                    className="w-full p-4 bg-slate-50 border rounded-2xl font-bold"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                <h3 className="font-black text-slate-800 px-2">أقساط تستحق التحصيل:</h3>
                
                {installments
                    .filter(inst => inst.status === 'pending' && getCustomerName(inst.customer_id).includes(searchTerm))
                    .sort((a,b) => new Date(a.due_date) - new Date(b.due_date))
                    .map(inst => (
                        <div key={inst.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                            {/* علامة تحذير لو القسط متأخر */}
                            {new Date(inst.due_date) < new Date() && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] px-3 py-1 font-black">متأخر!</div>
                            )}
                            
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-slate-800">{getCustomerName(inst.customer_id)}</h4>
                                    <p className="text-xs text-slate-400">تاريخ الاستحقاق: {inst.due_date}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-xl font-black text-blue-600">{inst.amount.toFixed(2)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">جنية مصري</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => collectPayment(inst.id)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-black shadow-lg shadow-green-100 transition-all active:scale-95"
                            >
                                ✅ تم استلام المبلغ
                            </button>
                        </div>
                    ))
                }

                {installments.filter(i => i.status === 'pending').length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <p className="text-4xl mb-2">🎉</p>
                        <p className="font-bold">لا توجد أقساط مستحقة حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

window.CollectionModule = CollectionModule;
