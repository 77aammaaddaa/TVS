import { create } from 'zustand';
import { License, PlanType } from '@/types/admin';

interface AdminState {
  licenses: License[];
  generateLicense: (plan: PlanType, notes?: string) => string;
  suspendLicense: (id: string) => void;
  unbindDevice: (id: string) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  licenses: [], // سيتم جلبها لاحقاً من Supabase

  generateLicense: (plan, notes) => {
    // خوارزمية توليد كود قوي: CBOS-XXXX-XXXX-XXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const newKey = `CBOS-${segment()}-${segment()}-${segment()}`;

    const newLicense: License = {
      id: crypto.randomUUID(),
      license_key: newKey,
      plan_type: plan,
      status: 'ACTIVE',
      device_id: null,
      created_at: new Date().toISOString(),
      expires_at: plan === 'LIFETIME' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      notes
    };

    set((state) => ({ licenses: [newLicense, ...state.licenses] }));
    return newKey;
  },

  suspendLicense: (id) => {
    set((state) => ({
      licenses: state.licenses.map(lic => 
        lic.id === id ? { ...lic, status: lic.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : lic
      )
    }));
  },

  unbindDevice: (id) => {
    set((state) => ({
      licenses: state.licenses.map(lic => 
        lic.id === id ? { ...lic, device_id: null } : lic
      )
    }));
  }
}));
