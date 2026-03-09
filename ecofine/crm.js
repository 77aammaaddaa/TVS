/**
 * 🤝 crm.js - مديول إدارة العملاء المطور (V7.5 - Full-Screen Mobile UI)
 * الإصدار السيادي: تم حل مشكلة الشاشة المنبثقة وتحويلها لواجهة تطبيق أصلية (Native App Feel).
 * دمج التقييم اللحظي، الفلترة المزدوجة، وحساب الأوزان النسبية للـ 100%.
 */

const { useState, useEffect, useMemo, useCallback } = React;

// دالة تحليل الرقم القومي المصري (14 رقم)
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

// مودال التأكيد الصغير (مرفوع الـ z-index ليظهر فوق كل شيء)
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in fade-in slide-in-from-bottom-4">
            <div className="text-4xl text-center mb-4">🔍</div>
            <p className="text-sm font-bold text-center text-slate-800 mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3 justify-center">
                <button onClick={onCancel} className="px-6 py-3 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-50">تعديل يدوياً</button>
                <button onClick={onConfirm} className="px-6 py-3 bg-blue-600 shadow-lg shadow-blue-600/30 text-white rounded-xl text-xs font-black active:scale-95">تأكيد ومتابعة</button>
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
    
    // بيانات النموذج الرئيسي للمشتري
    const [formData, setFormData] = useState({
        full_name: '', national_id: '', phone: '', whatsapp: '',
        province: '', area: '', address_details: '',
        job: '', job_type: 'قطاع خاص', income_verified: false,
        marital_status: 'متزوج', qualification: '',
        monthly_income: '', income_source: '', housing_type: 'إيجار',
        birth_date: '', gender: '', guarantors: [] 
    });

    const [pendingNationalIdConfirm, setPendingNationalIdConfirm] = useState(null); 
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
            showNotification('error', '❌ فشل في تحميل قاعدة بيانات العملاء');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    // ==========================================
    // 🧠 محرك التقييم اللحظي (Live Score Tracker)
    // ==========================================
    const liveScore = useMemo(() => {
        if (!window.XCore) return { score: 0, isEligible: false };

        const evaluatedGuarantors = formData.guarantors.map(g => {
            const gScore = window.XCore.calculateCreditScore(g, []).score; 
            return { ...g, credit_score: gScore };
        });

        return window.XCore.calculateCreditScore(formData, evaluatedGuarantors);
    }, [formData]);

    // ==========================================
    // 🛡️ الرقابة على المشتري (Buyer Guard)
    // ==========================================
    const handleBuyerNationalIdBlur = async (value) => {
        if (/^\d{14}$/.test(value) && window.XCore) {
            const check = await window.XCore.checkPersonEligibility(value, 'buyer');
            if (!check.eligible) {
                showNotification('error', check.msg);
                setFormData(prev => ({ ...prev, national_id: '' }));
                return;
            }
            if (check.requiresMultiInvoiceCheck) {
                showNotification('success', '💡 عميل حالي: سيخضع لشرط سداد 50% عند نقطة البيع.');
            }
            const parsed = parseNationalId(value);
            if (parsed) setPendingNationalIdConfirm({ nationalId: value, parsed });
        }
    };

    const confirmNationalId = () => {
        if (pendingNationalIdConfirm) {
            setFormData(prev => ({
                ...prev,
                national_id: pendingNationalIdConfirm.nationalId,
                birth_date: pendingNationalIdConfirm.parsed.birthDate,
                gender: pendingNationalIdConfirm.parsed.gender
            }));
            setPendingNationalIdConfirm(null);
        }
    };

    // ==========================================
    // 🛡️ الرقابة على الضامنين (Guarantor Guard)
    // ==========================================
    const addGuarantor = () => {
        if (formData.guarantors.length >= 3) {
            showNotification('error', '⚠️ الحد الأقصى 3 ضامنين للفاتورة الواحدة.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            guarantors: [...prev.guarantors, {
                full_name: '', national_id: '', phone: '', whatsapp: '',
                province: '', area: '', address_details: '',
                job: '', job_type: 'قطاع خاص', income_verified: false,
                marital_status: 'متزوج', monthly_income: '', housing_type: 'إيجار',
                birth_date: '', gender: '', relation: '', credit_score: 0
            }]
        }));
    };

    const updateGuarantor = (index, field, value) => {
        const updated = [...formData.guarantors];
        updated[index][field] = value;
        setFormData({ ...formData, guarantors: updated });
    };

    const handleGuarantorNationalIdBlur = async (index, value) => {
        if (/^\d{14}$/.test(value) && window.XCore) {
            if (value === formData.national_id) {
                showNotification('error', '🚫 لا يمكن للمشتري أن يضمن نفسه!');
                updateGuarantor(index, 'national_id', '');
                return;
            }

            const check = await window.XCore.checkPersonEligibility(value, 'guarantor');
            if (!check.eligible) {
                showNotification('error', check.msg);
                updateGuarantor(index, 'national_id', '');
                return;
            }
            
            const parsed = parseNationalId(value);
            if (parsed) setPendingGuarantorConfirm({ index, nationalId: value, parsed });
        }
    };

    const confirmGuarantorNationalId = () => {
        if (pendingGuarantorConfirm) {
            const { index, parsed } = pendingGuarantorConfirm;
            const updated = [...formData.guarantors];
            updated[index].birth_date = parsed.birthDate;
            updated[index].gender = parsed.gender;
            setFormData({ ...formData, guarantors: updated });
            setPendingGuarantorConfirm(null);
        }
    };

    // ==========================================
    // 💾 حفظ البيانات
    // ==========================================
    const handleSave = async (e) => {
        e.preventDefault();

        if (!liveScore.isEligible) {
            showNotification('error', `🚫 غير مؤهل للتسجيل. التقييم الحالي ${liveScore.score}% (الحد الأدنى 50%).`);
            return;
        }

        for (let i = 0; i < formData.guarantors.length; i++) {
            const g = formData.guarantors[i];
            const gScoreObj = window.XCore.calculateCreditScore(g, []);
            if (gScoreObj.score < 50) {
                showNotification('error', `🚫 الضامن ${i+1} غير مؤهل (تقييمه ${gScoreObj.score}%). يجب تغييره.`);
                return;
            }
            g.credit_score = gScoreObj.score; 
        }

        try {
            const customerData = {
                ...formData,
                status: 'active',
                credit_score: liveScore.score,
                survey_status: 'pending',
                created_at: new Date().toISOString(),
                legal_ban_until: null
            };
            
            await db.add('customers', customerData);
            
            setFormData({
                full_name: '', national_id: '', phone: '', whatsapp: '',
                province: '', area: '', address_details: '',
                job: '', job_type: 'قطاع خاص', income_verified: false,
                marital_status: 'متزوج', qualification: '', monthly_income: '',
                income_source: '', housing_type: 'إيجار', birth_date: '', gender: '', guarantors: []
            });
            setIsModalOpen(false);
            await loadCustomers();
            showNotification('success', `✅ تم الاعتماد. السكور الائتماني المبدئي: ${liveScore.score}%`);
        } catch (err) {
            showNotification('error', '❌ فشل الحفظ. قد يكون هناك مشكلة في الاتصال بالقاعدة.');
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
        <div className="space-y-6 animate-in relative">
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] px-8 py-4 rounded-2xl shadow-2xl text-white font-black text-xs md:text-sm tracking-wide ${
                    notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* شريط الإجراءات والبحث */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <input 
                    type="text" 
                    placeholder="ابحث بالاسم، الهاتف، أو الرقم القومي..." 
                    className="w-full md:w-1/2 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <span className="text-lg">+</span> استعلام وتسجيل عميل
                </button>
            </div>

            {/* عرض العملاء */}
            {isLoading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <span className="text-5xl block mb-4 grayscale opacity-50">👥</span>
                    <p className="text-slate-400 font-bold">لا يوجد عملاء مطابقين للبحث</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map(c => (
                        <div key={c.id} className="bg-white p-6 rounded-[2rem] border shadow-sm relative overflow-hidden transition-all hover:shadow-lg">
                            <div className={`absolute top-0 right-0 w-full h-1 ${c.credit_score >= 75 ? 'bg-green-500' : c.credit_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm">{c.full_name}</h4>
                                    <p className="text-[10px] text-slate-400 tracking-widest mt-1" dir="ltr">{c.national_id.replace(/(\d{6})\d{4}(\d{4})/, '$1****$2')}</p>
                                </div>
                                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl ${c.credit_score >= 75 ? 'bg-green-50 text-green-700' : c.credit_score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                    <span className="text-[10px] font-bold uppercase">Score</span>
                                    <span className="font-black leading-none">{c.credit_score}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl">
                                <div className="flex justify-between"><span>📱 الهاتف:</span><span className="text-slate-800">{c.phone}</span></div>
                                <div className="flex justify-between"><span>💼 الوظيفة:</span><span className="text-slate-800">{c.job_type}</span></div>
                                <div className="flex justify-between"><span>🏠 السكن:</span><span className="text-slate-800">{c.housing_type}</span></div>
                            </div>

                            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black">
                                    🛡️ ضامنين: {c.guarantors?.length || 0}
                                </span>
                                <span className={`text-[9px] px-2 py-1 rounded font-black ${c.legal_ban_until && new Date(c.legal_ban_until) > new Date() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {c.legal_ban_until && new Date(c.legal_ban_until) > new Date() ? 'محظور قانونياً' : 'متاح للتعامل'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* مودال تسجيل العميل (Full-Screen Native App Design) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-full">
                    
                    {/* الهيدر العلوي الثابت وشريط التقييم */}
                    <div className="shrink-0 bg-slate-900 p-4 md:p-6 text-white shadow-xl z-20 relative">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-black">غرفة الاستعلام الذكي</h3>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">فحص وتقييم آلي (X-CORE)</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-lg hover:bg-slate-700 transition-colors">✕</button>
                        </div>
                        
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-slate-400">التقييم الائتماني الحي:</span>
                                <span className={`text-2xl font-black ${liveScore.isEligible ? 'text-green-400' : 'text-red-400'}`}>{liveScore.score}%</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700">
                                <div className={`h-full transition-all duration-700 ease-out ${liveScore.score >= 75 ? 'bg-green-500' : liveScore.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${liveScore.score}%` }}></div>
                            </div>
                            <div className="flex justify-between mt-2 text-[8px] font-bold text-slate-500 uppercase">
                                <span>بيانات (20%)</span><span>مالية (30%)</span><span>سكن (10%)</span><span>ضامنين (40%)</span>
                            </div>
                            {!liveScore.isEligible && (
                                <p className="text-[10px] text-red-400 mt-2 font-bold animate-pulse">⚠️ التقييم أقل من 50%. غير مؤهل لفتح تعاقد حالياً.</p>
                            )}
                        </div>
                    </div>
                    
                    {/* جسم الفورم (السكرول الطبيعي هنا) */}
                    <form id="crm-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-32 custom-scroll">
                        
                        {/* القسم 1: البيانات الشخصية */}
                        <section className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-3">1. الهوية والبيانات الأساسية</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">الاسم الرباعي</label>
                                    <input required className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-bold" 
                                           value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">الرقم القومي (فحص فوري)</label>
                                    <input required type="text" maxLength="14" className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500" 
                                           value={formData.national_id} 
                                           onChange={e => setFormData({ ...formData, national_id: e.target.value, birth_date: '', gender: '' })}
                                           onBlur={(e) => handleBuyerNationalIdBlur(e.target.value)} />
                                    {formData.birth_date && <p className="text-[9px] text-green-600 font-bold mt-2 bg-green-50 p-2 rounded-lg">✅ {formData.birth_date} | {formData.gender}</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">رقم الهاتف (أساسي)</label>
                                    <input required type="tel" className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-bold" 
                                           value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">العنوان الفعلي بالتفصيل</label>
                                    <input required className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-bold" 
                                           value={formData.address_details} onChange={e => setFormData({...formData, address_details: e.target.value})} />
                                </div>
                            </div>
                        </section>

                        {/* القسم 2: القدرة المالية والسكن */}
                        <section className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-3">2. القدرة المالية والسكن</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">جهة العمل</label>
                                    <select className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-bold" 
                                            value={formData.job_type} onChange={e => setFormData({...formData, job_type: e.target.value})}>
                                        <option value="قطاع خاص">قطاع خاص</option>
                                        <option value="حكومي">موظف حكومي (أعلى تقييم)</option>
                                        <option value="أعمال حرة">أعمال حرة</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">متوسط الدخل الشهري</label>
                                    <input required type="number" className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-black text-blue-600" 
                                           value={formData.monthly_income} onChange={e => setFormData({...formData, monthly_income: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">نوع السكن</label>
                                    <select className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-bold" 
                                            value={formData.housing_type} onChange={e => setFormData({...formData, housing_type: e.target.value})}>
                                        <option value="إيجار">إيجار</option>
                                        <option value="تمليك">تمليك (أعلى تقييم)</option>
                                        <option value="عائلي">عائلي</option>
                                    </select>
                                </div>
                                <div className="md:col-span-3 flex items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl gap-3">
                                    <input type="checkbox" className="w-5 h-5 accent-blue-600 rounded" 
                                           checked={formData.income_verified} onChange={e => setFormData({...formData, income_verified: e.target.checked})} />
                                    <span className="text-xs font-black text-blue-800">إثبات دخل موثق (مفردات مرتب / كشف حساب) - يرفع التقييم</span>
                                </div>
                            </div>
                        </section>

                        {/* القسم 3: شبكة الضامنين */}
                        <section className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b pb-3">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">3. شبكة الضمان (40% من التقييم)</h5>
                                <button type="button" onClick={addGuarantor} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-xl active:scale-95">
                                    + إضافة ضامن
                                </button>
                            </div>
                            
                            {formData.guarantors.map((g, idx) => (
                                <div key={idx} className="bg-slate-50 p-5 rounded-[1.5rem] border relative mt-4 shadow-inner">
                                    <button type="button" onClick={() => removeGuarantor(idx)} className="absolute top-4 left-4 w-8 h-8 bg-red-100 text-red-600 rounded-full flex justify-center items-center text-xs font-bold">✕</button>
                                    <h6 className="font-black text-sm text-slate-800 mb-4">الضامن {idx+1}</h6>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="md:col-span-2">
                                            <input required placeholder="الاسم الرباعي" className="w-full p-3 bg-white border rounded-xl text-xs font-bold" value={g.full_name} onChange={e => updateGuarantor(idx, 'full_name', e.target.value)} />
                                        </div>
                                        <div>
                                            <input required type="text" maxLength="14" placeholder="الرقم القومي (فحص أهليته فوراً)" className="w-full p-3 bg-white border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500" 
                                                   value={g.national_id} 
                                                   onChange={e => { updateGuarantor(idx, 'national_id', e.target.value); updateGuarantor(idx, 'birth_date', ''); updateGuarantor(idx, 'gender', ''); }}
                                                   onBlur={(e) => handleGuarantorNationalIdBlur(idx, e.target.value)} />
                                            {g.birth_date && <p className="text-[8px] text-green-600 font-bold mt-1">✅ {g.birth_date}</p>}
                                        </div>
                                        <div>
                                            <input required type="tel" placeholder="رقم الهاتف" className="w-full p-3 bg-white border rounded-xl text-xs font-bold" value={g.phone} onChange={e => updateGuarantor(idx, 'phone', e.target.value)} />
                                        </div>
                                        <div>
                                            <select className="w-full p-3 bg-white border rounded-xl text-xs font-bold" value={g.job_type} onChange={e => updateGuarantor(idx, 'job_type', e.target.value)}>
                                                <option value="قطاع خاص">عمل: قطاع خاص</option><option value="حكومي">عمل: حكومي</option><option value="أعمال حرة">عمل: حر</option>
                                            </select>
                                        </div>
                                        <div>
                                            <select className="w-full p-3 bg-white border rounded-xl text-xs font-bold" value={g.housing_type} onChange={e => updateGuarantor(idx, 'housing_type', e.target.value)}>
                                                <option value="إيجار">سكن: إيجار</option><option value="تمليك">سكن: تمليك</option><option value="عائلي">سكن: عائلي</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {formData.guarantors.length === 0 && (
                                <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed">
                                    <p className="text-xs font-bold text-slate-400">إضافة الضامنين ترفع تقييم العميل وتفتح له سقف ائتمان أعلى.</p>
                                </div>
                            )}
                        </section>
                    </form>

                    {/* زر الحفظ العائم في الأسفل (Sticky Bottom Action Bar) */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <button form="crm-form" type="submit" disabled={!liveScore.isEligible} className={`w-full max-w-4xl mx-auto block py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${liveScore.isEligible ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                            {liveScore.isEligible ? 'حفظ واعتماد ملف العميل 🚀' : 'العميل غير مؤهل للاعتماد (السكور < 50%)'}
                        </button>
                    </div>

                </div>
            )}

            {/* نوافذ التأكيد */}
            {pendingNationalIdConfirm && <ConfirmModal message={`مشتري: استخرجنا مواليد ${pendingNationalIdConfirm.parsed.birthDate} (${pendingNationalIdConfirm.parsed.gender}). متابعة؟`} onConfirm={confirmNationalId} onCancel={() => setPendingNationalIdConfirm(null)} />}
            {pendingGuarantorConfirm && <ConfirmModal message={`ضامن: استخرجنا مواليد ${pendingGuarantorConfirm.parsed.birthDate} (${pendingGuarantorConfirm.parsed.gender}). متابعة؟`} onConfirm={confirmGuarantorNationalId} onCancel={() => setPendingGuarantorConfirm(null)} />}
        </div>
    );
};

window.CRMModule = CRMModule;
