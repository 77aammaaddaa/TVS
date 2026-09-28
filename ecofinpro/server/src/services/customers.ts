// server/src/services/customers.ts
import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, NotFound, Conflict } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';
import { isNonEmptyString, isValidPhoneNumber } from '../utils/validation';

// --- Helpers ---
const deriveCreditLimit = (monthlyIncome: number) => Math.round(monthlyIncome * 3 * 100) / 100;

const normalizeEgyptianPhone = (raw: string): string => {
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('1')) {
        // without leading 0 or +20
        digits = '20' + digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
        digits = '20' + digits.substring(1);
    } else if (digits.length === 12 && digits.startsWith('20')) {
        // already correct
    } else if (digits.length === 13 && digits.startsWith('+20')) {
        digits = digits.substring(1); // remove +
    } else {
        return raw; // let validator reject it
    }
    return digits;
};

const isValidEgyptianPhone = (phone: string) => /^201[0125][0-9]{8}$/.test(normalizeEgyptianPhone(phone));

// National ID parsing (same as MVP)
const govMap: Record<string, string> = {
    '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس',
    '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
    '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
    '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
    '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
    '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
    '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية'
};

const parseNationalId = (id: string) => {
    if (!/^\d{14}$/.test(id)) return null;
    const century = id[0];
    const year = id.substring(1, 3);
    const month = id.substring(3, 5);
    const day = id.substring(5, 7);
    const govCode = id.substring(7, 9);
    const genderDigit = parseInt(id[12]);

    let fullYear = century === '2' ? `19${year}` : century === '3' ? `20${year}` : null;
    if (!fullYear) return null;

    const dob = new Date(`${fullYear}-${month}-${day}`);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    return {
        birth_date: `${fullYear}-${month}-${day}`,
        age,
        gender: genderDigit % 2 === 1 ? 'ذكر' : 'أنثى',
        governorate: govMap[govCode] || 'غير معروف',
    };
};

// --- Types ---
export interface GuarantorInput {
    full_name: string;
    national_id?: string;
    phone: string;
    relation?: string;
    // Additional fields optional
    job?: string;
    job_type?: string;
    monthly_income?: number;
}

export interface CreateCustomerPayload {
    full_name: string;
    phone: string;
    national_id?: string;
    address?: string;
    monthly_income?: number;
    credit_score?: number; // read-only – we ignore it
    branch_id?: string | null;
    // Extended fields
    job?: string;
    job_type?: string;
    employer_address?: string;
    housing_type?: string;
    marital_status?: string;
    area?: string;
    city?: string;
    address_details?: string;
    bank_name?: string;
    bank_account?: string;
    iban?: string;
    notes?: string;
    guarantors?: GuarantorInput[];
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
    admin_password?: string; // required to change national_id
}

// --- Service Functions ---
export async function createCustomer(payload: CreateCustomerPayload, organizationId: string) {
    let { full_name, phone, national_id, monthly_income, ...rest } = payload;

    if (!isNonEmptyString(full_name)) throw BadRequest('اسم العميل مطلوب.');
    if (!phone || !isValidEgyptianPhone(phone)) throw BadRequest('رقم الهاتف غير صالح. تأكد من أنه 11 رقماً ويبدأ بـ 01 أو +20.');
    phone = normalizeEgyptianPhone(phone); // store normalized

    if (national_id) {
        const parsed = parseNationalId(national_id);
        if (!parsed) throw BadRequest('الرقم القومي غير صالح.');
        if (parsed.age < 21 || parsed.age > 65) throw BadRequest('العمر خارج النطاق المسموح (21-65).');
        const { data: existing } = await supabaseAdmin.from('persons')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('national_id', national_id)
        .maybeSingle();
        if (existing) throw Conflict('يوجد شخص مسجل بنفس الرقم القومي.');
    }

    if (monthly_income !== undefined && monthly_income < 0) throw BadRequest('الدخل الشهري لا يمكن أن يكون سالباً.');

    // Derive credit limit if income provided
    const credit_limit = monthly_income ? deriveCreditLimit(monthly_income) : null;

    // Generate internal code from national ID or random
    const internal_code = national_id
        ? `C${national_id.substring(1, 7)}-${Math.floor(1000 + Math.random() * 9000)}`
        : `CLNT-${Date.now().toString().slice(-6)}`;

    const tx = new TransactionTracker();

    try {
        // 1. Create person
        const { data: person, error: personError } = await supabaseAdmin
        .from('persons')
        .insert({
            organization_id: organizationId,
            full_name: full_name.trim(),
            phone,
            national_id: national_id?.trim() || null,
            address: rest.address?.trim() || null,
        })
        .select('id')
        .single();
        if (personError || !person) throw new AppError('فشل إنشاء السجل الأساسي.', 500, personError?.message);
        tx.track(async () => { await supabaseAdmin.from('persons').delete().eq('id', person.id); });

        // 2. Create customer row
        const customerInsert = {
        id: person.id,
        organization_id: organizationId,
        branch_id: rest.branch_id || null,
        full_name: full_name.trim(),
        national_id: national_id?.trim() || null,
        phone,
        address: rest.address?.trim() || null,
        monthly_income: monthly_income ?? null,
        credit_limit,
        credit_score: 50, // default score, X‑Score engine will later update
        status: 'active',
        internal_code,
        job: rest.job?.trim() || null,
        job_type: rest.job_type?.trim() || null,
        employer_address: rest.employer_address?.trim() || null,
        housing_type: rest.housing_type?.trim() || null,
        marital_status: rest.marital_status?.trim() || null,
        area: rest.area?.trim() || null,
        city: rest.city?.trim() || null,
        address_details: rest.address_details?.trim() || null,
        bank_name: rest.bank_name?.trim() || null,
        bank_account: rest.bank_account?.trim() || null,
        iban: rest.iban?.trim() || null,
        notes: rest.notes?.trim() || null,
        };

        const { data: customer, error: custError } = await supabaseAdmin
        .from('customers')
        .insert(customerInsert)
        .select('*')
        .single();
        if (custError || !customer) throw new AppError('فشل إنشاء العميل.', 500, custError?.message);

        // 3. Process guarantors if any
        if (payload.guarantors?.length) {
        await processGuarantors(organizationId, person.id, payload.guarantors);
        }

        return customer;
    } catch (err) {
        await tx.rollback();
        if (err instanceof AppError) throw err;
        throw new AppError((err as Error).message, 500);
    }
}

export async function listCustomers(organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
    if (error) throw new AppError('فشل تحميل العملاء.', 500, error.message);
    return data || [];
}

export async function getCustomerById(customerId: string, organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('organization_id', organizationId)
        .single();
    if (error || !data) throw NotFound('العميل غير موجود.');
    return data;
}

export async function updateCustomer(
    customerId: string,
    payload: UpdateCustomerPayload,
    organizationId: string
    ) {
    const existing = await getCustomerById(customerId, organizationId);
    if (!existing) throw NotFound('العميل غير موجود.');

    // If national_id is being changed, require admin password
    if (payload.national_id !== undefined && payload.national_id !== existing.national_id) {
        if (payload.admin_password !== 'FinTech‑Pro') {
        throw BadRequest('كلمة مرور الإدارة غير صحيحة. لا يمكن تعديل الرقم القومي.');
        }
        // Validate the new ID
        if (payload.national_id) {
        const parsed = parseNationalId(payload.national_id);
        if (!parsed) throw BadRequest('الرقم القومي الجديد غير صالح.');
        if (parsed.age < 21 || parsed.age > 65) throw BadRequest('العمر خارج النطاق المسموح.');
        const { data: dup } = await supabaseAdmin
            .from('persons')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('national_id', payload.national_id)
            .neq('id', customerId)
            .maybeSingle();
        if (dup) throw Conflict('الرقم القومي مستخدم بالفعل.');
        }
    }

    if (payload.phone !== undefined) {
        if (!isValidEgyptianPhone(payload.phone)) throw BadRequest('رقم الهاتف غير صالح.');
        payload.phone = normalizeEgyptianPhone(payload.phone);
    }

    // credit_score is read-only – remove it if accidentally sent
    delete payload.credit_score;

    // Build update object for customers table
    const customerUpdate: Record<string, any> = {};
    const personUpdate: Record<string, any> = {};
    const allowedCustomerFields = [
        'full_name', 'phone', 'national_id', 'address', 'monthly_income', 'branch_id',
        'job', 'job_type', 'employer_address', 'housing_type', 'marital_status',
        'area', 'city', 'address_details', 'bank_name', 'bank_account', 'iban', 'notes'
    ];
    for (const field of allowedCustomerFields) {
        if ((payload as any)[field] !== undefined) {
        customerUpdate[field] = (payload as any)[field];
        }
    }
    if (payload.full_name !== undefined) {
        personUpdate.full_name = payload.full_name;
    }
    if (payload.phone !== undefined) {
        personUpdate.phone = payload.phone;
    }
    if (payload.national_id !== undefined) {
        personUpdate.national_id = payload.national_id;
    }
    if (payload.address !== undefined) {
        personUpdate.address = payload.address;
    }

    // If monthly_income changed, recalc credit_limit
    if (payload.monthly_income !== undefined) {
        customerUpdate.credit_limit = payload.monthly_income ? deriveCreditLimit(payload.monthly_income) : null;
    }

    // Update persons table if needed
    if (Object.keys(personUpdate).length > 0) {
        const { error } = await supabaseAdmin.from('persons').update(personUpdate).eq('id', customerId);
        if (error) throw new AppError('فشل تحديث بيانات الشخص.', 500, error.message);
    }

    if (Object.keys(customerUpdate).length > 0) {
        const { error } = await supabaseAdmin.from('customers').update(customerUpdate).eq('id', customerId);
        if (error) throw new AppError('فشل تحديث العميل.', 500, error.message);
    }

    // Process guarantors if provided (full replace)
    if (payload.guarantors !== undefined) {
        // Remove existing links
        await supabaseAdmin.from('client_guarantors').delete().eq('customer_id', customerId);
        if (payload.guarantors.length > 0) {
        await processGuarantors(organizationId, customerId, payload.guarantors);
        }
    }

    return { success: true };
}

// Credit profile unchanged
export async function getCustomerCreditProfile(customerId: string, organizationId: string) {
    const customer = await getCustomerById(customerId, organizationId);
    const { data: contracts } = await supabaseAdmin
        .from('contracts')
        .select('id')
        .eq('customer_id', customerId)
        .eq('organization_id', organizationId)
        .eq('sale_type', 'INSTALLMENT');
    let activeDebt = 0;
    if (contracts?.length) {
        const { data: installments } = await supabaseAdmin
        .from('installments')
        .select('amount')
        .in('contract_id', contracts.map(c => c.id))
        .in('status', ['PENDING', 'OVERDUE']);
        activeDebt = (installments || []).reduce((sum, i) => sum + Number(i.amount), 0);
    }
    const { data: link } = await supabaseAdmin
        .from('client_guarantors')
        .select('guarantor_id')
        .eq('customer_id', customerId)
        .maybeSingle();
    let guarantor = null;
    if (link?.guarantor_id) {
        const { data: g } = await supabaseAdmin.from('guarantors').select('full_name, phone').eq('id', link.guarantor_id).maybeSingle();
        guarantor = g ? { full_name: g.full_name, phone: g.phone } : null;
    }
    return { customer, active_debt: activeDebt, guarantor };
}

// ===== Guarantor helper =====
async function processGuarantors(orgId: string, customerId: string, guarantors: GuarantorInput[]) {
  for (const g of guarantors) {
        if (!isNonEmptyString(g.full_name)) continue;
        if (!g.phone || !isValidEgyptianPhone(g.phone)) continue;
        const phone = normalizeEgyptianPhone(g.phone);
        let personId: string;

        // Check if this person already exists by national_id or phone
        if (g.national_id) {
        const { data: existingPerson } = await supabaseAdmin
            .from('persons')
            .select('id')
            .eq('organization_id', orgId)
            .eq('national_id', g.national_id)
            .maybeSingle();
        if (existingPerson) {
            personId = existingPerson.id;
            // Update name/phone if needed
            await supabaseAdmin.from('persons').update({ full_name: g.full_name, phone }).eq('id', personId);
        } else {
            // Create new person
            const { data: newPerson, error } = await supabaseAdmin.from('persons').insert({
            organization_id: orgId,
            full_name: g.full_name.trim(),
            phone,
            national_id: g.national_id?.trim() || null,
            }).select('id').single();
            if (error || !newPerson) continue;
            personId = newPerson.id;
        }
        } else {
        // No national_id, try by phone
        const { data: existingByPhone } = await supabaseAdmin
            .from('persons')
            .select('id')
            .eq('organization_id', orgId)
            .eq('phone', phone)
            .maybeSingle();
        if (existingByPhone) {
            personId = existingByPhone.id;
            await supabaseAdmin.from('persons').update({ full_name: g.full_name }).eq('id', personId);
        } else {
            const { data: newPerson } = await supabaseAdmin.from('persons').insert({
            organization_id: orgId,
            full_name: g.full_name.trim(),
            phone,
            }).select('id').single();
            if (!newPerson) continue;
            personId = newPerson.id;
        }
        }

        // Ensure guarantor record exists
        await supabaseAdmin.from('guarantors').upsert({
        id: personId,
        organization_id: orgId,
        full_name: g.full_name.trim(),
        phone,
        national_id: g.national_id?.trim() || null,
        address: null,
        }, { onConflict: 'id' });

        // Link to customer
        await supabaseAdmin.from('client_guarantors').upsert({
        organization_id: orgId,
        customer_id: customerId,
        guarantor_id: personId,
        }, { onConflict: 'customer_id,guarantor_id' });
    }
}