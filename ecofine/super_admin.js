/**
 * 💻 super_admin.js - لوحة التحكم السيادية (Super Admin / God Mode)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: إدارة المؤسسات، توليد أكواد التفعيل، مراقبة النظام الشاملة، وربط قواعد Supabase الفرعية.
 */

const { useState, useEffect, useMemo } = React;

const SuperAdminModule = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [organizations, setOrganizations] = useState([]);
    const [licenses, setLicenses] = useState([]);
    const [notification, setNotification] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // حالات توليد ترخيص جديد + بيانات ربط قاعدة بيانات العميل
    const [newLicenseData, setNewLicenseData] = useState({
        orgName: '',
        ownerName: '',
        phone: '',
        plan: 'gold', // basic, gold, platinum
        durationMonths: 12,
        tenantUrl: '', // رابط قاعدة بيانات العميل في Supabase
        tenantKey: ''  // مفتاح Anon Key الخاص بقاعدة العميل
    });

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3500);
    };

    // تحميل البيانات السيادية من Supabase (EcoFine_Master)
    const loadSystemData = async () => {
        try {
            // جلب المؤسسات
            const { data: orgs, error: orgsError } = await window.supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (orgsError) throw orgsError;

            // جلب التراخيص
            const { data: lics, error: licsError } = await window.supabase
                .from('licenses')
                .select('*')
                .order('created_at', { ascending: false });

            if (licsError) throw licsError;

            setOrganizations(orgs || []);
            setLicenses(lics || []);
        } catch (error) {
            console.error("SuperAdmin DB Error:", error);
            showNotification('error', '❌ فشل في جلب البيانات من الخادم المركزي.');
        }
    };

    useEffect(() => { loadSystemData(); }, []);

    // 🔑 محرك توليد أكواد التفعيل الذكي
    const generateLicenseKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segment = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `ECO-V12-${segment()}-${segment()}-${segment()}`;
    };

    const handleCreateOrganizationAndLicense = async () => {
        if (!newLicenseData.orgName || !newLicenseData.ownerName || !newLicenseData.tenantUrl || !newLicenseData.tenantKey) {
            return showNotification('error', '⚠️ يرجى إدخال جميع البيانات بما فيها روابط Supabase الفرعية.');
        }

        setIsLoading(true);
        const newLicenseKey = generateLicenseKey();
        
        // حساب تاريخ الانتهاء
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + Number(newLicenseData.durationMonths));

        // حدود الباقة
        let maxUsers = 1; let maxBranches = 1;
        if (newLicenseData.plan === 'gold') { maxUsers = 5; maxBranches = 3; }
        if (newLicenseData.plan === 'platinum') { maxUsers = 999; maxBranches = 999; }

        try {
            // 1. إنشاء الترخيص أولاً (لأن المؤسسة تعتمد عليه كـ Foreign Key)
            const { data: licenseData, error: licenseError } = await window.supabase
                .from('licenses')
                .insert([{
                    license_key: newLicenseKey,
                    plan: newLicenseData.plan,
                    max_users: maxUsers,
                    max_branches: maxBranches,
                    expires_at: expiryDate.toISOString(),
                    status: 'active'
                }])
                .select()
                .single();

            if (licenseError) throw licenseError;

            // 2. إنشاء المؤسسة وربطها بالترخيص وبيانات Supabase الخاصة بها
            const { error: orgError } = await window.supabase
                .from('organizations')
                .insert([{
                    license_id: licenseData.id,
                    name: newLicenseData.orgName,
                    owner_name: newLicenseData.ownerName,
                    phone: newLicenseData.phone,
                    tenant_supabase_url: newLicenseData.tenantUrl,
                    tenant_supabase_key: newLicenseData.tenantKey,
                    subscription_plan: newLicenseData.plan,
                    subscription_status: 'active'
                }]);

            if (orgError) throw orgError;

            showNotification('success', `✅ تم إنشاء المؤسسة وتوليد الكود: ${newLicenseKey}`);
            
            // تفريغ وتحديث
            setNewLicenseData({ orgName: '', ownerName: '', phone: '', plan: 'gold', durationMonths: 12, tenantUrl: '', tenantKey: '' });
            loadSystemData();
        } catch (error) {
            console.error(error);
            showNotification('error', '❌ فشل في حفظ البيانات، يرجى التأكد من الاتصال بالماستر.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleOrgStatus = async (orgId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const { error } = await window.supabase
                .from('organizations')
                .update({ subscription_status: newStatus })
                .eq('id', orgId);

            if (error) throw error;

            showNotification('success', `✅ تم تغيير حالة المؤسسة إلى ${newStatus}`);
            loadSystemData();
        } catch (err) {
            showNotification('error', '❌ فشل في تغيير الحالة.');
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-900 text-slate-200 font-sans animate-in fade-in">
            {/* الإشعارات */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] px-8 py-4 rounded-[2rem] shadow-2xl text-white font-black text-sm transition-all duration-300 flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    <span>{notification.type === 'success' ? '🛡️' : '⚠️'}</span>
                    {notification.message}
                </div>
            )}

            {/* القائمة الجانبية السيادية */}
            <div className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-l border-slate-800 p-6 shrink-0 flex flex-col">
                <div className="mb-8 border-b border-slate-800 pb-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30">🦅</div>
                    <h2 className="font-black text-xl text-white tracking-widest">ECOFINE <span className="text-indigo-400">MASTER</span></h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Super Admin Panel</p>
                </div>

                <div className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', icon: '📊', label: 'المركز الرئيسي' },
                        { id: 'organizations', icon: '🏢', label: 'إدارة المؤسسات' },
                        { id: 'licenses', icon: '🔑', label: 'توليد التراخيص' },
                        { id: 'system', icon: '⚙️', label: 'حالة النظام' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-right p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <span className="text-xl">{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-800 text-center">
                    <p className="text-xs font-bold text-slate-500">مرحباً، <span className="text-indigo-400">مستر إكس</span></p>
                    <p className="text-[9px] text-slate-600 mt-1">V 12.0 Master Node</p>
                </div>
            </div>

            {/* منطقة العمل الرئيسية */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scroll bg-slate-900">
                
                {/* التاب 1: المركز الرئيسي */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-1">المركز الرئيسي للتحكم</h3>
                            <p className="text-sm text-slate-400">نظرة عامة على إمبراطورية EcoFine Multi-Tenant</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                                <h4 className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2 relative z-10">إجمالي المؤسسات</h4>
                                <span className="text-4xl font-black text-white relative z-10">{organizations.length}</span>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                                <h4 className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2 relative z-10">المؤسسات النشطة</h4>
                                <span className="text-4xl font-black text-emerald-400 relative z-10">{organizations.filter(o => o.subscription_status === 'active').length}</span>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                                <h4 className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2 relative z-10">شبكة EcoCredit</h4>
                                <span className="text-4xl font-black text-purple-400 relative z-10">متصل <span className="text-sm">V2</span></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* التاب 2: إدارة المؤسسات */}
                {activeTab === 'organizations' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center bg-slate-800 p-6 rounded-[2rem] border border-slate-700">
                            <div>
                                <h3 className="text-xl font-black text-white">المؤسسات المشتركة (Tenants)</h3>
                                <p className="text-xs text-slate-400 mt-1">التحكم في إيقاف وتشغيل المؤسسات (Kill Switch)</p>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-[2rem] border border-slate-700 overflow-hidden overflow-x-auto">
                            <table className="w-full text-right min-w-[800px]">
                                <thead className="bg-slate-950/50 text-[10px] uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="p-4">المؤسسة / المالك</th>
                                        <th className="p-4">رقم التواصل</th>
                                        <th className="p-4">قاعدة البيانات (Supabase)</th>
                                        <th className="p-4 text-center">الحالة</th>
                                        <th className="p-4 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50 text-sm font-bold">
                                    {organizations.map(org => (
                                        <tr key={org.id} className="hover:bg-slate-700/20 transition-colors">
                                            <td className="p-4">
                                                <span className="block text-white">{org.name}</span>
                                                <span className="text-[10px] text-slate-500">{org.owner_name}</span>
                                            </td>
                                            <td className="p-4 text-slate-300">{org.phone || '---'}</td>
                                            <td className="p-4 text-slate-400 text-xs">
                                                <span className="block truncate max-w-[200px]" title={org.tenant_supabase_url}>{org.tenant_supabase_url}</span>
                                                <span className="text-[10px] text-indigo-400/50">متصل (Isolated Node)</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${org.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                    {org.subscription_status === 'active' ? 'نشط' : 'موقوف'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => toggleOrgStatus(org.id, org.subscription_status)}
                                                    className={`px-4 py-2 rounded-xl text-xs transition-colors ${org.subscription_status === 'active' ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}
                                                >
                                                    {org.subscription_status === 'active' ? 'إيقاف النظام' : 'تفعيل النظام'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {organizations.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-500">لا توجد مؤسسات مسجلة حتى الآن</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* التاب 3: توليد التراخيص (License Engine) */}
                {activeTab === 'licenses' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                            
                            <h3 className="text-2xl font-black text-white mb-2 relative z-10 flex items-center gap-3">
                                <span className="text-3xl">🗝️</span> محرك إصدار التراخيص (Tenant Generator)
                            </h3>
                            <p className="text-indigo-300 text-sm mb-8 relative z-10">قم بإنشاء كيان مؤسسي جديد، ربط قاعدة البيانات الخاصة به، وإصدار كود تفعيل مشفر له.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-6">
                                {/* القسم الأول: البيانات الأساسية */}
                                <div className="space-y-4">
                                    <h4 className="text-white font-bold mb-4 border-b border-slate-700 pb-2">البيانات الأساسية للعميل</h4>
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">اسم المؤسسة التجاري</label>
                                        <input type="text" placeholder="مثال: سنتر عبد الله..." className="w-full bg-slate-950/50 border border-indigo-500/30 p-4 rounded-2xl text-white outline-none focus:border-indigo-400 transition-colors" value={newLicenseData.orgName} onChange={e => setNewLicenseData({...newLicenseData, orgName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">اسم المالك / المسؤول</label>
                                        <input type="text" placeholder="مثال: محمد خالد..." className="w-full bg-slate-950/50 border border-indigo-500/30 p-4 rounded-2xl text-white outline-none focus:border-indigo-400 transition-colors" value={newLicenseData.ownerName} onChange={e => setNewLicenseData({...newLicenseData, ownerName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">رقم هاتف المالك</label>
                                        <input type="text" placeholder="010..." className="w-full bg-slate-950/50 border border-indigo-500/30 p-4 rounded-2xl text-white outline-none focus:border-indigo-400 transition-colors" value={newLicenseData.phone} onChange={e => setNewLicenseData({...newLicenseData, phone: e.target.value})} />
                                    </div>
                                </div>

                                {/* القسم الثاني: بيانات ربط الخادم المعزول */}
                                <div className="space-y-4">
                                    <h4 className="text-white font-bold mb-4 border-b border-slate-700 pb-2">إعدادات الخادم (Supabase Tenant)</h4>
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">رابط المشروع (Supabase URL)</label>
                                        <input type="text" placeholder="https://xxxxxx.supabase.co" className="w-full bg-slate-950/50 border border-rose-500/30 p-4 rounded-2xl text-white outline-none focus:border-rose-400 transition-colors font-mono text-xs" value={newLicenseData.tenantUrl} onChange={e => setNewLicenseData({...newLicenseData, tenantUrl: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">مفتاح المشروع (Anon Key)</label>
                                        <input type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5c..." className="w-full bg-slate-950/50 border border-rose-500/30 p-4 rounded-2xl text-white outline-none focus:border-rose-400 transition-colors font-mono text-xs" value={newLicenseData.tenantKey} onChange={e => setNewLicenseData({...newLicenseData, tenantKey: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <div>
                                    <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">تحديد الباقة (الحدود التقنية)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'basic', label: 'Basic', desc: '1 فرع | 1 موظف' },
                                            { id: 'gold', label: 'Gold', desc: '3 فروع | 5 موظفين' },
                                            { id: 'platinum', label: 'Platinum', desc: 'لا محدود' }
                                        ].map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => setNewLicenseData({...newLicenseData, plan: p.id})}
                                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${newLicenseData.plan === p.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                <span className="font-black text-sm">{p.label}</span>
                                                <span className="text-[8px] opacity-70">{p.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">مدة الترخيص (بالأشهر)</label>
                                    <select className="w-full bg-slate-950/50 border border-indigo-500/30 p-4 rounded-2xl text-white outline-none focus:border-indigo-400 transition-colors appearance-none" value={newLicenseData.durationMonths} onChange={e => setNewLicenseData({...newLicenseData, durationMonths: e.target.value})}>
                                        <option value={1}>شهر واحد (تجريبي)</option>
                                        <option value={6}>6 أشهر</option>
                                        <option value={12}>سنة واحدة</option>
                                        <option value={120}>مدى الحياة (10 سنوات)</option>
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateOrganizationAndLicense}
                                disabled={isLoading}
                                className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 relative z-10"
                            >
                                <span className="text-xl">{isLoading ? '⏳' : '✨'}</span> 
                                {isLoading ? 'جاري الإرسال للخادم المركزي...' : 'توليد كود التفعيل وإنشاء المؤسسة'}
                            </button>
                        </div>

                        {/* سجل الأكواد المصدرة */}
                        <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700">
                            <h4 className="text-sm font-black text-white mb-4">التراخيص المُصدرة مؤخراً</h4>
                            <div className="space-y-3">
                                {licenses.map(lic => {
                                    const org = organizations.find(o => o.license_id === lic.id);
                                    return (
                                        <div key={lic.id} className="flex flex-wrap md:flex-nowrap justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-700/50 gap-4">
                                            <div>
                                                <span className="block font-black text-indigo-400 text-lg font-mono tracking-wider">{lic.license_key}</span>
                                                <span className="text-xs text-slate-400 mt-1">المؤسسة: {org ? org.name : 'غير محدد'} | الباقة: {lic.plan.toUpperCase()}</span>
                                            </div>
                                            <div className="text-left">
                                                <span className="block text-[10px] text-slate-500 uppercase tracking-widest">ينتهي في</span>
                                                <span className="text-sm font-bold text-rose-300">{new Date(lic.expires_at).toLocaleDateString('ar-EG')}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

window.SuperAdminModule = SuperAdminModule;
