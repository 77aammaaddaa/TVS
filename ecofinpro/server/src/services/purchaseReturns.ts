import { supabaseAdmin } from '../utils/supabase';
import { BadRequest, ServerError } from '../utils/errors';

export interface CreateReturnPayload {
    purchase_invoice_id: string;
    items: { product_id: string; quantity: number; unit_cost: number }[];
}

export const createPurchaseReturn = async (
    payload: CreateReturnPayload,
    organization_id: string,
    employee_id: string
) => {
    if (!payload.purchase_invoice_id || !payload.items || payload.items.length === 0) {
        throw BadRequest('يجب تحديد الفاتورة والعناصر المرتجعة');
    }

    // Validate invoice existence and status
    const { data: invoice } = await supabaseAdmin
        .from('purchase_invoices')
        .select('id, supplier_id, status')
        .eq('id', payload.purchase_invoice_id)
        .eq('organization_id', organization_id)
        .single();

    if (!invoice) throw BadRequest('الفاتورة غير موجودة');
    if (invoice.status === 'VOID') throw BadRequest('الفاتورة ملغاة');

    const totalAmount = payload.items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

    // Insert return header
    const { data: ret, error: retErr } = await supabaseAdmin
        .from('purchase_returns')
        .insert({
            organization_id,
            purchase_invoice_id: payload.purchase_invoice_id,
            supplier_id: invoice.supplier_id,
            total_amount: totalAmount,
            employee_id,
        })
        .select('id')
        .single();

    if (retErr || !ret) throw ServerError('فشل إنشاء مرتجع الشراء');

    // Insert return items (triggers handle stock & payable updates)
    const returnItems = payload.items.map(i => ({
        organization_id,
        purchase_return_id: ret.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
    }));

    const { error: itemsErr } = await supabaseAdmin.from('purchase_return_items').insert(returnItems);
    if (itemsErr) throw ServerError('فشل حفظ عناصر المرتجع');

    return { id: ret.id, total_amount: totalAmount };
};