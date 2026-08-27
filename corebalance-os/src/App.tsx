import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { Dashboard } from '@/components/pages/Dashboard';
import { TxPage } from '@/components/pages/TxPage';
import { AssetPage } from '@/components/pages/AssetPage';
import { ActivationPage } from '@/components/pages/ActivationPage';
import { seedInitialData } from '@/db/seed';

export const App: React.FC = () => {
  const { isActivated } = useAppStore();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'transactions' | 'assets' | 'liabilities'>('dashboard');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      if (isActivated) {
        await seedInitialData();
      }
      setIsReady(true);
    };
    initDB();
  }, [isActivated]);

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#1e293b,_#0f172a_60%)] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-400" />
          <div className="text-lg font-bold tracking-wide">جاري تحميل CoreBalance OS...</div>
        </div>
      </div>
    );
  }

  if (!isActivated) {
    return <ActivationPage />;
  }

  return (
    <div className="relative min-h-screen w-full bg-transparent px-0 py-0">
      <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col overflow-hidden bg-transparent app-shell">
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'transactions' && <TxPage />}
        {currentTab === 'assets' && <AssetPage />}
        {currentTab === 'liabilities' && <div className="min-h-screen bg-slate-50 p-4">الخصوم</div>}

        <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
      </div>
    </div>
  );
};