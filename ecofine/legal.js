/**
 * legal.js - مديول الشؤون القانونية المتكامل مع نظام إيكو فاين برو
 * يدير القضايا المرتبطة بالعملاء والضامنين والفواتير
 * يتوافق مع القانون المصري ويوفر هيكل بيانات متقدم لإدارة القضايا والجلسات والمستندات والأحكام
 */

const LegalModule = () => {
    // =========================== الحالات (States) ===========================
    const [cases, setCases] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // add, edit, view
    const [activeTab, setActiveTab] = useState('details'); // details, hearings, documents, judgments
    const [notification, setNotification] = useState(null);

    // بيانات النموذج لإضافة/تعديل قضية
    const [formData, setFormData] = useState({
        id: null,
        case_number: '',
        case_type: 'مدني', // مدني، جنائي، أسرة، إداري، تجاري، ...
        sub_type: 'مدني كلي',
        status: 'open', // open, in_court, judged, closed, appealed
        court: '',
        circuit: '',
        filing_date: new Date().toISOString().split('T')[0],
        claim_amount: '',
        opponent_name: '',
        opponent_lawyer: '',
        client_role: 'مدعي', // مدعي، مدعى عليه، متهم، ...
        lawyer_id: '', // أو lawyer_name
        lawyer_name: '',
        notes: '',
        invoice_id: '', // الفاتورة المرتبطة (اختياري)
        customer_id: '', // العميل الرئيسي
        guarantor_ids: [], // قائمة بمعرفات الضامنين المرتبطين
    });

    // بيانات الجلسة (للإضافة)
    const [hearingForm, setHearingForm] = useState({
        hearing_date: '',
        hearing_number: '',
        result: '',
        next_hearing_date: '',
        notes: ''
    });

    // بيانات المستند (للإضافة)
    const [docForm, setDocForm] = useState({
        doc_name: '',
        doc_type: '',
        file: null
    });

    // =========================== تحميل البيانات ===========================
    const loadData = async () => {
        setLoading(true);
        try {
            const [cust, inv, casesData] = await Promise.all([
                db.getAll('customers'),
                db.getAll('invoices'),
                db.getAll('legal_cases')
            ]);
            setCustomers(cust || []);
            setInvoices(inv || []);
            setCases(casesData || []);
        } catch (error) {
            showNotification('error', '❌ فشل تحميل البيانات القانونية');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // =========================== الإشعارات ===========================
    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3500);
    };

    // =========================== دوال مساعدة ===========================
    const getCustomerName = (id) => {
        const cust = customers.find(c => c.id === id);
        return cust ? cust.full_name : 'غير معروف';
    };

    const getInvoiceNumber = (id) => {
        const inv = invoices.find(i => i.id === id);
        return inv ? `فاتورة #${inv.id.slice(0, 8)}` : 'غير مرتبطة';
    };

    // =========================== إدارة القضايا ===========================
    const handleSaveCase = async (e) => {
        e.preventDefault();
        try {
            const caseToSave = {
                ...formData,
                guarantor_ids: formData.guarantor_ids || [],
                updated_at: new Date().toISOString()
            };

            if (modalMode === 'add') {
                caseToSave.created_at = new Date().toISOString();
                await db.add('legal_cases', caseToSave);
                showNotification('success', '✅ تمت إضافة القضية بنجاح');
            } else if (modalMode === 'edit') {
                await db.update('legal_cases', formData.id, caseToSave);
                showNotification('success', '✅ تم تحديث القضية بنجاح');
            }

            // تحديث حالة العميل إذا كانت القضية جديدة (اختياري)
            if (modalMode === 'add' && formData.customer_id) {
                // يمكن تحديث حالة العميل إلى 'legal' أو إضافة علامة
                // لكن لا نغير الائتمان تلقائياً - يترك لإدارة الائتمان
            }

            setIsModalOpen(false);
            resetForm();
            loadData();
        } catch (err) {
            console.error(err);
            showNotification('error', '❌ حدث خطأ أثناء حفظ القضية');
        }
    };

    const resetForm = () => {
        setFormData({
            id: null,
            case_number: '',
            case_type: 'مدني',
            sub_type: 'مدني كلي',
            status: 'open',
            court: '',
            circuit: '',
            filing_date: new Date().toISOString().split('T')[0],
            claim_amount: '',
            opponent_name: '',
            opponent_lawyer: '',
            client_role: 'مدعي',
            lawyer_id: '',
            lawyer_name: '',
            notes: '',
            invoice_id: '',
            customer_id: '',
            guarantor_ids: [],
        });
    };

    const openAddModal = () => {
        resetForm();
        setModalMode('add');
        setIsModalOpen(true);
        setActiveTab('details');
    };

    const openEditModal = (caseItem) => {
        setFormData({
            ...caseItem,
            guarantor_ids: caseItem.guarantor_ids || []
        });
        setModalMode('edit');
        setIsModalOpen(true);
        setActiveTab('details');
    };

    const openViewModal = (caseItem) => {
        setSelectedCase(caseItem);
        setModalMode('view');
        setIsModalOpen(true);
        setActiveTab('details');
    };

    // =========================== إدارة الجلسات ===========================
    const handleAddHearing = async (caseId) => {
        if (!hearingForm.hearing_date) {
            showNotification('error', '⚠️ تاريخ الجلسة مطلوب');
            return;
        }
        try {
            const hearing = {
                ...hearingForm,
                case_id: caseId,
                created_at: new Date().toISOString()
            };
            await db.add('case_hearings', hearing);
            showNotification('success', '✅ تمت إضافة الجلسة');
            setHearingForm({ hearing_date: '', hearing_number: '', result: '', next_hearing_date: '', notes: '' });
            // يمكن تحديث القضية المعروضة
            if (selectedCase) {
                const updatedCase = { ...selectedCase, next_session: hearingForm.next_hearing_date || selectedCase.next_session };
                setSelectedCase(updatedCase);
            }
        } catch (err) {
            showNotification('error', '❌ فشل إضافة الجلسة');
        }
    };

    // =========================== إدارة المستندات ===========================
    const handleAddDocument = async (caseId) => {
        if (!docForm.doc_name || !docForm.file) {
            showNotification('error', '⚠️ اسم المستند والملف مطلوبان');
            return;
        }
        try {
            // هنا يمكن رفع الملف إلى storage والحصول على URL
            // نفترض وجود دالة uploadFile تعيد مسار الملف
            // const fileUrl = await uploadFile(docForm.file);
            const fileUrl = URL.createObjectURL(docForm.file); // مؤقت للعرض
            const document = {
                case_id: caseId,
                doc_name: docForm.doc_name,
                doc_type: docForm.doc_type,
                file_url: fileUrl,
                upload_date: new Date().toISOString()
            };
            await db.add('case_documents', document);
            showNotification('success', '✅ تم رفع المستند');
            setDocForm({ doc_name: '', doc_type: '', file: null });
        } catch (err) {
            showNotification('error', '❌ فشل رفع المستند');
        }
    };

    // =========================== التصفية والبحث ===========================
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredCases = useMemo(() => {
        return cases.filter(c => {
            const matchesSearch = 
                c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                getCustomerName(c.customer_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.opponent_name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [cases, searchQuery, statusFilter]);

    // =========================== التصميم والعرض ===========================
    return (
        <div className="h-full flex flex-col relative pb-20 animate-in fade-in">
            {/* الإشعارات */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] px-8 py-4 rounded-[2rem] shadow-2xl text-white font-black text-xs md:text-sm transition-all duration-300 flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-600 shadow-green-600/30' : 'bg-red-600 shadow-red-600/30'}`}>
                    <span>{notification.type === 'success' ? '⚖️' : '⚠️'}</span>
                    {notification.message}
                </div>
            )}

            {/* الهيدر مع البحث والفلتر */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm mb-4 sticky top-0 z-10 flex flex-col sm:flex-row gap-3 items-center mx-2 mt-2">
                <div className="flex-1 flex items-center gap-2 w-full">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-xl shrink-0">⚖️</div>
                    <input 
                        type="text" 
                        placeholder="بحث برقم القضية، اسم العميل، الخصم..." 
                        className="w-full bg-transparent outline-none text-sm font-black text-slate-800 placeholder:font-bold placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <select 
                        className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">كل الحالات</option>
                        <option value="open">مفتوحة</option>
                        <option value="in_court">منظورة</option>
                        <option value="judged">محكوم فيها</option>
                        <option value="closed">منتهية</option>
                        <option value="appealed">مطعون فيها</option>
                    </select>
                    <button 
                        onClick={openAddModal}
                        className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                        <span className="text-lg">+</span> قضية جديدة
                    </button>
                </div>
            </div>

            {/* عرض القضايا */}
            <div className="flex-1 overflow-y-auto custom-scroll px-2">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                ) : filteredCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <span className="text-6xl mb-4 opacity-50">📁</span>
                        <p className="text-slate-500 font-black text-sm uppercase">لا توجد قضايا مطابقة</p>
                        <p className="text-slate-400 font-bold text-[10px] mt-2">يمكنك إضافة قضية جديدة بالضغط على الزر</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCases.map(caseItem => (
                            <div key={caseItem.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openViewModal(caseItem)}>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-2 h-12 rounded-full ${caseItem.status === 'open' ? 'bg-orange-500' : caseItem.status === 'in_court' ? 'bg-blue-500' : caseItem.status === 'judged' ? 'bg-green-600' : 'bg-slate-400'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-black text-slate-800 line-clamp-1">{getCustomerName(caseItem.customer_id)}</h4>
                                            <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-1 rounded-full">{caseItem.case_type}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold mt-1">رقم القضية: {caseItem.case_number}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div>
                                        <span className="text-slate-400">الخصم:</span>
                                        <p className="font-bold truncate">{caseItem.opponent_name || 'غير محدد'}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">المحكمة:</span>
                                        <p className="font-bold truncate">{caseItem.court || 'غير محدد'}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">المحامي:</span>
                                        <p className="font-bold truncate">{caseItem.lawyer_name || 'غير محدد'}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">الجلسة القادمة:</span>
                                        <p className="font-black text-red-600">{caseItem.next_session || 'لا توجد'}</p>
                                    </div>
                                </div>

                                {caseItem.invoice_id && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded-xl text-[9px] font-bold text-blue-700 flex items-center gap-1">
                                        <span>📄</span> {getInvoiceNumber(caseItem.invoice_id)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ==================== مودال عرض/إضافة/تعديل القضية ==================== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* رأس المودال */}
                        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-xl">
                                    {modalMode === 'add' ? 'إضافة قضية جديدة' : modalMode === 'edit' ? 'تعديل بيانات القضية' : 'تفاصيل القضية'}
                                </h3>
                                <p className="text-[10px] text-red-400 font-bold uppercase mt-1">إدارة القضايا والشؤون القانونية</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-red-500 transition-colors">✕</button>
                        </div>

                        {/* تبويبات التنقل (في وضع العرض فقط) */}
                        {modalMode === 'view' && selectedCase && (
                            <div className="flex border-b border-slate-200 px-6 pt-4 gap-2">
                                {['details', 'hearings', 'documents', 'judgments'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-6 py-3 rounded-t-2xl text-xs font-black transition-all ${activeTab === tab ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        {tab === 'details' && '📋 البيانات الأساسية'}
                                        {tab === 'hearings' && '⚖️ الجلسات'}
                                        {tab === 'documents' && '📁 المستندات'}
                                        {tab === 'judgments' && '📜 الأحكام'}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* محتوى المودال - قابل للتمرير */}
                        <div className="flex-1 overflow-y-auto custom-scroll p-6">
                            {modalMode !== 'view' ? (
                                // ===== نموذج إضافة/تعديل قضية =====
                                <form onSubmit={handleSaveCase} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* الحقل: العميل الرئيسي */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">العميل الرئيسي *</label>
                                            <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                                                <option value="">اختر العميل...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                            </select>
                                        </div>

                                        {/* الحقل: الفاتورة المرتبطة */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">الفاتورة المرتبطة (اختياري)</label>
                                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.invoice_id} onChange={e => setFormData({...formData, invoice_id: e.target.value})}>
                                                <option value="">بدون فاتورة</option>
                                                {invoices.map(inv => <option key={inv.id} value={inv.id}>فاتورة #{inv.id.slice(0,8)} - {getCustomerName(inv.customer_id)}</option>)}
                                            </select>
                                        </div>

                                        {/* الحقل: رقم القضية */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">رقم القضية *</label>
                                            <input type="text" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.case_number} onChange={e => setFormData({...formData, case_number: e.target.value})} />
                                        </div>

                                        {/* الحقل: نوع القضية */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">نوع القضية</label>
                                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.case_type} onChange={e => setFormData({...formData, case_type: e.target.value})}>
                                                <option value="مدني">مدني</option>
                                                <option value="جنائي">جنائي</option>
                                                <option value="أسرة">أسرة</option>
                                                <option value="إداري">إداري</option>
                                                <option value="تجاري">تجاري</option>
                                                <option value="عمالي">عمالي</option>
                                                <option value="جنحة تبديد">جنحة تبديد</option>
                                                <option value="شيك بدون رصيد">شيك بدون رصيد</option>
                                                <option value="أمر أداء">أمر أداء</option>
                                                <option value="إثبات حالة">إثبات حالة</option>
                                            </select>
                                        </div>

                                        {/* الحقل: النوع الفرعي */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">النوع الفرعي</label>
                                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.sub_type} onChange={e => setFormData({...formData, sub_type: e.target.value})} placeholder="مثال: مدني كلي، جنحة، جناية" />
                                        </div>

                                        {/* الحقل: حالة القضية */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">الحالة</label>
                                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                                <option value="open">مفتوحة</option>
                                                <option value="in_court">منظورة</option>
                                                <option value="judged">محكوم فيها</option>
                                                <option value="closed">منتهية</option>
                                                <option value="appealed">مطعون فيها</option>
                                            </select>
                                        </div>

                                        {/* الحقل: تاريخ رفع الدعوى */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">تاريخ رفع الدعوى</label>
                                            <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.filing_date} onChange={e => setFormData({...formData, filing_date: e.target.value})} />
                                        </div>

                                        {/* الحقل: قيمة الدعوى */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">قيمة الدعوى (ج.م)</label>
                                            <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.claim_amount} onChange={e => setFormData({...formData, claim_amount: e.target.value})} />
                                        </div>

                                        {/* الحقل: المحكمة */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">المحكمة</label>
                                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.court} onChange={e => setFormData({...formData, court: e.target.value})} placeholder="محكمة ..." />
                                        </div>

                                        {/* الحقل: الدائرة */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">الدائرة</label>
                                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.circuit} onChange={e => setFormData({...formData, circuit: e.target.value})} placeholder="دائرة ..." />
                                        </div>

                                        {/* الحقل: اسم الخصم */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">اسم الخصم</label>
                                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.opponent_name} onChange={e => setFormData({...formData, opponent_name: e.target.value})} />
                                        </div>

                                        {/* الحقل: محامي الخصم */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">محامي الخصم</label>
                                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.opponent_lawyer} onChange={e => setFormData({...formData, opponent_lawyer: e.target.value})} />
                                        </div>

                                        {/* الحقل: صفة العميل */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">صفة العميل</label>
                                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.client_role} onChange={e => setFormData({...formData, client_role: e.target.value})}>
                                                <option value="مدعي">مدعي</option>
                                                <option value="مدعى عليه">مدعى عليه</option>
                                                <option value="متهم">متهم</option>
                                                <option value="وكيل">وكيل</option>
                                                <option value="ضامن">ضامن</option>
                                                <option value="شاهد">شاهد</option>
                                            </select>
                                        </div>

                                        {/* الحقل: المحامي المسؤول */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">المحامي المسؤول</label>
                                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.lawyer_name} onChange={e => setFormData({...formData, lawyer_name: e.target.value})} />
                                        </div>

                                        {/* الحقل: الجلسة القادمة */}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">الجلسة القادمة</label>
                                            <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.next_session} onChange={e => setFormData({...formData, next_session: e.target.value})} />
                                        </div>

                                        {/* الحقل: الضامنون (اختياري) */}
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">الضامنون المرتبطون</label>
                                            <select multiple className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500 h-32" value={formData.guarantor_ids} onChange={e => setFormData({...formData, guarantor_ids: Array.from(e.target.selectedOptions, opt => opt.value)})}>
                                                {customers.filter(c => c.id !== formData.customer_id).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                            </select>
                                            <p className="text-[9px] text-slate-400 mt-1">اضغط مع Ctrl لاختيار عدة ضامنين</p>
                                        </div>
                                    </div>

                                    {/* الحقل: ملاحظات */}
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">ملاحظات</label>
                                        <textarea rows="3" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-red-500" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                                    </div>

                                    {/* أزرار الحفظ والإلغاء */}
                                    <div className="flex gap-3 pt-4">
                                        <button type="submit" className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-red-700 transition-colors">
                                            {modalMode === 'add' ? 'إضافة القضية' : 'تحديث البيانات'}
                                        </button>
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black hover:bg-slate-200 transition-colors">
                                            إلغاء
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // ===== عرض تفاصيل القضية (حسب التبويب النشط) =====
                                selectedCase && (
                                    <div>
                                        {activeTab === 'details' && (
                                            <div className="space-y-6">
                                                {/* بيانات القضية الأساسية */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">العميل</span>
                                                        <p className="font-black text-lg">{getCustomerName(selectedCase.customer_id)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">رقم القضية</span>
                                                        <p className="font-black">{selectedCase.case_number}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">النوع</span>
                                                        <p className="font-black">{selectedCase.case_type} - {selectedCase.sub_type}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">الحالة</span>
                                                        <p className={`font-black ${selectedCase.status === 'open' ? 'text-orange-600' : selectedCase.status === 'in_court' ? 'text-blue-600' : selectedCase.status === 'judged' ? 'text-green-600' : 'text-slate-600'}`}>
                                                            {selectedCase.status === 'open' ? 'مفتوحة' : selectedCase.status === 'in_court' ? 'منظورة' : selectedCase.status === 'judged' ? 'محكوم فيها' : selectedCase.status === 'closed' ? 'منتهية' : 'مطعون فيها'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">المحكمة</span>
                                                        <p className="font-black">{selectedCase.court || 'غير محدد'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">الدائرة</span>
                                                        <p className="font-black">{selectedCase.circuit || 'غير محدد'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">تاريخ الرفع</span>
                                                        <p className="font-black">{selectedCase.filing_date}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">الخصم</span>
                                                        <p className="font-black">{selectedCase.opponent_name || 'غير محدد'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">محامي الخصم</span>
                                                        <p className="font-black">{selectedCase.opponent_lawyer || 'غير محدد'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">صفة العميل</span>
                                                        <p className="font-black">{selectedCase.client_role}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">المحامي المسؤول</span>
                                                        <p className="font-black">{selectedCase.lawyer_name || 'غير محدد'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase">الجلسة القادمة</span>
                                                        <p className="font-black text-red-600">{selectedCase.next_session || 'لا توجد'}</p>
                                                    </div>
                                                </div>

                                                {/* الفاتورة المرتبطة إن وجدت */}
                                                {selectedCase.invoice_id && (
                                                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200">
                                                        <span className="text-[9px] text-blue-600 font-black uppercase">الفاتورة المرتبطة</span>
                                                        <p className="font-black text-blue-800">{getInvoiceNumber(selectedCase.invoice_id)}</p>
                                                    </div>
                                                )}

                                                {/* الضامنون */}
                                                {selectedCase.guarantor_ids?.length > 0 && (
                                                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                                                        <span className="text-[9px] text-amber-600 font-black uppercase">الضامنون</span>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {selectedCase.guarantor_ids.map(gid => (
                                                                <span key={gid} className="bg-white px-3 py-1 rounded-full text-xs font-black shadow-sm">{getCustomerName(gid)}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* الملاحظات */}
                                                {selectedCase.notes && (
                                                    <div className="bg-slate-100 p-5 rounded-2xl italic text-slate-700">
                                                        "{selectedCase.notes}"
                                                    </div>
                                                )}

                                                {/* زر التعديل */}
                                                <button onClick={() => openEditModal(selectedCase)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-slate-900 transition-colors">
                                                    تعديل بيانات القضية
                                                </button>
                                            </div>
                                        )}

                                        {activeTab === 'hearings' && (
                                            <div className="space-y-4">
                                                <h4 className="font-black text-lg">جلسات القضية</h4>
                                                {/* نموذج إضافة جلسة جديدة */}
                                                <div className="bg-slate-50 p-5 rounded-2xl space-y-3">
                                                    <h5 className="font-black text-sm">إضافة جلسة جديدة</h5>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input type="date" placeholder="تاريخ الجلسة" className="p-3 bg-white border rounded-xl text-sm font-black" value={hearingForm.hearing_date} onChange={e => setHearingForm({...hearingForm, hearing_date: e.target.value})} />
                                                        <input type="text" placeholder="رقم الجلسة" className="p-3 bg-white border rounded-xl text-sm font-black" value={hearingForm.hearing_number} onChange={e => setHearingForm({...hearingForm, hearing_number: e.target.value})} />
                                                        <input type="text" placeholder="النتيجة" className="p-3 bg-white border rounded-xl text-sm font-black col-span-2" value={hearingForm.result} onChange={e => setHearingForm({...hearingForm, result: e.target.value})} />
                                                        <input type="date" placeholder="تاريخ الجلسة القادمة" className="p-3 bg-white border rounded-xl text-sm font-black col-span-2" value={hearingForm.next_hearing_date} onChange={e => setHearingForm({...hearingForm, next_hearing_date: e.target.value})} />
                                                        <textarea rows="2" placeholder="ملاحظات" className="p-3 bg-white border rounded-xl text-sm font-black col-span-2" value={hearingForm.notes} onChange={e => setHearingForm({...hearingForm, notes: e.target.value})}></textarea>
                                                    </div>
                                                    <button onClick={() => handleAddHearing(selectedCase.id)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-sm">إضافة الجلسة</button>
                                                </div>

                                                {/* قائمة الجلسات (نفترض وجود مجموعة case_hearings مرتبطة) */}
                                                <div className="space-y-2">
                                                    {/* سيتم جلب الجلسات من db وعرضها هنا */}
                                                    <p className="text-slate-500">قائمة الجلسات السابقة ستظهر هنا</p>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'documents' && (
                                            <div className="space-y-4">
                                                <h4 className="font-black text-lg">المستندات</h4>
                                                {/* نموذج رفع مستند جديد */}
                                                <div className="bg-slate-50 p-5 rounded-2xl space-y-3">
                                                    <h5 className="font-black text-sm">رفع مستند جديد</h5>
                                                    <input type="text" placeholder="اسم المستند" className="w-full p-3 bg-white border rounded-xl text-sm font-black" value={docForm.doc_name} onChange={e => setDocForm({...docForm, doc_name: e.target.value})} />
                                                    <select className="w-full p-3 bg-white border rounded-xl text-sm font-black" value={docForm.doc_type} onChange={e => setDocForm({...docForm, doc_type: e.target.value})}>
                                                        <option value="">نوع المستند</option>
                                                        <option value="عقد">عقد</option>
                                                        <option value="محضر شرطة">محضر شرطة</option>
                                                        <option value="حكم">حكم</option>
                                                        <option value="مذكرة">مذكرة</option>
                                                        <option value="صورة بطاقة">صورة بطاقة</option>
                                                        <option value="أخرى">أخرى</option>
                                                    </select>
                                                    <input type="file" className="w-full p-3 bg-white border rounded-xl text-sm" onChange={e => setDocForm({...docForm, file: e.target.files[0]})} />
                                                    <button onClick={() => handleAddDocument(selectedCase.id)} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-sm">رفع المستند</button>
                                                </div>
                                                {/* قائمة المستندات */}
                                                <div className="space-y-2">
                                                    <p className="text-slate-500">المستندات المرفوعة ستظهر هنا</p>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'judgments' && (
                                            <div className="space-y-4">
                                                <h4 className="font-black text-lg">الأحكام والطعون</h4>
                                                <p className="text-slate-500">سيتم عرض الأحكام هنا</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.LegalModule = LegalModule;
