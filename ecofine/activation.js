/**
 * 🔑 activation.js - مديول التفعيل السحابي (Multi-Tenant ERP Edition V14.0)
 * المطور: Techno Vision Solutions - Mr. X
 * الوظيفة: التحقق من كود التفعيل عبر قاعدة البيانات المركزية (Master DB) وتوجيه العميل لقاعدته المعزولة.
 */

const { useState, useEffect } = React;

// ==========================================
// 🌐 إعدادات قاعدة البيانات المركزية (Master DB)
// ==========================================
// ✅ تم وضع الرابط الخاص بك بنجاح
const MASTER_SUPABASE_URL = 'https://pyrcpouvcvjkgpjyuafz.supabase.co';

// ⚠️ المطلوب منك: امسح الجملة دي، واعمل Paste للمفتاح اللي نسخته من سوبابيز (بيبدأ بـ sb_publishable)
const MASTER_SUPABASE_KEY = 'ضع_مفتاح_الـ_Publishable_Key_هنا'; 

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
    }, [onActivated]);

    const handleActivate = async () => {
        if (!inputKey.trim()) {
            setError('⚠️ يرجى إدخال كود التفعيل أولاً.');
            return;
        }

        setIsVerifying(true);
        setError('');

        try {
            // 1. إنشاء اتصال مؤقت بقاعدة البيانات المركزية (الماستر)
            const masterDb = supabase.createClient(MASTER_SUPABASE_URL, MASTER_SUPABASE_KEY);

            // 2. البحث عن كود التفعيل في جدول licenses وجلب بيانات المؤسسة المرتبطة به
            const { data: licenseData, error: dbError } = await masterDb
                .from('licenses')
                .select(`
                    id,
                    license_key,
                    status,
                    expires_at,
                    plan,
                    organizations (
                        name,
                        tenant_supabase_url,
                        tenant_supabase_key,
                        subscription_status
                    )
                `)
                .eq('license_key', inputKey.trim().toUpperCase())
                .single(); 

            // 3. التحقق من وجود الكود وصحته
            if (dbError || !licenseData) {
                throw new Error('كود التفعيل غير صحيح أو غير مسجل في النظام.');
            }

            // 4. فحوصات الأمان وصلاحية الترخيص والمؤسسة
            if (licenseData.status !== 'active') {
                throw new Error('هذا الترخيص موقوف من قبل الإدارة المركزية.');
            }

            const today = new Date();
            const expiryDate = new Date(licenseData.expires_at);
            if (today > expiryDate) {
                throw new Error(`انتهت صلاحية هذا الترخيص في ${expiryDate.toLocaleDateString('ar-EG')}. يرجى التجديد.`);
            }

            // فحص وجود مؤسسة مربوطة بهذا الترخيص
            const org = Array.isArray(licenseData.organizations) ? licenseData.organizations[0] : licenseData.organizations;
            
            if (!org) {
                throw new Error('هذا الترخيص غير مربوط بأي كيان مؤسسي حتى الآن.');
            }

            if (org.subscription_status !== 'active') {
                throw new Error('نظام المؤسسة موقوف حالياً من قبل الإدارة.');
            }

            // 5. التفعيل ناجح: تجهيز بيانات المؤسسة وقاعدة بياناتها المعزولة (Tenant DB)
            const orgConfig = {
                orgName: org.name,
                url: org.tenant_supabase_url,
                key: org.tenant_supabase_key,
                plan: licenseData.plan,
                expiresAt: licenseData.expires_at,
                activatedAt: new Date().toISOString()
            };

            // 6. حفظ البيانات محلياً في المتصفح
            localStorage.setItem('X_ORG_CONFIG', JSON.stringify(orgConfig));
            
            // تحديث إعدادات المزامنة في XSync لتجنب التعارض
            const fullConfig = JSON.parse(localStorage.getItem('ecofine_config')) || {};
            fullConfig.cloudProvider = {
                activeProvider: 'supabase',
                supabaseUrl: orgConfig.url,
                supabaseKey: orgConfig.key,
                autoSyncInterval: 15
            };
            localStorage.setItem('ecofine_config', JSON.stringify(fullConfig));
            window.XConfig = fullConfig;

            // 7. تحديث محرك قاعدة البيانات المحلي للاتصال بقاعدة العميل
            if (window.db && window.db.reInitialize) {
                await window.db.reInitialize(orgConfig.url, orgConfig.key);
            }

            // 8. إبلاغ التطبيق بنجاح التفعيل لفتح الشاشات
            onActivated(orgConfig);

        } catch (err) {
            console.error("Activation Error:", err);
            setError('⚠️ ' + err.message);
        } finally {
            setIsVerifying(false);
        }
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
                    <h2 className="text-2xl font-black mb-2">تنشيط النظام السحابي</h2>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Eco Fine Pro V14 - Multi-Tenant ERP</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 mb-2 block pr-2 uppercase">كود تفعيل المؤسسة (License Key)</label>
                        <input 
                            type="text" 
                            placeholder="ECO-V12-XXXX..."
                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl text-center font-black text-lg tracking-[0.2em] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
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
                        className={`w-full py-5 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            isVerifying ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'
                        }`}
                    >
                        {isVerifying ? (
                            <><span className="animate-spin text-lg">⚙️</span> جاري التوثيق من الخادم المركزي...</>
                        ) : (
                            'تنشيط النظام الآن 🚀'
                        )}
                    </button>
                </div>

                <div className="mt-10 text-center border-t border-white/10 pt-4">
                    <p className="text-[9px] text-slate-500 font-bold">Powered by Techno Vision Solutions © 2026</p>
                    <p className="text-[8px] text-slate-600 mt-1">Suez, Egypt | X-Holding</p>
                </div>
            </div>
        </div>
    );
};

window.ActivationModule = ActivationModule;
