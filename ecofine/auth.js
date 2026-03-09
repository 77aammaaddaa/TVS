/**
 * 🔐 auth.js - محرك الحماية وتوزيع الصلاحيات (X-Guard V6 Turbo)
 * النظام: Eco Fine Pro V6 | المطور: M H 4 Tech
 * التحديث الجديد: تتبع الخمول (30 دقيقة) + حفظ مؤقت للبيانات (5 دقائق).
 */

// ==========================================
// 1. مراقب النشاط العالمي (Global Activity Tracker)
// يعمل في الخلفية دائماً لتسجيل تفاعل الموظف مع النظام
// ==========================================
(function initActivityTracker() {
    let timeout;
    const updateActivity = () => {
        if (timeout) clearTimeout(timeout);
        // تحديث بحد أقصى مرة كل ثانية لمنع استهلاك موارد الجهاز (Debouncing)
        timeout = setTimeout(() => {
            if (localStorage.getItem('ecofine_session')) {
                localStorage.setItem('ecofine_last_activity', Date.now().toString());
            }
        }, 1000); 
    };

    // الاستماع لحركات الماوس، اللمس، الكيبورد، والتمرير
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

    // 🚀 دالة تسجيل الخروج الذكية (تحفظ البيانات 5 دقائق)
    logout: () => {
        const sessionStr = localStorage.getItem('ecofine_session');
        if (sessionStr) {
            const user = JSON.parse(sessionStr);
            // حفظ اليوزر والباسورد مؤقتاً
            localStorage.setItem('ecofine_saved_creds', JSON.stringify({
                username: user.username,
                password: user.password,
                timestamp: Date.now()
            }));
        }
        // تدمير الجلسة الحالية
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

const AuthModule = ({ onLoginSuccess }) => {
    const [view, setView] = useState('loading');
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        const checkInitialState = async () => {
            try {
                // 1. فحص هل يوجد مستخدمين في النظام؟
                const users = await db.getAll('users');
                
                if (!users || users.length === 0) {
                    console.log("🛡️ لا يوجد مستخدمين - تفعيل وضع الوصول المباشر للمالك");
                    onLoginSuccess({ 
                        id: 'owner-auto', 
                        username: 'المالك', 
                        role_title: 'OWNER', 
                        permissions: ['all'] 
                    });
                    return;
                }

                const now = Date.now();

                // 2. فحص الخمول (Inactivity Timeout - 30 Minutes)
                const lastActivity = localStorage.getItem('ecofine_last_activity');
                const savedSession = localStorage.getItem('ecofine_session');

                if (savedSession && lastActivity) {
                    const inactiveTimeMs = now - parseInt(lastActivity, 10);
                    if (inactiveTimeMs > 30 * 60 * 1000) { // 30 دقيقة
                        console.log("⚠️ تم إنهاء الجلسة بسبب تجاوز 30 دقيقة من الخمول");
                        localStorage.removeItem('ecofine_session');
                        localStorage.removeItem('ecofine_last_activity');
                        setError("تم تسجيل الخروج تلقائياً لعدم وجود تفاعل.");
                    } else {
                        // الجلسة صالحة والتفاعل حديث
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
                    
                    if (timeSinceLogout <= 5 * 60 * 1000) { // 5 دقائق
                        setCredentials({
                            username: savedCreds.username,
                            password: savedCreds.password
                        });
                        console.log("⏱️ تم استرجاع بيانات الدخول المحفوظة (أقل من 5 دقائق)");
                    } else {
                        // مسح البيانات لو عدى عليها أكتر من 5 دقايق
                        localStorage.removeItem('ecofine_saved_creds');
                    }
                }

                // إذا وصلنا هنا، يجب عرض شاشة تسجيل الدخول
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
        
        try {
            const user = await db.getByIndex('users', 'username', credentials.username);
            
            if (user && user.password === credentials.password) {
                if (user.active === false) {
                    setError("⚠️ هذا الحساب معطل حالياً بقرار من الإدارة");
                    return;
                }
                
                // حفظ الجلسة وتنشيط وقت التفاعل
                localStorage.setItem('ecofine_session', JSON.stringify(user));
                localStorage.setItem('ecofine_last_activity', Date.now().toString());
                
                // مسح البيانات المؤقتة بعد الدخول الناجح
                localStorage.removeItem('ecofine_saved_creds');

                onLoginSuccess(user);
            } else {
                setError("❌ اسم المستخدم أو كلمة المرور غير صحيحة");
            }
        } catch (err) {
            setError("❌ فشل الاتصال بقاعدة البيانات المركزية");
        }
    };

    if (view === 'loading') return null;

    return (
        <div className="fixed inset-0 z-[500] bg-slate-900 flex items-center justify-center p-6 animate-in fade-in" dir="rtl">
            <div className="w-full max-w-md space-y-8">
                
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">Eco Fine <span className="text-blue-500">Pro</span></h1>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Powered by M H 4 Tech</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
                    <div className="mb-8 text-center">
                        <h2 className="text-white font-black text-lg">بوابة دخول الموظفين</h2>
                        <p className="text-slate-400 text-[10px] font-bold mt-1">الرجاء إدخال بيانات الاعتماد للوصول للنظام</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1 text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase pr-2">اسم المستخدم</label>
                            <input 
                                required
                                className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-2xl text-white text-xs font-bold outline-none focus:border-blue-500 transition-all text-right"
                                value={credentials.username}
                                onChange={e => setCredentials({...credentials, username: e.target.value})}
                                placeholder="ادخل اسم المستخدم"
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
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold text-center animate-pulse">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-4">
                            دخول آمن 🚀
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Version 6.0 Turbo | Secure Connection</p>
                </div>
            </div>
        </div>
    );
};

window.AuthModule = AuthModule;
