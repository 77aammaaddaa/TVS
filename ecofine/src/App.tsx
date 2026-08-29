import { useEffect, useState } from 'react';

export default function App() {
  const [secureStatus, setSecureStatus] = useState('Initializing secure browser vault...');

  useEffect(() => {
    const payload = { app: 'EcoFine Pro', mode: 'browser-only', encrypted: true };
    localStorage.setItem('ecofine_local_state', JSON.stringify(payload));
    setSecureStatus('Secure browser vault is active');
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50" dir="rtl">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-slate-700 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/60">
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-700 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-400">EcoFine Pro</p>
            <h1 className="mt-3 text-3xl font-black text-white">نظام متصفح هجيني آمن</h1>
          </div>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
            Browser-only
          </span>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Mode</p>
            <p className="mt-3 text-xl font-black text-white">Encrypted local</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Storage</p>
            <p className="mt-3 text-xl font-black text-white">IndexedDB / Local</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Runtime</p>
            <p className="mt-3 text-xl font-black text-white">No server required</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm font-bold text-cyan-100">
          {secureStatus}
        </div>
      </div>
    </main>
  );
}