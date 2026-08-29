import { useEffect, useState } from 'react';
import { AppShell } from '../shared/ui/AppShell';
import { appConfig } from '../shared/lib/appConfig';
import { useEcoFine } from '../shared/hooks/useEcoFine';
import { decryptText, encryptText } from './lib/crypto';

export default function App() {
  const ecoFine = useEcoFine();
  const [secureStatus, setSecureStatus] = useState('loading');

  useEffect(() => {
    void (async () => {
      const secret = 'ecofine-local-browser-key';
      const payload = 'local-session-state';
      const encrypted = await encryptText(payload, secret);
      const decrypted = await decryptText(encrypted, secret);
      setSecureStatus(decrypted === payload ? 'تم تشفير بيانات المتصفح محلياً' : 'فشل التشفير المحلي');
    })();
  }, []);

  return (
    <AppShell>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">{appConfig.appName}</h2>
        <p className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-slate-500">
          {ecoFine.message}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-400">Version</p>
            <p className="mt-2 text-lg font-black text-slate-800">{appConfig.version}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-400">Status</p>
            <p className="mt-2 text-lg font-black text-emerald-600">{ecoFine.status}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-400">Modules</p>
            <p className="mt-2 text-lg font-black text-slate-800">Dashboard, POS, CRM</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {secureStatus}
        </div>
      </div>
    </AppShell>
  );
}