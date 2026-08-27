import React, { useState } from 'react';
import { ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export const ActivationPage: React.FC = () => {
  const { activateApp } = useAppStore();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      const success = await activateApp(key);
      if (!success) {
        setError('كود التفعيل غير صالح أو منتهي الصلاحية.');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بخوادم التفعيل.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#1e293b,_#0f172a_55%)] p-4 text-white">
      <div className="absolute left-[-8%] top-[-10%] h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="absolute bottom-[-12%] right-[-8%] h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-indigo-900/20 backdrop-blur-md">
            <ShieldCheck size={46} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">CoreBalance OS</h1>
          <p className="mt-2 text-sm text-slate-300">نظام التشغيل المالي وإدارة الثروات</p>
        </div>

        <Card className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
            <KeyRound size={20} className="text-indigo-300" />
            <span>تفعيل النسخة</span>
          </div>

          <form onSubmit={handleActivation} className="space-y-4">
            <Input
              label="كود التفعيل (License Key)"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="CBOS-XXXX-XXXX-XXXX"
              className="border-slate-700 bg-slate-900/60 text-center font-mono tracking-[0.2em] text-white placeholder:text-slate-500"
              required
              error={error}
            />

            <Button
              type="submit"
              fullWidth
              className="mt-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-base font-bold text-white shadow-lg shadow-indigo-500/40 hover:from-indigo-400 hover:to-violet-400"
              disabled={isLoading || key.length < 10}
            >
              {isLoading ? 'جاري التحقق...' : 'تأكيد التفعيل'}
              {!isLoading && <ArrowLeft size={18} className="mr-2" />}
            </Button>
          </form>

          <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/30 p-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span>نسخة تجريبية</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-300">مفعلة محليًا</span>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
            يتطلب التفعيل الأولي اتصالاً بالإنترنت للتحقق من هوية الترخيص وربط الجهاز.
          </p>
        </Card>
      </div>
    </div>
  );
};