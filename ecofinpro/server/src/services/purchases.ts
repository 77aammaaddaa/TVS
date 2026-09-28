import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, NotFound, ServerError, Conflict } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';
import { createSupplier } from './suppliers';

interface PurchaseItemInput {
    product_id?: string;
    product_name?: string;
    barcode?: string;
    category_name?: string;
    cash_price: number;
    installment_price?: number;
    quantity: number;
    buy_price: number;
}

export interface CreatePurchasePayload {
    supplier_id?: string;
    new_supplier_name?: string;
    new_supplier_phone?: string;
    items: PurchaseItemInput[];
    notes?: string;
}

export const createPurchase = async (payload: CreatePurchasePayload, organization_id: string, employee_id: string) => {
    const { items, notes } = payload;

    if (!items || items.length === 0) throw BadRequest('يجب إضافة عناصر للفاتورة');

    const tx = new TransactionTracker();

    try {
        // 1. Resolve Supplier (Existing or New)
        let supplierId = payload.supplier_id;
        
        if (!supplierId && payload.new_supplier_name && payload.new_supplier_phone) {
            const newSupplier = await createSupplier({
                name: payload.new_supplier_name,
                phone: payload.new_supplier_phone
            }, organization_id);
            supplierId = newSupplier.id;
        }

        if (!supplierId) throw BadRequest('يجب تحديد المورد أو إدخال بيانات مورد جديد');

        let totalAmount = 0;
        const resolvedItems = [];

        // 2. Resolve Items & Auto-Create Products if needed
        for (const item of items) {
            if (item.quantity <= 0 || item.buy_price <= 0 || item.cash_price <= 0) {
                throw BadRequest('الكمية والأسعار يجب أن تكون أكبر من الصفر');
            }

            let productId = item.product_id;

            if (!productId && item.product_name) {
                let categoryId: string | null = null;
                
                if (item.category_name) {
                    const { data: existingCat } = await supabaseAdmin
                        .from('categories')
                        .select('id')
                        .eq('organization_id', organization_id)
                        .eq('name', item.category_name.trim())
                        .maybeSingle();

                    if (existingCat) {
                        categoryId = existingCat.id;
                    } else {
                        const { data: newCat, error: catErr } = await supabaseAdmin
                            .from('categories')
                            .insert({ organization_id, name: item.category_name.trim() })
                            .select('id')
                            .single();
                        if (catErr || !newCat) throw ServerError('فشل إنشاء التصنيف');
                        categoryId = newCat.id;
                        tx.track(async () => { await supabaseAdmin.from('categories').delete().eq('id', newCat.id); });
                    }
                }

                // Create product with 0 stock/cost. The DB trigger handles updates upon invoice approval.
                const { data: newProduct, error: prodErr } = await supabaseAdmin
                    .from('products')
                    .insert({
                        organization_id,
                        name: item.product_name.trim(),
                        barcode: item.barcode?.trim() || null,
                        category_id: categoryId,
                        cash_price: item.cash_price,
                        installment_price: item.installment_price || item.cash_price,
                        cost_price: 0, // Governed field
                        stock_quantity: 0, // Governed field
                        product_type: 'STANDARD'
                    })
                    .select('id')
                    .single();

                if (prodErr || !newProduct) throw ServerError('فشل إنشاء المنتج الجديد: ' + prodErr?.message);
                productId = newProduct.id;
                tx.track(async () => { await supabaseAdmin.from('products').delete().eq('id', newProduct.id); });
            }

            if (!productId) throw BadRequest('يجب تحديد المنتج بشكل صحيح');

            totalAmount += item.quantity * item.buy_price;

            resolvedItems.push({
                product_id: productId,
                quantity: item.quantity,
                unit_cost: item.buy_price
            });
        }

        // 3. Create Invoice (Status: PENDING)
        const { data: invoice, error: invErr } = await supabaseAdmin
            .from('purchase_invoices')
            .insert({
                organization_id,
                supplier_id: supplierId,
                total_amount: totalAmount,
                status: 'PENDING',
                notes,
            })
            .select('id')
            .single();

        if (invErr || !invoice) {
            // Include the actual database error for debugging
            throw ServerError(`فشل حفظ فاتورة المشتريات: ${invErr?.message || 'بيانات غير صالحة'}`);
        }
        tx.track(async () => { await supabaseAdmin.from('purchase_invoices').delete().eq('id', invoice.id); });

        // 4. Insert Purchase Items
        const purchaseItemsPayload = resolvedItems.map(item => ({
            organization_id,
            purchase_invoice_id: invoice.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost
        }));

        const { error: itemsErr } = await supabaseAdmin.from('purchase_items').insert(purchaseItemsPayload);
        if (itemsErr) throw ServerError('فشل حفظ أصناف الفاتورة');

        return { id: invoice.id, total_amount: totalAmount, status: 'PENDING' };

    } catch (err: any) {
        await tx.rollback();
        throw new AppError(err.message, err.statusCode || 500);
    }
};

// ==========================================
// Accounts Payable & Approval Logic
// ==========================================

export const approvePurchase = async (invoice_id: string, organization_id: string, employee_id: string) => {
    // Updating status to APPROVED fires `trg_purchase_approval` in DB
    // That trigger handles Cost Averaging, Stock Increment, and AP Debt generation automatically.
    const { data, error } = await supabaseAdmin
        .from('purchase_invoices')
        .update({ 
            status: 'APPROVED', 
            approved_by: employee_id,
            approved_at: new Date().toISOString()
        })
        .eq('id', invoice_id)
        .eq('organization_id', organization_id)
        .eq('status', 'PENDING')
        .select('id, outstanding_amount')
        .single();

    if (error || !data) throw BadRequest('الفاتورة غير موجودة أو تم التعامل معها مسبقاً');
    return data;
};

export const settlePurchaseDebt = async (invoice_id: string, vault_id: string, amount: number, organization_id: string, employee_id: string) => {
    if (amount <= 0) throw BadRequest('المبلغ يجب أن يكون أكبر من الصفر');

    // Vault check
    const { data: vault } = await supabaseAdmin.from('vaults').select('balance').eq('id', vault_id).eq('organization_id', organization_id).single();
    if (!vault || vault.balance < amount) throw BadRequest('رصيد الخزينة لا يكفي لسداد هذا المبلغ');

    // The insert into `purchase_settlements` fires `trg_process_purchase_settlement`
    // which deducts the vault and reduces outstanding_amount safely.
    const { error } = await supabaseAdmin
        .from('purchase_settlements')
        .insert({
            organization_id,
            purchase_invoice_id: invoice_id,
            vault_id,
            amount,
            employee_id
        });

    if (error) throw ServerError('فشل تسجيل الدفعة: ' + error.message);
    return { success: true };
};

export const listPurchases = async (organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('purchase_invoices')
        .select('*, supplier:suppliers(name, phone), items:purchase_items(*, product:products(name))')
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });
        
    if (error) throw ServerError('فشل تحميل المشتريات');
    return data;
};

export const rejectPurchase = async (
    invoice_id: string,
    reason: string,
    organization_id: string,
    employee_id: string
) => {
    const { data, error } = await supabaseAdmin
        .from('purchase_invoices')
        .update({
            status: 'REJECTED',
            notes: reason || null,
            approved_by: employee_id,
            approved_at: new Date().toISOString(),
        })
        .eq('id', invoice_id)
        .eq('organization_id', organization_id)
        .eq('status', 'PENDING')
        .select('id')
        .single();

    if (error || !data) throw BadRequest('الفاتورة غير موجودة أو تم التعامل معها مسبقاً');
    return data;
};