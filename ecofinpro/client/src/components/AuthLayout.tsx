import type { ReactNode } from "react";

/**
 * Shared shell for every auth page (Activation, Signup, Login,
 * ForgotPassword, ResetPassword). Previously LoginPage used a dark
 * slate-900/950 theme while the other four used a light slate-50/white
 * theme — this was the main source of the "pages don't match" feedback.
 * Everything now goes through this one component.
 */
export default function AuthLayout({
        subtitle,
        children,
    }: {
        subtitle?: string;
        children: ReactNode;
    }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full" dir="rtl">
                <h1 className="text-2xl font-black mb-1 text-center">EcoFin Pro</h1>
                {subtitle && (
                <p className="text-sm text-slate-500 mb-6 text-center">{subtitle}</p>
                )}
                {children}
            </div>
        </div>
    );
}