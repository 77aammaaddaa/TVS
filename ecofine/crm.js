/**
 * 🤝 crm.js - مديول إدارة العملاء والضامنين (V10.5 Titanium - Legal & X-Core Integrated)
 * التحديث: الاستخراج الذكي، الرفض العمري، التحقق الصارم من الهاتف، والربط المباشر مع القضايا القانونية.
 */

const { useState, useEffect, useMemo, useCallback } = React;

// ==========================================
// 🗺️ خرائط المحافظات والمناطق (Data Maps)
// ==========================================
const govMap = {
    '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس',
    '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
    '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
    '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
    '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
    '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
    '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية'
};

const areasMap = {
    'السويس': ['الأربعين', 'الجناين', 'السويس', 'عتاقة', 'فيصل', 'السلام', 'الصباح'],
    'القاهرة': ['مدينة نصر', 'المعادي', 'مصر الجديدة', 'شبرا', 'وسط البلد', 'التجمع الخامس', 'حلوان'],
    'الإسكندرية': ['المنتزه', 'سموحة', 'ميامي', 'سيدي بشر', 'محرم بك', 'العجمي'],
};

// ==========================================
// 🔍 محرك استخراج البيانات من الرقم القومي
// ==========================================
const parseNationalId = (id) => {
    if (!/^\d{14}$/.test(id)) return null;
    const century = id[0]; 
    const year = id.substring(1, 3);
    const month = id.substring(3, 5);
    const day = id.substring(5, 7);
    const govCode = id.substring(7, 9);
    const genderDigit = parseInt(id[12]); 
    
    let fullYear = century === '2' ? `19${year}` : century === '3' ? `20${year}` : null;
    if (!fullYear) return null;
    
    // حساب السن
    const dob = new Date(`${fullYear}-${month}-${day}`);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    return {
        birthDate: `${fullYear}-${month}-${day}`,
        age: age,
        gender: genderDigit % 2 === 1 ? 'ذكر' : 'أنثى',
        province: govMap[govCode] || 'غير معروف'
    };
};

// ==========================================
// 📱 التحقق من صحة رقم الهاتف المصري
// ==========================================
const isValidEgyptianPhone = (phone) => {
    return /^01[0125][0-9]{8}$/.test(phone);
};

// ==========================================
// 🛡️ نافذة التأكيد المنبثقة
// ==========================================
const ConfirmModal = ({ title, data, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in text-right">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 border-2 border-blue-100">
            <div className="text-4xl text-center mb-4">🔍</div>
            <h4 className="font-black text-center text-slate-800 mb-2">{title}</h4>
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-2 border border-slate-100 text-xs font-bold text-slate-600">
                <p className="flex justify-between"><span>تاريخ الميلاد:</span> <span className="text-blue-600">{data.birthDate}</span></p>
                <p className="flex justify-between"><span>السن المحسوب:</span> <span className="text-blue-600">{data.age} سنة</span></p>
                <p className="flex justify-between"><span>النوع:</span> <span className="text-blue-600">{data.gender}</span></p>
                <p className="flex justify-between"><span>المحافظة:</span> <span className="text-blue-600">{data.province}</span></p>
            </div>
            <div className="flex flex-col gap-2">
                <button onClick={onConfirm} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-lg active:scale-95 transition-all">تأكيد ومتابعة المِلء</button>
                <button onClick={onCancel} className="w-full py-3 bg-red-50 text-red-500 rounded-2xl text-[11px] font-black hover:bg-red-100 transition-colors">إلغاء (الرقم غير صحيح)</button>
            </div>
        </div>
    </div>
);

// ==========================================
// 🏢 الموديول الرئيسي
// ==========================================
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
        birth_date: '', age: '', gender: '', guarantors: [], credit_score: 0,
        has_legal_issues: false // الحقل الجديد للربط القانوني
    };
    const [formData, setFormData] = useState(initialFormState);

    const [pendingConfirm, setPendingConfirm] = useState(null); 
    const [pendingGuarantorConfirm, setPendingGuarantorConfirm] = useState(null);

    const showNotification = useCallback((type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4500);
    }, []);

    // ⚖️ تحميل العملاء مع التحقق من موقفهم القانوني
    const loadCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await window.db.getAll('customers') || [];
            const cases = await window.db.getAll('legal_cases').catch(() => []) || [];
            
            // ربط القضايا بالعملاء
            const enhancedData = data.map(c => {
                // البحث إذا كان العميل مدعى عليه في أي قضية
                const customerCases = cases.filter(lc => lc.defendant_id === c.id || lc.defendant_national_id === c.national_id);
                return {
                    ...c,
                    has_legal_issues: customerCases.length > 0,
                    cases_count: customerCases.length
                };
            });

            setCustomers(enhancedData);
        } catch (error) {
            showNotification('error', '❌ فشل في تحميل قاعدة البيانات');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    // 🧠 محرك التقييم اللحظي 
    const liveScore = useMemo(() => {
        let tempScore = 0;
        
        // وزن المشتري
        if (formData.full_name.trim().length > 8) tempScore += 5;
        if (/^\d{14}$/.test(formData.national_id)) tempScore += 10;
        if (isValidEgyptianPhone(formData.phone)) tempScore += 5;
        if (formData.housing_type === 'تمليك') tempScore += 10;
        else if (formData.housing_type === 'إيجار قديم') tempScore += 5;
        
        if (formData.job.length > 3) tempScore += 5;
        if (formData.job_type === 'حكومي') tempScore += 15;
        else if (formData.job_type === 'أعمال حرة') tempScore += 5;
        else tempScore += 10;

        if (Number(formData.monthly_income) > 3000) tempScore += 5;
        if (formData.income_verified) tempScore += 10;

        // وزن الضامنين (تحليل دقيق)
        formData.guarantors.forEach(g => {
            if (/^\d{14}$/.test(g.national_id)) {
                let gScore = 5; 
                if (g.is_existing && g.credit_score >= 50) gScore += 10; 
                if (g.job_type === 'حكومي') gScore += 5;
                if (Number(g.monthly_income) > 3000) gScore += 5;
                // خصم عنيف لو الضامن عليه قضايا
                if (g.has_legal_issues) gScore -= 50; 
                
                tempScore += gScore;
            }
        });

        // خصم لو المشتري نفسه عليه قضية مسجلة مسبقاً
        if (formData.has_legal_issues) tempScore -= 80;

        const finalScore = Math.max(0, Math.min(tempScore, 100));
        return { score: finalScore, isEligible: finalScore >= 50 && !formData.has_legal_issues };
    }, [formData]);

    // ==========================================
    // 🛡️ أحداث الرقم القومي (للمشتري)
    // ==========================================
    const handleNationalIdBlur = async (val) => {
        if (/^\d{14}$/.test(val)) {
            const parsed = parseNationalId(val);
            if (!parsed) return showNotification('error', '❌ الرقم القومي غير صالح.');
            
            // تحقق السن
            if (parsed.age < 21 || parsed.age > 65) {
                setFormData(prev => ({ ...prev, national_id: '' }));
                return showNotification('error', `🚫 السن القانوني مرفوض! (${parsed.age} سنة). يجب أن يكون بين 21 و 65.`);
            }

            // تحقق قانوني استباقي من السجل
            const existingCust = customers.find(c => c.national_id === val);
            if (existingCust && existingCust.has_legal_issues) {
                setFormData(prev => ({ ...prev, has_legal_issues: true }));
                showNotification('error', '🚨 تحذير أمني: هذا العميل مطلوب في قضايا مسجلة بالنظام!');
            }

            if (!formData.birth_date || formData.birth_date !== parsed.birthDate) {
                setPendingConfirm({ id: val, parsed });
            }
        }
    };

    // ==========================================
    // 👥 أحداث الضامنين
    // ==========================================
    const addGuarantor = () => {
        if (formData.guarantors.length >= 3) return showNotification('error', '⚠️ الحد الأقصى 3 ضامنين.');
        setFormData(prev => ({
            ...prev,
            guarantors: [...prev.guarantors, { 
                full_name: '', national_id: '', phone: '', relation: '', 
                birth_date: '', age: '', gender: '', province: '',
                job: '', job_type: 'قطاع خاص', monthly_income: '', is_existing: false, credit_score: 0,
                has_legal_issues: false
            }]
        }));
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

    const handleGuarantorBlur = async (index, val) => {
        if (!/^\d{14}$/.test(val)) return;

        if (val === formData.national_id) {
            updateGuarantor(index, 'national_id', '');
            return showNotification('error', '🚫 تلاعب محظور: لا يمكن للمشتري أن يضمن نفسه!');
        }

        const duplicate = formData.guarantors.find((g, i) => i !== index && g.national_id === val);
        if (duplicate) {
            updateGuarantor(index, 'national_id', '');
            return showNotification('error', '⚠️ هذا الضامن مضاف بالفعل في نفس الفاتورة!');
        }

        const parsed = parseNationalId(val);
        if (!parsed) return showNotification('error', '❌ الرقم القومي للضامن غير صالح.');
        if (parsed.age < 21 || parsed.age > 65) {
            updateGuarantor(index, 'national_id', '');
            return showNotification('error', `🚫 سن الضامن مرفوض (${parsed.age} سنة). يجب أن يكون بين 21 و 65.`);
        }

        const existingCust = customers.find(c => c.national_id === val);
        if (existingCust) {
            
            if (existingCust.has_legal_issues) {
                showNotification('error', `🚨 خطر ائتماني: الضامن (${existingCust.full_name}) عليه قضايا متعثرة في النظام!`);
            } else {
                showNotification('success', `✅ تم سحب بيانات الضامن (${existingCust.full_name}) تلقائياً من قاعدة البيانات.`);
            }

            const updated = [...formData.guarantors];
            updated[index] = {
                ...updated[index],
                full_name: existingCust.full_name, national_id: val, phone: existingCust.phone,
                birth_date: parsed.birthDate, age: parsed.age, gender: parsed.gender, province: parsed.province,
                job: existingCust.job || '', job_type: existingCust.job_type || 'قطاع خاص',
                monthly_income: existingCust.monthly_income || '',
                is_existing: true, credit_score: existingCust.credit_score || 50,
                has_legal_issues: existingCust.has_legal_issues || false
            };
            setFormData({ ...formData, guarantors: updated });
            return;
        }

        setPendingGuarantorConfirm({ index, id: val, parsed });
    };

    // ==========================================
    // 💾 حفظ العميل
    // ==========================================
    const handleSave = async (e) => {
        e.preventDefault();
        
        // 1. فحص الهاتف للمشتري
        if (!isValidEgyptianPhone(formData.phone)) {
            return showNotification('error', '❌ رقم هاتف المشتري غير صحيح. تأكد أنه 11 رقماً ويبدأ بـ 01.');
        }

        // 2. فحص الهواتف للضامنين
        const invalidGPhone = formData.guarantors.find(g => g.phone && !isValidEgyptianPhone(g.phone));
        if (invalidGPhone) {
            return showNotification('error', `❌ رقم هاتف الضامن (${invalidGPhone.full_name || 'بدون اسم'}) غير صحيح.`);
        }

        if (!liveScore.isEligible) return showNotification('error', `🚫 السكور ${liveScore.score}% غير كافٍ للاعتماد أو يوجد مانع قانوني.`);
        
        const invalidG = formData.guarantors.find(g => !g.age || g.full_name.trim() === '');
        if (invalidG) return showNotification('error', '⚠️ يرجى إكمال بيانات جميع الضامنين أو حذف الخانات الفارغة.');

        try {
            await window.db.add('customers', {
                ...formData,
                credit_score: liveScore.score,
                status: 'active',
                created_at: new Date().toISOString()
            });
            showNotification('success', '✅ تم تسجيل العميل واعتماده بنجاح');
            setIsModalOpen(false);
            loadCustomers();
            setFormData(initialFormState);
        } catch (err) {
            showNotification('error', '❌ فشل في حفظ البيانات.');
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(c => c.full_name?.toLowerCase().includes(term) || c.phone?.includes(term) || c.national_id?.includes(term));
    }, [customers, searchTerm]);

    return (
        <div className="space-y-6 pb-24 animate-in fade-in relative">
            
            {/* الإشعارات */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-[2rem] shadow-2xl text-white font-black text-xs transition-all duration-300 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.message}
                </div>
            )}

            {/* شريط البحث */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[2rem] shadow-sm border mx-2 mt-2">
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-[1.5rem] px-4">
                    <span className="text-xl">🔍</span>
                    <input type="text" placeholder="ابحث بالاسم، الهاتف، أو الرقم القومي..." className="w-full p-4 bg-transparent text-xs font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => { setFormData(initialFormState); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs shadow-xl active:scale-95 flex items-center justify-center gap-2">
                    <span className="text-lg">➕</span> إضافة ملف استعلام
                </button>
            </div>

            {/* قائمة عرض العملاء */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                {filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden flex flex-col justify-between text-right hover:shadow-md transition-shadow">
                        <div className={`absolute top-0 right-0 w-2 h-full ${c.has_legal_issues ? 'bg-red-600' : (c.credit_score >= 50 ? 'bg-green-500' : 'bg-amber-500')}`}></div>
                        <div className="flex justify-between items-start mb-4 pr-3">
                            <div className={`w-12 h-12 rounded-[1rem] flex flex-col items-center justify-center shadow-inner shrink-0 ${c.credit_score >= 50 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                <span className="font-black text-lg leading-none">{c.credit_score}</span>
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm flex items-center justify-end gap-1">
                                    {c.has_legal_issues && <span title="مطلوب في قضايا" className="text-red-500 text-lg animate-pulse">⚖️</span>}
                                    {c.full_name}
                                </h4>
                                <div className="flex flex-wrap justify-end gap-1 mt-2">
                                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{c.phone}</span>
                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold">{c.province}</span>
                                    {c.has_legal_issues && <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-black">مطلوب قانونياً</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 📱 نافذة إضافة العميل (Full-Screen) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[500] bg-slate-50 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    
                    {/* هيدر التقييم */}
                    <div className="shrink-0 bg-slate-900 text-white p-5 rounded-b-[2rem] shadow-xl z-50 text-right">
                        <div className="flex justify-between items-start mb-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg active:scale-95 hover:bg-white/20">✕</button>
                            <div>
                                <h3 className="font-black text-lg">ملف استعلام الائتمان</h3>
                                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">X-Core Data Miner</p>
                            </div>
                        </div>
                        <div className={`p-4 rounded-2xl border ${formData.has_legal_issues ? 'bg-red-900/50 border-red-500' : 'bg-slate-800 border-slate-700'}`}>
                            <div className="flex justify-between items-end mb-2">
                                <span className={`text-2xl font-black leading-none ${liveScore.isEligible ? 'text-green-400' : 'text-red-400'}`}>
                                    {formData.has_legal_issues ? 'مرفوض قانونياً' : `${liveScore.score}%`}
                                </span>
                                <span className="text-[10px] font-black text-slate-300 uppercase">مؤشر الجدارة</span>
                            </div>
                            {!formData.has_legal_issues && (
                                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex justify-end">
                                    <div className={`h-full transition-all duration-700 ease-out ${liveScore.score >= 50 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${liveScore.score}%` }}></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* جسم الفورم */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full">
                        <form id="main-crm-form" onSubmit={handleSave} className="p-4 space-y-4 pb-10 max-w-2xl mx-auto text-right">
                            
                            {/* بطاقة 1: الهوية */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">1. الهوية الأساسية</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الاسم الرباعي</label>
                                        <input required className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none focus:border-blue-500" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الرقم القومي (يحدد السن والمحافظة تلقائياً)</label>
                                        <input required type="text" maxLength="14" className={`w-full p-4 border rounded-2xl text-xs font-black tracking-widest outline-none focus:border-blue-500 ${formData.has_legal_issues ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-50'}`} value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value.replace(/\D/g,'')})} onBlur={e => handleNationalIdBlur(e.target.value)} />
                                    </div>
                                    
                                    {formData.age && (
                                        <div className="col-span-2 grid grid-cols-3 gap-2 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                            <div className="text-center border-l border-blue-100"><span className="block text-[8px] font-black text-blue-400">السن</span><span className="text-xs font-black text-blue-900">{formData.age} عام</span></div>
                                            <div className="text-center border-l border-blue-100"><span className="block text-[8px] font-black text-blue-400">المحافظة</span><span className="text-xs font-black text-blue-900">{formData.province}</span></div>
                                            <div className="text-center"><span className="block text-[8px] font-black text-blue-400">النوع</span><span className="text-xs font-black text-blue-900">{formData.gender}</span></div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الهاتف (11 رقم)</label>
                                        <input required type="tel" maxLength="11" placeholder="01..." className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g,'')})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الواتساب</label>
                                        <input type="tel" maxLength="11" placeholder="01..." className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g,'')})} />
                                    </div>
                                </div>
                            </section>

                            {/* بطاقة 2: السكن */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">2. العنوان الاستدلالي</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 flex gap-2 bg-slate-50 p-1.5 rounded-[1.5rem]">
                                        {['إيجار جديد', 'إيجار قديم', 'تمليك'].map(t => (
                                            <button type="button" key={t} onClick={() => setFormData({...formData, housing_type: t})} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${formData.housing_type === t ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{t}</button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">المنطقة / المركز</label>
                                        {areasMap[formData.province] ? (
                                            <select required className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none appearance-none" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})}>
                                                <option value="">-- اختر المنطقة --</option>
                                                {areasMap[formData.province].map(a => <option key={a} value={a}>{a}</option>)}
                                                <option value="أخرى">منطقة أخرى...</option>
                                            </select>
                                        ) : (
                                            <input required placeholder="اكتب المنطقة..." className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">العنوان بالتفصيل</label>
                                        <input required className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none" value={formData.address_details} onChange={e => setFormData({...formData, address_details: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            {/* بطاقة 3: العمل والدخل */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">3. العمل والدخل</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">جهة العمل</label>
                                        <input required className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none" value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} />
                                    </div>
                                    <div className="col-span-2 flex gap-2 bg-slate-50 p-1.5 rounded-[1.5rem]">
                                        {['قطاع خاص', 'حكومي', 'أعمال حرة', 'معاش'].map(t => (
                                            <button type="button" key={t} onClick={() => setFormData({...formData, job_type: t})} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${formData.job_type === t ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{t}</button>
                                        ))}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الدخل الشهري</label>
                                        <input type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none text-blue-700" value={formData.monthly_income} onChange={e => setFormData({...formData, monthly_income: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            {/* بطاقة 4: الضامنين (Legal Check Included) */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <button type="button" onClick={addGuarantor} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md">+ إضافة ضامن</button>
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. بيانات الضامنين ({formData.guarantors.length}/3)</h5>
                                </div>
                                <div className="space-y-4">
                                    {formData.guarantors.map((g, idx) => (
                                        <div key={idx} className={`p-4 rounded-[1.5rem] border relative text-right ${g.has_legal_issues ? 'bg-red-50/50 border-red-300' : (g.is_existing ? 'bg-green-50/30 border-green-200' : 'bg-slate-50/80 border-slate-200')}`}>
                                            <button type="button" onClick={() => removeGuarantor(idx)} className="absolute top-4 left-4 w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-black">✕</button>
                                            
                                            <div className="flex justify-between items-center mb-3 pr-2">
                                                <div className="flex gap-2">
                                                    {g.is_existing && !g.has_legal_issues && <span className="bg-green-100 text-green-700 text-[8px] px-2 py-1 rounded font-black">⭐ مسجل بالنظام</span>}
                                                    {g.has_legal_issues && <span className="bg-red-100 text-red-700 text-[8px] px-2 py-1 rounded font-black animate-pulse">⚖️ مطلوب قانونياً</span>}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 block">ضامن رقم {idx + 1}</span>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <input required type="text" maxLength="14" placeholder="الرقم القومي (يحدد البيانات تلقائياً)" className={`w-full p-3 bg-white border rounded-xl text-xs font-black font-mono outline-none ${g.has_legal_issues ? 'text-red-600' : ''}`} value={g.national_id} onChange={e => updateGuarantor(idx, 'national_id', e.target.value.replace(/\D/g,''))} onBlur={e => handleGuarantorBlur(idx, e.target.value)} disabled={g.is_existing} />
                                                
                                                <input required placeholder="الاسم الرباعي" className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" value={g.full_name} onChange={e => updateGuarantor(idx, 'full_name', e.target.value)} disabled={g.is_existing} />
                                                
                                                {g.age && (
                                                    <div className="flex gap-2 text-[9px] font-black text-blue-600 bg-blue-50 p-2 rounded-xl">
                                                        <span>سن: {g.age}</span> | <span>{g.province}</span> | <span>{g.gender}</span>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-2">
                                                    <input required type="tel" maxLength="11" placeholder="الهاتف (01...)" className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" value={g.phone} onChange={e => updateGuarantor(idx, 'phone', e.target.value.replace(/\D/g,''))} disabled={g.is_existing} />
                                                    <input required placeholder="القرابة" className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" value={g.relation} onChange={e => updateGuarantor(idx, 'relation', e.target.value)} />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <select className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" value={g.job_type} onChange={e => updateGuarantor(idx, 'job_type', e.target.value)} disabled={g.is_existing}>
                                                        <option value="قطاع خاص">قطاع خاص</option><option value="حكومي">حكومي</option><option value="أعمال حرة">حرة</option>
                                                    </select>
                                                    <input type="number" placeholder="الدخل (اختياري)" className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" value={g.monthly_income} onChange={e => updateGuarantor(idx, 'monthly_income', e.target.value)} disabled={g.is_existing} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </form>
                    </div>

                    {/* زر الحفظ */}
                    <div className="shrink-0 bg-white border-t p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-8 z-50">
                        <button form="main-crm-form" type="submit" disabled={!liveScore.isEligible || isLoading || formData.has_legal_issues} className={`w-full max-w-2xl mx-auto py-5 rounded-[2rem] font-black text-sm block transition-all ${liveScore.isEligible && !formData.has_legal_issues ? 'bg-slate-900 text-white shadow-xl hover:bg-slate-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                            {formData.has_legal_issues ? 'موقوف قانونياً 🚫' : (liveScore.isEligible ? `اعتماد وتسجيل (${liveScore.score}%) 🚀` : `غير مؤهل ائتمانياً (${liveScore.score}%)`)}
                        </button>
                    </div>

                </div>
            )}

            {/* نوافذ التأكيد */}
            {pendingConfirm && <ConfirmModal title="التحقق من هوية المشتري" data={{birthDate: pendingConfirm.parsed.birthDate, age: pendingConfirm.parsed.age, gender: pendingConfirm.parsed.gender, province: pendingConfirm.parsed.province}} onConfirm={() => {
                setFormData(prev => ({ ...prev, national_id: pendingConfirm.id, birth_date: pendingConfirm.parsed.birthDate, age: pendingConfirm.parsed.age, gender: pendingConfirm.parsed.gender, province: pendingConfirm.parsed.province, area: '' }));
                setPendingConfirm(null);
            }} onCancel={() => setPendingConfirm(null)} />}

            {pendingGuarantorConfirm && <ConfirmModal title={`التحقق من الضامن رقم ${pendingGuarantorConfirm.index + 1}`} data={{birthDate: pendingGuarantorConfirm.parsed.birthDate, age: pendingGuarantorConfirm.parsed.age, gender: pendingGuarantorConfirm.parsed.gender, province: pendingGuarantorConfirm.parsed.province}} onConfirm={() => {
                updateGuarantor(pendingGuarantorConfirm.index, 'national_id', pendingGuarantorConfirm.id);
                updateGuarantor(pendingGuarantorConfirm.index, 'birth_date', pendingGuarantorConfirm.parsed.birthDate);
                updateGuarantor(pendingGuarantorConfirm.index, 'age', pendingGuarantorConfirm.parsed.age);
                updateGuarantor(pendingGuarantorConfirm.index, 'gender', pendingGuarantorConfirm.parsed.gender);
                updateGuarantor(pendingGuarantorConfirm.index, 'province', pendingGuarantorConfirm.parsed.province);
                setPendingGuarantorConfirm(null);
            }} onCancel={() => setPendingGuarantorConfirm(null)} />}
        </div>
    );
};

window.CRMModule = CRMModule;
