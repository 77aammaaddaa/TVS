import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";
import AuthLayout from "@/components/AuthLayout";
import SubmitButton from "@/components/SubmitButton";
import { inputClass, errorClass } from "@/lib/authStyles";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await authAPI.forgotPassword({ email });
            // Always show the success state, even if the backend silently no-ops
            // for an unregistered email — this avoids leaking which emails exist.
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "فشل في إرسال رابط الاستعادة. تأكد من صحة البريد الإلكتروني.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout subtitle="تحقق من بريدك الإلكتروني">
                <p className="text-center text-sm text-slate-600 mb-4">
                    تم إرسال رابط آمن لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني.
                </p>
                <SubmitButton
                    type="button"
                    label="العودة لتسجيل الدخول"
                    onClick={() => navigate("/login")}
                    className="w-full"
                />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout subtitle="استعادة كلمة المرور">
            <form onSubmit={handleForgotPassword} className="space-y-4">
                <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                />
                {error && <p className={errorClass}>{error}</p>}
                <SubmitButton
                    label="إرسال رابط الاستعادة"
                    loadingLabel="جاري الإرسال..."
                    loading={loading}
                    className="w-full"
                />
                <p className="text-center text-xs">
                    <span className="text-slate-500">تذكرت كلمة المرور؟ </span>
                    <a href="/login" className="text-blue-600 underline">تسجيل الدخول</a>
                </p>
            </form>
        </AuthLayout>
    );
}