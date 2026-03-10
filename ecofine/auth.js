/**
 * 🔐 auth.js - محرك الحماية وتوزيع الصلاحيات (Enterprise X-Guard V11.0)
 * النظام: Eco Fine Pro V11 | المطور: Techno Vision Solutions (Mr. X)
 * التحديث الجديد: Cloud Bootstrapping (تأسيس المالك الأول في السحابة) + تتبع الخمول (30 دقيقة)
 */

// ==========================================
// 1. مراقب النشاط العالمي (Global Activity Tracker)
// ==========================================
(function initActivityTracker() {
    let timeout;
    const updateActivity = () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (localStorage.getItem('ecofine_session')) {
                localStorage.setItem('ecofine_last_activity', Date.now().toString());
            }
        }, 1000); 
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));
})();

// ==========================================
// 2. محرك الحماية والتحقق (X-Guard)
// ==========================================
const XGuard = {
    roles: {
        'OWNER': { label: 'المالك / المدير العام', color: 'bg-slate-900' },
        'MODERATOR': { label: 'مدير النظام', color: 'bg-blue-600' },
        'CASHIER': { label: 'كاشير / مبيعات', color: 'bg-teal-600' },
        'COLLECTOR': { label: 'محصل ميداني', color: 'bg-green-600' },
        'LAWYER': { label: 'الشؤون القانونية', color: 'bg-red-600' },
        'ACCOUNTANT': { label: 'محاسب مالي', color: 'bg-amber-600' },
        'HR_MANAGER': { label: 'مدير موارد بشرية', color: 'bg-purple-600' },
        'WH_MANAGER': { label: 'مدير مخازن', color: 'bg-orange-600' }
    },

    canAccess: (user, moduleId) => {
        if (!user || !user.permissions) return false;
        if (user.permissions.includes('all') || user.role_title === 'OWNER') return true;
        return user.permissions.includes(moduleId);
    },

    logout: () => {
        const sessionStr = localStorage.getItem('ecofine_session');
        if (sessionStr) {
            const user = JSON.parse(sessionStr);
            localStorage.setItem('ecofine_saved_creds', JSON.stringify({
                username: user.username,
                password: user.password,
                timestamp: Date.now()
            }));
        }
        localStorage.removeItem('ecofine_session');
        localStorage.removeItem('ecofine_last_activity');
        window.location.reload();
    }
};

window.XGuard = XGuard;

// ==========================================
// 3. واجهة الدخول الذكية (Auth Gatekeeper)
// ==========================================
const { useState, useEffect } = React;

const AuthModule = ({ onLoginSuccess, orgConfig }) => {
    const [view, setView] = useState('loading'); // loading, login, setup_owner
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkInitialState = async () => {
            try {
                // 1. فحص هل يوجد مستخدمين في قاعدة بيانات المؤسسة (السحابية أو المحلية)؟
                let users = [];
                if (window._supabase) {
                    // إذا كنا متصلين بالسحابة، ابحث في جدول users
                    const { data, error } = await window._supabase.from('users').select('*').limit(1);
                    if (!error && data) users = data;
                } else if (window.db) {
                    // Fallback محلي
                    users = await window.db.getAll('users');
                }
                
                // 🚀 Bootstrapping Logic: لو مفيش أي مستخدم، افتح شاشة التأسيس للمالك
                if (!users || users.length === 0) {
                    console.log("🛡️ لا يوجد مستخدمين - تفعيل وضع تأسيس المالك الأول");
                    setView('setup_owner');
                    return;
                }

                // 2. فحص الخمول (Inactivity Timeout - 30 Minutes)
                const now = Date.now();
                const lastActivity = localStorage.getItem('ecofine_last_activity');
                const savedSession = localStorage.getItem('ecofine_session');

                if (savedSession && lastActivity) {
                    const inactiveTimeMs = now - parseInt(lastActivity, 10);
                    if (inactiveTimeMs > 30 * 60 * 1000) { 
                        console.log("⚠️ تم إنهاء الجلسة بسبب تجاوز 30 دقيقة من الخمول");
                        localStorage.removeItem('ecofine_session');
                        localStorage.removeItem('ecofine_last_activity');
                        setError("تم تسجيل الخروج تلقائياً لعدم وجود تفاعل.");
                    } else {
                        localStorage.setItem('ecofine_last_activity', now.toString());
                        onLoginSuccess(JSON.parse(savedSession));
                        return;
                    }
                }

                // 3. فحص الحفظ المؤقت للباسورد (5 دقائق بعد تسجيل الخروج)
                const savedCredsStr = localStorage.getItem('ecofine_saved_creds');
                if (savedCredsStr) {
                    const savedCreds = JSON.parse(savedCredsStr);
                    const timeSinceLogout = now - savedCreds.timestamp;
                    
                    if (timeSinceLogout <= 5 * 60 * 1000) { 
                        setCredentials({ username: savedCreds.username, password: savedCreds.password });
                    } else {
                        localStorage.removeItem('ecofine_saved_creds');
                    }
                }

                setView('login');
            } catch (err) {
                console.error("Auth Init Error:", err);
                setView('login');
            }
        };

        checkInitialState();
    }, [onLoginSuccess]);

    // ==========================================
    // 🛠️ دالة تسجيل الدخول (للموظفين والمالك بعد التأسيس)
    // ==========================================
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            let user = null;
            
            // البحث السحابي أولاً
            if (window._supabase) {
                const { data, error: dbError } = await window._supabase
                    .from('users')
                    .select('*')
                    .eq('username', credentials.username.trim())
                    .single();
                
                if (!dbError && data) user = data;
            } else if (window.db) {
                user = await window.db.getByIndex('users', 'username', credentials.username.trim());
            }
            
            if (user && user.password === credentials.password) {
                if (user.active === false) {
                    setError("⚠️ هذا الحساب معطل حالياً بقرار من الإدارة");
                    setIsLoading(false);
                    return;
                }
                
                // إضافة الصلاحيات للمالك إذا لم تكن موجودة في الداتا بيز
                if (user.role === 'OWNER') user.permissions = ['all'];

                localStorage.setItem('ecofine_session', JSON.stringify(user));
                localStorage.setItem('ecofine_last_activity', Date.now().toString());
                localStorage.removeItem('ecofine_saved_creds');

                onLoginSuccess(user);
            } else {
                setError("❌ اسم المستخدم أو كلمة المرور غير صحيحة");
            }
        } catch (err) {
            setError("❌ خطأ في الاتصال بقاعدة البيانات.");
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 👑 دالة تأسيس حساب المالك الأول (Bootstrapping)
    // ==========================================
    const handleSetupOwner = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (credentials.username.trim().length < 4 || credentials.password.length < 6) {
            setError('⚠️ اسم المستخدم يجب أن يكون 4 أحرف على الأقل، وكلمة المرور 6 أحرف.');
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

            // الحفظ في السحابة
            if (window._supabase) {
                const { error: insertError } = await window._supabase.from('users').insert([newOwner]);
                if (insertError) throw new Error(insertError.message);
            } else if (window.db) {
                await window.db.add('users', newOwner);
            }

            // الدخول المباشر بعد التأسيس
            localStorage.setItem('ecofine_session', JSON.stringify(newOwner));
            localStorage.setItem('ecofine_last_activity', Date.now().toString());
            onLoginSuccess(newOwner);

        } catch (err) {
            console.error(err);
            setError("❌ حدث خطأ أثناء إنشاء حساب المالك السحابي.");
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'loading') return null;

    return (
        <div className="fixed inset-0 z-[500] bg-slate-900 flex items-center justify-center p-6 animate-in fade-in" dir="rtl">
            <div className="w-full max-w-md space-y-8">
                
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">
                        Eco Fine <span className="text-blue-500">Pro</span>
                    </h1>
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em]">
                        {orgConfig?.orgName ? `فرع: ${orgConfig.orgName}` : 'Enterprise Edition'}
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    
                    {/* شريط علوي يوضح نوع الشاشة */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${view === 'setup_owner' ? 'bg-amber-500' : 'bg-blue-600'}`}></div>

                    <div className="mb-8 text-center mt-2">
                        {view === 'setup_owner' ? (
                            <>
                                <h2 className="text-amber-400 font-black text-xl mb-1">👑 تأسيس النظام</h2>
                                <p className="text-slate-400 text-[10px] font-bold leading-relaxed">
                                    مرحباً بك. نظامك السحابي فارغ حالياً. قم بإنشاء حساب <br/> (المالك / المدير العام) الأول للبدء.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-white font-black text-lg">بوابة دخول الموظفين</h2>
                                <p className="text-slate-400 text-[10px] font-bold mt-1">الرجاء إدخال بيانات الاعتماد للوصول للنظام</p>
                            </>
                        )}
                    </div>

                    <form onSubmit={view === 'setup_owner' ? handleSetupOwner : handleLogin} className="space-y-4">
                        <div className="space-y-1 text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase pr-2">اسم المستخدم</label>
                            <input 
                                required
                                className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-2xl text-white text-xs font-bold outline-none focus:border-blue-500 transition-all text-right"
                                value={credentials.username}
                                onChange={e => setCredentials({...credentials, username: e.target.value})}
                                placeholder={view === 'setup_owner' ? "مثال: admin" : "ادخل اسم المستخدم"}
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

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold text-center animate-pulse">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all mt-4 flex justify-center items-center gap-2 ${
                                view === 'setup_owner' 
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'جاري المعالجة...' : view === 'setup_owner' ? 'إنشاء حساب المالك والبدء 🚀' : 'دخول آمن 🚀'}
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Techno Vision Solutions © 2026</p>
                </div>
            </div>
        </div>
    );
};

window.AuthModule = AuthModule;
