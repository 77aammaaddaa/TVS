// server/src/services/pos.ts
//
// POS ("Point of Sale") service. Mirrors services/users.ts's
// createEmployee(): a multi-step write wrapped in a TransactionTracker so a
// failure partway through gets undone — same shape, same discipline.
//
// ONE IMPORTANT DIFFERENCE from users.ts: two of our writes have DB
// triggers with side effects —
//   - INSERT INTO payments        -> trigger adds amount to vaults.balance
//                                     + inserts a vault_transactions row
//   - INSERT INTO inventory_transactions -> trigger adds quantity_changed
//                                     to products.stock_quantity
// (see migration 001, Section 8: process_payment_to_vault /
// update_product_stock). Deleting a payments/inventory_transactions row on
// rollback would NOT undo the trigger's effect — triggers only fire on
// INSERT here. So rollback for these two steps inserts a COMPENSATING row
// (negative amount / opposite quantity_changed) instead of deleting,
// letting the same trigger machinery reverse itself. Every other step
// (contracts, contract_items, installments) has no side-effect trigger, so
// those roll back with an ordinary delete, same as users.ts.

import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, NotFound, Conflict, Forbidden } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';
import {
    isNonEmptyString,
    isValidSaleType,
    isValidSaleItems,
    isValidPositiveNumber,
    isValidInstallmentCount,
    SaleItemInput,
} from '../utils/validation';
import { getCustomerCreditProfile } from './customers';

// ==================================================
// Types
// ==================================================
export interface CreateSalePayload {
    sale_type: 'CASH' | 'SHIPPING' | 'INSTALLMENT';
    items: SaleItemInput[];
    customer_id?: string | null; // required for SHIPPING / INSTALLMENT
    shipping_fee?: number; // SHIPPING only
    down_payment?: number; // INSTALLMENT only
    installment_count?: number; // INSTALLMENT only
    notes?: string;
}

export interface SaleResult {
    contract: {
        id: string;
        sale_type: string;
        total_amount: number;
        remaining_amount: number;
        status: string;
    };
    receipt_ref: string;
}

// ==================================================
// CREATE SALE — the critical path. Requires an OPEN shift for the calling
// employee; the shift's vault_id is what payments post against (never a
// client-supplied vault_id — that would let a cashier post cash into a
// vault they don't have a shift open on).
// ==================================================
// server/src/services/pos.ts
export async function createSale(payload: CreateSalePayload, employeeId: string, branchId: string | null, organizationId: string): Promise<SaleResult> {
    // Validate payload as before, then:
    const { data, error } = await supabaseAdmin.rpc('create_pos_sale', {
        p_organization_id: organizationId,
        p_branch_id: branchId,
        p_employee_id: employeeId,
        p_sale_type: payload.sale_type,
        p_items: payload.items,   // array of {product_id, quantity}
        p_customer_id: payload.customer_id || null,
        p_shipping_fee: payload.shipping_fee || 0,
        p_down_payment: payload.down_payment || 0,
        p_installment_count: payload.installment_count || null,
        p_notes: payload.notes || null
    });
    if (error) throw new AppError(error.message, 500);
    return {
        contract: {
            id: data.contract_id,
            sale_type: data.sale_type,
            total_amount: data.total_amount,
            remaining_amount: data.remaining_amount,
            status: data.status
        },
        receipt_ref: data.receipt_ref
    };
}

// ==================================================
// LIST SALES — history, scoped to org (optionally branch/date/type).
// ==================================================
export interface ListSalesFilters {
    branch_id?: string;
    sale_type?: string;
    from?: string;
    to?: string;
}

export async function listSales(organizationId: string, filters: ListSalesFilters) {
    let query = supabaseAdmin
        .from('contracts')
        .select(
            'id, sale_type, total_amount, remaining_amount, status, branch_id, customer_id, employee_id, created_at'
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (filters.branch_id) query = query.eq('branch_id', filters.branch_id);
    if (filters.sale_type) query = query.eq('sale_type', filters.sale_type);
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data, error } = await query;
    if (error) throw new AppError('فشل تحميل سجل المبيعات.', 500, error.message);
    return data || [];
}

// ==================================================
// CATALOG READS — products/categories/vaults for the POS register UI.
// Read-only, org-scoped. Full inventory CRUD (creating/editing products,
// categories, suppliers) is a separate module — this is only what the
// register screen needs to load its grid and let a cashier pick a vault
// when opening a shift.
// ==================================================
export async function listAvailableProducts(organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('products')
        .select(
            'id, name, sku, unit, category_id, stock_quantity, cash_price, installment_price, cost_price, categories(name)'
        )
        .eq('organization_id', organizationId)
        .gt('stock_quantity', 0)
        .order('name', { ascending: true });
    if (error) throw new AppError('فشل تحميل قائمة المنتجات.', 500, error.message);
    return (data || []).map((p: any) => ({
        ...p,
        category_name: p.categories?.name || null,
        categories: undefined,
    }));
}

export async function listCategories(organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });
    if (error) throw new AppError('فشل تحميل التصنيفات.', 500, error.message);
    return data || [];
}

export async function listVaults(organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('vaults')
        .select('id, name, balance, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true });
    if (error) throw new AppError('فشل تحميل قائمة الخزائن.', 500, error.message);
    return data || [];
}