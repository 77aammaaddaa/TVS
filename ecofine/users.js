/**
 * 🔑 users.js - مديول إدارة المستخدمين والوصول (Eco Fine Pro V6)
 * المطور: M H 4 Tech | الميزة: تخصيص يدوي للصلاحيات لكل موظف.
 */

const { useState, useEffect, useMemo } = React;

const UsersModule = () => {
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // مصفوفة الموديولات المتاحة في نظام Eco Fine Pro
    const availableModules = [
        { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
        { id: 'crm', label: 'العملاء والضامنين', icon: '🤝' },
        { id: 'pos', label: 'نقطة البيع', icon: '💻' },
        { id: 'collection', label: 'وحدة التحصيل', icon: '💰' },
        { id: 'treasury', label: 'الخزينة والمصاريف', icon: '🏦' },
        { id: 'inventory', label: 'المخزن والجرد', icon: '📦' },
        { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️' },
        { id: 'hr', label: 'شؤون الموظفين', icon: '👥' },
        { id: 'survey', label: 'الاستعلام الميداني', icon: '📍' },
        { id: 'suppliers', label: 'الموردين والمشتريات', icon: '🛒' },
        { id: 'users', label: 'إدارة الصلاحيات', icon: '🔑' },
        { id: 'settings', label: 'إعدادات النظام', icon: '⚙️' }
    ];

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role_title: 'موظف', // مسمى للعرض فقط
        permissions: [], // المصفوفة الفعلية للصلاحيات
        active: true
    });

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await db.getAll('users');
            setUsers(data || []);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { loadUsers(); }, []);

    // دالة لملء الصلاحيات تلقائياً بناءً على الدور (Quick Presets)
    const applyPreset = (preset) => {
        const presets = {
            'ACCOUNTANT': ['dashboard', 'treasury', 'collection', 'suppliers'],
            'LAWYER': ['crm', 'legal', 'survey', 'dashboard'],
            'CASHIER': ['pos', 'collection', 'crm'],
            'COLLECTOR': ['collection', 'crm', 'survey'],
            'HR_MANAGER': ['hr', 'users', 'dashboard'],
            'WH_MANAGER': ['inventory', 'suppliers', 'dashboard'],
            'OWNER': availableModules.map(m => m.id) // كل شيء
        };
        setFormData({ ...formData, permissions: presets[preset] || [], role_title: preset });
    };

    const togglePermission = (modId) => {
        const current = [...formData.permissions];
        const index = current.indexOf(modId);
        if (index > -1) current.splice(index, 1);
        else current.push(modId);
        setFormData({ ...formData, permissions: current });
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (formData.permissions.length === 0) return alert("⚠️ يجب تحديد صلاحية واحدة على الأقل!");
        
        try {
            await db.add('users', { ...formData, created_at: new Date().toISOString() });
            alert("✅ تم إنشاء الحساب بنجاح");
            setIsModalOpen(false);
            setFormData({ username: '', password: '', role_title: 'موظف', permissions: [], active: true });
            loadUsers();
        } catch (err) { alert("❌ فشل الحفظ"); }
    };

    const deleteUser = async (u) => {
        if (u.username === 'admin' || u.role_title === 'OWNER') return alert("🚫 محظور حذف حساب المالك!");
        if (confirm(`هل أنت متأكد من سحب صلاحيات ${u.username}؟`)) {
            await db.delete('users', u.id);
            loadUsers();
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* واجهة العرض الرئيسية */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border shadow-sm">
                <div>
                    <h3 className="font-black text-slate-900">إدارة الموظفين والوصول</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">تحكم يدوي كامل في الموديلات</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs active:scale-95 shadow-lg">+ إضافة حساب</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(u => (
                    <div key={u.id} className="bg-white p-6 rounded-[2rem] border relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl">👤</div>
                            <div>
                                <h4 className="font-black text-slate-800">{u.username}</h4>
                                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded-full font-black text-slate-500">{u.role_title}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {u.permissions?.map(p => (
                                <span key={p} className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase">{p}</span>
                            ))}
                        </div>
                        <button onClick={() => deleteUser(u)} className="absolute top-4 left-4 text-red-200 hover:text-red-500">🗑️</button>
                    </div>
                ))}
            </div>

            {/* 📱 نافذة الإضافة (Full-Screen Native UI) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-500">
                    
                    {/* هيدر النافذة */}
                    <div className="shrink-0 bg-slate-900 text-white p-6 rounded-b-[2.5rem] shadow-2xl z-30">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-black text-lg">منح صلاحيات وصول</h3>
                                <p className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Eco Fine Pro V6 Matrix</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">✕</button>
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scroll">
                            {['OWNER', 'ACCOUNTANT', 'LAWYER', 'CASHIER', 'COLLECTOR', 'WH_MANAGER'].map(p => (
                                <button key={p} type="button" onClick={() => applyPreset(p)} className="shrink-0 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black text-white hover:bg-blue-600 transition-all uppercase">
                                    {p} Template
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* جسم الفورم */}
                    <form id="user-form" onSubmit={handleAddUser} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                        
                        <section className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase border-b pb-4">01. بيانات الدخول</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input required placeholder="اسم المستخدم" className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                                <input required type="password" placeholder="كلمة المرور" className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>
                        </section>

                        <section className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase border-b pb-4">02. مصفوفة الصلاحيات اليدوية</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {availableModules.map(mod => (
                                    <label key={mod.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.permissions.includes(mod.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-50'}`}>
                                        <input type="checkbox" className="hidden" checked={formData.permissions.includes(mod.id)} onChange={() => togglePermission(mod.id)} />
                                        <span className="text-xl">{mod.icon}</span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-800">{mod.label}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">{mod.id}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </section>
                    </form>

                    {/* زر الحفظ الثابت */}
                    <div className="shrink-0 p-4 bg-white/80 backdrop-blur-md border-t">
                        <button form="user-form" type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all">
                            تفعيل حساب الموظف بالصلاحيات المختارة 🚀
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

window.UsersModule = UsersModule;
