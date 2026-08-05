import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { Dashboard } from '@/components/pages/Dashboard';
import { TxPage } from '@/components/pages/TxPage';
import { AssetPage } from '@/components/pages/AssetPage';
import { ActivationPage } from '@/components/pages/ActivationPage';
import { seedInitialData } from '@/db/seed';

const App: React.FC = () => {
  // التحقق من حالة التفعيل من المخزن
  const { isActivated } = useAppStore();
  
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'transactions' | 'assets' | 'liabilities'>('dashboard');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // حقن القواعد الأولية فقط إذا كان التطبيق مفعلاً
    const initDB = async () => {
      if (isActivated) {
        await seedInitialData();
      }
      setIsReady(true);
    };
    initDB();
  }, [isActivated]);

  if (!isReady) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-bold">جاري تحميل CoreBalance OS...</div>;
  }

  // --- حارس البوابة (Gatekeeper) ---
  if (!isActivated) {
    return <ActivationPage />;
  }

  return (
    <div className="relative w-full h-full max-w-md mx-auto bg-slate-50 shadow-2xl overflow-x-hidden">
      {currentTab === 'dashboard' && <Dashboard />}
      {currentTab === 'transactions' && <TxPage />}
      {currentTab === 'assets' && <AssetPage />}
      
      <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
    </div>
  );
};