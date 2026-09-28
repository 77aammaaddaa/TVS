import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest } from '../utils/errors';
import * as XLSX from 'xlsx';

const ALLOWED_TABLES = ['customers', 'products', 'suppliers'];

// ------------------------------------------------------------
// Parse spreadsheet (unchanged)
// ------------------------------------------------------------
function parseSpreadsheet(fileBuffer: Buffer, fileName: string): string[][] {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as string[][];
    }
    const text = fileBuffer.toString('utf-8');
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as string[][];
}

// ------------------------------------------------------------
// Duplicate check helpers
// ------------------------------------------------------------
async function checkCustomerDuplicate(orgId: string, record: any): Promise<boolean> {
    if (record.national_id) {
        const { data } = await supabaseAdmin
            .from('persons')
            .select('id')
            .eq('organization_id', orgId)
            .eq('national_id', record.national_id)
            .maybeSingle();
        return !!data;
    }
    if (record.phone) {
        const { data } = await supabaseAdmin
            .from('persons')
            .select('id')
            .eq('organization_id', orgId)
            .eq('phone', record.phone)
            .maybeSingle();
        return !!data;
    }
    return false; // no key – treat as new
}

async function checkSupplierDuplicate(orgId: string, record: any): Promise<boolean> {
    if (record.phone) {
        const { data } = await supabaseAdmin
            .from('persons')
            .select('id')
            .eq('organization_id', orgId)
            .eq('phone', record.phone)
            .maybeSingle();
        return !!data;
    }
    return false;
}

async function checkProductDuplicate(orgId: string, record: any): Promise<boolean> {
    const sku = record.sku;
    const barcode = record.barcode;
    if (sku) {
        const { data } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('organization_id', orgId)
            .eq('sku', sku)
            .maybeSingle();
        if (data) return true;
    }
    if (barcode) {
        const { data } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('organization_id', orgId)
            .eq('barcode', barcode)
            .maybeSingle();
        return !!data;
    }
    return false;
}

// ------------------------------------------------------------
// MAIN IMPORT
// ------------------------------------------------------------
export async function importData(
    organizationId: string,
    table: string,
    fileBuffer: Buffer,
    fileName: string,
    mapping: Record<string, string>
) {
    if (!ALLOWED_TABLES.includes(table)) {
        throw BadRequest(`الجدول ${table} غير مدعوم للاستيراد.`);
    }

    // 1. Check one-time import lock
    const { data: importLog } = await supabaseAdmin
        .from('data_imports')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('table_name', table)
        .maybeSingle();

    if (importLog) {
        throw BadRequest(`تم استيراد بيانات ${table} مسبقاً. لا يمكن الاستيراد مرة أخرى.`);
    }

    const rows = parseSpreadsheet(fileBuffer, fileName);
    if (rows.length < 2) throw BadRequest('الملف فارغ أو لا يحتوي على بيانات.');

    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);

    // 2. Map rows to records
    const mappedRows: any[] = [];
    for (const row of dataRows) {
        if (row.every((cell: any) => cell === '' || cell === null || cell === undefined)) continue;
        let record: any = {};
        let hasData = false;
        for (const [dbField, csvHeader] of Object.entries(mapping)) {
            if (!csvHeader) continue;
            const colIndex = headers.indexOf(csvHeader);
            if (colIndex !== -1 && row[colIndex] !== undefined && row[colIndex] !== '') {
                let value: any = row[colIndex];
                if (['stock_quantity', 'cost_price', 'cash_price', 'installment_price', 'monthly_income'].includes(dbField)) {
                    value = Number(value) || 0;
                }
                record[dbField] = value;
                hasData = true;
            }
        }
        if (hasData) mappedRows.push(record);
    }

    if (mappedRows.length === 0) throw BadRequest('لم يتم العثور على أي بيانات صالحة بعد المطابقة.');

    // 3. Deduplicate
    const freshRows: any[] = [];
    const duplicateCount = 0;
    for (const row of mappedRows) {
        let isDuplicate = false;
        if (table === 'customers') {
            isDuplicate = await checkCustomerDuplicate(organizationId, row);
        } else if (table === 'suppliers') {
            isDuplicate = await checkSupplierDuplicate(organizationId, row);
        } else if (table === 'products') {
            isDuplicate = await checkProductDuplicate(organizationId, row);
        }
        if (!isDuplicate) {
            freshRows.push(row);
        }
    }

    const skippedDuplicates = mappedRows.length - freshRows.length;

    if (freshRows.length === 0) {
        // Even if no new rows, we still lock the table to prevent future attempts
        await supabaseAdmin.from('data_imports').insert({ organization_id: organizationId, table_name: table });
        return { inserted: 0, duplicates_skipped: skippedDuplicates };
    }

    // 4. Insert fresh records (same logic as before but with freshRows)
    if (table === 'products') {
        const productsPayload = freshRows.map(row => ({
            ...row,
            organization_id: organizationId,
            // ensure product_type is set
            product_type: row.product_type || 'STANDARD'
        }));
        const { error } = await supabaseAdmin.from('products').insert(productsPayload);
        if (error) throw new AppError('فشل إدراج المنتجات.', 500, error.message);
    } else {
        // customers & suppliers: insert into persons, then into dedicated table
        const personsPayload = freshRows.map(row => ({
            organization_id: organizationId,
            full_name: (row.full_name || row.name) || 'بدون اسم',
            phone: row.phone || '0000000000',
            national_id: row.national_id || null,
            address: row.address || null
        }));

        const { data: persons, error: personsError } = await supabaseAdmin
            .from('persons')
            .insert(personsPayload)
            .select('id');
        if (personsError || !persons) throw new AppError('فشل إدراج السجلات الأساسية.', 500, personsError?.message);

        try {
            if (table === 'customers') {
                const customersPayload = persons.map((p, i) => ({
                    id: p.id,
                    organization_id: organizationId,
                    full_name: personsPayload[i].full_name,
                    phone: personsPayload[i].phone,
                    national_id: personsPayload[i].national_id,
                    address: personsPayload[i].address,
                    monthly_income: freshRows[i].monthly_income || 0,
                    credit_limit: (freshRows[i].monthly_income || 0) * 3,
                    credit_score: 50,
                    status: 'active'
                }));
                const { error: custError } = await supabaseAdmin.from('customers').insert(customersPayload);
                if (custError) throw custError;
            } else if (table === 'suppliers') {
                const suppliersPayload = persons.map((p, i) => ({
                    id: p.id,
                    organization_id: organizationId,
                    name: personsPayload[i].full_name,
                    phone: personsPayload[i].phone,
                    address: personsPayload[i].address
                }));
                const { error: suppError } = await supabaseAdmin.from('suppliers').insert(suppliersPayload);
                if (suppError) throw suppError;
            }
        } catch (e: any) {
            // Rollback persons insertion
            const personIds = persons.map(p => p.id);
            await supabaseAdmin.from('persons').delete().in('id', personIds);
            throw new AppError('فشل إدراج السجلات الفرعية وتم التراجع عن العملية.', 500, e.message);
        }
    }

    // 5. Lock the table for this organization
    await supabaseAdmin.from('data_imports').insert({ organization_id: organizationId, table_name: table });

    return { inserted: freshRows.length, duplicates_skipped: skippedDuplicates };
}

export async function exportData(organizationId: string, table: string): Promise<string> {
    if (!ALLOWED_TABLES.includes(table)) {
        throw BadRequest(`الجدول ${table} غير مدعوم للتصدير.`);
    }
    const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('organization_id', organizationId);

    if (error) throw new AppError(`فشل جلب البيانات.`, 500, error.message);
    if (!data || data.length === 0) throw BadRequest('لا توجد بيانات لتصديرها.');

    const headers = Object.keys(data[0]);
    const csvRows = data.map(row =>
        headers.map(header => {
            const val = row[header];
            const safeVal = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
            return `"${safeVal}"`;
        }).join(',')
    );
    return [headers.join(','), ...csvRows].join('\n');
}