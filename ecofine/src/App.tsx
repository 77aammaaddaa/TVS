import { AppShell } from '../../shared/ui/AppShell';
import { appConfig } from '../../shared/lib/appConfig';
import { useEcoFine } from '../../shared/hooks/useEcoFine';
import { AppShell } from '../shared/ui/AppShell';
import { appConfig } from '../shared/lib/appConfig';
import { useEcoFine } from '../shared/hooks/useEcoFine';

export default function App() {
  const ecoFine = useEcoFine();

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
      </div>
    </AppShell>
  );
}