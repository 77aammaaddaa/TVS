import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthLogic } from '@/hooks/useAuthLogic';
import type { ChangeEvent } from 'react';
import type { User } from '@/types/auth';

interface LoginProps {
  readonly onLoginSuccess: (user: User) => void;
  readonly orgName?: string;
}

export default function Login({ onLoginSuccess, orgName }: LoginProps) {
  const { view, username, setUsername, password, setPassword, error, isLoading, handleAuthSubmit } = useAuthLogic(onLoginSuccess);

  if (view === 'loading') {
    return null;
  }

  let submitLabel = 'دخول آمن 🚀';
  if (isLoading) {
    submitLabel = 'جاري المعالجة...';
  } else if (view === 'setup_owner') {
    submitLabel = 'إنشاء حساب المالك 🚀';
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4" dir="rtl">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 shadow-2xl">
        <div className={`h-1.5 w-full rounded-t-xl ${view === 'setup_owner' ? 'bg-amber-500' : 'bg-blue-600'}`} />

        <CardHeader className="mt-4 space-y-2 text-center">
          <CardTitle className="text-4xl font-black tracking-tighter text-white">
            Eco Fine <span className="text-blue-500">Pro</span>
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400">
            {orgName ? `الكيان: ${orgName}` : 'V14.0 Enterprise ERP'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6 text-center">
            {view === 'setup_owner' ? (
              <>
                <h2 className="mb-1 text-xl font-black text-amber-400">👑 تأسيس النظام</h2>
                <p className="text-[10px] font-bold text-slate-400">قاعدة بيانات الكيان فارغة. قم بإنشاء حساب المالك.</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-black text-white">بوابة الدخول الموحدة</h2>
                <p className="text-[10px] font-bold text-slate-400">أدخل بيانات الاعتماد للوصول لنظام المؤسسة.</p>
              </>
            )}
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="username" className="text-[10px] font-black uppercase text-slate-400">اسم المستخدم</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
                placeholder={view === 'setup_owner' ? 'مثال: admin' : 'ادخل اسم المستخدم'}
                className="border-slate-800 bg-slate-900 text-right text-white focus:border-blue-500"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2 text-right">
              <Label htmlFor="password" className="text-[10px] font-black uppercase text-slate-400">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="border-slate-800 bg-slate-900 text-right text-white focus:border-blue-500"
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-[10px] font-bold text-red-400 animate-pulse">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full font-black tracking-widest ${view === 'setup_owner' ? 'bg-amber-500 text-slate-900 hover:bg-amber-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {submitLabel}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}