import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { EntityId } from '@/types';

export const TopNav: React.FC = () => {
  const { activeEntity, setActiveEntity } = useAppStore();

  // الترميز اللوني لكل كيان لتحسين الوعي المالي أثناء الإدخال
  const entityConfig: Record<EntityId, { label: string; activeColor: string }> = {
    'Person': { label: 'شخصي', activeColor: 'bg-blue-600 text-white shadow-blue-200' },
    'TVS': { label: 'TVS', activeColor: 'bg-purple-600 text-white shadow-purple-200' },
    'Mkank Store': { label: 'مكانك ستور', activeColor: 'bg-emerald-600 text-white shadow-emerald-200' }
  };

  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between bg-slate-100 rounded-xl p-1 relative">
        {(Object.keys(entityConfig) as EntityId[]).map((entity) => {
          const isActive = activeEntity === entity;
          const config = entityConfig[entity];
          
          return (
            <button
              key={entity}
              type="button"
              onClick={() => setActiveEntity(entity)}
              className={`flex-1 relative z-10 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 touch-manipulation
                ${isActive ? `${config.activeColor} shadow-md` : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};