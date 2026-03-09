/**
 * 🔑 users.js - مديول إدارة المستخدمين والوصول (X-Control)
 * يسمح للمدير العام (CEO) بإضافة وحذف الموظفين وتعيين صلاحياتهم.
 */

const UsersModule = () => {
    const [users, setUsers] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    
    const [formData, setFormData] = React.useState({
        username: '',
        password: '',
        role: 'MODERATOR', // القيمة الافتراضية
        active: true
    });

    // تحميل قائمة المستخدمين من القاعدة
    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await db.getAll('users');
            setUsers(data || []);
        } catch (err) {
            console.error("خطأ في تحميل المستخدمين:", err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => { loadUsers(); }, []);

    // إضافة مستخدم جديد
    const handleAddUser = async (e) => {
        e.preventDefault();
        
        // منع إضافة اسم مستخدم مكرر
        const exists = users.find(u => u.username.toLowerCase() === formData.username.toLowerCase());
        if (exists) {
            alert("⚠️ اسم المستخدم هذا موجود بالفعل!");
            return;
        }

        try {
            await db.add('users', { 
                ...formData, 
                last_login: null 
            });
            alert("✅ تم إنشاء حساب الموظف ومنحه الصلاحيات");
            setFormData({ username: '', password: '', role: 'MODERATOR', active: true });
            setIsModalOpen(false);
            loadUsers();
        } catch (err) {
            alert("❌ فشل في إنشاء الحساب");
        }
    };

    const deleteUser = async (id, name) => {
        if (name === 'admin' || name === 'مستر إكس') {
            alert("⚠️ لا يمكن حذف حساب المدير العام!");
            return;
        }
        if (confirm(`هل أنت متأكد من حذف صلاحيات الموظف: ${name}؟`)) {
            await db.delete('users', id);
            loadUsers();
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* الهيدر */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-sm">
                <div>
                    <h3 className="font-black text-slate-800">إدارة الوصول (UAC)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">تحكم في من يرى ماذا</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all"
                >
                    + إضافة موظف
                </button>
            </div>

            {/* قائمة المستخدمين */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(u => (
                    <div key={u.id} className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl">
                                👤
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800">{u.username}</h4>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">
                                        {window.XGuard?.roles[u.role]?.label || u.role}
                                    </span>
                                    {u.active ? 
                                        <span className="text-[9px] text-green-500 font-bold">● نشط</span> : 
                                        <span className="text-[9px] text-red-400 font-bold">● معطل</span>
                                    }
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => deleteUser(u.id, u.username)}
                            className="p-2 text-red-300 hover:text-red-600 transition-colors"
                        >
                            🗑️
                        </button>
                    </div>
                ))}
            </div>

            {/* مودال إضافة مستخدم */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleAddUser} className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl overflow-y-auto">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="font-black text-xl text-slate-800">منح صلاحيات دخول</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-2xl text-slate-400">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">اسم المستخدم (Login)</label>
                                <input 
                                    required 
                                    className="w-full p-4 bg-slate-50 border rounded-2xl font-bold mt-1" 
                                    placeholder="مثلاً: m_saber"
                                    value={formData.username}
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">كلمة المرور</label>
                                <input 
                                    required 
                                    type="password"
                                    className="w-full p-4 bg-slate-50 border rounded-2xl font-bold mt-1" 
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">الدور الوظيفي (الصلاحيات)</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 border rounded-2xl font-black mt-1"
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    {window.XGuard && Object.entries(window.XGuard.roles).map(([key, role]) => (
                                        <option key={key} value={key}>{role.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-2">
                            <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                                ℹ️ ملاحظة: الموظف سيتمكن فقط من رؤية الموديولات المسموح بها لدوره الوظيفي كما هو محدد في نظام X-Guard.
                            </p>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4 active:scale-95 transition-transform">
                            تفعيل الحساب والوصول 🚀
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

// تصدير الموديول للذاكرة العامة
window.UsersModule = UsersModule;
