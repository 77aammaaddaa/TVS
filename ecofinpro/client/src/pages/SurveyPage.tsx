import { useState, useEffect, useRef } from "react";
import { FileText, Plus, Camera, CheckCircle, XCircle, MapPin, Loader2, AlertCircle, ClipboardList } from "lucide-react";
import { surveysAPI, customersAPI, type CustomerRecord, type SurveyRecord } from "@/services/api";
import type { User } from "@/types/auth";

interface SurveyPageProps {
    currentUser: User;
}

const CRITERIA_LABELS: Record<string, string> = {
    housing_quality: "جودة السكن",
    neighborhood_quality: "جودة الحي",
    income_stability: "استقرار الدخل",
    employment_status: "الحالة الوظيفية",
    property_ownership: "ملكية العقار",
    overall_impression: "الانطباع العام",
};

const initialCriteria = {
    housing_quality: 5,
    neighborhood_quality: 5,
    income_stability: 5,
    employment_status: 5,
    property_ownership: 5,
    overall_impression: 5,
};

export default function SurveyPage({ currentUser }: SurveyPageProps) {
    const isModerator = currentUser.role === "OWNER" || currentUser.role === "MODERATOR";
    const [tab, setTab] = useState<"create" | "list">("list");
    const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [guarantorMode, setGuarantorMode] = useState<"existing" | "new">("existing");
    const [existingGuarantorId, setExistingGuarantorId] = useState("");
    const [newGuarantorName, setNewGuarantorName] = useState("");
    const [newGuarantorPhone, setNewGuarantorPhone] = useState("");
    const [criteria, setCriteria] = useState(initialCriteria);
    const [recommendation, setRecommendation] = useState("");
    const [photos, setPhotos] = useState<File[]>([]);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [gps, setGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);

    const photoInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        setLoading(true);
        try {
        const [custRes, survRes] = await Promise.all([customersAPI.list(), surveysAPI.list()]);
        setCustomers(custRes.data.customers);
        setSurveys(survRes.data.surveys || []);
        } catch (err: any) {
        setError(err.message);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const captureGPS = () => {
        setGpsLoading(true);
        setGpsError(null);
        if (!navigator.geolocation) {
        setGpsError("المتصفح لا يدعم تحديد الموقع");
        setGpsLoading(false);
        return;
        }
        navigator.geolocation.getCurrentPosition(
        (pos) => {
            setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
            setGpsLoading(false);
        },
        (err) => {
            setGpsError("تعذر الحصول على الموقع: " + err.message);
            setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setPhotos(Array.from(e.target.files));
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setSignatureFile(e.target.files[0]);
    };

    const handleCreateSurvey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !gps) return setError("يجب اختيار العميل وتحديد الموقع");

        setLoading(true);
        setError(null);
        try {
        const payload: any = {
            customer_id: selectedCustomer,
            latitude: gps.lat,
            longitude: gps.lng,
            gps_accuracy: gps.accuracy,
            ...criteria,
            recommendation,
            photos,
            signature: signatureFile || undefined,
        };

        if (guarantorMode === "existing") {
            if (!existingGuarantorId) throw new Error("يجب اختيار الضامن");
            payload.guarantor_id = existingGuarantorId;
        } else {
            if (!newGuarantorName || !newGuarantorPhone) throw new Error("اسم ورقم الضامن مطلوبان");
            payload.new_guarantor_name = newGuarantorName;
            payload.new_guarantor_phone = newGuarantorPhone;
        }

        await surveysAPI.create(payload);
        setSuccess("تم رفع الاستبيان بنجاح وهو قيد المراجعة");
        
        setSelectedCustomer("");
        setExistingGuarantorId("");
        setNewGuarantorName("");
        setNewGuarantorPhone("");
        setCriteria(initialCriteria);
        setRecommendation("");
        setPhotos([]);
        setSignatureFile(null);
        setGps(null);
        loadData();
        } catch (err: any) {
        setError(err.message);
        } finally {
        setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
        await surveysAPI.approve(id);
        setSuccess("تمت الموافقة على الاستبيان وتحديث درجة العميل");
        loadData();
        } catch (err: any) {
        setError(err.message);
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt("سبب الرفض (اختياري):");
        try {
        await surveysAPI.reject(id, reason || undefined);
        setSuccess("تم رفض الاستبيان");
        loadData();
        } catch (err: any) {
        setError(err.message);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans" dir="rtl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <ClipboardList className="text-blue-600" /> الاستبيانات الميدانية
            </h2>
            <p className="text-sm text-gray-500 mt-1">
                {isModerator ? "مراجعة وتقييم الاستبيانات" : "إنشاء استبيانات جديدة للعملاء"}
            </p>
            </div>
            {!isModerator && (
            <button onClick={() => setTab(tab === "create" ? "list" : "create")} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-5 h-5" /> {tab === "create" ? "عرض السجل" : "استبيان جديد"}
            </button>
            )}
        </div>

        {error && <div className="p-4 mb-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {error}</div>}
        {success && <div className="p-4 mb-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-2"><CheckCircle className="w-5 h-5" /> {success}</div>}

        {!isModerator && tab === "create" && (
            <form onSubmit={handleCreateSurvey} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-bold text-lg">بيانات الاستبيان</h3>
            
            <div>
                <label className="block text-sm font-medium mb-1">العميل *</label>
                <select required className="w-full p-3 border rounded-xl" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="">اختر العميل</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} – {c.phone}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">الضامن</label>
                <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setGuarantorMode("existing")} className={`px-3 py-1 rounded ${guarantorMode === "existing" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>موجود</button>
                <button type="button" onClick={() => setGuarantorMode("new")} className={`px-3 py-1 rounded ${guarantorMode === "new" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>جديد</button>
                </div>
                {guarantorMode === "existing" ? (
                <select className="w-full p-3 border rounded-xl" value={existingGuarantorId} onChange={(e) => setExistingGuarantorId(e.target.value)}>
                    <option value="">اختر الضامن</option>
                </select>
                ) : (
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="اسم الضامن" className="p-3 border rounded-xl" value={newGuarantorName} onChange={(e) => setNewGuarantorName(e.target.value)} />
                    <input type="tel" placeholder="رقم الهاتف" className="p-3 border rounded-xl" value={newGuarantorPhone} onChange={(e) => setNewGuarantorPhone(e.target.value)} />
                </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button type="button" onClick={captureGPS} disabled={gpsLoading} className="bg-gray-100 px-4 py-2 rounded-xl flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {gps ? "تم تحديد الموقع" : "تحديد الموقع"}
                </button>
                {gps && <span className="text-sm">({gps.lat.toFixed(6)}, {gps.lng.toFixed(6)})</span>}
                {gpsError && <span className="text-red-500 text-sm">{gpsError}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                <div key={key}>
                    <label className="block text-sm mb-1">{label} (1-10)</label>
                    <input type="number" min={1} max={10} value={criteria[key as keyof typeof criteria]} onChange={(e) => setCriteria({ ...criteria, [key]: Number(e.target.value) })} className="w-full p-2 border rounded-lg" />
                </div>
                ))}
            </div>

            <textarea placeholder="توصيات (اختياري)" className="w-full p-3 border rounded-xl" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />

            <div className="space-y-4">
                <div>
                <input type="file" multiple accept="image/*" ref={photoInputRef} onChange={handlePhotoChange} className="hidden" />
                <button type="button" onClick={() => photoInputRef.current?.click()} className="bg-gray-100 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Camera className="w-4 h-4" /> {photos.length > 0 ? `${photos.length} صور` : "اختيار صور"}
                </button>
                </div>
                <div>
                <input type="file" accept="image/*" ref={signatureInputRef} onChange={handleSignatureChange} className="hidden" />
                <button type="button" onClick={() => signatureInputRef.current?.click()} className="bg-gray-100 px-4 py-2 rounded-xl flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {signatureFile ? signatureFile.name : "رفع التوقيع"}
                </button>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin inline" /> : "إرسال الاستبيان"}
            </button>
            </form>
        )}

        {tab === "list" && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-6">
            <table className="w-full text-sm">
                <thead className="bg-gray-50">
                <tr>
                    <th className="p-3 text-right">العميل</th>
                    <th className="p-3 text-right">الضامن</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-center">إجراءات</th>
                </tr>
                </thead>
                <tbody className="divide-y">
                {surveys.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                    <td className="p-3">{s.customer?.full_name}</td>
                    <td className="p-3">{s.guarantor?.full_name || "—"}</td>
                    <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        s.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        s.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{s.status}</span>
                    </td>
                    <td className="p-3">{new Date(s.created_at).toLocaleDateString("ar-EG")}</td>
                    <td className="p-3 flex justify-center gap-2">
                        {isModerator && s.status === 'PENDING' && (
                        <>
                            <button onClick={() => handleApprove(s.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                            <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReject(s.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                            <XCircle className="w-4 h-4" />
                            </button>
                        </>
                        )}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
        </div>
    );
}