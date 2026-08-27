import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { EntityId } from '@/types';

export const TopNav: React.FC = () => {
  const { activeEntity, setActiveEntity } = useAppStore();

  const entityConfig: Record<EntityId, { label: string; activeColor: string; softColor: string }> = {
    'Person': { label: 'شخصي', activeColor: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_12px_24px_rgba(59,130,246,0.28)]', softColor: 'bg-sky-50 text-sky-700' },
    'TVS': { label: 'TVS', activeColor: 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-[0_12px_24px_rgba(99,102,241,0.28)]', softColor: 'bg-violet-50 text-violet-700' },
    'Mkank Store': { label: 'مكانك ستور', activeColor: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_12px_24px_rgba(16,185,129,0.25)]', softColor: 'bg-emerald-50 text-emerald-700' }
  };

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur-xl">
      <div className="rounded-[22px] bg-slate-100 p-1.5 ring-1 ring-slate-200">
        <div className="flex items-center gap-1.5">
          {(Object.keys(entityConfig) as EntityId[]).map((entity) => {
            const isActive = activeEntity === entity;
            const config = entityConfig[entity];

            return (
              <button
                key={entity}
                type="button"
                onClick={() => setActiveEntity(entity)}
                className={`flex-1 rounded-[16px] px-2 py-2.5 text-sm font-black transition-all duration-300 touch-manipulation ${
                  isActive ? `${config.activeColor} shadow-md` : `${config.softColor} hover:bg-white`
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};