import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";
import AuthLayout from "@/components/AuthLayout";
import SubmitButton from "@/components/SubmitButton";
import { inputClass, errorClass } from "@/lib/authStyles";

export default function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const license_key = localStorage.getItem('ecofine_license_key');
            
            if (!license_key) {
                throw new Error("لا يوجد مفتاح ترخيص. يرجى تفعيل الترخيص أولاً.");
            }

            // Login through backend API only
            const response = await authAPI.login({
                identifier,
                password,
                license_key
            });
            
            const { user: sessionUser, session } = response.data;

            // Store auth tokens (acceptable - not business data)
            localStorage.setItem('ecofine_auth_token', session.access_token);
            localStorage.setItem('ecofine_session', JSON.stringify(sessionUser));
            localStorage.setItem('ecofine_last_activity', new Date().toISOString());
            
            onLogin(sessionUser);

            if (sessionUser.isSuperAdmin) {
                navigate("/sa", { replace: true });
            } else {
                navigate("/", { replace: true });
            }
        } catch (err: any) {
            const message = err.message || err.response?.data?.message || "بيانات الدخول غير صحيحة";
            
            if (message.includes('المفتاح لا يتطابق') || message.includes('license')) {
                localStorage.removeItem('ecofine_license_key');
                localStorage.removeItem('ecofine_org_id');
                window.dispatchEvent(new Event('ecofine_license_key_updated'));
                navigate('/activate', { replace: true });
                return;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout subtitle="تسجيل الدخول">
            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="text"
                    placeholder="اسم المستخدم أو البريد الإلكتروني"
                    className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    dir="ltr"
                />
                <input type="password" placeholder="كلمة المرور" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
                {error && <p className={errorClass}>{error}</p>}
                <SubmitButton
                    label="تسجيل الدخول"
                    loadingLabel="جاري..."
                    loading={loading}
                    className="w-full"
                />
                <p className="text-center text-xs">
                    <span className="text-slate-500">نسيت كلمة المرور؟ </span>
                    <a href="/forgot-password" className="text-blue-600 underline">استعادة كلمة المرور</a>
                </p>
            </form>
        </AuthLayout>
    );
}