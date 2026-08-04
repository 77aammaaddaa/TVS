export type PlanType = 'LIFETIME' | 'ANNUAL' | 'TRIAL';
export type LicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';

export interface License {
  id: string;
  license_key: string;
  plan_type: PlanType;
  status: LicenseStatus;
  device_id: string | null;
  created_at: string;
  expires_at: string | null;
  notes?: string;
}
