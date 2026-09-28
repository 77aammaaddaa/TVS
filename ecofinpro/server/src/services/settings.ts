// server/src/services/settings.ts
import { supabaseAdmin } from '../utils/supabase';
import { BadRequest } from '../utils/errors';

// ==================================================
// SETTINGS SERVICE - Get/Update/Reset system settings
// NOTE: No audit logging here - that's the controller's job
// ==================================================

export interface SystemSettings {
    id?: string;
    organization_id: string;
    config_data: Record<string, any>;
    last_updated?: string;
    updated_by?: string;
}

const DEFAULT_SETTINGS = {
    identity: {
        storeName: '',
        currency: 'EGP',
        themeColor: '#2563EB'
    },
    creditPolicy: {
        minScoreToEntry: 50,
        creditLimitMultiplier: 5,
        weights: {
            guarantors: 40,
            income: 30,
            residence: 20,
            identity: 10
        }
    },
    salesTerms: {
        minInvoiceAmount: 2500,
        downPaymentLogic: {
            monthly: 'ONE_MONTH_PREPAID'
        }
    },
    legalPolicy: {
        thresholds: {
            daily: 35,
            monthly: 63
        },
        banPeriodDays: 180,
        warningInterval: 10
    },
    inventory: {
        globalMinStock: 3
    }
};

export async function getSettings(organizationId: string): Promise<SystemSettings> {
    if (!organizationId) throw BadRequest('معرف المؤسسة مطلوب.');

    const { data, error } = await supabaseAdmin
        .from('system_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

    if (error) {
        throw new Error(`Database error: ${error.message}`);
    }

    // If no settings exist, return defaults
    if (!data) {
        return {
            organization_id: organizationId,
            config_data: DEFAULT_SETTINGS
        };
    }

    return data as SystemSettings;
}

export async function updateSettings(
    organizationId: string,
    configData: Record<string, any>,
    employeeId: string
): Promise<SystemSettings> {
    if (!organizationId) throw BadRequest('معرف المؤسسة مطلوب.');
    if (!configData || typeof configData !== 'object') {
        throw BadRequest('بيانات الإعدادات مطلوبة.');
    }
    if (!employeeId) throw BadRequest('معرف الموظف مطلوب.');

    // Merge with defaults to ensure all required fields exist
    const mergedConfig = {
        ...DEFAULT_SETTINGS,
        ...configData
    };

    const { data, error } = await supabaseAdmin
        .from('system_settings')
        .upsert(
            {
                organization_id: organizationId,
                config_data: mergedConfig,
                last_updated: new Date().toISOString(),
                updated_by: employeeId
            },
            { onConflict: 'organization_id' }
        )
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update settings: ${error.message}`);
    }

    return data as SystemSettings;
}

export async function resetSettings(
    organizationId: string,
    employeeId: string
): Promise<SystemSettings> {
    if (!organizationId) throw BadRequest('معرف المؤسسة مطلوب.');
    if (!employeeId) throw BadRequest('معرف الموظف مطلوب.');

    const { data, error } = await supabaseAdmin
        .from('system_settings')
        .upsert(
            {
                organization_id: organizationId,
                config_data: DEFAULT_SETTINGS,
                last_updated: new Date().toISOString(),
                updated_by: employeeId
            },
            { onConflict: 'organization_id' }
        )
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to reset settings: ${error.message}`);
    }

    return data as SystemSettings;
}