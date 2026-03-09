/**
 * 🤝 crm.js - مديول إدارة العملاء المطور (V7.6 - Corrected Native UI)
 * تم الإصلاح: ربط الدوال بـ XCore V7.5 وتصحيح أخطاء الـ Rendering.
 * التصميم: Full-Screen Mobile App Experience.
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-300">
            <div className="text-4xl text-center mb-4">🛡️</div>
            <p className="text-sm font-black text-center text-slate-800 mb-6 leading-relaxed">{message}</p>
            <div className="flex flex-col gap-2">
                <button onClick={onConfirm} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all">تأكيد البيانات</button>
                <button onClick={onCancel} className="w-full py-3 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-400">تعديل يدوياً</button>
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
    
    const [formData, setFormData] = useState({
        full_name: '', national_id: '', phone: '', whatsapp: '',
        province: '', area: '', address_details: '',
        job: '', job_type: 'قطاع خاص', income_verified: false,
        marital_status: 'متزوج', monthly_income: '', housing_type: 'إيجار',
        birth_date: '', gender: '', guarantors: [], credit_score: 0
    });

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
    // 🧠 محرك التقييم اللحظي (X-CORE Sync)
    // ==========================================
    const liveScore = useMemo(() => {
        // حساب مبدئي للسكور بناءً على قواعد XCore V7.5
        let tempScore = 0;
        if (formData.full_name.length > 5) tempScore += 5;
        if (formData.national_id.length === 14) tempScore += 5;
        if (formData.income_verified) tempScore += 20;
        if (formData.job_type === 'حكومي') tempScore += 10;
        
        // وزن الضامنين
        const validGuarantors = formData.guarantors.filter(g => g.national_id.length === 14).length;
        tempScore += (validGuarantors * 15);

        const finalScore = Math.min(tempScore, 100);
        return { score: finalScore, isEligible: finalScore >= 50 };
    }, [formData]);

    // ==========================================
    // 🛡️ الرقابة على الهوية والضامنين
    // ==========================================
    const handleNationalIdBlur = async (val) => {
        if (/^\d{14}$/.test(val) && window.XCore) {
            const availability = await window.XCore.checkGuarantorEligibility(val); // فحص لو هو ضامن حالي
            const parsed = parseNationalId(val);
            if (parsed) setPendingConfirm({ id: val, parsed });
        }
    };

    const addGuarantor = () => {
        if (formData.guarantors.length >= 3) {
            showNotification('error', '⚠️ الحد الأقصى 3 ضامنين.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            guarantors: [...prev.guarantors, { 
                full_name: '', national_id: '', phone: '', credit_score: 50,
                birth_date: '', gender: '', relation: ''
            }]
        }));
    };

    const handleGuarantorBlur = async (index, val) => {
        if (/^\d{14}$/.test(val) && window.XCore) {
            const eligibility = await window.XCore.checkGuarantorEligibility(val);
            if (!eligibility.eligible) {
                showNotification('error', eligibility.msg);
                updateGuarantor(index, 'national_id', '');
                return;
            }
            const parsed = parseNationalId(val);
            if (parsed) setPendingGuarantorConfirm({ index, id: val, parsed });
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
        if (!liveScore.isEligible) {
            showNotification('error', `🚫 التقييم ${liveScore.score}% غير كافٍ (الحد الأدنى 50%).`);
            return;
        }

        try {
            await db.add('customers', {
                ...formData,
                credit_score: liveScore.score,
                status: 'active',
                created_at: new Date().toISOString()
            });
            showNotification('success', '✅ تم الاعتماد الائتماني بنجاح');
            setIsModalOpen(false);
            loadCustomers();
            // تصفير الفورم
            setFormData({ full_name: '', national_id: '', phone: '', whatsapp: '', province: '', area: '', address_details: '', job: '', job_type: 'قطاع خاص', income_verified: false, marital_status: 'متزوج', monthly_income: '', housing_type: 'إيجار', birth_date: '', gender: '', guarantors: [], credit_score: 0 });
        } catch (err) {
            showNotification('error', '❌ فشل في حفظ البيانات');
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
        <div className="space-y-6 animate-in">
            {notification && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[400] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-xs animate-in slide-in-from-top duration-300">
                    {notification.message}
                </div>
            )}

            {/* شريط البحث */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
                <input 
                    type="text" placeholder="ابحث بالاسم أو الرقم القومي..." 
                    className="flex-1 p-4 bg-slate-50 border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs active:scale-95 transition-transform shadow-lg">+ إضافة عميل / استعلام</button>
            </div>

            {/* قائمة عرض العملاء */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-1.5 h-full ${c.credit_score >= 50 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-slate-900">{c.full_name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter">ID: {c.national_id}</p>
                            </div>
                            <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs">
                                {c.credit_score}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 📱 النافذة العملاقة (Full-Screen UI) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-500">
                    
                    {/* هيدر التقييم الثابت */}
                    <div className="shrink-0 bg-slate-900 text-white p-6 rounded-b-[2.5rem] shadow-2xl z-30">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-black text-lg">استعلام ائتماني ذكي</h3>
                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">X-CORE V7.5 Engine</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-lg active:scale-90 transition-transform">✕</button>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">مؤشر الأهلية:</span>
                                <span className={`text-3xl font-black ${liveScore.isEligible ? 'text-green-400' : 'text-red-400'}`}>{liveScore.score}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ease-out ${liveScore.score >= 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${liveScore.score}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* جسم الفورم (Scrollable) */}
                    <form id="main-crm-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 py-8 space-y-8 pb-32 custom-scroll">
                        
                        <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 text-right">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">01. بيانات المشتري</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2 text-right">
                                    <label className="text-[10px] font-black text-slate-500 mb-1 block">الاسم الرباعي</label>
                                    <input required className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold text-right" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] font-black text-slate-500 mb-1 block">الرقم القومي</label>
                                    <input required type="text" maxLength="14" className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold focus:ring-2 focus:ring-slate-900" 
                                           value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} 
                                           onBlur={e => handleNationalIdBlur(e.target.value)} />
                                    {formData.birth_date && <p className="text-[9px] text-green-600 font-bold mt-2 text-right">✅ مواليد {formData.birth_date}</p>}
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] font-black text-slate-500 mb-1 block">رقم الهاتف</label>
                                    <input required type="tel" className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold text-right" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={formData.income_verified} onChange={e => setFormData({...formData, income_verified: e.target.checked})} />
                                    <span className="text-[10px] font-black text-blue-700">تم تقديم إثبات دخل موثق (+20%)</span>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 text-right">
                            <div className="flex justify-between items-center border-b pb-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">02. الضامنين</h5>
                                <button type="button" onClick={addGuarantor} className="bg-slate-100 text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black">+ ضامن</button>
                            </div>
                            <div className="space-y-4">
                                {formData.guarantors.map((g, idx) => (
                                    <div key={idx} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 relative text-right">
                                        <button type="button" onClick={() => removeGuarantor(idx)} className="absolute top-4 left-4 text-red-300 hover:text-red-600">✕</button>
                                        <input required placeholder="الاسم الكامل" className="w-full p-3 mb-2 bg-white border rounded-xl text-xs font-bold text-right" value={g.full_name} onChange={e => updateGuarantor(idx, 'full_name', e.target.value)} />
                                        <input required type="text" maxLength="14" placeholder="الرقم القومي" className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-right" value={g.national_id} onChange={e => updateGuarantor(idx, 'national_id', e.target.value)} onBlur={e => handleGuarantorBlur(idx, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </form>

                    {/* زر الحفظ العائم */}
                    <div className="shrink-0 bg-white/80 backdrop-blur-md p-4 border-t shadow-2xl">
                        <button 
                            form="main-crm-form" type="submit" disabled={!liveScore.isEligible}
                            className={`w-full py-5 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all ${liveScore.isEligible ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}
                        >
                            {liveScore.isEligible ? `اعتماد تسجيل العميل (${liveScore.score}%) 🚀` : `غير مؤهل (${liveScore.score}%)`}
                        </button>
                    </div>

                </div>
            )}

            {/* نوافذ التأكيد */}
            {pendingConfirm && <ConfirmModal message={`مواليد ${pendingConfirm.parsed.birthDate}. نعتمد؟`} onConfirm={() => {
                setFormData(prev => ({ ...prev, national_id: pendingConfirm.id, birth_date: pendingConfirm.parsed.birthDate, gender: pendingConfirm.parsed.gender }));
                setPendingConfirm(null);
            }} onCancel={() => setPendingConfirm(null)} />}

            {pendingGuarantorConfirm && <ConfirmModal message={`ضامن: مواليد ${pendingGuarantorConfirm.parsed.birthDate}. نعتمد؟`} onConfirm={() => {
                updateGuarantor(pendingGuarantorConfirm.index, 'national_id', pendingGuarantorConfirm.id);
                updateGuarantor(pendingGuarantorConfirm.index, 'birth_date', pendingGuarantorConfirm.parsed.birthDate);
                setPendingGuarantorConfirm(null);
            }} onCancel={() => setPendingGuarantorConfirm(null)} />}
        </div>
    );
};

window.CRMModule = CRMModule;
