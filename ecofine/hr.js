// hr.js - مديول شؤون الموظفين ونظام النقاط (إصدار إكس القابضة V6)

const HRModule = () => {
    const [employees, setEmployees] = React.useState([]);
    const [points, setPoints] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState('list'); // 'list' or 'points'
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    
    const [empForm, setEmpForm] = React.useState({ name: '', role: '', base_salary: 0, point_value: 10 });
    const [pointForm, setPointForm] = React.useState({ emp_id: '', type: 'plus', amount: '', reason: '' });

    const loadData = async () => {
        const [e, p] = await Promise.all([db.getAll('employees'), db.getAll('salary_points')]);
        setEmployees(e || []);
        setPoints(p || []);
    };

    React.useEffect(() => { loadData(); }, []);

    // 1. إضافة موظف
    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        await db.add('employees', empForm);
        setIsModalOpen(false);
        setEmpForm({ name: '', role: '', base_salary: 0, point_value: 10 });
        loadData();
        alert("✅ تم تسجيل الموظف في القوة الضاربة");
    };

    // 2. إضافة نقاط (مكافأة أو جزاء)
    const handleAddPoints = async (e) => {
        e.preventDefault();
        const emp = employees.find(x => x.id === pointForm.emp_id);
        const pointValue = Number(emp.point_value || 10);
        const cashImpact = Number(pointForm.amount) * pointValue * (pointForm.type === 'plus' ? 1 : -1);

        await db.add('salary_points', {
            ...pointForm,
            cash_impact: cashImpact,
            date: new Date().toISOString()
        });
        
        setPointForm({ emp_id: '', type: 'plus', amount: '', reason: '' });
        loadData();
        alert("✅ تم تحديث ميزان الأداء للموظف");
    };

    // حساب الراتب المستحق حالياً
    const calculateSalary = (empId, base) => {
        const empPoints = points.filter(p => p.emp_id === empId);
        const adjustments = empPoints.reduce((sum, p) => sum + p.cash_impact, 0);
        return Number(base) + adjustments;
    };

    return (
        <div className="space-y-6 pb-20">
            {/* التبويبات */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
                <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>فريق العمل</button>
                <button onClick={() => setActiveTab('points')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'points' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>نظام النقاط</button>
            </div>

            {activeTab === 'list' ? (
                <div className="space-y-4 animate-in fade-in">
                    <button onClick={() => setIsModalOpen(true)} className="w-full p-4 bg-blue-600 text-white rounded-3xl font-black shadow-lg shadow-blue-100">+ إضافة كادر جديد</button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {employees.map(emp => (
                            <div key={emp.id} className="bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                                <h4 className="font-black text-slate-800 text-lg">{emp.name}</h4>
                                <p className="text-[10px] text-blue-600 font-bold uppercase mb-4">{emp.role}</p>
                                
                                <div className="grid grid-cols-2 gap-2 border-t pt-4">
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">الأساسي</p>
                                        <p className="font-black text-slate-700">{emp.base_salary} ج</p>
                                    </div>
                                    <div className="text-center bg-blue-50 rounded-2xl p-2 border border-blue-100">
                                        <p className="text-[9px] text-blue-600 font-bold uppercase">المستحق الآن</p>
                                        <p className="font-black text-blue-700">{calculateSalary(emp.id, emp.base_salary)} ج</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom">
                    {/* فورم إضافة النقاط */}
                    <form onSubmit={handleAddPoints} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                        <h4 className="font-black text-slate-800">تعديل نقاط الأداء</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" value={pointForm.emp_id} onChange={e => setPointForm({...pointForm, emp_id: e.target.value})}>
                                <option value="">اختر الموظف...</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <select className="p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={pointForm.type} onChange={e => setPointForm({...pointForm, type: e.target.value})}>
                                    <option value="plus">إضافة (+)</option>
                                    <option value="minus">خصم (-)</option>
                                </select>
                                <input type="number" placeholder="عدد النقاط" required className="flex-1 p-4 bg-slate-50 border rounded-2xl font-black" value={pointForm.amount} onChange={e => setPointForm({...pointForm, amount: e.target.value})} />
                            </div>
                        </div>
                        <input placeholder="السبب (مثلاً: إنجاز تصميم، تأخير في الرد...)" required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" value={pointForm.reason} onChange={e => setPointForm({...pointForm, reason: e.target.value})} />
                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">اعتماد النقاط</button>
                    </form>

                    {/* سجل النقاط الأخير */}
                    <div className="space-y-2">
                        <p className="text-xs font-black text-slate-400 px-2 uppercase">آخر سجلات الأداء</p>
                        {points.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(p => (
                            <div key={p.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{employees.find(e => e.id === p.emp_id)?.name}</p>
                                    <p className="text-[10px] text-slate-400">{p.reason}</p>
                                </div>
                                <span className={`font-black ${p.type === 'plus' ? 'text-green-600' : 'text-red-600'}`}>
                                    {p.type === 'plus' ? '+' : '-'}{p.amount} نقطة
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* مودال إضافة موظف */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSaveEmployee} className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl">
                        <h3 className="font-black text-xl border-b pb-4">إضافة موظف جديد</h3>
                        <input placeholder="اسم الموظف" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
                        <input placeholder="المسمى الوظيفي" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">الراتب الأساسي</label>
                                <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={empForm.base_salary} onChange={e => setEmpForm({...empForm, base_salary: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">قيمة النقطة (ج)</label>
                                <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={empForm.point_value} onChange={e => setEmpForm({...empForm, point_value: e.target.value})} />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl mt-4">تثبيت الموظف</button>
                    </form>
                </div>
            )}
        </div>
    );
};

window.HRModule = HRModule;
