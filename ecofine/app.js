// app.js - المايسترو (نسخة متوافقة مع الهاتف والكمبيوتر)
// تم الحفاظ على الهيكل البرمجي وربط الموديولات كما هو

const { useState, useEffect } = React;

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false); // حالة القائمة الجانبية للموبايل
    const [user, setUser] = useState({ name: 'مستر إكس', role: 'CEO' });

    // 1. تشغيل المحرك عند بدء التطبيق
    useEffect(() => {
        db.init().then(() => {
            setIsReady(true);
        }).catch(err => {
            alert("خطأ في تشغيل قاعدة البيانات: " + err);
        });
    }, []);

    if (!isReady) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xl font-bold">جاري تشغيل محرك إكس V4...</p>
                </div>
            </div>
        );
    }

    const menuItems = [
        { id: 'dashboard', label: 'الرؤية العامة', icon: '📊' },
        { id: 'crm', label: 'إدارة العملاء', icon: '👥' },
        { id: 'inventory', label: 'المخازن', icon: '📦' },
        { id: 'pos', label: 'نقطة البيع', icon: '🛒' },
        { id: 'collection', label: 'التحصيلات', icon: '💰' },
        { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️' },
        { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
    ];

    // دالة لتغيير التبويب وإغلاق القائمة في الموبايل
    const navigateTo = (id) => {
        setActiveTab(id);
        setIsMenuOpen(false);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden relative">
            
            {/* طبقة تظليل عند فتح القائمة في الموبايل (Overlay) */}
            {isMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMenuOpen(false)}
                ></div>
            )}

            {/* القائمة الجانبية (متجاوبة) */}
            <aside className={`
                fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl transition-transform duration-300
                lg:relative lg:translate-x-0 
                ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xl">X</div>
                        <div>
                            <h1 className="text-white font-bold leading-none">EcoFine Pro</h1>
                            <span className="text-[10px] text-blue-400 font-bold tracking-widest">7X HOLDING</span>
                        </div>
                    </div>
                    {/* زر إغلاق القائمة (موبايل فقط) */}
                    <button onClick={() => setIsMenuOpen(false)} className="lg:hidden text-2xl">×</button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => navigateTo(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                                activeTab === item.id 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 text-xs text-center text-slate-500">
                    نسخة V4.0.0 | استراتيجية الدومينو
                </div>
            </aside>

            {/* المحتوى الأساسي */}
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-4 lg:px-8">
                    <div className="flex items-center gap-4">
                        {/* زر فتح القائمة (موبايل فقط) */}
                        <button 
                            onClick={() => setIsMenuOpen(true)}
                            className="lg:hidden p-2 text-slate-600 text-2xl focus:outline-none"
                        >
                            ☰
                        </button>
                        <h2 className="text-lg lg:text-xl font-black text-slate-800 truncate">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-4">
                        <span className="hidden sm:inline text-sm font-bold bg-slate-100 px-3 py-1 rounded-full">{user.role}</span>
                        <div className="w-8 h-8 bg-slate-200 rounded-full border border-slate-300 flex-shrink-0"></div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    {/* المحتوى المتبدل */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-blue-600">
                                <p className="text-slate-500 font-bold text-sm">إجمالي المبيعات</p>
                                <h3 className="text-2xl font-black">0.00 ج.م</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-green-600">
                                <p className="text-slate-500 font-bold text-sm">التحصيل اليومي</p>
                                <h3 className="text-2xl font-black">0.00 ج.م</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-red-600">
                                <p className="text-slate-500 font-bold text-sm">متأخرات خطر</p>
                                <h3 className="text-2xl font-black">0 عميل</h3>
                            </div>
                        </div>
                    )}

                    {activeTab === 'crm' && <CRMModule />}

                    {activeTab === 'inventory' && <div className="p-10 text-center font-bold text-slate-400 italic">📦 مديول المخازن قيد التطوير...</div>}
                    
                    {/* الموديلات القادمة تركب هنا بنفس الطريقة */}
                </div>
            </main>
        </div>
    );
};

// تشغيل React
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
