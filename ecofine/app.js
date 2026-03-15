/**
 * 🚀 app.js - المايسترو ومركز القيادة (The X-Command Center V14.1)
 * التحديث: إصلاح الشاشة البيضاء + إضافة مكونات لوحة التحكم الناقصة + تحسين معالجة الأخطاء.
 */

(function() {
    "use strict";

    const { useState, useEffect, useMemo, useCallback, useRef } = React;

    // ==========================================
    // الثوابت العامة
    // ==========================================
    const SECRET_PIN = '0120';
    const SECRET_CLICKS_THRESHOLD = 5;
    const SECRET_TIMEOUT_MS = 2000;
    const DASHBOARD_REFRESH_INTERVAL = 10000; // 10 ثواني
    const ALERT_REFRESH_INTERVAL = 15000; // 15 ثانية
    const SPLASH_TIMEOUT_MS = 10000; // 10 ثواني كحد أقصى للتحميل

    // ==========================================
    // مكونات لوحة التحكم (تمت إضافتها لمنع الشاشة البيضاء)
    // ==========================================
    const StatBox = ({ title, value, icon, color, trend }) => (
        <div className={`p-6 rounded-[2rem] border shadow-sm relative overflow-hidden bg-white`}>
            <div className={`absolute top-0 right-0 w-2 h-full bg-${color}-500`}></div>
            <div className="flex justify-between items-start mb-4 pr-3">
                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-2xl bg-${color}-50 text-${color}-600`}>
                    {icon}
                </div>
                <div className="text-left">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
                    <span className="text-2xl font-black text-slate-800">{value}</span>
                </div>
            </div>
            {trend && (
                <div className="mt-4 text-[10px] font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 pr-3">
                    {trend}
                </div>
            )}
        </div>
    );

    const RatioCard = ({ title, value, percentage, color }) => (
        <div className="bg-slate-800/50 p-6 rounded-[1.5rem] border border-slate-700">
            <div className="flex justify-between items-end mb-4">
                <span className="text-xl font-black text-white">{value}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">{title}</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex justify-end">
                <div className={`h-full bg-${color}-500 rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );

    const DashboardView = ({ currentUser, setActiveTab }) => {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">مرحباً، {currentUser?.full_name || currentUser?.username || 'أيها القائد'} 👋</h2>
                        <p className="text-xs font-bold text-slate-500 mt-1">نظرة عامة على أداء النظام اليوم</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatBox title="إجمالي المبيعات" value="0" icon="💰" color="blue" trend="مؤشرات اليوم" />
                    <StatBox title="العملاء النشطين" value="0" icon="👥" color="green" trend="إجمالي المسجلين" />
                    <StatBox title="الأقساط المتأخرة" value="0" icon="⚠️" color="red" trend="يحتاج متابعة عاجلة" />
                    <StatBox title="رصيد الخزينة" value="0" icon="🏦" color="purple" trend="السيولة الحالية" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] border shadow-sm">
                        <h3 className="font-black text-slate-800 mb-4 text-sm">الاختصارات السريعة (العمليات)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <button onClick={() => setActiveTab('pos')} className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group">
                                <span className="text-3xl group-hover:scale-110 transition-transform">💻</span>
                                <span className="text-[10px] font-black text-slate-600">نقطة البيع</span>
                            </button>
                            <button onClick={() => setActiveTab('crm')} className="p-4 bg-slate-50 hover:bg-green-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group">
                                <span className="text-3xl group-hover:scale-110 transition-transform">🤝</span>
                                <span className="text-[10px] font-black text-slate-600">إدارة العملاء</span>
                            </button>
                            <button onClick={() => setActiveTab('collection')} className="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group">
                                <span className="text-3xl group-hover:scale-110 transition-transform">💰</span>
                                <span className="text-[10px] font-black text-slate-600">التحصيل</span>
                            </button>
                            <button onClick={() => setActiveTab('inventory')} className="p-4 bg-slate-50 hover:bg-purple-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group">
                                <span className="text-3xl group-hover:scale-110 transition-transform">📦</span>
                                <span className="text-[10px] font-black text-slate-600">المخزن والجرد</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
                        <h3 className="font-black text-slate-200 mb-4 text-sm flex items-center justify-between">
                            <span>مؤشرات صحة النظام</span>
                            <span className="text-[9px] bg-blue-600 px-2 py-1 rounded-lg tracking-widest uppercase">Live</span>
                        </h3>
                        <div className="space-y-3">
                            <RatioCard title="تطابق البيانات السحابية" value="100%" percentage={100} color="green" />
                            <RatioCard title="معدل التحصيل العام" value="0%" percentage={0} color="blue" />
                            <RatioCard title="مؤشر المخاطر الائتمانية" value="مستقر" percentage={15} color="amber" />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const LoadingScreen = ({ error }) => (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 mb-8 relative">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-xl">X</div>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-2">Eco Fine <span className="text-blue-500">Pro</span></h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse mb-4">Initializing System...</p>
                
                {error && (
                    <div className="mt-6 max-w-sm bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-center animate-in zoom-in duration-300">
                        <p className="text-xs text-red-300 font-bold leading-relaxed">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );

    // ==========================================
    // المكون الرئيسي للتطبيق
    // ==========================================
    const App = () => {
        const [currentUser, setCurrentUser] = useState(null);
        const [isReady, setIsReady] = useState(false);
        const [initError, setInitError] = useState(null); 
        const [activeTab, setActiveTab] = useState('dashboard');
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [isOnline, setIsOnline] = useState(navigator.onLine);
        const [currentTime, setCurrentTime] = useState(new Date());
        const [unreadAlerts, setUnreadAlerts] = useState(0);

        // حالات الباب السري
        const secretClicksRef = useRef(0);
        const secretTimeoutRef = useRef(null);
        const splashTimeoutRef = useRef(null);
        const [showPinModal, setShowPinModal] = useState(false);
        const [pinCode, setPinCode] = useState('');

        // ==========================================
        // التهيئة مع مؤقت احتياطي
        // ==========================================
        useEffect(() => {
            splashTimeoutRef.current = setTimeout(() => {
                if (!isReady) {
                    console.error("❌ تجاوز الوقت المسموح لتهيئة النظام.");
                    setInitError("تجاوز الوقت المسموح لتهيئة النظام. يرجى التحقق من اتصالك بالإنترنت وتوافر ملفات قاعدة البيانات.");
                    setIsReady(true);
                }
            }, SPLASH_TIMEOUT_MS);

            const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);

            const handleOnline = () => {
                setIsOnline(true);
                if (window.db?.syncWithCloud) {
                    window.db.syncWithCloud().catch(e => console.warn("⚠️ فشل المزامنة التلقائية:", e));
                }
            };
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            const hideSplash = () => {
                const splash = document.getElementById('splash-screen');
                if (splash) {
                    splash.style.opacity = '0';
                    setTimeout(() => splash?.remove(), 500);
                }
            };

            const initializeApp = async () => {
                try {
                    if (!window.db) {
                        throw new Error("ملف database.js غير محمل أو db غير معرف.");
                    }

                    if (window.db.init) {
                        await window.db.init();
                    } else {
                        console.warn("⚠️ db.init غير موجود، تم تخطي التهيئة المحلية.");
                    }

                    if (window.XAlerts?.scanSystemHealth) {
                        const count = await window.XAlerts.scanSystemHealth();
                        setUnreadAlerts(count || 0);
                    }

                    if (navigator.onLine && window.db?.pullAllFromCloud) {
                        window.db.pullAllFromCloud().catch(e => console.warn("⚠️ فشل سحب البيانات:", e));
                    }

                    setIsReady(true);
                    setInitError(null);
                    hideSplash();
                } catch (err) {
                    console.error("❌ App Init Error:", err);
                    setInitError(err.message || 'خطأ غير معروف في تهيئة النظام.');
                    setIsReady(true); 
                    hideSplash();
                } finally {
                    if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current);
                }
            };

            initializeApp();

            return () => {
                clearInterval(clockTimer);
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
                if (secretTimeoutRef.current) clearTimeout(secretTimeoutRef.current);
                if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current);
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        useEffect(() => {
            if (!isReady || !window.db) return;
            const fetchAlerts = async () => {
                try {
                    const alerts = await window.db.getAll('system_alerts').catch(() => []);
                    setUnreadAlerts(alerts.filter(a => a?.status === 'unread').length);
                } catch (e) {
                    console.warn("⚠️ فشل جلب الإشعارات:", e);
                }
            };
            fetchAlerts();
            const interval = setInterval(fetchAlerts, ALERT_REFRESH_INTERVAL);
            return () => clearInterval(interval);
        }, [isReady]);

        // ==========================================
        // محرك الباب السري
        // ==========================================
        const handleSecretDoor = useCallback(() => {
            if (secretTimeoutRef.current) clearTimeout(secretTimeoutRef.current);
            secretClicksRef.current += 1;
            if (secretClicksRef.current >= SECRET_CLICKS_THRESHOLD) {
                setShowPinModal(true);
                secretClicksRef.current = 0;
            } else {
                secretTimeoutRef.current = setTimeout(() => {
                    secretClicksRef.current = 0;
                }, SECRET_TIMEOUT_MS);
            }
        }, []);

        const verifyPin = useCallback(() => {
            if (pinCode === SECRET_PIN) {
                setShowPinModal(false);
                setPinCode('');
                setActiveTab('super_admin');
                setIsMenuOpen(false);
            } else {
                alert('🚫 الوصول مرفوض! تم تسجيل محاولة اختراق.');
                setShowPinModal(false);
                setPinCode('');
            }
        }, [pinCode]);

        const rawMenuGroups = useMemo(() => [
            { group: "القيادة والأداء", items: [
                { id: 'dashboard', label: 'لوحة التحكم المركزية', icon: '📊' },
                { id: 'reports', label: 'التقارير والإحصائيات', icon: '📈' },
                { id: 'hr', label: 'شؤون الموظفين والنقاط', icon: '👥' },
                { id: 'users', label: 'إدارة الصلاحيات (UAC)', icon: '🔑' }
            ]},
            { group: "العملاء والائتمان", items: [
                { id: 'crm', label: 'العملاء والضامنين', icon: '🤝' },
                { id: 'survey', label: 'الاستعلام الميداني', icon: '📍' }
            ]},
            { group: "المخازن والمشتريات", items: [
                { id: 'inventory', label: 'المخزن والجرد', icon: '📦' },
                { id: 'suppliers', label: 'إدارة الموردين', icon: '🏢' },
                { id: 'purchases', label: 'المشتريات والتوريد', icon: '🛒' }
            ]},
            { group: "التشغيل والمبيعات", items: [
                { id: 'pos', label: 'نقطة البيع', icon: '💻' },
                { id: 'marketing', label: 'التسويق والعروض', icon: '🎯' }
            ]},
            { group: "المالية والقانون", items: [
                { id: 'accounting', label: 'الحسابات العامة والزكاة', icon: '⚖️' },
                { id: 'collection', label: 'إدارة الأقساط والتحصيل', icon: '💰' },
                { id: 'treasury', label: 'الخزينة والمصاريف', icon: '🏦' },
                { id: 'legal', label: 'الشؤون القانونية', icon: '🚨' }
            ]},
            { group: "البيانات و الإعدادات", items: [
                { id: 'notifications', label: 'مركز الإشعارات', icon: '🔔' },
                { id: 'audit', label: 'سجل المراقبة الأمني', icon: '👁️' },
                { id: 'data_import', label: 'استيراد وتصدير (CSV)', icon: '📥' },
                { id: 'settings', label: 'الإعدادات العامة', icon: '⚙️' },
                { id: 'sync', label: 'مركز المزامنة السحابية', icon: '☁️' }
            ]}
        ], []);

        const menuGroups = useMemo(() => {
            if (!currentUser) return [];
            return rawMenuGroups.map(group => ({
                ...group,
                items: group.items.filter(item => 
                    window.XGuard?.canAccess?.(currentUser, item.id) ?? true
                )
            })).filter(group => group.items.length > 0);
        }, [currentUser, rawMenuGroups]);

        const renderModule = useCallback(() => {
            const moduleMap = {
                'dashboard': DashboardView,
                'reports': window.ReportsModule,
                'hr': window.HRModule,
                'users': window.UsersModule,
                'crm': window.CRMModule,
                'survey': window.SurveyModule,
                'inventory': window.InventoryModule,
                'suppliers': window.SuppliersModule,
                'purchases': window.PurchasesModule,
                'pos': window.POSModule,
                'marketing': window.MarketingModule,
                'accounting': window.AccountingModule,
                'collection': window.InstallmentsModule || window.CollectionModule,
                'treasury': window.TreasuryModule,
                'legal': window.LegalModule,
                'notifications': window.NotificationsModule,
                'audit': window.AuditModule,
                'data_import': window.ImportModule,
                'settings': window.SettingsModule,
                'sync': window.XSyncModule,
                'super_admin': window.SuperAdminModule
            };

            const Component = moduleMap[activeTab];
            if (Component) {
                return (
                    <div className="animate-in fade-in duration-500 h-full">
                        <Component 
                            currentUser={currentUser} 
                            setActiveTab={setActiveTab} 
                            rawMenuGroups={rawMenuGroups} 
                        />
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mx-4 animate-in zoom-in-95">
                    <div className="text-6xl mb-4 text-red-400">⚠️</div>
                    <h3 className="font-black text-slate-800 text-lg">الموديول "{activeTab}" قيد التطوير أو غير متصل</h3>
                    <p className="text-xs text-slate-400 mt-2 font-bold">
                        يرجى التأكد من تضمين ملف الموديول بشكل صحيح في index.html.
                    </p>
                </div>
            );
        }, [activeTab, currentUser, rawMenuGroups]);

        if (!isReady) {
            return <LoadingScreen error={initError} />;
        }

        if (!currentUser && window.AuthModule) {
            return <window.AuthModule onLoginSuccess={setCurrentUser} />;
        }

        if (initError) {
            return (
                <div className="h-[100dvh] flex items-center justify-center bg-slate-900 text-white p-6">
                    <div className="bg-red-500/20 border border-red-500/30 p-8 rounded-[2.5rem] max-w-md text-center">
                        <div className="text-6xl mb-4">❌</div>
                        <h3 className="text-xl font-black mb-4">خطأ في تهيئة النظام</h3>
                        <p className="text-sm text-slate-300 mb-6">{initError}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-[100dvh] bg-slate-50 flex overflow-hidden flex-col print:h-auto print:bg-white" dir="rtl">
                {showPinModal && (
                    <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center backdrop-blur-md">
                        <div className="bg-slate-950 p-8 rounded-[2rem] border border-red-500/30 shadow-2xl text-center max-w-sm w-full animate-in zoom-in duration-300">
                            <div className="text-5xl mb-4">🦅</div>
                            <h3 className="text-white font-black text-xl mb-1 tracking-widest uppercase">الوصول السيادي</h3>
                            <p className="text-red-400 text-[10px] font-bold tracking-widest mb-6">RESTRICTED AREA</p>
                            <input 
                                type="password" 
                                placeholder="****" 
                                className="w-full bg-slate-900 border border-slate-700 text-white text-center text-2xl tracking-[1em] p-4 rounded-2xl outline-none focus:border-red-500 mb-6 transition-colors"
                                value={pinCode}
                                onChange={e => setPinCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && verifyPin()}
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button onClick={verifyPin} className="flex-1 bg-red-600 text-white font-black py-3 rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 active:scale-95">دخول</button>
                                <button onClick={() => {setShowPinModal(false); setPinCode('');}} className="flex-1 bg-slate-800 text-slate-400 font-black py-3 rounded-xl hover:bg-slate-700 transition-colors active:scale-95">إغلاق</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`print:hidden shrink-0 w-full text-center py-1 text-[9px] font-black tracking-widest uppercase transition-colors duration-500 z-[300] ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {isOnline ? '🟢 متصل بالسحابة (جاهز للمزامنة)' : '🔴 وضع الأوفلاين (تخزين محلي فقط)'}
                </div>

                <header className="print:hidden shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
                    <button onClick={() => setIsMenuOpen(true)} className="p-2 text-slate-700 text-2xl active:scale-95 transition-transform md:hidden">☰</button>
                    
                    <div className="mr-3 flex flex-col hidden sm:flex cursor-pointer select-none" onClick={handleSecretDoor}>
                        <h2 className="font-black text-slate-900 leading-tight">Eco Fine <span className="text-blue-600">Pro</span></h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">
                            {window.XConfig?.identity?.storeName || 'Enterprise Edition V14.1'}
                        </p>
                    </div>

                    <div className="hidden md:flex items-center justify-center flex-1">
                        <div className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full shadow-inner flex items-center gap-2 text-slate-600">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">توقيت النظام</span>
                            <span className="text-xs font-black" dir="ltr">{currentTime.toLocaleTimeString('ar-EG')}</span>
                        </div>
                    </div>

                    <div className="mr-auto flex items-center gap-3 md:gap-4">
                        <button onClick={() => setActiveTab('notifications')} className="relative p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors active:scale-95">
                            <span className="text-xl">🔔</span>
                            {unreadAlerts > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full font-black border-2 border-white animate-bounce">
                                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                                </span>
                            )}
                        </button>

                        <div className="text-left hidden sm:block">
                            <p className="text-xs font-black text-slate-800">{currentUser?.username}</p>
                            <p className="text-[9px] font-bold text-slate-400">{currentUser?.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-[1rem] bg-slate-900 flex items-center justify-center text-white font-black shadow-lg border-2 border-slate-800">
                            {currentUser?.username?.charAt(0).toUpperCase() || 'X'}
                        </div>
                        
                        <button 
                            onClick={() => window.XGuard?.logout?.()} 
                            className="text-[10px] font-black text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm hidden md:flex items-center gap-2 active:scale-95"
                        >
                            خروج 🚪
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden relative">
                    <aside className={`print:hidden absolute md:static inset-y-0 right-0 z-[100] w-72 bg-slate-900 text-slate-400 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${isMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
                            <div className="cursor-pointer select-none" onClick={handleSecretDoor}>
                                <span className="text-white font-black text-lg block">القائمة الرئيسية</span>
                                <p className="text-[9px] text-blue-500 font-bold tracking-widest uppercase mt-1">Version 14.1</p>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="text-xl text-slate-500 hover:text-white transition-colors md:hidden active:scale-90">✕</button>
                        </div>
                        
                        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll pb-20">
                            {menuGroups.map((group, idx) => (
                                <div key={idx}>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 pr-2">{group.group}</h4>
                                    <div className="space-y-1">
                                        {group.items.map(item => (
                                            <button 
                                                key={item.id}
                                                onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-slate-800 text-slate-300'}`}
                                            >
                                                <span className="text-base">{item.icon}</span>
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </aside>

                    {isMenuOpen && (
                        <div className="fixed inset-0 bg-slate-900/60 z-[90] backdrop-blur-sm transition-opacity md:hidden" onClick={() => setIsMenuOpen(false)}></div>
                    )}

                    <main className="flex-1 overflow-y-auto w-full px-2 py-4 md:px-6 md:py-6 custom-scroll print:p-0 print:overflow-visible">
                        <div className="max-w-7xl mx-auto h-full print:max-w-none">
                            {renderModule()}
                        </div>
                    </main>
                </div>
            </div>
        );
    };

    const rootElement = document.getElementById('root');
    if (rootElement) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<App />);
    } else {
        console.error('❌ لم يتم العثور على عنصر #root في الصفحة.');
    }

})();
