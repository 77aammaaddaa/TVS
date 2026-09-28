// Shared style tokens so every auth page (Activation, Signup, Login,
// ForgotPassword, ResetPassword) looks and behaves identically.
// Change styling in exactly one place from now on.

export const inputClass =
    "w-full p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition";

export const buttonClass =
    "w-full bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition hover:bg-blue-700";

export const errorClass = "text-red-600 text-sm text-center";

export const successClass = "text-green-600 text-sm text-center";
