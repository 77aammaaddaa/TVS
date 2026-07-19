import { useState, useEffect, useCallback } from 'react';
import { AuthView, User } from '@/types/auth';

export function useAuthLogic(onLoginSuccess: (user: User) => void) {
    const [view, setView] = useState<AuthView>('loading');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 1. Safe Activity Tracker (With Cleanup)
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const updateActivity = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (localStorage.getItem('ecofine_session')) {
            localStorage.setItem('ecofine_last_activity', Date.now().toString());
            }
        }, 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

    return () => {
        events.forEach(e => window.removeEventListener(e, updateActivity));
        clearTimeout(timeout);
        };
    }, []);

    // 2. Initial Bootstrapping Logic
    useEffect(() => {
        const checkInitialState = async () => {
        try {
            // Placeholder for your actual DB call
            const userCount = 0; // Replace with actual Supabase/IndexedDB count check
            
            if (userCount === 0) {
            setView('setup_owner');
            return;
            }

        const savedSession = localStorage.getItem('ecofine_session');
        const lastActivity = localStorage.getItem('ecofine_last_activity');

        if (savedSession && lastActivity) {
            const inactiveTimeMs = Date.now() - parseInt(lastActivity, 10);
            if (inactiveTimeMs > 30 * 60 * 1000) {
                localStorage.removeItem('ecofine_session');
                setError("تم تسجيل الخروج تلقائياً لعدم وجود تفاعل.");
            } else {
                onLoginSuccess(JSON.parse(savedSession));
                return;
            }
            }
            setView('login');
        } catch (err) {
            setView('login');
        }
        };
        checkInitialState();
    }, [onLoginSuccess]);

     // 3. Login Execution
    const handleAuthSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
        if (view === 'setup_owner') {
            if (username.length < 4 || password.length < 6) {
            throw new Error('⚠️ اسم المستخدم يجب أن يكون 4 أحرف على الأقل، وكلمة المرور 6 أحرف.');
            }
            // TODO: Replace with Supabase Insert Logic using Hashed Passwords
            console.log("Creating owner...", { username, password });
        } else {
            // TODO: Replace with Supabase Select Logic
            console.log("Logging in...", { username, password });
        }
        
        // Simulate Success
        setTimeout(() => setIsLoading(false), 1000);

        } catch (err: any) {
        setError(err.message || "❌ حدث خطأ غير متوقع");
        setIsLoading(false);
        }
    }, [username, password, view]);

    return {
        view,
        username,
        setUsername,
        password,
        setPassword,
        error,
        isLoading,
        handleAuthSubmit
    };
}