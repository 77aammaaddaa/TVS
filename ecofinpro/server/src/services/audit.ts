// server/src/services/audit.ts
//
// The central nervous system for security auditing. Handles fetching logs
// and mapping Supabase auth_ids to your employees' usernames dynamically.

import { supabaseAdmin } from '../utils/supabase';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface AuditLogRecord {
    id: string;
    organization_id: string;
    user_id: string | null;
    action: string;
    module: string;
    details: string;
    severity: 'info' | 'warning' | 'critical';
    ip_address: string | null;
    user_agent: string | null;
    timestamp: string;
    username?: string; // Appended dynamically
}

// Global helper to log actions securely from anywhere in the backend
export async function logAction(
    orgId: string, 
    userId: string | null, 
    action: string, 
    module: string, 
    details: string, 
    severity: 'info' | 'warning' | 'critical' = 'info',
    req?: any
) {
    const ip_address = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const user_agent = req?.headers?.['user-agent'] || null;

    const { error } = await supabaseAdmin.from('audit_logs').insert({
        organization_id: orgId,
        user_id: userId,
        action,
        module,
        details,
        severity,
        ip_address,
        user_agent
    });

    if (error) logger.error({ error, orgId, action, module }, 'Audit Log Failed to Write');
}

export async function getLogs(organizationId: string): Promise<AuditLogRecord[]> {
    // 1. Fetch raw logs
    const { data: logs, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('timestamp', { ascending: false })
        .limit(1000); // Prevent massive payloads, keep to recent history

    if (error) throw new AppError('فشل تحميل السجلات الأمنية.', 500, error.message);

    // 2. Fetch employee usernames to map the user_id (auth_id) to readable names
    const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('auth_id, username')
        .eq('organization_id', organizationId);

    const employeeMap = new Map();
    if (employees) {
        employees.forEach(emp => {
            if (emp.auth_id) employeeMap.set(emp.auth_id, emp.username);
        });
    }

    // 3. Hydrate logs with usernames
    return (logs || []).map(log => ({
        ...log,
        username: log.user_id ? (employeeMap.get(log.user_id) || 'النظام') : 'عملية آلية'
    }));
}

export async function clearLogs(organizationId: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .eq('organization_id', organizationId);

    if (error) throw new AppError('فشل مسح السجلات التاريخية.', 500, error.message);
}