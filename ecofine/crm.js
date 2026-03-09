/**
 * 🤝 crm.js - مديول إدارة العملاء المطور (V10.3 Platinum - X-Core Integrated)
 * تم الإصلاح: إضافة كافة حقول العميل المفقودة، تثبيت شاشة السكور، وضبط واجهة الموبايل.
 * التصميم: Full-Screen Mobile App Experience (100dvh).
 */

const { useState, useEffect, useMemo, useCallback } = React;

// --- دالة تحليل الرقم القومي المصري ---
const parseNationalId = (nationalId) => {
    if (!/^\d{14}$/.test(nationalId)) return null;
    const century = nationalId[0]; 
    const year = nationalId.substring(1, 3);
    const month = nationalId.substring(3, 5);
    const day = nationalId.substring(5, 7);
    const genderDigit = parseInt(nationalId[12]); 
    let fullYear = century === '2' ? `19${year}` : century === '3' ? `20${year}` : null;
    if (!fullYear) return null;
    return {
        birthDate: `${fullYear}-${month}-${day}`,
        gender: genderDigit % 2 === 1 ? 'ذكر' : 'أنثى'
    };
};

// --- مكون التأكيد المنبثق ---
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="text-4xl text-center mb-4">🛡️</div>
            <p className="text-sm font-black text-center text-slate-800 mb-6 leading-relaxed">{message}</p>
            <div className="flex flex-col gap-2">
                <button onClick={onConfirm} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-lg active:scale-95 transition-all">اعتماد البيانات</button>
                <button onClick={onCancel} className="w-full py-3 bg-slate-50 text-slate-500 rounded-2xl text-[11px] font-black hover:bg-slate-100 transition-colors">إلغاء وإدخال يدوي</button>
            </div>
        </div>
    </div>
);

const CRMModule = () => {
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null); 
    
    const initialFormState = {
        full_name: '', national_id: '', phone: '', whatsapp: '',
        province: '', area: '', address_details: '',
        job: '', job_type: 'قطاع خاص', income_verified: false,
        marital_status: 'متزوج', monthly_income: '', housing_type: 'إيجار',
        birth_date: '', gender: '', guarantors: [], credit_score: 0
    };
    const [formData, setFormData] = useState(initialFormState);

    const [pendingConfirm, setPendingConfirm] = useState(null); 
    const [pendingGuarantorConfirm, setPendingGuarantorConfirm] = useState(null);

    const showNotification = useCallback((type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    const loadCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await db.getAll('customers');
            setCustomers(data || []);
        } catch (error) {
            showNotification('error', '❌ فشل في تحميل قاعدة البيانات');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    // ==========================================
    // 🧠 محرك التقييم اللحظي (Live Score Engine)
    // ==========================================
    const liveScore = useMemo(() => {
        let tempScore = 0;
        // البيانات الأساسية
        if (formData.full_name.trim().length > 8) tempScore += 5;
        if (/^\d{14}$/.test(formData.national_id)) tempScore += 10;
        if (/^01\d{9}$/.test(formData.phone)) tempScore += 5;
        
        // بيانات السكن (الاستقرار)
        if (formData.address_details.length > 10) tempScore += 5;
        if (formData.housing_type === 'تمليك') tempScore += 15;
        else if (formData.housing_type === 'إيجار قديم') tempScore += 10;
        else if (formData.housing_type === 'إيجار جديد') tempScore += 5;

        // العمل والدخل (القدرة على السداد)
        if (formData.job.length > 3) tempScore += 5;
        if (formData.job_type === 'حكومي') tempScore += 15;
        else if (formData.job_type === 'أعمال حرة') tempScore += 5;
        else tempScore += 10; // قطاع خاص

        if (Number(formData.monthly_income) > 3000) tempScore += 5;
        if (formData.income_verified) tempScore += 15;
        
        // وزن الضامنين
        const validGuarantors = formData.guarantors.filter(g => /^\d{14}$/.test(g.national_id) && g.full_name.length > 5).length;
        tempScore += (validGuarantors * 10); // كل ضامن سليم يعطي 10 نقاط بحد أقصى 30

        const finalScore = Math.min(tempScore, 100);
        return { score: finalScore, isEligible: finalScore >= 50 }; // 50 هو الحد الأدنى للقبول
    }, [formData]);

    // ==========================================
    // 🛡️ الرقابة على الهوية والضامنين
    // ==========================================
    const handleNationalIdBlur = async (val) => {
        if (/^\d{14}$/.test(val)) {
            if (window.XCore) {
                const availability = await window.XCore.checkGuarantorEligibility(val);
                // يمكن إضافة لوجيك هنا لمنع العميل لو كان عليه بلوك
            }
            const parsed = parseNationalId(val);
            if (parsed && (!formData.birth_date || formData.birth_date !== parsed.birthDate)) {
                setPendingConfirm({ id: val, parsed });
            }
        }
    };

    const addGuarantor = () => {
        if (formData.guarantors.length >= 3) {
            return showNotification('error', '⚠️ الحد الأقصى للنظام هو 3 ضامنين.');
        }
        setFormData(prev => ({
            ...prev,
            guarantors: [...prev.guarantors, { 
                full_name: '', national_id: '', phone: '', relation: '', birth_date: '', gender: ''
            }]
        }));
    };

    const handleGuarantorBlur = async (index, val) => {
        if (/^\d{14}$/.test(val)) {
            if (window.XCore) {
                const eligibility = await window.XCore.checkGuarantorEligibility(val);
                if (!eligibility.eligible) {
                    showNotification('error', `🚫 الضامن مرفوض: ${eligibility.msg}`);
                    updateGuarantor(index, 'national_id', '');
                    return;
                }
            }
            const parsed = parseNationalId(val);
            const currentG = formData.guarantors[index];
            if (parsed && (!currentG.birth_date || currentG.birth_date !== parsed.birthDate)) {
                setPendingGuarantorConfirm({ index, id: val, parsed });
            }
        }
    };

    const updateGuarantor = (index, field, value) => {
        const updated = [...formData.guarantors];
        updated[index][field] = value;
        setFormData({ ...formData, guarantors: updated });
    };

    const removeGuarantor = (idx) => {
        const updated = formData.guarantors.filter((_, i) => i !== idx);
        setFormData({ ...formData, guarantors: updated });
    };

    // ==========================================
    // 💾 الحفظ والاعتماد
    // ==========================================
    const handleSave = async (e) => {
        e.preventDefault();
        
        // 1. التحقق من صحة البيانات (Validation)
        if (!/^\d{14}$/.test(formData.national_id)) return showNotification('error', '⚠️ الرقم القومي يجب أن يكون 14 رقماً.');
        if (!/^01\d{9}$/.test(formData.phone)) return showNotification('error', '⚠️ رقم الهاتف غير صحيح.');
        if (!liveScore.isEligible) return showNotification('error', `🚫 التقييم الائتماني ${liveScore.score}% غير كافٍ للاعتماد.`);

        try {
            await db.add('customers', {
                ...formData,
                credit_score: liveScore.score,
                status: 'active',
                created_at: new Date().toISOString()
            });
            showNotification('success', '✅ تم تسجيل العميل واعتماده ائتمانياً بنجاح');
            setIsModalOpen(false);
            loadCustomers();
            setFormData(initialFormState);
        } catch (err) {
            showNotification('error', '❌ فشل في حفظ البيانات: ' + err.message);
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(c => 
            c.full_name?.toLowerCase().includes(term) || 
            c.phone?.includes(term) || c.national_id?.includes(term)
        );
    }, [customers, searchTerm]);

    return (
        <div className="space-y-6 pb-24 animate-in fade-in relative">
            
            {/* إشعارات النظام */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-[2rem] shadow-2xl text-white font-black text-xs transition-all duration-300 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.message}
                </div>
            )}

            {/* شريط البحث وزر الإضافة */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 mx-2 mt-2">
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-[1.5rem] px-4">
                    <span className="text-xl">🔍</span>
                    <input 
                        type="text" placeholder="ابحث بالاسم، رقم الهاتف، أو الرقم القومي..." 
                        className="w-full p-4 bg-transparent text-xs font-bold outline-none"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={() => { setFormData(initialFormState); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <span className="text-lg">➕</span> إضافة ملف استعلام
                </button>
            </div>

            {/* قائمة عرض العملاء */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                {filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className={`absolute top-0 right-0 w-2 h-full ${c.credit_score >= 50 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="flex justify-between items-start mb-4 pl-2">
                            <div>
                                <h4 className="font-black text-slate-800 text-sm">{c.full_name}</h4>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{c.phone}</span>
                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold">{c.job_type}</span>
                                </div>
                            </div>
                            <div className={`w-12 h-12 rounded-[1rem] flex flex-col items-center justify-center shadow-inner shrink-0 ${c.credit_score >= 50 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                <span className="font-black text-lg leading-none">{c.credit_score}</span>
                                <span className="text-[7px] font-black uppercase mt-1">Score</span>
                            </div>
                        </div>
                        <div className="border-t border-slate-50 pt-3 flex justify-between items-center pr-2">
                            <span className="text-[10px] text-slate-400 font-bold">{c.province} - {c.area}</span>
                            <span className="text-[10px] font-black text-slate-300">ID: {c.national_id.slice(-4)}****</span>
                        </div>
                    </div>
                ))}
                {filteredCustomers.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <span className="text-4xl opacity-50 block mb-3">📇</span>
                        <p className="text-xs font-black text-slate-400 uppercase">لا توجد سجلات مطابقة</p>
                    </div>
                )}
            </div>

            {/* 📱 نافذة إضافة العميل (Full-Screen 100dvh UI) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[500] bg-slate-50 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    
                    {/* 1. هيدر التقييم (Sticky Top) */}
                    <div className="shrink-0 bg-slate-900 text-white p-5 rounded-b-[2rem] shadow-xl z-50 relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-black text-lg">ملف استعلام ائتماني</h3>
                                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">X-CORE V7.5 Analysis</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg active:scale-95 transition-transform hover:bg-white/20">✕</button>
                        </div>
                        
                        {/* مؤشر السكور */}
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-slate-300 uppercase">مؤشر الجدارة:</span>
                                <span className={`text-2xl font-black leading-none ${liveScore.isEligible ? 'text-green-400' : 'text-red-400'}`}>{liveScore.score}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-700 ease-out ${liveScore.score >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${liveScore.score}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* 2. جسم الفورم (Scrollable) */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full">
                        <form id="main-crm-form" onSubmit={handleSave} className="p-4 space-y-4 pb-10 max-w-2xl mx-auto text-right">
                            
                            {/* بطاقة 1: الهوية */}
                            <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><span>👤</span> الهوية والتواصل</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">الاسم الرباعي كما في البطاقة</label>
                                        <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:ring-2 focus:ring-blue-500 outline-none" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">الرقم القومي (14 رقم)</label>
                                        <input required type="text" maxLength="14" pattern="\d{14}" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black font-mono tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value.replace(/\D/g,'')})} onBlur={e => handleNationalIdBlur(e.target.value)} />
                                        {formData.birth_date && <p className="text-[9px] text-green-600 font-bold mt-1.5 pr-2">مواليد: {formData.birth_date} ({formData.gender})</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">رقم الهاتف</label>
                                            <input required type="tel" maxLength="11" placeholder="01..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g,'')})} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">الواتساب</label>
                                            <input type="tel" maxLength="11" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black focus:ring-2 focus:ring-green-500 outline-none" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g,'')})} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* بطاقة 2: السكن */}
                            <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><span>🏠</span> محل الإقامة</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">المحافظة</label>
                                        <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">المنطقة / المركز</label>
                                        <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">العنوان بالتفصيل (علامة مميزة)</label>
                                        <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none" value={formData.address_details} onChange={e => setFormData({...formData, address_details: e.target.value})} />
                                    </div>
                                    <div className="col-span-2 flex gap-2 bg-slate-50 p-1.5 rounded-[1.5rem]">
                                        {['إيجار جديد', 'إيجار قديم', 'تمليك'].map(t => (
                                            <button type="button" key={t} onClick={() => setFormData({...formData, housing_type: t})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formData.housing_type === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* بطاقة 3: العمل والدخل */}
                            <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><span>💼</span> العمل والدخل</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="col-span-2 flex gap-2 bg-slate-50 p-1.5 rounded-[1.5rem]">
                                        {['قطاع خاص', 'حكومي', 'أعمال حرة', 'معاش'].map(t => (
                                            <button type="button" key={t} onClick={() => setFormData({...formData, job_type: t})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formData.job_type === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>{t}</button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">المسمى الوظيفي / جهة العمل</label>
                                        <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none" value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1.5 block pr-2">متوسط الدخل الشهري (ج.م)</label>
                                        <input type="number" required min="0" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none text-blue-700" value={formData.monthly_income} onChange={e => setFormData({...formData, monthly_income: e.target.value})} />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl cursor-pointer" onClick={() => setFormData({...formData, income_verified: !formData.income_verified})}>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors ${formData.income_verified ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-300 bg-white'}`}>
                                            {formData.income_verified && "✓"}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-blue-900">يوجد مستند إثبات دخل (مفردات مرتب / فيزا)</p>
                                            <p className="text-[9px] text-blue-600 font-bold mt-0.5">يرفع التقييم الائتماني بـ 15 نقطة فوراً.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* بطاقة 4: الضامنين */}
                            <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><span>🤝</span> الضامنين ({formData.guarantors.length}/3)</h5>
                                    <button type="button" onClick={addGuarantor} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md active:scale-95 transition-transform">+ ضامن جديد</button>
                                </div>
                                <div className="space-y-4">
                                    {formData.guarantors.map((g, idx) => (
                                        <div key={idx} className="p-5 bg-slate-50/80 rounded-[1.5rem] border border-slate-200 relative">
                                            <button type="button" onClick={() => removeGuarantor(idx)} className="absolute top-4 left-4 w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-black hover:bg-red-500 hover:text-white transition-colors">✕</button>
                                            <span className="text-[10px] font-black text-slate-400 mb-3 block">ضامن رقم {idx + 1}</span>
                                            
                                            <div className="space-y-3">
                                                <input required placeholder="الاسم الرباعي للضامن" className="w-full p-4 bg-white border border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" value={g.full_name} onChange={e => updateGuarantor(idx, 'full_name', e.target.value)} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input required type="text" maxLength="14" placeholder="الرقم القومي (14)" className="w-full p-4 bg-white border border-slate-100 rounded-xl text-xs font-black font-mono tracking-widest outline-none focus:border-blue-500" value={g.national_id} onChange={e => updateGuarantor(idx, 'national_id', e.target.value.replace(/\D/g,''))} onBlur={e => handleGuarantorBlur(idx, e.target.value)} />
                                                    <input required type="tel" maxLength="11" placeholder="رقم الهاتف" className="w-full p-4 bg-white border border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" value={g.phone} onChange={e => updateGuarantor(idx, 'phone', e.target.value.replace(/\D/g,''))} />
                                                </div>
                                                <input required placeholder="صلة القرابة (أخ، زوج، صديق...)" className="w-full p-4 bg-white border border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" value={g.relation} onChange={e => updateGuarantor(idx, 'relation', e.target.value)} />
                                                
                                                {g.birth_date && <p className="text-[9px] text-green-600 font-bold pr-1">مواليد: {g.birth_date}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {formData.guarantors.length === 0 && (
                                        <p className="text-[10px] text-slate-400 font-bold text-center py-4">لم يتم إضافة ضامنين. (إضافة ضامن يرفع سكور العميل بـ 10 نقاط).</p>
                                    )}
                                </div>
                            </section>

                        </form>
                    </div>

                    {/* 3. زر الحفظ (Sticky Bottom) */}
                    <div className="shrink-0 bg-white border-t border-slate-200 p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-8 z-50">
                        <button 
                            form="main-crm-form" type="submit" disabled={!liveScore.isEligible || isLoading}
                            className={`w-full max-w-2xl mx-auto py-5 rounded-[2rem] font-black text-sm shadow-2xl transition-all active:scale-95 block ${liveScore.isEligible ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                        >
                            {isLoading ? 'جاري المعالجة...' : liveScore.isEligible ? `اعتماد تسجيل العميل (${liveScore.score}%) 🚀` : `غير مؤهل ائتمانياً (${liveScore.score}%)`}
                        </button>
                    </div>

                </div>
            )}

            {/* نوافذ التأكيد */}
            {pendingConfirm && <ConfirmModal message={`الرقم القومي يطابق مواليد ${pendingConfirm.parsed.birthDate} (${pendingConfirm.parsed.gender}). هل نعتمد هذه البيانات؟`} onConfirm={() => {
                setFormData(prev => ({ ...prev, national_id: pendingConfirm.id, birth_date: pendingConfirm.parsed.birthDate, gender: pendingConfirm.parsed.gender }));
                setPendingConfirm(null);
            }} onCancel={() => setPendingConfirm(null)} />}

            {pendingGuarantorConfirm && <ConfirmModal message={`الضامن مواليد ${pendingGuarantorConfirm.parsed.birthDate} (${pendingGuarantorConfirm.parsed.gender}). هل نعتمد؟`} onConfirm={() => {
                updateGuarantor(pendingGuarantorConfirm.index, 'national_id', pendingGuarantorConfirm.id);
                updateGuarantor(pendingGuarantorConfirm.index, 'birth_date', pendingGuarantorConfirm.parsed.birthDate);
                updateGuarantor(pendingGuarantorConfirm.index, 'gender', pendingGuarantorConfirm.parsed.gender);
                setPendingGuarantorConfirm(null);
            }} onCancel={() => setPendingGuarantorConfirm(null)} />}
        </div>
    );
};

window.CRMModule = CRMModule;
