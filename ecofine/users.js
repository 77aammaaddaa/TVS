/**
 * 👥 users.js - موديول المستخدمين والحماية (V14.0 Cloud/Multi-Tenant Standalone)
 * الوظيفة: شاشة تسجيل الدخول + إدارة الصلاحيات والموظفين في البيئة المعزولة.
 */

const { useState, useEffect } = React;

// ==========================================
// 🛡️ 1. محرك الحماية وتوزيع الصلاحيات (X-Guard V14.0)
// ==========================================
const XGuard = {
    roles: {
        'OWNER': { label: 'المالك / المدير العام', color: 'bg-slate-900' },
        'MODERATOR': { label: 'مدير النظام (Admin)', color: 'bg-blue-600' },
        'CASHIER': { label: 'مسؤول عقود وخزينة', color: 'bg-teal-600' },
        'COLLECTOR': { label: 'محصل ميداني', color: 'bg-green-600' },
        'ACCOUNTANT': { label: 'محاسب مالي', color: 'bg-amber-600' },
        'HR_MANAGER': { label: 'مدير موارد بشرية', color: 'bg-purple-600' },
        'WH_MANAGER': { label: 'مدير مخازن', color: 'bg-orange-600' },
        'LAWYER': { label: 'الشؤون القانونية', color: 'bg-red-600' }
    },
    canAccess: (user, moduleId) => {
        if (!user || !user.permissions) return false;
        if (user.role === 'OWNER' || user.role_title === 'OWNER' || user.permissions.includes('all')) return true;
        return user.permissions.includes(moduleId);
    },
    logout: () => {
        localStorage.removeItem('ecofine_session');
        localStorage.removeItem('ecofine_last_activity');
        window.location.reload();
    }
};
window.XGuard = XGuard;

// ==========================================
// 🔐 2. شاشة تسجيل الدخول المدمجة (Auth Gatekeeper)
// ==========================================
const AuthModule = ({ onLoginSuccess }) => {
    const [view, setView] = useState('loading'); // loading, login, setup
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkInitialState = async () => {
            try {
                // التأكد من تهيئة الداتا بيز المحلية
                if (!window.db.localDb) await window.db.init();

                // فحص المستخدمين سحابياً أولاً (للـ Multi-Tenant) ثم محلياً
                let users = [];
                if (navigator.onLine && window._supabase) {
                    const { data } = await window._supabase.from('users').select('*').limit(1);
                    if (data) users = data;
                } else {
                    users = await window.db.getAll('users');
                }
                
                // إذا لم يكن هناك مستخدمين، افتح شاشة تأسيس المالك في السحابة
                if (!users || users.length === 0) {
                    setView('setup');
                    return;
                }

                // فحص الجلسة السابقة
                const savedSession = localStorage.getItem('ecofine_session');
                if (savedSession) {
                    onLoginSuccess(JSON.parse(savedSession));
                    return;
                }

                setView('login');
            } catch (err) {
                console.error("Auth Error:", err);
                setView('login');
            }
        };
        checkInitialState();
    }, [onLoginSuccess]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            let user = null;
            
            // تحقق سحابي مباشر إذا أمكن
            if (navigator.onLine && window._supabase) {
                const { data } = await window._supabase.from('users').select('*').eq('username', credentials.username.trim()).single();
                if (data) user = data;
            } else {
                const users = await window.db.getAll('users');
                user = users.find(u => u.username === credentials.username.trim());
            }
            
            if (user && user.password === credentials.password) {
                if (user.active === false || user.is_active === false) {
                    setError("⚠️ هذا الحساب معطل بقرار من الإدارة.");
                    setIsLoading(false);
                    return;
                }

                if (user.role === 'OWNER') user.permissions = ['all'];

                localStorage.setItem('ecofine_session', JSON.stringify(user));
                localStorage.setItem('ecofine_last_activity', Date.now().toString());
                onLoginSuccess(user);
            } else {
                setError("❌ اسم المستخدم أو كلمة المرور غير صحيحة.");
            }
        } catch (err) {
            setError("❌ خطأ في الاتصال بقاعدة البيانات.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetupOwner = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        if (credentials.username.length < 4 || credentials.password.length < 4) {
            setError('⚠️ يجب أن لا يقل الاسم والباسورد عن 4 أحرف.');
            setIsLoading(false);
            return;
        }
        try {
            const newOwner = {
                username: credentials.username.trim(),
                password: credentials.password,
                role: 'OWNER',
                permissions: ['all'],
                active: true,
                created_at: new Date().toISOString()
            };

            if (navigator.onLine && window._supabase) {
                await window._supabase.from('users').insert([newOwner]);
            }
            await window.db.add('users', newOwner);
            
            localStorage.setItem('ecofine_session', JSON.stringify(newOwner));
            localStorage.setItem('ecofine_last_activity', Date.now().toString());
            onLoginSuccess(newOwner);
        } catch (err) {
            setError("❌ حدث خطأ أثناء إنشاء الحساب السحابي.");
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'loading') return null;

    return (
        <div className="fixed inset-0 z-[500] bg-slate-900 flex items-center justify-center p-6 animate-in fade-in" dir="rtl">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">Eco Fine <span className="text-blue-500">Pro</span></h1>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em]">
                        {window.XConfig?.identity?.storeName || 'V14.0 Enterprise Edition'}
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${view === 'setup' ? 'bg-amber-500' : 'bg-blue-600'}`}></div>
                    
                    <div className="mb-8 text-center mt-2">
                        {view === 'setup' ? (
                            <>
                                <h2 className="text-amber-400 font-black text-xl mb-1">👑 تأسيس النظام (Cloud)</h2>
                                <p className="text-slate-400 text-[10px] font-bold leading-relaxed">قم بإنشاء حساب المالك الأول للبيئة المعزولة.</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-white font-black text-lg">بوابة دخول الموظفين</h2>
                                <p className="text-slate-400 text-[10px] font-bold mt-1">أدخل بيانات الاعتماد للوصول لنظام المؤسسة.</p>
                            </>
                        )}
                    </div>

                    <form onSubmit={view === 'setup' ? handleSetupOwner : handleLogin} className="space-y-4">
                        <div className="space-y-1 text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase pr-2">اسم المستخدم</label>
                            <input 
                                required
                                className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-2xl text-white text-xs font-bold outline-none focus:border-blue-500 transition-all text-right"
                                value={credentials.username}
                                onChange={e => setCredentials({...credentials, username: e.target.value})}
                                placeholder={view === 'setup' ? "مثال: admin" : "ادخل اسم المستخدم"}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-1 text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase pr-2">كلمة المرور</label>
                            <input 
                                required
                                type="password"
                                className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-2xl text-white text-xs font-bold outline-none focus:border-blue-500 transition-all text-right"
                                value={credentials.password}
                                onChange={e => setCredentials({...credentials, password: e.target.value})}
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>

                        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold text-center animate-pulse">{error}</div>}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all mt-4 flex justify-center items-center gap-2 ${
                                view === 'setup' ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'جاري المعالجة...' : view === 'setup' ? 'إنشاء حساب المالك 🚀' : 'دخول آمن 🚀'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
window.AuthModule = AuthModule;

// ==========================================
// 👥 3. لوحة إدارة الموظفين والصلاحيات (Users Module)
// ==========================================
const UsersModule = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'CASHIER', permissions: ['dashboard'], active: true });

    // موديولات النظام الجديد (V14.0)
    const availableModules = [
        { id: 'dashboard', name: 'الرئيسية' },
        { id: 'contracts', name: 'العقود والمبيعات' },
        { id: 'vaults', name: 'الخزائن والماليات' },
        { id: 'inventory', name: 'المخازن' },
        { id: 'crm', name: 'العملاء' },
        { id: 'hr', name: 'الموظفين' },
        { id: 'purchases', name: 'المشتريات' },
        { id: 'reports', name: 'التقارير' }
    ];

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        let data = [];
        // جلب سحابي مباشر للحصول على التحديثات اللحظية من الفروع الأخرى
        if (navigator.onLine && window._supabase) {
            const { data: cloudData } = await window._supabase.from('users').select('*').order('created_at', { ascending: false });
            if (cloudData) data = cloudData;
        } else {
            data = await window.db.getAll('users');
        }
        setUsers(data || []);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            await window.db.add('users', formData); // window.db.add handles both Local & Supabase
            setShowForm(false);
            loadUsers();
            setFormData({ username: '', password: '', role: 'CASHIER', permissions: ['dashboard'], active: true });
        } catch (err) {
            alert("❌ فشل حفظ المستخدم");
        }
    };

    const toggleStatus = async (user) => {
        if (user.role === 'OWNER') return alert("⚠️ لا يمكن تعطيل حساب المالك!");
        await window.db.update('users', user.id, { active: !user.active });
        loadUsers();
    };

    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MODERATOR') {
        return <div className="p-10 text-center text-red-500 font-black bg-red-50 rounded-3xl">⚠️ غير مصرح لك بالوصول لهذه الصفحة.</div>;
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl font-black text-slate-800">إدارة الموظفين والصلاحيات</h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">التحكم في وصول الموظفين لموديولات النظام السحابي.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all">
                    {showForm ? 'إلغاء' : '➕ إضافة موظف'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSaveUser} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1">اسم المستخدم</label>
                        <input required className="w-full p-3 rounded-xl border outline-none focus:border-blue-500 font-bold text-sm" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1">كلمة المرور</label>
                        <input required type="password" className="w-full p-3 rounded-xl border outline-none focus:border-blue-500 font-bold text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1">الدور الوظيفي</label>
                        <select className="w-full p-3 rounded-xl border outline-none font-bold text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                            {Object.entries(XGuard.roles).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 mb-2">الصلاحيات (الموديولات المسموحة)</label>
                        <div className="flex flex-wrap gap-2">
                            {availableModules.map(mod => (
                                <label key={mod.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.permissions.includes(mod.id)}
                                        onChange={(e) => {
                                            const newPerms = e.target.checked ? [...formData.permissions, mod.id] : formData.permissions.filter(p => p !== mod.id);
                                            setFormData({...formData, permissions: newPerms});
                                        }}
                                        className="accent-blue-600"
                                    />
                                    <span className="text-[10px] font-bold uppercase">{mod.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="md:col-span-2 mt-2">
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-600/20">حفظ الموظف</button>
                    </div>
                </form>
            )}

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400">
                            <tr>
                                <th className="p-4">الموظف</th>
                                <th className="p-4">الدور الوظيفي</th>
                                <th className="p-4">الحالة</th>
                                <th className="p-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs">{user.username.charAt(0).toUpperCase()}</div>
                                        <span>{user.username}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[9px] text-white shadow-sm ${XGuard.roles[user.role]?.color || 'bg-slate-400'}`}>
                                            {XGuard.roles[user.role]?.label || user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[9px] ${user.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                            {user.active ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => toggleStatus(user)} className="text-[10px] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-700 active:scale-95 transition-transform border border-slate-200">
                                            {user.active ? 'تعطيل 🔴' : 'تفعيل 🟢'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 text-xs">جاري تحميل البيانات السحابية...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
window.UsersModule = UsersModule;
