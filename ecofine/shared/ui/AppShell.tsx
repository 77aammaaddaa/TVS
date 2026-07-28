import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black">EcoFine Pro</h1>
          <p className="text-sm text-slate-500">هيكل مرن للتركيب والتطوير والتوسع</p>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
