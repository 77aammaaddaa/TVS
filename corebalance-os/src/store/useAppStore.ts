import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EntityId } from '@/types';

interface AppState {
  activeEntity: EntityId;
  setActiveEntity: (entity: EntityId) => void;
  
  // --- إضافات نظام التفعيل ---
  isActivated: boolean;
  licenseKey: string | null;
  activateApp: (key: string) => Promise<boolean>;
  logoutLicense: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeEntity: 'Person',
      setActiveEntity: (entity) => set({ activeEntity: entity }),

      // افتراضياً التطبيق غير مفعل
      isActivated: false,
      licenseKey: null,

      activateApp: async (key: string) => {
        // محاكاة التحقق من السيرفر (API Call إلى Supabase لاحقاً)
        // حالياً: نقبل أي كود يبدأ بـ CBOS- كـ ديمو للتحقق السريع
        const isValid = key.trim().startsWith('CBOS-') && key.length > 10;
        
        if (isValid) {
          set({ isActivated: true, licenseKey: key });
          return true;
        }
        return false;
      },

      logoutLicense: () => {
        set({ isActivated: false, licenseKey: null });
      }
    }),
    {
      name: 'corebalance-app-store',
    }
  )
);