import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = 'ecofine_app_state_v1';

type Screen = 'splash' | 'activation' | 'setup' | 'login' | 'dashboard';

type SavedState = {
  activated: boolean;
  ownerCreated: boolean;
  currentUser: { name: string; role: string; permissions: string[] } | null;
};

const defaultState: SavedState = {
  activated: false,
  ownerCreated: false,
  currentUser: null,
};

function getStoredState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [activationCode, setActivationCode] = useState('ECOFINE-2026');
  const [activationError, setActivationError] = useState('');
  const [setupForm, setSetupForm] = useState({ fullName: 'مالك المؤسسة', username: 'admin', password: 'admin123', orgName: 'EcoFine Pro' });
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' });
  const [savedState, setSavedState] = useState<SavedState>(() => getStoredState());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const state = getStoredState();
      if (state.activated && state.ownerCreated) {
        setScreen(state.currentUser ? 'dashboard' : 'login');
      } else if (state.activated) {
        setScreen('setup');
      } else {
        setScreen('activation');
      }
    }, 1400);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
  }, [savedState]);

  const appTitle = useMemo(() => 'EcoFine Pro', []);

  const handleActivate = () => {
    if (!activationCode.trim() || activationCode.trim().length < 6) {
      setActivationError('يرجى إدخال رمز التفعيل الصحيح');
      return;
    }

    setActivationError('');
    setSavedState((prev) => ({ ...prev, activated: true }));
    setScreen('setup');
  };

  const handleSetup = () => {
    if (!setupForm.username.trim() || !setupForm.password.trim() || !setupForm.fullName.trim()) {
      setActivationError('يجب تعبئة اسم المستخدم وكلمة المرور واسم المالك');
      return;
    }

    setActivationError('');
    const user = { name: setupForm.fullName, role: 'المالك / المدير العام', permissions: ['all'] };
    setSavedState((prev) => ({ ...prev, ownerCreated: true, currentUser: user }));
    setLoginForm({ username: setupForm.username, password: setupForm.password });
    setScreen('login');
  };

  const handleLogin = () => {
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setActivationError('اسم المستخدم وكلمة المرور مطلوبان');
      return;
    }

    const user = {
      name: setupForm.fullName || 'مالك المؤسسة',
      role: 'المالك / المدير العام',
      permissions: ['all'],
    };

    setSavedState((prev) => ({ ...prev, currentUser: user }));
    setScreen('dashboard');
    setActivationError('');
  };

  const handleLogout = () => {
    setSavedState((prev) => ({ ...prev, currentUser: null }));
    setScreen('login');
  };

  const renderSplash = () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-50" dir="rtl">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/80 p-8 text-center shadow-[0_30px_80px_rgba(14,116,144,0.35)]">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 text-4xl shadow-lg shadow-cyan-500/20">⚡</div>
        <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-300">EcoFine Pro</p>
        <h1 className="mt-5 text-4xl font-black text-white">جارٍ تجهيز بيئة العمل...</h1>
        <p className="mt-4 text-sm text-slate-300">تجهيز الحماية، التفعيل، والتهيئة الأولية للمنصة</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400 [animation-delay:150ms]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400 [animation-delay:300ms]" />
        </div>
      </div>
    </main>
  );

  const renderActivation = () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6" dir="rtl">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900/90 shadow-[0_30px_80px_rgba(15,23,42,0.8)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-3xl font-black text-white">تفعيل النظام</CardTitle>
          <CardDescription className="text-sm text-slate-400">أدخل الرمز الخاص بترخيص EcoFine Pro لتفعيل النسخة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">رمز التفعيل</Label>
            <Input
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              className="border-slate-700 bg-slate-950 text-right text-base text-white placeholder:text-slate-500"
              placeholder="ECOFINE-2026"
            />
          </div>

          {activationError && <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-center text-sm font-bold text-red-300">{activationError}</div>}

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-right text-sm text-cyan-100">
            الرمز الاحتياطي: <span className="font-black">ECOFINE-2026</span>
          </div>

          <Button onClick={handleActivate} className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">
            تفعيل النظام
          </Button>
        </CardContent>
      </Card>
    </main>
  );

  const renderSetup = () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6" dir="rtl">
      <Card className="w-full max-w-xl border-slate-800 bg-slate-900/90 shadow-[0_30px_80px_rgba(15,23,42,0.8)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400" />
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-3xl font-black text-white">تأسيس حساب المالك</CardTitle>
          <CardDescription className="text-sm text-slate-400">أنشئ الحساب الأول لإدارة المؤسسة من نقطة الصفر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">اسم المؤسسة</Label>
              <Input
                value={setupForm.orgName}
                onChange={(e) => setSetupForm((prev) => ({ ...prev, orgName: e.target.value }))}
                className="border-slate-700 bg-slate-950 text-right text-white"
                placeholder="EcoFine Pro"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">اسم المالك</Label>
              <Input
                value={setupForm.fullName}
                onChange={(e) => setSetupForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="border-slate-700 bg-slate-950 text-right text-white"
                placeholder="مالك المؤسسة"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">اسم المستخدم</Label>
              <Input
                value={setupForm.username}
                onChange={(e) => setSetupForm((prev) => ({ ...prev, username: e.target.value }))}
                className="border-slate-700 bg-slate-950 text-right text-white"
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">كلمة المرور</Label>
              <Input
                type="password"
                value={setupForm.password}
                onChange={(e) => setSetupForm((prev) => ({ ...prev, password: e.target.value }))}
                className="border-slate-700 bg-slate-950 text-right text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          {activationError && <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-center text-sm font-bold text-red-300">{activationError}</div>}

          <Button onClick={handleSetup} className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400">إنشاء الحساب والبدء</Button>
        </CardContent>
      </Card>
    </main>
  );

  const renderLogin = () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6" dir="rtl">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 shadow-[0_30px_80px_rgba(15,23,42,0.8)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-3xl font-black text-white">تسجيل الدخول</CardTitle>
          <CardDescription className="text-sm text-slate-400">مرحباً بعودتك إلى {setupForm.orgName || appTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">اسم المستخدم</Label>
            <Input
              value={loginForm.username}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
              className="border-slate-700 bg-slate-950 text-right text-white"
              placeholder="admin"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">كلمة المرور</Label>
            <Input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              className="border-slate-700 bg-slate-950 text-right text-white"
              placeholder="••••••••"
            />
          </div>

          {activationError && <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-center text-sm font-bold text-red-300">{activationError}</div>}

          <Button onClick={handleLogin} className="w-full bg-blue-600 text-white hover:bg-blue-500">دخول آمن</Button>
        </CardContent>
      </Card>
    </main>
  );

  const renderDashboard = () => (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-50" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-900/80 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.8)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-400">EcoFine Pro</p>
            <h1 className="mt-2 text-3xl font-black text-white">لوحة التحكم</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">متصل</div>
            <Button variant="outline" onClick={handleLogout} className="border-slate-700 text-slate-200 hover:bg-slate-800">تسجيل الخروج</Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'المبيعات', value: '₹ 1.4M', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
            { label: 'المدفوعات', value: '₹ 840K', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
            { label: 'المخزون', value: '2,440', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
            { label: 'العملاء', value: '1,830', color: 'bg-violet-500/10 text-violet-300 border-violet-500/30' },
          ].map((item) => (
            <div key={item.label} className={`rounded-[22px] border p-5 ${item.color}`}>
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">{item.label}</p>
              <p className="mt-3 text-3xl font-black">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">النشاط الأخير</h2>
              <span className="text-xs font-bold text-slate-400">آخر 7 أيام</span>
            </div>
            <div className="space-y-4">
              {[
                ['سحب نقدي', 'مركز الخزينة', '08:30'],
                ['إضافة عميل جديد', 'CRM', '09:15'],
                ['تحديث مخزون', 'المخازن', '11:00'],
                ['تسوية عقود', 'المالية', '13:40'],
              ].map(([title, section, time]) => (
                <div key={title} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                  <div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="text-sm text-slate-400">{section}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
            <h2 className="text-xl font-black text-white">ملف المستخدم</h2>
            <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">المستخدم الحالي</p>
              <p className="mt-3 text-2xl font-black text-white">{savedState.currentUser?.name ?? 'مالك المؤسسة'}</p>
              <p className="mt-2 text-sm text-cyan-100">{savedState.currentUser?.role ?? 'المالك / المدير العام'}</p>
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-300">
              <p>الأذونات: {savedState.currentUser?.permissions?.join(' • ') ?? 'all'}</p>
              <p>الوضع: متاح</p>
              <p>النسخة: Pro Enterprise</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  const views: Record<Screen, JSX.Element> = {
    splash: renderSplash(),
    activation: renderActivation(),
    setup: renderSetup(),
    login: renderLogin(),
    dashboard: renderDashboard(),
  };

  return views[screen];
}

export default App;