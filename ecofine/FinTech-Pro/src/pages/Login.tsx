import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthLogic } from "@/hooks/useAuthLogic";
import { User } from "@/types/auth";

interface LoginProps {
    onLoginSuccess: (user: User) => void;
    orgName?: string;
}

export default function Login({ onLoginSuccess, orgName }: LoginProps) {
    const { 
        view, username, setUsername, password, setPassword, error, isLoading, handleAuthSubmit 
    } = useAuthLogic(onLoginSuccess);

    if (view === 'loading') return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-950">
            
            {/* Dynamic Top Border */}
            <div className={`h-1.5 w-full rounded-t-xl ${view === 'setup_owner' ? 'bg-amber-500' : 'bg-blue-600'}`} />

            <CardHeader className="text-center space-y-2 mt-4">
            <CardTitle className="text-4xl font-black text-white tracking-tighter">
                Eco Fine <span className="text-blue-500">Pro</span>
            </CardTitle>
            <CardDescription className="font-bold text-blue-400 uppercase tracking-widest text-[10px]">
                {orgName ? `الكيان: ${orgName}` : 'V14.0 Enterprise ERP'}
            </CardDescription>
            </CardHeader>
            
            <CardContent>
            <div className="mb-6 text-center">
                {view === 'setup_owner' ? (
                <>
                    <h2 className="text-amber-400 font-black text-xl mb-1">👑 تأسيس النظام</h2>
                    <p className="text-slate-400 text-[10px] font-bold">قاعدة بيانات الكيان فارغة. قم بإنشاء حساب المالك.</p>
                </>
                ) : (
                <>
                    <h2 className="text-white font-black text-lg">بوابة الدخول الموحدة</h2>
                    <p className="text-slate-400 text-[10px] font-bold">أدخل بيانات الاعتماد للوصول لنظام المؤسسة.</p>
                </>
                )}
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-2 text-right">
                <Label htmlFor="username" className="text-slate-400 font-black text-[10px] uppercase">اسم المستخدم</Label>
                <Input 
                    id="username" 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={view === 'setup_owner' ? "مثال: admin" : "ادخل اسم المستخدم"} 
                    className="text-right bg-slate-900 border-slate-800 text-white focus:border-blue-500"
                    disabled={isLoading}
                    required
                />
                </div>
                
                <div className="space-y-2 text-right">
                <Label htmlFor="password" className="text-slate-400 font-black text-[10px] uppercase">كلمة المرور</Label>
                <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="text-right bg-slate-900 border-slate-800 text-white focus:border-blue-500"
                    disabled={isLoading}
                    required
                />
                </div>

                {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold text-center animate-pulse">
                    {error}
                </div>
                )}

                <Button 
                type="submit" 
                disabled={isLoading}
                className={`w-full font-black tracking-widest ${view === 'setup_owner' ? 'bg-amber-500 hover:bg-amber-600 text-slate-900' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                {isLoading ? 'جاري المعالجة...' : view === 'setup_owner' ? 'إنشاء حساب المالك 🚀' : 'دخول آمن 🚀'}
                </Button>
            </form>
            </CardContent>
        </Card>
        </div>
    );
}