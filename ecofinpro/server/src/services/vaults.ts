import { supabaseAdmin } from '../utils/supabase';
import { BadRequest, ServerError } from '../utils/errors';

// ── List all vaults (management) ───────────────────────────
export const listAllVaults = async (organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('vaults')
        .select('id, name, balance, is_main_vault, is_active, created_at')
        .eq('organization_id', organization_id)
        .order('is_main_vault', { ascending: false })
        .order('name');

    if (error) throw ServerError('فشل تحميل الخزائن');
    return data || [];
};

// ── Create sub‑vault ───────────────────────────────────────
export const createVault = async (organization_id: string, payload: { name: string }) => {
    const { name } = payload;
    if (!name || !name.trim()) throw BadRequest('اسم الخزينة مطلوب');

    const { data, error } = await supabaseAdmin
        .from('vaults')
        .insert({
            organization_id,
            name: name.trim(),
            is_main_vault: false,
            is_active: true,
            balance: 0,
        })
        .select('id, name, balance, is_main_vault, is_active, created_at')
        .single();

    if (error) throw ServerError('فشل إنشاء الخزينة');
    return data;
};

// ── Update vault (main vault protected) ───────────────────
export const updateVault = async (
    organization_id: string,
    vault_id: string,
    payload: { name?: string; is_active?: boolean }
) => {
    const { data: vault } = await supabaseAdmin
        .from('vaults')
        .select('is_main_vault')
        .eq('id', vault_id)
        .eq('organization_id', organization_id)
        .single();

    if (!vault) throw BadRequest('الخزينة غير موجودة');
    if (vault.is_main_vault) throw BadRequest('لا يمكن تعديل الخزينة الرئيسية');

    const updates: Record<string, any> = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;

    const { data, error } = await supabaseAdmin
        .from('vaults')
        .update(updates)
        .eq('id', vault_id)
        .eq('organization_id', organization_id)
        .select('id, name, balance, is_main_vault, is_active, created_at')
        .single();

    if (error) throw ServerError('فشل تحديث الخزينة');
    return data;
};

// ── Transfer (uses DB function) ────────────────────────────
export const transfer = async (
    organization_id: string,
    employee_id: string,
    payload: { source_vault_id: string; destination_vault_id: string; amount: number; description?: string }
) => {
    const { source_vault_id, destination_vault_id, amount, description } = payload;
    if (source_vault_id === destination_vault_id) throw BadRequest('لا يمكن التحويل لنفس الخزينة');
    if (amount <= 0) throw BadRequest('المبلغ يجب أن يكون أكبر من الصفر');

    const { error } = await supabaseAdmin.rpc('transfer_between_vaults', {
        p_org_id: organization_id,
        p_from_vault: source_vault_id,
        p_to_vault: destination_vault_id,
        p_amount: amount,
        p_employee_id: employee_id,
        p_description: description || null,
    });

    if (error) {
        if (error.message?.includes('Insufficient')) throw BadRequest('رصيد الخزينة لا يكفي');
        throw ServerError('فشل التحويل');
    }
};

// ── Ledger ─────────────────────────────────────────────────
export const getLedger = async (
    organization_id: string,
    vault_id: string,
    filters?: { from?: string; to?: string; transaction_type?: string; limit?: number }
) => {
    let query = supabaseAdmin
        .from('vault_transactions')
        .select(`
            id, amount, transaction_type, source_vault_id, destination_vault_id,
            description, created_at,
            employee:employees ( person:persons (full_name) )
        `)
        .eq('organization_id', organization_id)
        .or(`source_vault_id.eq.${vault_id},destination_vault_id.eq.${vault_id}`)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

    if (filters?.from) query = query.gte('created_at', filters.from);
    if (filters?.to) query = query.lte('created_at', filters.to);
    if (filters?.transaction_type) query = query.eq('transaction_type', filters.transaction_type);

    const { data, error } = await query;
    if (error) throw ServerError('فشل تحميل سجل الحركات');
    return data;
};