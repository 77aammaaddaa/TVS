import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, ServerError } from '../utils/errors';

export const listProducts = async (organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
            id, name, sku, barcode, product_type, unit, category_id, 
            stock_quantity, cash_price, installment_price, cost_price, 
            category:categories(name)
        `)
        .eq('organization_id', organization_id)
        .order('name');
        
    if (error) throw ServerError('فشل تحميل المنتجات');
    
    return (data || []).map((p: any) => ({
        ...p,
        category_name: p.category?.name || null,
        category: undefined,
    }));
};

export const listCategories = async (organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('categories')
        .select('id, name, description')
        .eq('organization_id', organization_id)
        .order('name');
        
    if (error) throw ServerError('فشل تحميل التصنيفات');
    return data || [];
};

export interface UpdateProductDetailsPayload {
    name?: string;
    barcode?: string;
    sku?: string;
    cash_price?: number;
    installment_price?: number;
    category_id?: string;
    // NOTICE: cost_price and stock_quantity are INTENTIONALLY excluded here.
}

export const updateProductDetails = async (product_id: string, payload: UpdateProductDetailsPayload, organization_id: string) => {
    if (Object.keys(payload).length === 0) throw BadRequest('لا توجد بيانات للتحديث');

    // Prevent passing restricted fields directly
    if ('cost_price' in payload || 'stock_quantity' in payload || 'product_type' in payload) {
        throw BadRequest('غير مسموح بتعديل التكلفة أو الكمية أو نوع المنتج من هذه الواجهة. يرجى استخدام فواتير المشتريات أو المرتجعات.');
    }

    const { error } = await supabaseAdmin
        .from('products')
        .update(payload)
        .eq('id', product_id)
        .eq('organization_id', organization_id);

    if (error) throw ServerError('فشل تحديث بيانات المنتج: ' + error.message);
    return { success: true };
};