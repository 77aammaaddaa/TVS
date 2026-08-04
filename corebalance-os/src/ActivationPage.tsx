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
      // محاكاة تأخير الاتصال بالسيرفر
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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* خلفية تجميلية للواجهة */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-sm z-10 text-center mb-8">
        <div className="inline-flex bg-slate-800 p-4 rounded-3xl mb-4 shadow-lg border border-slate-700">
          <ShieldCheck size={48} className="text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">CoreBalance OS</h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">نظام التشغيل المالي وإدارة الثروات</p>
      </div>

      <Card className="w-full max-w-sm bg-white/10 backdrop-blur-lg border border-white/20 p-6 shadow-2xl rounded-3xl">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <KeyRound size={20} className="text-indigo-400" />
          تفعيل النسخة
        </h2>

        <form onSubmit={handleActivation} className="flex flex-col gap-4">
          <Input 
            label="كود التفعيل (License Key)"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="CBOS-XXXX-XXXX-XXXX"
            className="bg-slate-900/50 border-slate-700 text-white placeholder-slate-500 font-mono text-center tracking-widest uppercase"
            required
            error={error}
          />
          
          <Button 
            type="submit" 
            fullWidth 
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30"
            disabled={isLoading || key.length < 10}
          >
            {isLoading ? 'جاري التحقق...' : 'تأكيد التفعيل'}
            {!isLoading && <ArrowLeft size={18} className="ml-2" />}
          </Button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-6 font-medium leading-relaxed">
          يتطلب التفعيل الأولي اتصالاً بالإنترنت للتحقق من هوية الترخيص وربط الجهاز.
        </p>
      </Card>
    </div>
  );
};