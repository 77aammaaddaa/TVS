import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, ServerError } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface CreateSupplierPayload {
    name: string;
    phone: string;
    address?: string;
    category?: string;          // optional – will be stored if column exists
}

export interface UpdateSupplierPayload {
    name?: string;
    phone?: string;
    address?: string;
    category?: string;
}

// ------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------
export const createSupplier = async (payload: CreateSupplierPayload, organization_id: string) => {
    if (!payload.name || !payload.phone) {
        throw BadRequest('اسم المورد ورقم الهاتف مطلوبان');
    }

    const tx = new TransactionTracker();
    const personId = crypto.randomUUID();

    try {
        // 1. Insert person
        const { error: personErr } = await supabaseAdmin
            .from('persons')
            .insert({
                id: personId,
                organization_id,
                full_name: payload.name.trim(),
                phone: payload.phone.trim(),
                address: payload.address?.trim() || null,
            });

        if (personErr) {
            throw new AppError('فشل إنشاء السجل الأساسي للمورد', 500, personErr.message);
        }

        tx.track(async () => {
            await supabaseAdmin.from('persons').delete().eq('id', personId);
        });

        // 2. Insert supplier (using same id)
        const { data: supplier, error: suppErr } = await supabaseAdmin
            .from('suppliers')
            .insert({
                id: personId,
                organization_id,
                name: payload.name.trim(),
                phone: payload.phone.trim(),
                address: payload.address?.trim() || null,
                category: payload.category?.trim() || 'عام',   // will be ignored if column doesn't exist
            })
            .select('id, name, phone, address, category, created_at')
            .single();

        if (suppErr || !supplier) {
            throw new AppError('فشل إنشاء حساب المورد', 500, suppErr?.message);
        }

        return supplier;
    } catch (err: any) {
        await tx.rollback();
        throw err;
    }
};

// ------------------------------------------------------------------
// LIST (with optional search)
// ------------------------------------------------------------------
export const listSuppliers = async (organization_id: string, search?: string) => {
    let query = supabaseAdmin
        .from('suppliers')
        .select('id, name, phone, address, category, is_active, created_at')
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });

    if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw ServerError('فشل تحميل الموردين');
    return data || [];
};

// ------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------
export const updateSupplier = async (
    id: string,
    payload: UpdateSupplierPayload,
    organization_id: string
) => {
    // Only allow updating allowed fields
    const updates: Record<string, any> = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.phone !== undefined) updates.phone = payload.phone.trim();
    if (payload.address !== undefined) updates.address = payload.address.trim();
    if (payload.category !== undefined) updates.category = payload.category.trim();

    const { data, error } = await supabaseAdmin
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', organization_id)
        .select('id, name, phone, address, category, created_at')
        .single();

    if (error || !data) throw ServerError('فشل تحديث بيانات المورد');
    return data;
};

// ------------------------------------------------------------------
// DEACTIVATE (soft‑delete)
// ------------------------------------------------------------------
export const deactivateSupplier = async (id: string, organization_id: string) => {
    // 1. Check outstanding purchase invoices
    const { data: invoices, error: invErr } = await supabaseAdmin
        .from('purchase_invoices')
        .select('id')
        .eq('supplier_id', id)
        .eq('organization_id', organization_id)
        .neq('status', 'VOID')
        .gt('outstanding_amount', 0)
        .limit(1);

    if (invErr) throw ServerError('فشل التحقق من الفواتير المستحقة');
    if (invoices && invoices.length > 0) {
        throw BadRequest('لا يمكن تعطيل المورد – توجد فواتير شراء غير مسددة');
    }

    const { error } = await supabaseAdmin
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)
        .eq('organization_id', organization_id);

    if (error) throw ServerError('فشل تعطيل المورد');
};

export const getSupplierOutstanding = async (supplierId: string, organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('purchase_invoices')
        .select('id, total_amount, amount_paid, outstanding_amount, status, created_at')
        .eq('supplier_id', supplierId)
        .eq('organization_id', organization_id)
        .neq('status', 'VOID')
        .gt('outstanding_amount', 0)
        .order('created_at', { ascending: true });

    if (error) throw ServerError('فشل تحميل كشف الحساب');
    const totalOutstanding = data.reduce((sum, inv) => sum + Number(inv.outstanding_amount), 0);
    return { invoices: data, totalOutstanding };
};