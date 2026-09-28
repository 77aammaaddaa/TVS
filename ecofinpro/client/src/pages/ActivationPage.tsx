import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";
import AuthLayout from "@/components/AuthLayout";
import SubmitButton from "@/components/SubmitButton";

export default function ActivationPage() {
    const [key, setKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await authAPI.checkLicense({ license_key: key });
            const data = response.data;

            // Save the key immediately so App.tsx's gating logic lets the
            // rest of the auth flow proceed on refresh.
            localStorage.setItem("ecofine_license_key", key);
            window.dispatchEvent(new Event('ecofine_license_key_updated'));

            if (data.is_used) {
                navigate("/login", { replace: true });
            } else {
                navigate(`/claim?key=${key}`, { replace: true });
            }
        } catch (err: any) {
            setError(err.message || "كود التفعيل غير صحيح.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout subtitle="أدخل كود التفعيل للمتابعة">
            <form onSubmit={handleCheck} className="space-y-4">
                <input
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="ECO-XXXX-XXXX"
                    className="w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition text-center font-mono text-lg"
                    dir="ltr"
                    required
                />
                {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                <SubmitButton
                    label="متابعة"
                    loading={loading}
                    loadingLabel="جاري التحقق..."
                    className="w-full bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition hover:bg-blue-700"
                />
            </form>
        </AuthLayout>
    );
}