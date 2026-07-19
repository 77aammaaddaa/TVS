export type Role = 'OWNER' | 'MODERATOR' | 'CASHIER' | 'COLLECTOR' | 'LAWYER' | 'ACCOUNTANT' | 'HR_MANAGER' | 'WH_MANAGER';

export type AuthView = 'loading' | 'login' | 'setup_owner';

export interface User {
    id: string;
    username: string;
    role: Role;
    permissions: string[];
    active: boolean;
    created_at: string;
}

export const ROLE_DEFINITIONS: Record<Role, { label: string; color: string }> = {
    OWNER: { label: 'المالك / المدير العام', color: 'bg-slate-900' },
    MODERATOR: { label: 'مدير النظام (Admin)', color: 'bg-blue-600' },
    CASHIER: { label: 'مسؤول خزينة وعقود', color: 'bg-teal-600' },
    COLLECTOR: { label: 'محصل ميداني', color: 'bg-green-600' },
    LAWYER: { label: 'الشؤون القانونية', color: 'bg-red-600' },
    ACCOUNTANT: { label: 'محاسب مالي', color: 'bg-amber-600' },
    HR_MANAGER: { label: 'مدير موارد بشرية', color: 'bg-purple-600' },
    WH_MANAGER: { label: 'مدير مخازن', color: 'bg-orange-600' }
};