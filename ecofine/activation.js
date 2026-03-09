/**
 * 🔑 activation.js - مديول التفعيل التجريبي (Demo Edition V1.0)
 * المطور: Techno Vision Solutions - M H 4 Tech
 * الوظيفة: محاكاة تفعيل النظام للمؤسسات المختلفة في مرحلة الاختبار.
 */

const { useState, useEffect } = React;

// ==========================================
// 📋 قائمة أكواد الديمو (Master Demo Keys)
// يمكنك إضافة أو تعديل المؤسسات من هنا بسهولة
// ==========================================
const DEMO_DATABASE = {
    "GHTS-2026": { 
        orgName: "مؤسسة الغاطس التجارية", 
        owner: "م/ الغاطس",
        expireDate: "2026-06-01",
        supabaseUrl: "https://pyrcpouvcvjkgpjyuafz.supabase.co", // قاعدة بيانات تجريبية 1
        supabaseKey: "YOUR_DEMO_KEY_1"
    },
    "WLID-2026": { 
        orgName: "مؤسسة الوليد للخدمات", 
        owner: "أ/ الوليد",
        expireDate: "2026-05-15",
        supabaseUrl: "https://pyrcpouvcvjkgpjyuafz.supabase.co", // قاعدة بيانات تجريبية 2
        supabaseKey: "YOUR_DEMO_KEY_2"
    },
    "TECHNO-X": { 
        orgName: "Techno Vision (Admin)", 
        owner: "Mr. X",
        expireDate: "2030-01-01",
        supabaseUrl: "https://pyrcpouvcvjkgpjyuafz.supabase.co",
        supabaseKey: "YOUR_MASTER_KEY"
    }
};

const ActivationModule = ({ onActivated }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // فحص التفعيل عند فتح التطبيق
    useEffect(() => {
        const savedConfig = localStorage.getItem('X_ORG_CONFIG');
        if (savedConfig) {
            onActivated(JSON.parse(savedConfig));
        }
    }, []);

    const handleActivate = () => {
        setIsVerifying(true);
        setError('');

        // محاكاة تأخير الشبكة (لإضفاء طابع الاحترافية)
        setTimeout(() => {
            const orgData = DEMO_DATABASE[inputKey.toUpperCase()];

            if (orgData) {
                // حفظ بيانات المؤسسة محلياً
                localStorage.setItem('X_ORG_CONFIG', JSON.stringify(orgData));
                onActivated(orgData);
            } else {
                setError('⚠️ كود التفعيل غير صحيح أو انتهت صلاحيته.');
            }
            setIsVerifying(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-right">
            {/* الخلفية الجمالية */}
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-blue-500 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-purple-500 rounded-full blur-[120px]"></div>
            </div>

            {/* كارت التفعيل */}
            <div className="relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl animate-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🛡️</div>
                    <h2 className="text-2xl font-black mb-2">تنشيط النسخة</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Eco Fine Pro V10 - Demo Phase</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 mb-2 block pr-2 uppercase">كود تفعيل المؤسسة</label>
                        <input 
                            type="text" 
                            placeholder="X-XXXX-XXXX"
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-center font-black text-lg tracking-[0.3em] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            disabled={isVerifying}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl text-[10px] font-black text-red-300 text-center animate-bounce">
                            {error}
                        </div>
                    )}

                    <button 
                        onClick={handleActivate}
                        disabled={isVerifying || !inputKey}
                        className={`w-full py-5 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${
                            isVerifying ? 'bg-slate-700 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                    >
                        {isVerifying ? 'جاري التحقق من التراخيص...' : 'تنشيط النظام الآن 🚀'}
                    </button>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-[9px] text-slate-500 font-bold">Techno Vision Solutions © 2026</p>
                    <p className="text-[8px] text-slate-600 mt-1">جميع الحقوق محفوظة لمستر إكس</p>
                </div>
            </div>
        </div>
    );
};

window.ActivationModule = ActivationModule;
