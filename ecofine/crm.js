/**
 * 🤝 crm.js - مديول إدارة العملاء والضامنين (V11.0 Enterprise - Fully Integrated)
 * متكامل مع نظام إيكو فاين برو، ومرتبط بـ XCore، legal.js، invoices.js، installments.js
 * يوفر إدارة متقدمة للعملاء مع تحليل ائتماني لحظي، وربط بالقضايا، وإدارة الضامنين.
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
    'القاهرة': ['مدينة نصر', 'المعادي', 'مصر الجديدة', 'شبرا', 'وسط البلد', 'التجمع الخامس', 'حلوان', 'الزمالك', 'جاردن سيتي', 'المقطم', 'عين شمس', 'المرج', 'السلام', 'التبين', 'طره', 'المعصرة', '15 مايو'],
    'الإسكندرية': ['المنتزه', 'سموحة', 'ميامي', 'سيدي بشر', 'محرم بك', 'العجمي', 'السيوف', 'الشدس', 'كامب شيزار', 'لوران', 'فيكتوريا', 'سبورتنج', 'جليم', 'سان ستيفانو', 'كرموز', 'مينا البصل', 'الدخيلة', 'برج العرب'],
    'بورسعيد': ['بورسعيد', 'الزهور', 'المناخ', 'العرب', 'ضواحي بورسعيد'],
    'السويس': ['الأربعين', 'الجناين', 'السويس', 'عتاقة', 'فيصل', 'السلام', 'الصباح'],
    'دمياط': ['دمياط', 'رأس البر', 'عزبة البرج', 'كفر سعد', 'فارسكور', 'الزرقا', 'كفر البطيخ'],
    'الدقهلية': ['المنصورة', 'طلخا', 'ميت غمر', 'أجا', 'السنبلاوين', 'دكرنس', 'منية النصر', 'بلقاس', 'تمي الأمديد', 'نبروه', 'الجمالية'],
    'الشرقية': ['الزقازيق', 'بلبيس', 'فاقوس', 'أبو حماد', 'أبو كبير', 'ههيا', 'الحسينية', 'الإبراهيمية', 'منيا القمح', 'مشتول السوق', 'كفر صقر', 'أولاد صقر'],
    'القليوبية': ['بنها', 'شبرا الخيمة', 'قليوب', 'الخانكة', 'العبور', 'القناطر الخيرية', 'طوخ', 'كفر شكر'],
    'كفر الشيخ': ['كفر الشيخ', 'دسوق', 'بيلا', 'مطوبس', 'الرياض', 'الحامول', 'سيدي سالم', 'قلين', 'فوه'],
    'الغربية': ['طنطا', 'المحلة الكبرى', 'كفر الزيات', 'السنطة', 'زفتى', 'بسيون', 'قطور', 'سمنود'],
    'المنوفية': ['شبين الكوم', 'منوف', 'أشمون', 'الباجور', 'تلا', 'بركة السبع', 'قويسنا', 'الشهداء'],
    'البحيرة': ['دمنهور', 'كفر الدوار', 'رشيد', 'إدكو', 'أبو المطامير', 'الدلنجات', 'كوم حمادة', 'حوش عيسى', 'وادي النطرون', 'المحمودية', 'إيتاي البارود', 'شبراخيت', 'الرحمانية'],
    'الإسماعيلية': ['الإسماعيلية', 'فايد', 'القنطرة شرق', 'القنطرة غرب', 'التل الكبير', 'أبو صوير', 'القصاصين'],
    'الجيزة': ['الجيزة', 'الدقي', 'العجوزة', 'المهندسين', 'الهرم', 'فيصل', 'أكتوبر', 'الشيخ زايد', 'البدرشين', 'العياط', 'الصف', 'أطفيح', 'الواحات البحرية', 'منشأة القناطر', 'أوسيم', 'كرداسة', 'أبو النمرس', 'الحوامدية'],
    'بني سويف': ['بني سويف', 'الواسطى', 'ناصر', 'إهناسيا', 'ببا', 'سمسطا', 'الفشن'],
    'الفيوم': ['الفيوم', 'طامية', 'سنورس', 'إطسا', 'يوسف الصديق'],
    'المنيا': ['المنيا', 'مطاي', 'بني مزار', 'مغاغة', 'أبو قرقاص', 'ملوي', 'دير مواس', 'سمالوط', 'العدوة'],
    'أسيوط': ['أسيوط', 'ديروط', 'منفلوط', 'القوصية', 'الغنايم', 'أبنوب', 'أبو تيج', 'صدفا', 'البداري', 'ساحل سليم'],
    'سوهاج': ['سوهاج', 'أخميم', 'البلينا', 'المراغة', 'المنشأة', 'دار السلام', 'جرجا', 'جهينة', 'ساقلته', 'طهطا', 'طما'],
    'قنا': ['قنا', 'قوص', 'نقادة', 'دشنا', 'الوقف', 'فرشوط', 'أبو تشت', 'نجع حمادي'],
    'أسوان': ['أسوان', 'إدفو', 'كوم أمبو', 'نصر النوبة', 'دراو'],
    'الأقصر': ['الأقصر', 'البياضية', 'الطود', 'الزينية', 'إسنا', 'أرمنت'],
    'البحر الأحمر': ['الغردقة', 'رأس غارب', 'سفاجا', 'القصير', 'مرسى علم', 'الشلاتين', 'حلايب'],
    'الوادي الجديد': ['الخارجة', 'الداخلة', 'باريس', 'بلاط', 'الفرافرة'],
    'مطروح': ['مرسى مطروح', 'الحمام', 'العلمين', 'الضبعة', 'سيدي براني', 'السلوم', 'سيوة'],
    'شمال سيناء': ['العريش', 'الشيخ زويد', 'رفح', 'بئر العبد', 'الحسنة', 'نخل'],
    'جنوب سيناء': ['الطور', 'شرم الشيخ', 'دهب', 'نويبع', 'أبو زنيمة', 'أبو رديس', 'رأس سدر', 'سانت كاترين'],
    'خارج الجمهورية': ['خارج مصر']
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
const isValidEgyptianPhone = (phone) => /^01[0125][0-9]{8}$/.test(phone);

// ==========================================
// ✉️ التحقق من صحة البريد الإلكتروني
// ==========================================
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
// 💳 مكون عرض بطاقة العميل (للقائمة)
// ==========================================
const CustomerCard = ({ customer, onClick }) => {
    return (
        <div onClick={onClick} className="bg-white p-5 rounded-[2rem] border shadow-sm relative overflow-hidden flex flex-col justify-between text-right hover:shadow-md transition-shadow cursor-pointer">
            <div className={`absolute top-0 right-0 w-2 h-full ${customer.has_legal_issues ? 'bg-red-600' : (customer.credit_score >= 50 ? 'bg-green-500' : 'bg-amber-500')}`}></div>
            <div className="flex justify-between items-start mb-4 pr-3">
                <div className={`w-12 h-12 rounded-[1rem] flex flex-col items-center justify-center shadow-inner shrink-0 ${customer.credit_score >= 50 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    <span className="font-black text-lg leading-none">{customer.credit_score}</span>
                </div>
                <div>
                    <h4 className="font-black text-slate-800 text-sm flex items-center justify-end gap-1">
                        {customer.has_legal_issues && <span title="مطلوب في قضايا" className="text-red-500 text-lg animate-pulse">⚖️</span>}
                        {customer.full_name}
                    </h4>
                    <div className="flex flex-wrap justify-end gap-1 mt-2">
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{customer.phone}</span>
                        <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold">{customer.province}</span>
                        {customer.has_legal_issues && <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-black">مطلوب قانونياً</span>}
                        {customer.is_guarantor && <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-black">ضامن</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 📊 مكون مؤشر النقاط
// ==========================================
const ScoreIndicator = ({ score, isEligible, hasLegalIssues }) => (
    <div className={`p-4 rounded-2xl border ${hasLegalIssues ? 'bg-red-900/50 border-red-500' : 'bg-slate-800 border-slate-700'}`}>
        <div className="flex justify-between items-end mb-2">
            <span className={`text-2xl font-black leading-none ${hasLegalIssues ? 'text-red-400' : (isEligible ? 'text-green-400' : 'text-amber-400')}`}>
                {hasLegalIssues ? 'مرفوض قانونياً' : `${score}%`}
            </span>
            <span className="text-[10px] font-black text-slate-300 uppercase">مؤشر الجدارة</span>
        </div>
        {!hasLegalIssues && (
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex justify-end">
                <div className={`h-full transition-all duration-700 ease-out ${score >= 50 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${score}%` }}></div>
            </div>
        )}
    </div>
);

// ==========================================
// 📝 مكون نموذج الضامن
// ==========================================
const GuarantorForm = ({ guarantor, index, onUpdate, onRemove, customers, onBlur, disabled }) => (
    <div className={`p-4 rounded-[1.5rem] border relative text-right ${guarantor.has_legal_issues ? 'bg-red-50/50 border-red-300' : (guarantor.is_existing ? 'bg-green-50/30 border-green-200' : 'bg-slate-50/80 border-slate-200')}`}>
        <button type="button" onClick={onRemove} className="absolute top-4 left-4 w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center font-black">✕</button>
        
        <div className="flex justify-between items-center mb-3 pr-2">
            <div className="flex gap-2">
                {guarantor.is_existing && !guarantor.has_legal_issues && <span className="bg-green-100 text-green-700 text-[8px] px-2 py-1 rounded font-black">⭐ مسجل بالنظام</span>}
                {guarantor.has_legal_issues && <span className="bg-red-100 text-red-700 text-[8px] px-2 py-1 rounded font-black animate-pulse">⚖️ مطلوب قانونياً</span>}
            </div>
            <span className="text-[10px] font-black text-slate-400 block">ضامن رقم {index + 1}</span>
        </div>
        
        <div className="space-y-3">
            <input 
                type="text" 
                maxLength="14" 
                placeholder="الرقم القومي (يحدد البيانات تلقائياً)" 
                className={`w-full p-3 bg-white border rounded-xl text-xs font-black font-mono outline-none ${guarantor.has_legal_issues ? 'text-red-600' : ''}`} 
                value={guarantor.national_id} 
                onChange={e => onUpdate(index, 'national_id', e.target.value.replace(/\D/g,''))} 
                onBlur={e => onBlur(index, e.target.value)} 
                disabled={guarantor.is_existing || disabled} 
            />
            
            <input 
                required 
                placeholder="الاسم الرباعي" 
                className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" 
                value={guarantor.full_name} 
                onChange={e => onUpdate(index, 'full_name', e.target.value)} 
                disabled={guarantor.is_existing || disabled} 
            />
            
            {guarantor.age && (
                <div className="flex gap-2 text-[9px] font-black text-blue-600 bg-blue-50 p-2 rounded-xl">
                    <span>سن: {guarantor.age}</span> | <span>{guarantor.province}</span> | <span>{guarantor.gender}</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <input 
                    required 
                    type="tel" 
                    maxLength="11" 
                    placeholder="الهاتف (01...)" 
                    className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" 
                    value={guarantor.phone} 
                    onChange={e => onUpdate(index, 'phone', e.target.value.replace(/\D/g,''))} 
                    disabled={guarantor.is_existing || disabled} 
                />
                <input 
                    required 
                    placeholder="القرابة" 
                    className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" 
                    value={guarantor.relation} 
                    onChange={e => onUpdate(index, 'relation', e.target.value)} 
                    disabled={disabled} 
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <select 
                    className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" 
                    value={guarantor.job_type} 
                    onChange={e => onUpdate(index, 'job_type', e.target.value)} 
                    disabled={guarantor.is_existing || disabled}
                >
                    <option value="قطاع خاص">قطاع خاص</option>
                    <option value="حكومي">حكومي</option>
                    <option value="أعمال حرة">أعمال حرة</option>
                    <option value="معاش">معاش</option>
                </select>
                <input 
                    type="number" 
                    placeholder="الدخل الشهري" 
                    className="w-full p-3 bg-white border rounded-xl text-xs font-black outline-none" 
                    value={guarantor.monthly_income} 
                    onChange={e => onUpdate(index, 'monthly_income', e.target.value)} 
                    disabled={guarantor.is_existing || disabled} 
                />
            </div>
        </div>
    </div>
);

// ==========================================
// 🏢 الموديول الرئيسي
// ==========================================
const CRMModule = ({ currentUser }) => {
    // -------------------- الحالات --------------------
    const [customers, setCustomers] = useState([]);
    const [legalCases, setLegalCases] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null); // للتحرير

    // الحالة الأولية للنموذج
    const initialFormState = {
        full_name: '', 
        national_id: '', 
        phone: '', 
        whatsapp: '',
        email: '',
        province: '', 
        area: '', 
        address_details: '',
        job: '', 
        job_type: 'قطاع خاص', 
        income_verified: false,
        marital_status: 'متزوج', 
        monthly_income: '', 
        housing_type: 'إيجار جديد',
        birth_date: '', 
        age: '', 
        gender: '', 
        guarantors: [], 
        credit_score: 0,
        has_legal_issues: false,
        cases_count: 0,
        employer_address: '',
        bank_name: '',
        bank_account: '',
        iban: '',
        notes: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [pendingConfirm, setPendingConfirm] = useState(null);
    const [pendingGuarantorConfirm, setPendingGuarantorConfirm] = useState(null);

    // -------------------- الإشعارات --------------------
    const showNotification = useCallback((type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4500);
    }, []);

    // -------------------- تحميل البيانات --------------------
    const loadCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
            // تحميل العملاء والقضايا معاً
            const [custData, casesData] = await Promise.all([
                window.db.getAll('customers').catch(() => []),
                window.db.getAll('legal_cases').catch(() => [])
            ]);

            // بناء lookup سريع للقضايا
            const casesByCustomer = new Map();
            const casesByGuarantor = new Map();

            casesData.forEach(c => {
                // العميل الرئيسي
                if (c.customer_id) {
                    if (!casesByCustomer.has(c.customer_id)) casesByCustomer.set(c.customer_id, []);
                    casesByCustomer.get(c.customer_id).push(c);
                }
                // الضامنون
                if (c.guarantor_ids && Array.isArray(c.guarantor_ids)) {
                    c.guarantor_ids.forEach(gid => {
                        if (!casesByGuarantor.has(gid)) casesByGuarantor.set(gid, []);
                        casesByGuarantor.get(gid).push(c);
                    });
                }
            });

            // تحسين بيانات العملاء
            const enhancedData = (custData || []).map(c => {
                const asMain = casesByCustomer.get(c.id) || [];
                const asGuarantor = casesByGuarantor.get(c.id) || [];
                const allCases = [...asMain, ...asGuarantor];
                const hasOpenCases = allCases.some(cs => cs.status !== 'closed' && cs.status !== 'judged'); // حسب التعريف
                return {
                    ...c,
                    has_legal_issues: hasOpenCases,
                    cases_count: allCases.length,
                    is_guarantor: asGuarantor.length > 0
                };
            });

            setCustomers(enhancedData);
            setLegalCases(casesData);
        } catch (error) {
            console.error(error);
            showNotification('error', '❌ فشل في تحميل قاعدة البيانات');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    // -------------------- محرك التقييم الائتماني (باستخدام XCore إذا وجد) --------------------
    const calculateCreditScore = useCallback((data) => {
        // استخدام XCore إذا كان متاحاً
        if (window.XCore && typeof window.XCore.calculateCustomerScore === 'function') {
            try {
                const result = window.XCore.calculateCustomerScore(data);
                return { score: result.score, isEligible: result.isEligible };
            } catch (e) {
                console.warn('XCore score calculation failed, using fallback', e);
            }
        }

        // خوارزمية احتياطية
        let tempScore = 0;
        
        // وزن المشتري
        if (data.full_name.trim().length > 8) tempScore += 5;
        if (/^\d{14}$/.test(data.national_id)) tempScore += 10;
        if (isValidEgyptianPhone(data.phone)) tempScore += 5;
        if (data.housing_type === 'تمليك') tempScore += 10;
        else if (data.housing_type === 'إيجار قديم') tempScore += 5;
        
        if (data.job.length > 3) tempScore += 5;
        if (data.job_type === 'حكومي') tempScore += 15;
        else if (data.job_type === 'أعمال حرة') tempScore += 5;
        else tempScore += 10;

        if (Number(data.monthly_income) > 3000) tempScore += 5;
        if (data.income_verified) tempScore += 10;

        // وزن الضامنين
        data.guarantors.forEach(g => {
            if (/^\d{14}$/.test(g.national_id)) {
                let gScore = 5;
                if (g.is_existing && g.credit_score >= 50) gScore += 10;
                if (g.job_type === 'حكومي') gScore += 5;
                if (Number(g.monthly_income) > 3000) gScore += 5;
                if (g.has_legal_issues) gScore -= 30; // خصم أقل من السابق
                tempScore += gScore;
            }
        });

        // خصم لو المشتري عليه قضية
        if (data.has_legal_issues) tempScore -= 50;

        const finalScore = Math.max(0, Math.min(tempScore, 100));
        return { score: finalScore, isEligible: finalScore >= 50 && !data.has_legal_issues };
    }, []);

    const liveScore = useMemo(() => calculateCreditScore(formData), [formData, calculateCreditScore]);

    // -------------------- معالجة الرقم القومي للمشتري --------------------
    const handleNationalIdBlur = async (val) => {
        if (!/^\d{14}$/.test(val)) return;

        const parsed = parseNationalId(val);
        if (!parsed) {
            showNotification('error', '❌ الرقم القومي غير صالح.');
            return;
        }

        // تحقق السن
        if (parsed.age < 21 || parsed.age > 65) {
            setFormData(prev => ({ ...prev, national_id: '' }));
            showNotification('error', `🚫 السن القانوني مرفوض! (${parsed.age} سنة). يجب أن يكون بين 21 و 65.`);
            return;
        }

        // تحقق من وجود العميل مسبقاً
        const existing = customers.find(c => c.national_id === val);
        if (existing) {
            // إذا كنا في وضع الإضافة، لا نسمح بتكرار الرقم القومي
            if (!editingCustomer || editingCustomer.national_id !== val) {
                setFormData(prev => ({ ...prev, national_id: '' }));
                showNotification('error', `⚠️ الرقم القومي مسجل مسبقاً للعميل: ${existing.full_name}`);
                return;
            }
        }

        // تحقق قانوني استباقي
        if (existing && existing.has_legal_issues) {
            setFormData(prev => ({ ...prev, has_legal_issues: true }));
            showNotification('error', '🚨 تحذير أمني: هذا العميل مطلوب في قضايا مسجلة بالنظام!');
        }

        // إذا لم تكن بيانات الميلاد موجودة أو مختلفة، نطلب التأكيد
        if (!formData.birth_date || formData.birth_date !== parsed.birthDate) {
            setPendingConfirm({ id: val, parsed });
        } else {
            // تحديث مباشر
            setFormData(prev => ({
                ...prev,
                birth_date: parsed.birthDate,
                age: parsed.age,
                gender: parsed.gender,
                province: parsed.province,
                area: ''
            }));
        }
    };

    // -------------------- معالجة الضامنين --------------------
    const addGuarantor = () => {
        if (formData.guarantors.length >= 3) {
            showNotification('error', '⚠️ الحد الأقصى 3 ضامنين.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            guarantors: [...prev.guarantors, {
                full_name: '', national_id: '', phone: '', relation: '',
                birth_date: '', age: '', gender: '', province: '',
                job: '', job_type: 'قطاع خاص', monthly_income: '',
                is_existing: false, credit_score: 0, has_legal_issues: false
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

        // منع تكرار الضامن مع المشتري
        if (val === formData.national_id) {
            updateGuarantor(index, 'national_id', '');
            showNotification('error', '🚫 لا يمكن للمشتري أن يضمن نفسه!');
            return;
        }

        // منع تكرار الضامن في نفس القائمة
        const duplicate = formData.guarantors.find((g, i) => i !== index && g.national_id === val);
        if (duplicate) {
            updateGuarantor(index, 'national_id', '');
            showNotification('error', '⚠️ هذا الضامن مضاف بالفعل في نفس الفاتورة!');
            return;
        }

        const parsed = parseNationalId(val);
        if (!parsed) {
            showNotification('error', '❌ الرقم القومي للضامن غير صالح.');
            return;
        }

        if (parsed.age < 21 || parsed.age > 65) {
            updateGuarantor(index, 'national_id', '');
            showNotification('error', `🚫 سن الضامن مرفوض (${parsed.age} سنة). يجب أن يكون بين 21 و 65.`);
            return;
        }

        // البحث عن الضامن في العملاء المسجلين
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
                full_name: existingCust.full_name,
                national_id: val,
                phone: existingCust.phone,
                birth_date: parsed.birthDate,
                age: parsed.age,
                gender: parsed.gender,
                province: parsed.province,
                job: existingCust.job || '',
                job_type: existingCust.job_type || 'قطاع خاص',
                monthly_income: existingCust.monthly_income || '',
                is_existing: true,
                credit_score: existingCust.credit_score || 50,
                has_legal_issues: existingCust.has_legal_issues || false
            };
            setFormData({ ...formData, guarantors: updated });
            return;
        }

        // ضامن جديد، نعرض نافذة التأكيد
        setPendingGuarantorConfirm({ index, id: val, parsed });
    };

    // -------------------- حفظ الضامنين الجدد كعملاء --------------------
    const saveNewGuarantors = async (customerId) => {
        const guarantorPromises = formData.guarantors
            .filter(g => !g.is_existing && g.national_id && g.full_name)
            .map(async (g) => {
                const newGuarantor = {
                    full_name: g.full_name,
                    national_id: g.national_id,
                    phone: g.phone,
                    whatsapp: g.whatsapp || '',
                    email: '',
                    province: g.province,
                    area: '',
                    address_details: '',
                    job: g.job,
                    job_type: g.job_type,
                    monthly_income: g.monthly_income || 0,
                    income_verified: false,
                    marital_status: 'أعزب',
                    housing_type: 'إيجار',
                    birth_date: g.birth_date,
                    age: g.age,
                    gender: g.gender,
                    credit_score: 50, // تقديري
                    status: 'active',
                    has_legal_issues: g.has_legal_issues,
                    is_guarantor: true,
                    guarantor_for: [customerId], // يضمن هذا العميل
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                return await window.db.add('customers', newGuarantor);
            });
        const results = await Promise.all(guarantorPromises);
        return results.map(res => res.id); // معرفات الضامنين الجدد
    };

    // -------------------- حفظ العميل الرئيسي --------------------
    const handleSave = async (e) => {
        e.preventDefault();

        // التحقق من صحة الهاتف
        if (!isValidEgyptianPhone(formData.phone)) {
            showNotification('error', '❌ رقم هاتف المشتري غير صحيح. تأكد أنه 11 رقماً ويبدأ بـ 01.');
            return;
        }

        // التحقق من البريد الإلكتروني إذا تم إدخاله
        if (formData.email && !isValidEmail(formData.email)) {
            showNotification('error', '❌ البريد الإلكتروني غير صحيح.');
            return;
        }

        // التحقق من صحة هواتف الضامنين
        const invalidGPhone = formData.guarantors.find(g => g.phone && !isValidEgyptianPhone(g.phone));
        if (invalidGPhone) {
            showNotification('error', `❌ رقم هاتف الضامن (${invalidGPhone.full_name || 'بدون اسم'}) غير صحيح.`);
            return;
        }

        // التحقق من الأهلية الائتمانية
        if (!liveScore.isEligible) {
            showNotification('error', `🚫 السكور ${liveScore.score}% غير كافٍ للاعتماد أو يوجد مانع قانوني.`);
            return;
        }

        // التحقق من اكتمال بيانات الضامنين
        const incompleteG = formData.guarantors.find(g => !g.age || g.full_name.trim() === '' || !g.phone);
        if (incompleteG) {
            showNotification('error', '⚠️ يرجى إكمال بيانات جميع الضامنين أو حذف الخانات الفارغة.');
            return;
        }

        setIsLoading(true);
        try {
            let guarantorIds = [];

            // 1. حفظ الضامنين الجدد أولاً
            if (formData.guarantors.length > 0) {
                guarantorIds = await saveNewGuarantors('temp'); // سنعرف معرف العميل بعد حفظه
            }

            // 2. تجهيز بيانات العميل
            const customerToSave = {
                ...formData,
                credit_score: liveScore.score,
                status: 'active',
                guarantor_ids: guarantorIds, // معرفات الضامنين الجدد + معرفات الضامنين الموجودين (الذين is_existing)
                updated_at: new Date().toISOString()
            };

            // إذا كان التحرير، نقوم بالتحديث، وإلا إضافة
            if (editingCustomer) {
                await window.db.update('customers', editingCustomer.id, customerToSave);
                showNotification('success', '✅ تم تحديث بيانات العميل بنجاح');
            } else {
                customerToSave.created_at = new Date().toISOString();
                const newCustomer = await window.db.add('customers', customerToSave);
                // تحديث حقل guarantor_for للضامنين الموجودين (الذين is_existing) ليشمل معرف العميل الجديد
                const existingGuarantors = formData.guarantors.filter(g => g.is_existing);
                for (let g of existingGuarantors) {
                    const guarantor = customers.find(c => c.national_id === g.national_id);
                    if (guarantor) {
                        const guarantorFor = guarantor.guarantor_for || [];
                        if (!guarantorFor.includes(newCustomer.id)) {
                            guarantorFor.push(newCustomer.id);
                            await window.db.update('customers', guarantor.id, { guarantor_for: guarantorFor });
                        }
                    }
                }
                showNotification('success', '✅ تم تسجيل العميل واعتماده بنجاح');
            }

            // إعادة تحميل البيانات وإغلاق النموذج
            await loadCustomers();
            setIsModalOpen(false);
            setEditingCustomer(null);
            setFormData(initialFormState);
        } catch (err) {
            console.error(err);
            showNotification('error', '❌ فشل في حفظ البيانات.');
        } finally {
            setIsLoading(false);
        }
    };

    // -------------------- فتح نموذج الإضافة/التحرير --------------------
    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const openEditModal = (customer) => {
        // تحويل الضامنين من guarantor_ids إلى مصفوفة guarantors بالتنسيق المطلوب
        const guarantors = (customer.guarantor_ids || []).map(gid => {
            const g = customers.find(c => c.id === gid);
            return g ? {
                full_name: g.full_name,
                national_id: g.national_id,
                phone: g.phone,
                relation: '', // نحتاج لتخزين العلاقة في مكان ما، قد نضيفها لاحقاً
                birth_date: g.birth_date,
                age: g.age,
                gender: g.gender,
                province: g.province,
                job: g.job,
                job_type: g.job_type,
                monthly_income: g.monthly_income,
                is_existing: true,
                credit_score: g.credit_score,
                has_legal_issues: g.has_legal_issues
            } : null;
        }).filter(Boolean);

        setEditingCustomer(customer);
        setFormData({
            ...customer,
            guarantors: guarantors
        });
        setIsModalOpen(true);
    };

    // -------------------- تصفية العملاء للعرض --------------------
    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.full_name?.toLowerCase().includes(term) ||
            c.phone?.includes(term) ||
            c.national_id?.includes(term) ||
            c.email?.toLowerCase().includes(term)
        );
    }, [customers, searchTerm]);

    // -------------------- التصميم والعرض --------------------
    return (
        <div className="space-y-6 pb-24 animate-in fade-in relative">
            {/* الإشعارات */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-[2rem] shadow-2xl text-white font-black text-xs transition-all duration-300 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.message}
                </div>
            )}

            {/* شريط البحث والإجراءات */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-[2rem] shadow-sm border mx-2 mt-2">
                <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-[1.5rem] px-4">
                    <span className="text-xl">🔍</span>
                    <input
                        type="text"
                        placeholder="ابحث بالاسم، الهاتف، الرقم القومي، أو البريد..."
                        className="w-full p-4 bg-transparent text-xs font-bold outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="text-lg">➕</span> إضافة عميل جديد
                </button>
            </div>

            {/* قائمة العملاء */}
            {isLoading && customers.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                    {filteredCustomers.map(c => (
                        <CustomerCard key={c.id} customer={c} onClick={() => openEditModal(c)} />
                    ))}
                    {filteredCustomers.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                            <span className="text-6xl mb-4 opacity-50">👥</span>
                            <p className="text-slate-500 font-black text-sm uppercase">لا يوجد عملاء</p>
                            <p className="text-slate-400 font-bold text-[10px] mt-2">يمكنك إضافة عميل جديد بالضغط على الزر</p>
                        </div>
                    )}
                </div>
            )}

            {/* 📱 نافذة إضافة/تعديل العميل */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[500] bg-slate-50 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    {/* هيدر التقييم */}
                    <div className="shrink-0 bg-slate-900 text-white p-5 rounded-b-[2rem] shadow-xl z-50 text-right">
                        <div className="flex justify-between items-start mb-4">
                            <button
                                type="button"
                                onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }}
                                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg active:scale-95 hover:bg-white/20"
                            >
                                ✕
                            </button>
                            <div>
                                <h3 className="font-black text-lg">
                                    {editingCustomer ? 'تعديل بيانات العميل' : 'ملف استعلام الائتمان'}
                                </h3>
                                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">
                                    {editingCustomer ? 'تحديث المعلومات' : 'X-Core Data Miner'}
                                </p>
                            </div>
                        </div>
                        <ScoreIndicator
                            score={liveScore.score}
                            isEligible={liveScore.isEligible}
                            hasLegalIssues={formData.has_legal_issues}
                        />
                    </div>

                    {/* جسم النموذج */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full">
                        <form id="crm-form" onSubmit={handleSave} className="p-4 space-y-4 pb-10 max-w-2xl mx-auto text-right">
                            {/* الهوية الأساسية */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">1. الهوية الأساسية</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الاسم الرباعي *</label>
                                        <input
                                            required
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none focus:border-blue-500"
                                            value={formData.full_name}
                                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الرقم القومي * (يحدد السن والمحافظة تلقائياً)</label>
                                        <input
                                            required
                                            type="text"
                                            maxLength="14"
                                            className={`w-full p-4 border rounded-2xl text-xs font-black tracking-widest outline-none focus:border-blue-500 ${formData.has_legal_issues ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-50'}`}
                                            value={formData.national_id}
                                            onChange={e => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '') })}
                                            onBlur={e => handleNationalIdBlur(e.target.value)}
                                        />
                                    </div>

                                    {formData.age && (
                                        <div className="col-span-2 grid grid-cols-3 gap-2 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                            <div className="text-center border-l border-blue-100"><span className="block text-[8px] font-black text-blue-400">السن</span><span className="text-xs font-black text-blue-900">{formData.age} عام</span></div>
                                            <div className="text-center border-l border-blue-100"><span className="block text-[8px] font-black text-blue-400">المحافظة</span><span className="text-xs font-black text-blue-900">{formData.province}</span></div>
                                            <div className="text-center"><span className="block text-[8px] font-black text-blue-400">النوع</span><span className="text-xs font-black text-blue-900">{formData.gender}</span></div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الهاتف (11 رقم) *</label>
                                        <input
                                            required
                                            type="tel"
                                            maxLength="11"
                                            placeholder="01..."
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الواتساب</label>
                                        <input
                                            type="tel"
                                            maxLength="11"
                                            placeholder="01..."
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.whatsapp}
                                            onChange={e => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">البريد الإلكتروني</label>
                                        <input
                                            type="email"
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* العنوان والسكن */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">2. العنوان الاستدلالي</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 flex gap-2 bg-slate-50 p-1.5 rounded-[1.5rem]">
                                        {['إيجار جديد', 'إيجار قديم', 'تمليك'].map(t => (
                                            <button
                                                type="button"
                                                key={t}
                                                onClick={() => setFormData({ ...formData, housing_type: t })}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black ${formData.housing_type === t ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">المنطقة / المركز *</label>
                                        {areasMap[formData.province] ? (
                                            <select
                                                required
                                                className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none appearance-none"
                                                value={formData.area}
                                                onChange={e => setFormData({ ...formData, area: e.target.value })}
                                            >
                                                <option value="">-- اختر المنطقة --</option>
                                                {areasMap[formData.province].map(a => <option key={a} value={a}>{a}</option>)}
                                                <option value="أخرى">منطقة أخرى...</option>
                                            </select>
                                        ) : (
                                            <input
                                                required
                                                placeholder="اكتب المنطقة..."
                                                className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                                value={formData.area}
                                                onChange={e => setFormData({ ...formData, area: e.target.value })}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">المدينة/القرية</label>
                                        <input
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.city || ''}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">العنوان بالتفصيل *</label>
                                        <input
                                            required
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.address_details}
                                            onChange={e => setFormData({ ...formData, address_details: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* العمل والدخل */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">3. العمل والدخل</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">جهة العمل *</label>
                                        <input
                                            required
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.job}
                                            onChange={e => setFormData({ ...formData, job: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">عنوان العمل</label>
                                        <input
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.employer_address || ''}
                                            onChange={e => setFormData({ ...formData, employer_address: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 flex gap-2 bg-slate-50 p-1.5 rounded-[1.5rem]">
                                        {['قطاع خاص', 'حكومي', 'أعمال حرة', 'معاش'].map(t => (
                                            <button
                                                type="button"
                                                key={t}
                                                onClick={() => setFormData({ ...formData, job_type: t })}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black ${formData.job_type === t ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الدخل الشهري *</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none text-blue-700"
                                            value={formData.monthly_income}
                                            onChange={e => setFormData({ ...formData, monthly_income: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="income_verified"
                                            className="w-5 h-5"
                                            checked={formData.income_verified}
                                            onChange={e => setFormData({ ...formData, income_verified: e.target.checked })}
                                        />
                                        <label htmlFor="income_verified" className="text-xs font-black text-slate-600">تم التحقق من الدخل (مستندات)</label>
                                    </div>
                                </div>
                            </section>

                            {/* الضامنون */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <button
                                        type="button"
                                        onClick={addGuarantor}
                                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md"
                                    >
                                        + إضافة ضامن
                                    </button>
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        4. بيانات الضامنين ({formData.guarantors.length}/3)
                                    </h5>
                                </div>
                                <div className="space-y-4">
                                    {formData.guarantors.map((g, idx) => (
                                        <GuarantorForm
                                            key={idx}
                                            guarantor={g}
                                            index={idx}
                                            onUpdate={updateGuarantor}
                                            onRemove={() => removeGuarantor(idx)}
                                            customers={customers}
                                            onBlur={handleGuarantorBlur}
                                            disabled={false}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* معلومات مصرفية */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">5. المعلومات المصرفية (اختياري)</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">اسم البنك</label>
                                        <input
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.bank_name || ''}
                                            onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">رقم الحساب</label>
                                        <input
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.bank_account || ''}
                                            onChange={e => setFormData({ ...formData, bank_account: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">IBAN</label>
                                        <input
                                            className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                            value={formData.iban || ''}
                                            onChange={e => setFormData({ ...formData, iban: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* ملاحظات */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">6. ملاحظات</h5>
                                <textarea
                                    rows="3"
                                    className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-black outline-none"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                ></textarea>
                            </section>
                        </form>
                    </div>

                    {/* زر الحفظ */}
                    <div className="shrink-0 bg-white border-t p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-8 z-50">
                        <button
                            form="crm-form"
                            type="submit"
                            disabled={!liveScore.isEligible || isLoading || formData.has_legal_issues}
                            className={`w-full max-w-2xl mx-auto py-5 rounded-[2rem] font-black text-sm block transition-all ${
                                liveScore.isEligible && !formData.has_legal_issues
                                    ? 'bg-slate-900 text-white shadow-xl hover:bg-slate-800'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> جاري الحفظ...
                                </span>
                            ) : formData.has_legal_issues ? (
                                'موقوف قانونياً 🚫'
                            ) : liveScore.isEligible ? (
                                `اعتماد وتسجيل (${liveScore.score}%) 🚀`
                            ) : (
                                `غير مؤهل ائتمانياً (${liveScore.score}%)`
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* نوافذ التأكيد */}
            {pendingConfirm && (
                <ConfirmModal
                    title="التحقق من هوية المشتري"
                    data={{
                        birthDate: pendingConfirm.parsed.birthDate,
                        age: pendingConfirm.parsed.age,
                        gender: pendingConfirm.parsed.gender,
                        province: pendingConfirm.parsed.province
                    }}
                    onConfirm={() => {
                        setFormData(prev => ({
                            ...prev,
                            national_id: pendingConfirm.id,
                            birth_date: pendingConfirm.parsed.birthDate,
                            age: pendingConfirm.parsed.age,
                            gender: pendingConfirm.parsed.gender,
                            province: pendingConfirm.parsed.province,
                            area: ''
                        }));
                        setPendingConfirm(null);
                    }}
                    onCancel={() => setPendingConfirm(null)}
                />
            )}

            {pendingGuarantorConfirm && (
                <ConfirmModal
                    title={`التحقق من الضامن رقم ${pendingGuarantorConfirm.index + 1}`}
                    data={{
                        birthDate: pendingGuarantorConfirm.parsed.birthDate,
                        age: pendingGuarantorConfirm.parsed.age,
                        gender: pendingGuarantorConfirm.parsed.gender,
                        province: pendingGuarantorConfirm.parsed.province
                    }}
                    onConfirm={() => {
                        updateGuarantor(pendingGuarantorConfirm.index, 'national_id', pendingGuarantorConfirm.id);
                        updateGuarantor(pendingGuarantorConfirm.index, 'birth_date', pendingGuarantorConfirm.parsed.birthDate);
                        updateGuarantor(pendingGuarantorConfirm.index, 'age', pendingGuarantorConfirm.parsed.age);
                        updateGuarantor(pendingGuarantorConfirm.index, 'gender', pendingGuarantorConfirm.parsed.gender);
                        updateGuarantor(pendingGuarantorConfirm.index, 'province', pendingGuarantorConfirm.parsed.province);
                        setPendingGuarantorConfirm(null);
                    }}
                    onCancel={() => setPendingGuarantorConfirm(null)}
                />
            )}
        </div>
    );
};

window.CRMModule = CRMModule;
