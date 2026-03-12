/**
 * survey.js - مديول الاستعلام الميداني الذكي (V10.1 Platinum)
 * متكامل مع نظام إيكو فاين برو، CRM، XCore، والموقع الجغرافي الدقيق
 * تم إصلاح توافق React Hooks، روابط الخرائط، وتوافق الضامنين.
 */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const SurveyModule = ({ currentUser }) => {
    // =========================== الحالات ===========================
    const [customers, setCustomers] = useState([]);
    const [surveys, setSurveys] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [location, setLocation] = useState({
        lat: null,
        lng: null,
        accuracy: null,
        address: ''
    });
    const [locationLoading, setLocationLoading] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [signature, setSignature] = useState(null);
    const [criteriaScores, setCriteriaScores] = useState({
        housing_quality: 5,
        neighborhood: 5,
        cleanliness: 5,
        stability: 5,
        guarantor_presence: 5,
    });

    // نموذج البيانات
    const [formData, setFormData] = useState({
        customer_id: '',
        guarantor_id: '',
        visit_type: 'منزل',
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: new Date().toTimeString().slice(0,5),
        status: 'pending', // pending, approved, rejected
        recommendation: 'pending', // recommend, reject, pending
        notes: '',
        surveyor_name: currentUser?.name || 'إكس',
        surveyor_id: currentUser?.id || null,
        latitude: null,
        longitude: null,
        accuracy: null,
        address: '',
        photos: [],
        signature: null,
        criteria_scores: criteriaScores,
    });

    // تحديث معايير التقييم في formData تلقائياً (تم نقلها خارج الـ JSX)
    useEffect(() => {
        setFormData(prev => ({ ...prev, criteria_scores: criteriaScores }));
    }, [criteriaScores]);

    // =========================== الإشعارات ===========================
    const showNotification = useCallback((type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    // =========================== تحميل البيانات ===========================
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [cust, surv] = await Promise.all([
                window.db.getAll('customers').catch(() => []),
                window.db.getAll('surveys').catch(() => [])
            ]);
            setCustomers(cust || []);
            setSurveys(surv || []);
        } catch (error) {
            showNotification('error', '❌ فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => { loadData(); }, [loadData]);

    // =========================== الحصول على الموقع الجغرافي ===========================
    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            showNotification('error', '❌ المتصفح لا يدعم تحديد الموقع');
            return;
        }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                setLocation({ lat: latitude, lng: longitude, accuracy, address: '' });
                setFormData(prev => ({ ...prev, latitude, longitude, accuracy }));
                
                // عكس الإحداثيات للحصول على العنوان
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`
                    );
                    const data = await response.json();
                    const address = data.display_name || '';
                    setLocation(prev => ({ ...prev, address }));
                    setFormData(prev => ({ ...prev, address }));
                } catch (err) {
                    console.warn('فشل الحصول على العنوان', err);
                }
                setLocationLoading(false);
            },
            (err) => {
                showNotification('error', `❌ فشل تحديد الموقع: ${err.message}`);
                setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [showNotification]);

    // =========================== التقاط الصور والتوقيع ===========================
    const capturePhoto = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.capture = 'environment';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                setPhotos(prev => [...prev, url]);
                setFormData(prev => ({ ...prev, photos: [...prev.photos, url] }));
            }
        };
        fileInput.click();
    };

    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    };

    const captureSignature = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                setSignature(url);
                setFormData(prev => ({ ...prev, signature: url }));
            }
        };
        input.click();
    };

    // =========================== اختيار العميل وتحميل الضامنين ===========================
    const handleCustomerChange = (custId) => {
        const cust = customers.find(c => c.id === custId);
        setSelectedCustomer(cust);
        setFormData(prev => ({ ...prev, customer_id: custId, guarantor_id: '' }));
    };

    // الضامنون المرتبطون بالعميل (دعم التوافق مع crm.js)
    const customerGuarantors = useMemo(() => {
        if (!selectedCustomer) return [];
        // إذا كان النظام القديم يستخدم guarantor_ids
        if (selectedCustomer.guarantor_ids) {
            return customers.filter(c => selectedCustomer.guarantor_ids.includes(c.id));
        }
        // إذا كان من crm.js الحديث الذي يدمج الضامنين في المصفوفة
        if (selectedCustomer.guarantors) {
            return selectedCustomer.guarantors.map((g, idx) => ({
                id: g.national_id || `g_${idx}`, 
                full_name: g.full_name
            }));
        }
        return [];
    }, [selectedCustomer, customers]);

    // =========================== حساب التقييم باستخدام XCore ===========================
    const calculateScoreFromSurvey = useCallback(async (surveyData) => {
        if (window.XCore && typeof window.XCore.evaluateSurvey === 'function') {
            try {
                const result = await window.XCore.evaluateSurvey(surveyData);
                return result;
            } catch (e) {
                console.warn('XCore evaluateSurvey failed', e);
            }
        }

        const scores = surveyData.criteria_scores || criteriaScores;
        const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
        const percent = (avg / 10) * 100;
        return {
            score: Math.round(percent),
            recommendation: percent >= 70 ? 'recommend' : (percent >= 50 ? 'pending' : 'reject')
        };
    }, [criteriaScores]);

    // =========================== حفظ الاستعلام ===========================
    const handleSaveSurvey = async (e) => {
        e.preventDefault();

        if (!formData.customer_id) {
            showNotification('error', '⚠️ يرجى اختيار العميل');
            return;
        }
        if (!formData.latitude || !formData.longitude) {
            showNotification('error', '⚠️ يرجى تحديد الموقع الجغرافي');
            return;
        }

        setLoading(true);
        try {
            const evaluation = await calculateScoreFromSurvey(formData);
            const finalRecommendation = formData.recommendation === 'pending' ? evaluation.recommendation : formData.recommendation;
            const finalScore = evaluation.score;

            const surveyRecord = {
                ...formData,
                recommendation: finalRecommendation,
                calculated_score: finalScore,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const saved = await window.db.add('surveys', surveyRecord);

            if (finalRecommendation !== 'pending') {
                const customer = customers.find(c => c.id === formData.customer_id);
                if (customer) {
                    let newScore = customer.credit_score || 50;
                    if (finalRecommendation === 'recommend') {
                        newScore = Math.min(100, newScore + 15);
                    } else if (finalRecommendation === 'reject') {
                        newScore = Math.max(0, newScore - 30);
                    }
                    await window.db.update('customers', formData.customer_id, {
                        credit_score: newScore,
                        last_survey_id: saved.id,
                        updated_at: new Date().toISOString()
                    });
                }
            }

            showNotification('success', '✅ تم تسجيل الاستعلام بنجاح');
            setIsModalOpen(false);
            resetForm();
            loadData();
        } catch (err) {
            console.error(err);
            showNotification('error', '❌ فشل في حفظ الاستعلام');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            customer_id: '',
            guarantor_id: '',
            visit_type: 'منزل',
            visit_date: new Date().toISOString().split('T')[0],
            visit_time: new Date().toTimeString().slice(0,5),
            status: 'pending',
            recommendation: 'pending',
            notes: '',
            surveyor_name: currentUser?.name || 'إكس',
            surveyor_id: currentUser?.id || null,
            latitude: null,
            longitude: null,
            accuracy: null,
            address: '',
            photos: [],
            signature: null,
            criteria_scores: {
                housing_quality: 5, neighborhood: 5, cleanliness: 5,
                stability: 5, guarantor_presence: 5,
            },
        });
        setCriteriaScores({
            housing_quality: 5, neighborhood: 5, cleanliness: 5,
            stability: 5, guarantor_presence: 5,
        });
        setLocation({ lat: null, lng: null, accuracy: null, address: '' });
        setPhotos([]);
        setSignature(null);
        setSelectedCustomer(null);
    };

    // =========================== عرض القائمة ===========================
    const getCustomerName = (id) => {
        const cust = customers.find(c => c.id === id);
        if (cust) return cust.full_name;
        // البحث في الضامنين المدمجين
        for (const c of customers) {
            if (c.guarantors) {
                const g = c.guarantors.find(g => g.national_id === id || `g_${c.guarantors.indexOf(g)}` === id);
                if (g) return g.full_name;
            }
        }
        return 'غير معروف';
    };

    const getSurveyStatusColor = (rec) => {
        if (rec === 'recommend') return 'bg-green-100 text-green-700 border-green-200';
        if (rec === 'reject') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in relative">
            {/* الإشعارات */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] px-8 py-4 rounded-[2rem] shadow-2xl text-white font-black text-xs md:text-sm transition-all duration-300 flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-600 shadow-green-600/30' : 'bg-red-600 shadow-red-600/30'}`}>
                    <span>{notification.type === 'success' ? '✅' : '❌'}</span>
                    {notification.message}
                </div>
            )}

            {/* الهيدر */}
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mx-2 mt-2">
                <div>
                    <h3 className="font-black text-slate-800 text-xl">الاستعلام الميداني الذكي</h3>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">تقييم العملاء والضامنين بالموقع الجغرافي</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-gradient-to-l from-slate-900 to-slate-800 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:from-slate-800 hover:to-slate-700 transition-all"
                >
                    <span className="text-xl">📍</span> استعلام ميداني جديد
                </button>
            </div>

            {/* قائمة الاستعلامات */}
            {loading && surveys.length === 0 ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                    {surveys.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(s => (
                        <div key={s.id} className="bg-white p-5 rounded-[2rem] border shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${s.recommendation === 'recommend' ? 'bg-green-500' : s.recommendation === 'reject' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-black text-slate-800">{getCustomerName(s.customer_id)}</h4>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">{s.visit_date} {s.visit_time}</p>
                                </div>
                                <span className={`text-[8px] font-black px-3 py-1 rounded-full border ${getSurveyStatusColor(s.recommendation)}`}>
                                    {s.recommendation === 'recommend' ? 'موصى به' : s.recommendation === 'reject' ? 'مرفوض' : 'معلق'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div>
                                    <span className="text-slate-400">المعاينة</span>
                                    <p className="font-bold">{s.visit_type}</p>
                                </div>
                                {s.guarantor_id && (
                                    <div>
                                        <span className="text-slate-400">الضامن</span>
                                        <p className="font-bold truncate">{getCustomerName(s.guarantor_id)}</p>
                                    </div>
                                )}
                            </div>

                            {s.address && (
                                <div className="mb-3 text-[9px] bg-slate-50 p-2 rounded-xl truncate" title={s.address}>
                                    <span className="text-slate-400 ml-1">📍</span> {s.address}
                                </div>
                            )}

                            {s.notes && (
                                <div className="bg-slate-50 p-3 rounded-xl text-xs italic text-slate-600 border border-slate-100">
                                    "{s.notes}"
                                </div>
                            )}

                            {s.photos && s.photos.length > 0 && (
                                <div className="flex gap-1 mt-3">
                                    {s.photos.slice(0,3).map((p, i) => (
                                        <div key={i} className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden">
                                            <img src={p} alt="صورة" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                    {s.photos.length > 3 && <span className="text-[9px] text-slate-400">+{s.photos.length-3}</span>}
                                </div>
                            )}

                            <div className="mt-3 text-[9px] text-slate-400 font-bold">
                                المعاين: {s.surveyor_name}
                            </div>
                        </div>
                    ))}
                    {surveys.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                            <span className="text-6xl mb-4 opacity-50">🗺️</span>
                            <p className="text-slate-500 font-black text-sm uppercase">لا توجد استعلامات سابقة</p>
                            <p className="text-slate-400 font-bold text-[10px] mt-2">قم بإضافة استعلام جديد بالضغط على الزر</p>
                        </div>
                    )}
                </div>
            )}

            {/* نافذة الاستعلام الميداني */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[500] bg-slate-50 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    {/* هيدر */}
                    <div className="shrink-0 bg-gradient-to-l from-slate-900 to-slate-800 text-white p-5 rounded-b-[2rem] shadow-xl z-50 text-right">
                        <div className="flex justify-between items-start">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg hover:bg-red-500/80 transition-colors">✕</button>
                            <div>
                                <h3 className="font-black text-lg">استعلام ميداني ذكي</h3>
                                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-1">تسجيل المعاينة + الموقع + التقييم</p>
                            </div>
                        </div>
                    </div>

                    {/* جسم النموذج (قابل للتمرير) */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full">
                        <form id="survey-form" onSubmit={handleSaveSurvey} className="p-4 space-y-4 pb-10 max-w-2xl mx-auto text-right">
                            
                            {/* اختيار العميل */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">1. بيانات العميل</h5>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">العميل المستهدف *</label>
                                        <select required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500" value={formData.customer_id} onChange={e => handleCustomerChange(e.target.value)}>
                                            <option value="">اختر العميل...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} - {c.phone}</option>)}
                                        </select>
                                    </div>

                                    {selectedCustomer && (
                                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-xs">
                                            <span className="block text-[9px] font-black text-blue-600 mb-2">معلومات العميل الأساسية</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>الهاتف: {selectedCustomer.phone}</div>
                                                <div>العنوان: {selectedCustomer.address_details}</div>
                                                <div>نقاط الائتمان: {selectedCustomer.credit_score}</div>
                                                {selectedCustomer.has_legal_issues && <div className="text-red-600 font-black">⚖️ عليه قضايا</div>}
                                            </div>
                                        </div>
                                    )}

                                    {customerGuarantors.length > 0 && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الضامن المراد زيارته (اختياري)</label>
                                            <select className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500" value={formData.guarantor_id} onChange={e => setFormData({...formData, guarantor_id: e.target.value})}>
                                                <option value="">بدون ضامن</option>
                                                {customerGuarantors.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* الموقع الجغرافي */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">2. الموقع الجغرافي الدقيق</h5>
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={getCurrentLocation} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                            {locationLoading ? <span className="animate-spin">⏳</span> : '📍'}
                                            {locationLoading ? 'جلب الموقع...' : 'تحديد موقعي الحالي'}
                                        </button>
                                        {location.lat && (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="bg-slate-100 text-slate-700 px-6 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-colors flex items-center"
                                            >
                                                عرض على الخريطة
                                            </a>
                                        )}
                                    </div>
                                    
                                    {location.lat && (
                                        <div className="bg-green-50 p-4 rounded-2xl border border-green-200 space-y-1">
                                            <p className="text-xs font-black text-green-800 flex items-center gap-2">
                                                <span className="text-lg">📍</span> تم تحديد الموقع بنجاح
                                            </p>
                                            <p className="text-[9px] text-slate-600">خط العرض: {location.lat}</p>
                                            <p className="text-[9px] text-slate-600">خط الطول: {location.lng}</p>
                                            <p className="text-[9px] text-slate-600">الدقة: ±{Math.round(location.accuracy)} متر</p>
                                            {location.address && <p className="text-[9px] text-slate-700 mt-2 border-t border-green-200 pt-2">العنوان: {location.address}</p>}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* تفاصيل المعاينة */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">3. تفاصيل المعاينة</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">نوع المعاينة</label>
                                        <select className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-black outline-none" value={formData.visit_type} onChange={e => setFormData({...formData, visit_type: e.target.value})}>
                                            <option value="منزل">مقر السكن</option>
                                            <option value="عمل">مقر العمل</option>
                                            <option value="ضامن">سكن الضامن</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">التاريخ</label>
                                        <input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-black outline-none" value={formData.visit_date} onChange={e => setFormData({...formData, visit_date: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الوقت</label>
                                        <input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-black outline-none" value={formData.visit_time} onChange={e => setFormData({...formData, visit_time: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">القرار المبدئي</label>
                                        <select className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-black outline-none" value={formData.recommendation} onChange={e => setFormData({...formData, recommendation: e.target.value})}>
                                            <option value="pending">معلق للمراجعة</option>
                                            <option value="recommend">موصى به</option>
                                            <option value="reject">مرفوض</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* معايير التقييم */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">4. معايير التقييم (من 1 إلى 10)</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">جودة السكن</label>
                                        <input type="range" min="1" max="10" className="w-full" value={criteriaScores.housing_quality} onChange={e => setCriteriaScores({...criteriaScores, housing_quality: parseInt(e.target.value)})} />
                                        <span className="text-xs font-black text-blue-600">{criteriaScores.housing_quality}</span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">الجيران والمحيط</label>
                                        <input type="range" min="1" max="10" className="w-full" value={criteriaScores.neighborhood} onChange={e => setCriteriaScores({...criteriaScores, neighborhood: parseInt(e.target.value)})} />
                                        <span className="text-xs font-black text-blue-600">{criteriaScores.neighborhood}</span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">النظافة</label>
                                        <input type="range" min="1" max="10" className="w-full" value={criteriaScores.cleanliness} onChange={e => setCriteriaScores({...criteriaScores, cleanliness: parseInt(e.target.value)})} />
                                        <span className="text-xs font-black text-blue-600">{criteriaScores.cleanliness}</span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">استقرار المنطقة</label>
                                        <input type="range" min="1" max="10" className="w-full" value={criteriaScores.stability} onChange={e => setCriteriaScores({...criteriaScores, stability: parseInt(e.target.value)})} />
                                        <span className="text-xs font-black text-blue-600">{criteriaScores.stability}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black text-slate-600 mb-1 block pr-2">وجود الضامن (إن وجد)</label>
                                        <input type="range" min="1" max="10" className="w-full" value={criteriaScores.guarantor_presence} onChange={e => setCriteriaScores({...criteriaScores, guarantor_presence: parseInt(e.target.value)})} />
                                        <span className="text-xs font-black text-blue-600">{criteriaScores.guarantor_presence}</span>
                                    </div>
                                </div>
                            </section>

                            {/* الصور والتوقيع */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">5. الصور والتوقيع</h5>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={capturePhoto} className="bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-black text-xs hover:bg-slate-200 transition-colors flex items-center gap-1">
                                        📸 إضافة صورة
                                    </button>
                                    <button type="button" onClick={captureSignature} className="bg-slate-100 text-slate-700 px-5 py-3 rounded-xl font-black text-xs hover:bg-slate-200 transition-colors flex items-center gap-1">
                                        ✍️ إضافة توقيع
                                    </button>
                                </div>

                                {/* معرض الصور */}
                                {photos.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-3">
                                        {photos.map((p, i) => (
                                            <div key={i} className="relative group">
                                                <img src={p} alt="صورة" className="w-full h-16 object-cover rounded-lg" />
                                                <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* عرض التوقيع */}
                                {signature && (
                                    <div className="border p-2 rounded-xl inline-block">
                                        <img src={signature} alt="توقيع" className="max-h-16" />
                                    </div>
                                )}
                            </section>

                            {/* ملاحظات */}
                            <section className="bg-white p-5 rounded-[2rem] border shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">6. ملاحظات التقرير</h5>
                                <textarea rows="4" required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="اكتب ملاحظاتك عن المعاينة..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                            </section>
                        </form>
                    </div>

                    {/* الفوتر الثابت (زر الحفظ) */}
                    <div className="shrink-0 bg-white border-t p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-8 z-50">
                        <button 
                            form="survey-form" 
                            type="submit" 
                            disabled={loading || !location.lat}
                            className={`w-full max-w-2xl mx-auto py-5 rounded-[2rem] font-black text-sm block transition-all ${
                                location.lat ? 'bg-gradient-to-l from-slate-900 to-slate-800 text-white shadow-xl hover:from-slate-800 hover:to-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> جاري الحفظ...
                                </span>
                            ) : !location.lat ? (
                                '⚠️ يرجى تحديد الموقع أولاً'
                            ) : (
                                'تسجيل الاستعلام وتحديث التقييم 🚀'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

window.SurveyModule = SurveyModule;
