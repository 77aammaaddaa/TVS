import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, Forbidden, ServerError } from '../utils/errors';

export async function getActiveShift(employeeId: string, organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('shift_sessions')
        .select('id, branch_id, vault_id, opened_at, starting_balance, status')
        .eq('employee_id', employeeId)
        .eq('organization_id', organizationId)
        .eq('status', 'OPEN')
        .maybeSingle();

    if (error) throw ServerError('فشل التحقق من الوردية النشطة');
    return data || null;
}

export async function openShift(
    vaultId: string,
    startingBalance: number,
    branchId: string | null,
    employeeId: string,
    organizationId: string
) {
    const existing = await getActiveShift(employeeId, organizationId);
    if (existing) {
        throw BadRequest('الموظف لديه وردية مفتوحة بالفعل');
    }

    const { data, error } = await supabaseAdmin
        .from('shift_sessions')
        .insert({
            organization_id: organizationId,
            branch_id: branchId,
            employee_id: employeeId,
            vault_id: vaultId,
            starting_balance: startingBalance,
            status: 'OPEN',
        })
        .select('id, vault_id, opened_at, starting_balance, status')
        .single();

    if (error) {
        // PL/pgSQL RAISE EXCEPTION returns code 'P0001'. We also check the specific Arabic message.
        if (error.code === 'P0001' || error.message?.includes('الحد الأقصى لعدد الورديات')) {
            throw BadRequest('لا يمكن فتح أكثر من ورديتين نشطتين في نفس الفرع');
        }
        throw ServerError(`فشل فتح الوردية: ${error.message}`);
    }

    return data;
}

export async function closeShift(
    shiftId: string,
    actualClosingBalance: number,
    notes: string | null,
    employeeId: string,
    organizationId: string
) {
    const { data: shift, error: fetchError } = await supabaseAdmin
        .from('shift_sessions')
        .select('id, vault_id, employee_id, status')
        .eq('id', shiftId)
        .eq('organization_id', organizationId)
        .single();

    if (fetchError || !shift) throw new AppError('الوردية غير موجودة', 404);
    if (shift.employee_id !== employeeId) throw Forbidden('لا يمكن إغلاق وردية موظف آخر');
    if (shift.status !== 'OPEN') throw BadRequest('الوردية مغلقة بالفعل');

    const { data: vault, error: vaultError } = await supabaseAdmin
        .from('vaults')
        .select('balance')
        .eq('id', shift.vault_id)
        .single();

    if (vaultError || !vault) throw ServerError('تعذر قراءة رصيد الخزينة');

    const expectedClosingBalance = Number(vault.balance);

    const { data: updated, error: updateError } = await supabaseAdmin
        .from('shift_sessions')
        .update({
            closed_at: new Date().toISOString(),
            expected_closing_balance: expectedClosingBalance,
            actual_closing_balance: actualClosingBalance,
            notes: notes || null,
            status: 'CLOSED',
        })
        .eq('id', shiftId)
        .select('id, expected_closing_balance, actual_closing_balance, difference_amount, status')
        .single();

    if (updateError) throw ServerError(`فشل إغلاق الوردية: ${updateError.message}`);

    return updated;
}

export async function listHistoricalShifts(organizationId: string, branchId?: string | null) {
    let query = supabaseAdmin
        .from('shift_sessions')
        .select(`
            id, branch_id, employee_id, vault_id, opened_at, closed_at,
            starting_balance, expected_closing_balance, actual_closing_balance,
            difference_amount, status, notes, shortage_status, transferred_to_vault,
            employee:employees ( id, person:persons ( full_name ) ),
            vault:vaults ( id, name )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'CLOSED')
        .order('closed_at', { ascending: false });

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) throw ServerError('فشل تحميل سجل الورديات');

    return data || [];
}