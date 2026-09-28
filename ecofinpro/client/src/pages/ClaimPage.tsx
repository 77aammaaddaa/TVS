import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import SubmitButton from "@/components/SubmitButton";
import { inputClass, errorClass } from "@/lib/authStyles";
import { authAPI } from "@/services/api";

export default function ClaimPage() {
    const [searchParams] = useSearchParams();
    const queryLicenseKey = searchParams.get("key");
    const storedLicenseKey = localStorage.getItem("ecofine_license_key");
    const licenseKey = queryLicenseKey || storedLicenseKey;
    const navigate = useNavigate();

    const [loadingLicense, setLoadingLicense] = useState(true);
    const [orgName, setOrgName] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!licenseKey) {
            navigate("/activate", { replace: true });
            return;
        }

        (async () => {
            try {
                const response = await authAPI.checkLicense({ license_key: licenseKey });
                const data = response.data;

                const needsClaim = data.needs_claim ?? !data.is_used;

                if (!needsClaim) {
                    // The workspace is already activated; send the owner to login.
                    navigate("/login", { replace: true });
                    return;
                }
                if (!data.owner_email) {
                    setError("لم يتم العثور على بريد إلكتروني مسجل لهذا الكود. يرجى التواصل مع الدعم.");
                    return;
                }

                setOrgName(data.org_name || "");
                setOwnerEmail(data.owner_email);
            } catch (err: any) {
                setError(err.message || "كود التفعيل غير صحيح.");
            } finally {
                setLoadingLicense(false);
            }
        })();
    }, [licenseKey, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (username.trim().length < 3) {
            setError("اسم المستخدم يجب ألا يقل عن 3 أحرف.");
            return;
        }
        if (password.length < 8) {
            setError("كلمة المرور يجب ألا تقل عن 8 أحرف.");
            return;
        }
        if (password !== confirmPassword) {
            setError("كلمتا المرور غير متطابقتين.");
            return;
        }

        setSubmitting(true);
        try {
            await authAPI.activateWorkspace({
                license_key: licenseKey!,
                email: ownerEmail,
                username: username.trim(),
                password,
                confirmPassword,
            });

            navigate("/login", { replace: true });
        } catch (err: any) {
            setError(err.message || "فشل تفعيل المنشأة.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingLicense) {
        return (
            <AuthLayout subtitle="جاري التحقق من الكود...">
                <p className="text-center text-sm text-slate-500">يرجى الانتظار...</p>
            </AuthLayout>
        );
    }

    // ADD THIS GUARD BLOCK
    if (error && !orgName) {
        return (
            <AuthLayout subtitle="خطأ في التحقق">
                <p className={errorClass}>{error}</p>
                <SubmitButton
                    type="button"
                    label="العودة لصفحة التفعيل"
                    onClick={() => navigate("/activate", { replace: true })}
                    className="w-full"
                />
            </AuthLayout>
        );
    }
    return (
        <AuthLayout subtitle="أكمل إعداد حساب المالك">
            <form onSubmit={handleSubmit} className="space-y-4">
                {orgName && (
                    <h2 className="text-lg font-bold text-center -mt-2 mb-2">{orgName}</h2>
                )}

                {/* Read-only fields — pre-registered by the Super Admin */}
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">كود التفعيل</label>
                    <input value={licenseKey || ""} readOnly disabled className="w-full p-3 bg-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-center font-mono" dir="ltr" />
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">البريد الإلكتروني المسجل</label>
                    <input value={ownerEmail} readOnly disabled className="w-full p-3 bg-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" dir="ltr" />
                </div>

                <div>
                    <label className="text-xs text-slate-500 mb-1 block">اسم المستخدم</label>
                    <input
                        type="text"
                        placeholder="اسم المستخدم (3 أحرف على الأقل)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                        dir="ltr"
                        required
                        minLength={3}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">كلمة المرور</label>
                    <input
                        type="password"
                        placeholder="كلمة المرور (8 أحرف على الأقل)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                        dir="ltr"
                        required
                        minLength={8}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">تأكيد كلمة المرور</label>
                    <input
                        type="password"
                        placeholder="أعد إدخال كلمة المرور"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                        dir="ltr"
                        required
                        minLength={8}
                    />
                </div>

                {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                <SubmitButton
                    label="تفعيل المؤسسة"
                    loadingLabel="جاري التفعيل..."
                    loading={submitting}
                    className="w-full"
                />
            </form>
        </AuthLayout>
    );
}