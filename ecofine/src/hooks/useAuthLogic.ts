import { useCallback, useEffect, useState } from 'react';
import type { AuthView, User } from '@/types/auth';

export function useAuthLogic(onLoginSuccess: (user: User) => void) {
  const [view, setView] = useState<AuthView>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('ecofine_session');
    if (savedSession) {
      try {
        const parsedUser = JSON.parse(savedSession) as User;
        onLoginSuccess(parsedUser);
      } catch {
        localStorage.removeItem('ecofine_session');
      }
    }
  }, [onLoginSuccess]);

  const handleAuthSubmit = useCallback(
    async (event: { preventDefault: () => void }) => {
      event.preventDefault();
      setError('');
      setIsLoading(true);

      try {
        if (!username.trim() || !password.trim()) {
          throw new Error('اسم المستخدم وكلمة المرور مطلوبان.');
        }

        const user: User = {
          id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
          username: username.trim(),
          role: 'OWNER',
          permissions: ['*'],
          active: true,
          created_at: new Date().toISOString(),
        };

        localStorage.setItem('ecofine_session', JSON.stringify(user));
        onLoginSuccess(user);
        setView('login');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onLoginSuccess, password, username],
  );

  return {
    view,
    username,
    setUsername,
    password,
    setPassword,
    error,
    isLoading,
    handleAuthSubmit,
  };
}