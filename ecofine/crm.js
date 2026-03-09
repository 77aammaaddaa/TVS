// crm.js - مديول إدارة العملاء المطور (إصدار الاستعلام الشامل V5)
// الإصدار المحسن: استخراج تاريخ الميلاد والجنس من الرقم القومي المصري، دعم الضامنين، تحسين الأداء وتجربة المستخدم

const { useState, useEffect, useMemo, useCallback } = React;

// دالة تحليل الرقم القومي المصري (14 رقم)
const parseNationalId = (nationalId) => {
  if (!/^\d{14}$/.test(nationalId)) return null;
  
  const century = nationalId[0]; // 2=1900, 3=2000
  const year = nationalId.substring(1, 3);
  const month = nationalId.substring(3, 5);
  const day = nationalId.substring(5, 7);
  const governorate = nationalId.substring(7, 9); // يمكن استخدامها لاحقاً
  const genderDigit = parseInt(nationalId[12]); // الرقم قبل الأخير، فردي = ذكر، زوجي = أنثى
  
  let fullYear;
  if (century === '2') fullYear = `19${year}`;
  else if (century === '3') fullYear = `20${year}`;
  else return null; // غير معروف
  
  const gender = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';
  
  return {
    birthDate: `${fullYear}-${month}-${day}`,
    gender,
    fullYear: parseInt(fullYear),
    month: parseInt(month),
    day: parseInt(day)
  };
};

// مكون التأكيد المنبثق (يمكن استبداله بـ modal صغير)
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
      <p className="text-lg mb-6">{message}</p>
      <div className="flex gap-4 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border rounded-lg">تعديل</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg">تأكيد</button>
      </div>
    </div>
  </div>
);

const CRMModule = () => {
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', message }
  
  // بيانات النموذج الرئيسي
  const [formData, setFormData] = useState({
    full_name: '',
    national_id: '',
    phone: '',
    whatsapp: '',
    comm_method: 'whatsapp',
    province: '',
    area: '',
    address_details: '',
    job: '',
    marital_status: 'متزوج',
    qualification: '',
    monthly_income: '',
    income_source: '',
    housing_type: 'إيجار',
    birth_date: '', // سيتم تعبئته تلقائياً
    gender: '', // سيتم تعبئته تلقائياً
    guarantors: [] // مصفوفة من الضامنين، كل ضامن له نفس بنية بيانات العميل (بدون guarantors)
  });

  // حالة تأكيد الرقم القومي للعميل
  const [pendingNationalIdConfirm, setPendingNationalIdConfirm] = useState(null); // { nationalId, parsed }

  // حالة تأكيد الرقم القومي للضامن (مؤقتة لكل ضامن)
  const [pendingGuarantorConfirm, setPendingGuarantorConfirm] = useState(null); // { index, nationalId, parsed }

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.getAll('customers');
      setCustomers(data);
    } catch (error) {
      showNotification('error', 'فشل في تحميل العملاء');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, []);

  // التحقق من صحة الرقم القومي (التنسيق وعدم التكرار)
  const validateNationalId = async (nationalId, excludeId = null) => {
    if (!/^\d{14}$/.test(nationalId)) {
      return 'الرقم القومي يجب أن يكون 14 رقماً';
    }
    // التحقق من التكرار في قاعدة البيانات
    const all = await db.getAll('customers');
    const exists = all.some(c => c.national_id === nationalId && c.id !== excludeId);
    if (exists) return 'هذا الرقم القومي مسجل مسبقاً';
    return null;
  };

  // معالج تغيير الرقم القومي للعميل
  const handleNationalIdChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, national_id: value, birth_date: '', gender: '' });
    
    if (/^\d{14}$/.test(value)) {
      const parsed = parseNationalId(value);
      if (parsed) {
        setPendingNationalIdConfirm({
          nationalId: value,
          parsed
        });
      }
    }
  };

  // تأكيد الرقم القومي للعميل
  const confirmNationalId = () => {
    if (pendingNationalIdConfirm) {
      setFormData({
        ...formData,
        national_id: pendingNationalIdConfirm.nationalId,
        birth_date: pendingNationalIdConfirm.parsed.birthDate,
        gender: pendingNationalIdConfirm.parsed.gender
      });
      setPendingNationalIdConfirm(null);
    }
  };

  // إلغاء تأكيد الرقم القومي (يسمح للمستخدم بالتعديل)
  const cancelNationalIdConfirm = () => {
    setPendingNationalIdConfirm(null);
    // لا نقوم بتغيير birth_date/gender، المستخدم سيدخلها يدوياً
  };

  // دوال إدارة الضامنين
  const addGuarantor = () => {
    setFormData({
      ...formData,
      guarantors: [
        ...formData.guarantors,
        {
          full_name: '',
          national_id: '',
          phone: '',
          whatsapp: '',
          comm_method: 'whatsapp',
          province: '',
          area: '',
          address_details: '',
          job: '',
          marital_status: 'متزوج',
          qualification: '',
          monthly_income: '',
          income_source: '',
          housing_type: 'إيجار',
          birth_date: '',
          gender: '',
          relation: '' // صلة القرابة
        }
      ]
    });
  };

  const removeGuarantor = (index) => {
    const updated = [...formData.guarantors];
    updated.splice(index, 1);
    setFormData({ ...formData, guarantors: updated });
  };

  const updateGuarantor = (index, field, value) => {
    const updated = [...formData.guarantors];
    updated[index][field] = value;
    setFormData({ ...formData, guarantors: updated });
  };

  // معالج تغيير الرقم القومي لضامن معين
  const handleGuarantorNationalIdChange = (index, value) => {
    updateGuarantor(index, 'national_id', value);
    updateGuarantor(index, 'birth_date', '');
    updateGuarantor(index, 'gender', '');

    if (/^\d{14}$/.test(value)) {
      const parsed = parseNationalId(value);
      if (parsed) {
        setPendingGuarantorConfirm({
          index,
          nationalId: value,
          parsed
        });
      }
    }
  };

  // تأكيد الرقم القومي للضامن
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

  const cancelGuarantorConfirm = () => {
    setPendingGuarantorConfirm(null);
  };

  // التحقق من صحة جميع البيانات
  const validateForm = async () => {
    const phoneRegex = /^01[0125][0-9]{8}$/; // أرقام مصر

    // تحقق من بيانات العميل
    const nationalIdError = await validateNationalId(formData.national_id);
    if (nationalIdError) return nationalIdError;

    if (!phoneRegex.test(formData.phone)) return 'رقم هاتف العميل غير صحيح (يجب أن يبدأ بـ 010/011/012/015)';
    if (formData.whatsapp && !phoneRegex.test(formData.whatsapp)) return 'رقم واتساب العميل غير صحيح';
    if (Number(formData.monthly_income) <= 0) return 'متوسط الدخل الشهري يجب أن يكون أكبر من صفر';

    // تحقق من الضامنين
    for (let i = 0; i < formData.guarantors.length; i++) {
      const g = formData.guarantors[i];
      if (!g.full_name.trim()) return `الضامن ${i+1}: الاسم مطلوب`;
      
      const guarantorNationalError = await validateNationalId(g.national_id);
      if (guarantorNationalError) return `الضامن ${i+1}: ${guarantorNationalError}`;
      
      if (!phoneRegex.test(g.phone)) return `الضامن ${i+1}: رقم الهاتف غير صحيح`;
      if (g.whatsapp && !phoneRegex.test(g.whatsapp)) return `الضامن ${i+1}: رقم الواتساب غير صحيح`;
      if (Number(g.monthly_income) <= 0) return `الضامن ${i+1}: متوسط الدخل الشهري يجب أن يكون أكبر من صفر`;
      if (!g.relation.trim()) return `الضامن ${i+1}: صلة القرابة مطلوبة`;
    }

    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const error = await validateForm();
    if (error) {
      showNotification('error', error);
      return;
    }

    try {
      // إضافة العميل مع الضامنين
      const customerData = {
        ...formData,
        status: 'نشط',
        credit_score: 50,
        last_update: new Date().toISOString(),
        guarantors: formData.guarantors.map(g => ({
          ...g,
          credit_score: 50, // تقييم مبدئي للضامن
          created_at: new Date().toISOString()
        }))
      };
      
      await db.add('customers', customerData);
      
      // إعادة تعيين النموذج
      setFormData({
        full_name: '', national_id: '', phone: '', whatsapp: '',
        comm_method: 'whatsapp', province: '', area: '', address_details: '',
        job: '', marital_status: 'متزوج', qualification: '',
        monthly_income: '', income_source: '', housing_type: 'إيجار',
        birth_date: '', gender: '', guarantors: []
      });
      setIsModalOpen(false);
      await loadCustomers();
      showNotification('success', '✅ تم تسجيل العميل والضامنين بنجاح');
    } catch (err) {
      showNotification('error', '❌ فشل في الحفظ، قد يكون الرقم القومي مكرراً');
    }
  };

  // فلترة العملاء (محسنة باستخدام useMemo)
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.full_name.toLowerCase().includes(term) || 
      c.phone.includes(term) ||
      c.national_id.includes(term)
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      {/* إشعار Toast بسيط */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-white font-bold ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}

      {/* شريط البحث والإضافة */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <input 
          type="text" 
          placeholder="ابحث بالاسم، الهاتف، أو الرقم القومي..." 
          className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition"
        >
          <span>➕</span> تسجيل عميل جديد
        </button>
      </div>

      {/* حالة التحميل */}
      {isLoading && (
        <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
      )}

      {/* قائمة العملاء */}
      {!isLoading && (
        <>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed">
              <span className="text-4xl block mb-2">👥</span>
              <p className="text-slate-400">لا يوجد عملاء بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-800 mb-1">{c.full_name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      c.credit_score >= 70 ? 'bg-green-100 text-green-700' :
                      c.credit_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{c.credit_score}%</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3" dir="ltr">🆔 {c.national_id.replace(/(\d{6})\d{4}(\d{4})/, '$1****$2')}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">الهاتف:</span>
                      <span className="font-bold">{c.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">تاريخ الميلاد:</span>
                      <span>{c.birth_date || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الجنس:</span>
                      <span>{c.gender || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-slate-400">العنوان:</span>
                      <span>{c.province} - {c.area}</span>
                    </div>
                    {c.guarantors?.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <span className="text-xs text-blue-600 font-bold">ضامنون: {c.guarantors.length}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="text-blue-600 text-sm">تعديل</button>
                    <button className="text-red-600 text-sm">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* مودال تسجيل العميل */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-3xl h-[90vh] md:h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xl font-black text-slate-800">بيانات الاستعلام الكاملة</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-3xl text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scroll text-right">
              
              {/* القسم 1: البيانات الشخصية للعميل */}
              <section>
                <h5 className="text-blue-600 font-black mb-4 border-b pb-2 text-sm">1. بيانات العميل الأساسية</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">الاسم الرباعي (من واقع البطاقة)</label>
                    <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.full_name} 
                           onChange={e => setFormData({...formData, full_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">الرقم القومي (14 رقم)</label>
                    <input required type="text" pattern="\d*" maxLength="14"
                           className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.national_id} 
                           onChange={handleNationalIdChange} />
                    {formData.birth_date && (
                      <p className="text-xs text-green-600 mt-1">
                        تاريخ الميلاد المستخرج: {formData.birth_date} | الجنس: {formData.gender}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">الحالة الاجتماعية</label>
                    <select className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                            value={formData.marital_status} 
                            onChange={e => setFormData({...formData, marital_status: e.target.value})}>
                      <option>أعزب</option><option>متزوج</option><option>مطلق</option><option>أرمل</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">المؤهل الدراسي</label>
                    <input className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.qualification} 
                           onChange={e => setFormData({...formData, qualification: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* القسم 2: التواصل والعنوان */}
              <section>
                <h5 className="text-blue-600 font-black mb-4 border-b pb-2 text-sm">2. التواصل والعنوان بالتفصيل</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">رقم الهاتف الأساسي</label>
                    <input required type="tel" className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.phone} 
                           onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">رقم الواتساب</label>
                    <input type="tel" className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.whatsapp} 
                           onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">المحافظة</label>
                    <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.province} 
                           onChange={e => setFormData({...formData, province: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">المنطقة / الحي / القرية</label>
                    <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.area} 
                           onChange={e => setFormData({...formData, area: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">تفاصيل العنوان (شارع - رقم منزل - علامة مميزة)</label>
                    <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.address_details} 
                           onChange={e => setFormData({...formData, address_details: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">نوع السكن</label>
                    <select className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                            value={formData.housing_type} 
                            onChange={e => setFormData({...formData, housing_type: e.target.value})}>
                      <option>تمليك</option><option>إيجار</option><option>سكن عائلي</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* القسم 3: الدخل والعمل */}
              <section>
                <h5 className="text-blue-600 font-black mb-4 border-b pb-2 text-sm">3. الوظيفة ومستوى الدخل</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500">الوظيفة / المهنة</label>
                    <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.job} 
                           onChange={e => setFormData({...formData, job: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">مصدر الدخل</label>
                    <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" 
                           value={formData.income_source} 
                           onChange={e => setFormData({...formData, income_source: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">متوسط الدخل الشهري (ج.م)</label>
                    <input required type="number" min="1" step="1"
                           className="w-full p-3 mt-1 bg-slate-50 border rounded-xl font-black text-blue-600" 
                           value={formData.monthly_income} 
                           onChange={e => setFormData({...formData, monthly_income: e.target.value})} />
                  </div>
                </div>
              </section>

              {/* القسم 4: الضامنون */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-blue-600 font-black border-b pb-2 text-sm">4. بيانات الضامنين (اختياري)</h5>
                  <button type="button" onClick={addGuarantor} className="text-blue-600 text-sm border border-blue-600 px-3 py-1 rounded-full">
                    + إضافة ضامن
                  </button>
                </div>
                
                {formData.guarantors.map((guarantor, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl mb-4 relative">
                    <button type="button" onClick={() => removeGuarantor(idx)} className="absolute top-2 left-2 text-red-500">✕</button>
                    <h6 className="font-bold mb-3">الضامن {idx+1}</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">الاسم الرباعي</label>
                        <input required className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.full_name} 
                               onChange={e => updateGuarantor(idx, 'full_name', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">الرقم القومي</label>
                        <input required type="text" pattern="\d*" maxLength="14"
                               className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.national_id} 
                               onChange={e => handleGuarantorNationalIdChange(idx, e.target.value)} />
                        {guarantor.birth_date && (
                          <p className="text-xs text-green-600 mt-1">
                            تاريخ الميلاد: {guarantor.birth_date} | الجنس: {guarantor.gender}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">صلة القرابة</label>
                        <input required className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.relation} 
                               onChange={e => updateGuarantor(idx, 'relation', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">الهاتف</label>
                        <input required type="tel" className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.phone} 
                               onChange={e => updateGuarantor(idx, 'phone', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">الواتساب</label>
                        <input type="tel" className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.whatsapp} 
                               onChange={e => updateGuarantor(idx, 'whatsapp', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">المحافظة</label>
                        <input required className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.province} 
                               onChange={e => updateGuarantor(idx, 'province', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">المنطقة</label>
                        <input required className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.area} 
                               onChange={e => updateGuarantor(idx, 'area', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500">العنوان بالتفصيل</label>
                        <input required className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.address_details} 
                               onChange={e => updateGuarantor(idx, 'address_details', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">الوظيفة</label>
                        <input required className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.job} 
                               onChange={e => updateGuarantor(idx, 'job', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">الدخل الشهري</label>
                        <input required type="number" className="w-full p-3 mt-1 bg-white border rounded-xl" 
                               value={guarantor.monthly_income} 
                               onChange={e => updateGuarantor(idx, 'monthly_income', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.guarantors.length === 0 && (
                  <p className="text-slate-400 text-sm">لم تتم إضافة ضامنين بعد</p>
                )}
              </section>

              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 sticky bottom-0 hover:bg-blue-700 transition">
                إتمام التسجيل والتقييم المبدئي
              </button>
            </form>
          </div>
        </div>
      )}

      {/* نوافذ تأكيد الرقم القومي للعميل */}
      {pendingNationalIdConfirm && (
        <ConfirmModal 
          message={`تم استخراج تاريخ الميلاد: ${pendingNationalIdConfirm.parsed.birthDate} والجنس: ${pendingNationalIdConfirm.parsed.gender}. هل البيانات صحيحة؟`}
          onConfirm={confirmNationalId}
          onCancel={cancelNationalIdConfirm}
        />
      )}

      {/* نوافذ تأكيد الرقم القومي للضامن */}
      {pendingGuarantorConfirm && (
        <ConfirmModal 
          message={`بالنسبة للضامن: تم استخراج تاريخ الميلاد: ${pendingGuarantorConfirm.parsed.birthDate} والجنس: ${pendingGuarantorConfirm.parsed.gender}. هل البيانات صحيحة؟`}
          onConfirm={confirmGuarantorNationalId}
          onCancel={cancelGuarantorConfirm}
        />
      )}
    </div>
  );
};

// تصدير المكون للاستخدام العام
window.CRMModule = CRMModule;