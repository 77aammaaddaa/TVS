import { supabaseAdmin } from '../utils/supabase';
import { BadRequest, ServerError } from '../utils/errors';

// ---------------------------------------------------------------------------
// List all partners with personal info
// ---------------------------------------------------------------------------
export const listPartners = async (organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('partners')
        .select(`
            id,
            current_capital,
            profit_share_percentage,
            status,
            created_at,
            lockup_end_date,
            person:persons(full_name, national_id, phone, address)
        `)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });

    if (error) throw ServerError('فشل تحميل قائمة الشركاء');
    return data;
};

// ---------------------------------------------------------------------------
// Create a partner WITH mandatory initial deposit and vault
// ---------------------------------------------------------------------------
export const createPartner = async (payload: any, organization_id: string) => {
    const {
        full_name,
        phone,
        national_id,
        address,
        initial_deposit,
        vault_id,
        lockup_end_date,
    } = payload;

    if (!initial_deposit || Number(initial_deposit) <= 0)
        throw BadRequest('يجب إيداع مبلغ أولى أكبر من صفر');
    if (!vault_id) throw BadRequest('يجب اختيار الخزينة');

    // Validate vault belongs to organization
    const { data: vault } = await supabaseAdmin
        .from('vaults')
        .select('id')
        .eq('id', vault_id)
        .eq('organization_id', organization_id)
        .maybeSingle();
    if (!vault) throw BadRequest('الخزينة المحددة غير صحيحة');

    // 1. Insert person
    const { data: person, error: personError } = await supabaseAdmin
        .from('persons')
        .insert({
            organization_id,
            full_name,
            phone,
            national_id: national_id || null,
            address: address || null,
        })
        .select('id')
        .single();

    if (personError || !person) {
        throw ServerError('فشل إنشاء السجل الشخصي للشريك');
    }

    // 2. Insert partner (capital will be updated by the trigger)
    const { data: partner, error: partnerError } = await supabaseAdmin
        .from('partners')
        .insert({
            id: person.id,
            organization_id,
            current_capital: 0,            // will be set by the trigger
            profit_share_percentage: 0,
            status: 'ACTIVE',
            lockup_end_date: lockup_end_date || null,
        })
        .select('*, person:persons(full_name, national_id, phone, address)')
        .single();

    if (partnerError || !partner) {
        // Rollback person row
        await supabaseAdmin.from('persons').delete().eq('id', person.id);
        throw ServerError('فشل إنشاء حساب الشريك');
    }

    // 3. Insert the initial deposit as an APPROVED transaction (trigger fires)
    const { error: txError } = await supabaseAdmin
        .from('partner_transactions')
        .insert({
            organization_id,
            partner_id: partner.id,
            vault_id,
            amount: Number(initial_deposit),
            transaction_type: 'DEPOSIT',
            status: 'APPROVED',
            // employee_id is not required for initial deposit; set null if needed
        });

    if (txError) {
        // Rollback both partner and person
        await supabaseAdmin.from('partners').delete().eq('id', partner.id);
        await supabaseAdmin.from('persons').delete().eq('id', person.id);
        throw ServerError('فشل في تسجيل الإيداع الأولي');
    }

    // Return the partner with updated capital (re-fetch to reflect trigger changes)
    const { data: updatedPartner } = await supabaseAdmin
        .from('partners')
        .select('*, person:persons(full_name, national_id, phone, address)')
        .eq('id', partner.id)
        .single();

    return updatedPartner;
};

// ---------------------------------------------------------------------------
// Deposit / Withdrawal (with lock-up check & PENDING withdrawals)
// ---------------------------------------------------------------------------
export const transactCapital = async (
    organization_id: string,
    partner_id: string,
    vault_id: string,
    amount: number,
    transaction_type: 'DEPOSIT' | 'WITHDRAWAL',
    employee_id: string
) => {
    if (!amount || amount <= 0) throw BadRequest('المبلغ يجب أن يكون أكبر من الصفر');

    // Validate vault belongs to org
    const { data: vault } = await supabaseAdmin
        .from('vaults')
        .select('id')
        .eq('id', vault_id)
        .eq('organization_id', organization_id)
        .maybeSingle();
    if (!vault) throw BadRequest('الخزينة المحددة غير صحيحة');

    // For withdrawals: enforce lock-up period
    if (transaction_type === 'WITHDRAWAL') {
        const { data: partner } = await supabaseAdmin
            .from('partners')
            .select('current_capital, lockup_end_date')
            .eq('id', partner_id)
            .single();

        if (!partner) throw BadRequest('الشريك غير موجود');
        if (Number(partner.current_capital) < amount) {
            throw BadRequest('رصيد الشريك الحالي لا يكفي لعملية السحب');
        }
        if (partner.lockup_end_date && new Date(partner.lockup_end_date) > new Date()) {
            throw BadRequest('لا يمكن السحب قبل انتهاء فترة الحظر');
        }
    }

    // Insert the transaction – APPROVED for deposits, PENDING for withdrawals
    const status = transaction_type === 'WITHDRAWAL' ? 'PENDING' : 'APPROVED';

    const { error } = await supabaseAdmin
        .from('partner_transactions')
        .insert({
            organization_id,
            partner_id,
            vault_id,
            amount,
            transaction_type,
            status,
            employee_id,
        });

    if (error) throw ServerError(error.message);

    // Return updated partner (capital only changes for APPROVED deposits)
    const partners = await listPartners(organization_id);
    const updated = partners.find((p: any) => p.id === partner_id);
    return updated;
};

// ---------------------------------------------------------------------------
// Approve / Reject a pending withdrawal
// ---------------------------------------------------------------------------
export const approveTransaction = async (
    organization_id: string,
    transaction_id: string,
    new_status: 'APPROVED' | 'REJECTED'
) => {
    // Fetch the transaction and verify ownership & current status
    const { data: tx, error: fetchErr } = await supabaseAdmin
        .from('partner_transactions')
        .select('*')
        .eq('id', transaction_id)
        .eq('organization_id', organization_id)
        .maybeSingle();

    if (fetchErr || !tx) throw BadRequest('المعاملة غير موجودة');
    if (tx.status !== 'PENDING') throw BadRequest('المعاملة ليست في حالة انتظار');

    if (new_status === 'APPROVED' && tx.transaction_type === 'WITHDRAWAL') {
        // Ensure vault has enough balance to cover the withdrawal
        const { data: vault } = await supabaseAdmin
            .from('vaults')
            .select('balance')
            .eq('id', tx.vault_id)
            .single();
        if (!vault || Number(vault.balance) < Number(tx.amount)) {
            throw BadRequest('رصيد الخزينة لا يكفي لاعتماد السحب');
        }
    }

    // Update status → the trigger will fire if status becomes APPROVED
    const { error: updateErr } = await supabaseAdmin
        .from('partner_transactions')
        .update({ status: new_status })
        .eq('id', transaction_id);

    if (updateErr) throw ServerError('فشل تحديث حالة المعاملة');
};

// ---------------------------------------------------------------------------
// List pending withdrawals (for the front‑end “Approvals Needed” section)
// ---------------------------------------------------------------------------
export const listPendingWithdrawals = async (organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('partner_transactions')
        .select(`
            id,
            created_at,
            amount,
            partner_id,
            partner:partners(
                person:persons(full_name)
            )
        `)
        .eq('organization_id', organization_id)
        .eq('status', 'PENDING')
        .eq('transaction_type', 'WITHDRAWAL')
        .order('created_at', { ascending: false });

    if (error) throw ServerError('فشل تحميل المعاملات المعلقة');
    return data;
};

// ---------------------------------------------------------------------------
// Calculate net profit for a period
// ---------------------------------------------------------------------------
export const calculateProfits = async (organization_id: string, from: string, to: string) => {
    const fromDate = `${from}T00:00:00.000Z`;
    const toDate = `${to}T23:59:59.999Z`;

    const [paymentsRes, expensesRes, purchasesRes] = await Promise.all([
        supabaseAdmin.from('payments').select('amount')
            .eq('organization_id', organization_id)
            .gte('created_at', fromDate).lte('created_at', toDate),
        supabaseAdmin.from('expenses').select('amount')
            .eq('organization_id', organization_id)
            .gte('created_at', fromDate).lte('created_at', toDate),
        supabaseAdmin.from('purchase_invoices').select('total_amount')
            .eq('organization_id', organization_id)
            .eq('status', 'COMPLETED')
            .gte('created_at', fromDate).lte('created_at', toDate),
    ]);

    if (paymentsRes.error || expensesRes.error || purchasesRes.error) {
        throw ServerError('فشل حساب الأرباح');
    }

    const total_collected = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const total_expenses_direct = (expensesRes.data || []).reduce((sum, e) => sum + Number(e.amount), 0);
    const total_purchases = (purchasesRes.data || []).reduce((sum, p) => sum + Number(p.total_amount), 0);

    const total_expenses = total_expenses_direct + total_purchases;
    const net_profit = total_collected - total_expenses;

    return { total_collected, total_expenses, net_profit };
};

// ---------------------------------------------------------------------------
// Distribute profits (with reinvestment option)
// ---------------------------------------------------------------------------
export const distributeProfits = async (
    payload: {
        period_start: string;
        period_end: string;
        organization_share_pct: number;
        payout_vault_id: string;
        reinvesting_partner_ids?: string[];
    },
    organization_id: string,
    employee_id: string
) => {
    const { net_profit, total_collected, total_expenses } =
        await calculateProfits(organization_id, payload.period_start, payload.period_end);

    if (net_profit <= 0) throw BadRequest('لا يوجد صافي ربح للتوزيع في هذه الفترة');

    const org_profit = (net_profit * payload.organization_share_pct) / 100;
    const partners_pool = net_profit - org_profit;

    // 1. Fetch active partners with positive profit share
    const { data: partners, error: partnersError } = await supabaseAdmin
        .from('partners')
        .select('id, current_capital, profit_share_percentage')
        .eq('organization_id', organization_id)
        .eq('status', 'ACTIVE')
        .gt('profit_share_percentage', 0);

    if (partnersError || !partners) throw ServerError('فشل في جلب بيانات الشركاء');

    // 2. Insert distribution record
    const { data: distribution, error: distError } = await supabaseAdmin
        .from('profit_distributions')
        .insert({
            organization_id,
            period_start: payload.period_start,
            period_end: payload.period_end,
            total_collected,
            total_expenses,
            net_profit,
            organization_share_pct: payload.organization_share_pct,
            organization_profit: org_profit,
            partners_pool_amount: partners_pool,
            employee_id,
        })
        .select()
        .single();

    if (distError) throw ServerError('فشل في تسجيل عملية التوزيع');

    // 3. Calculate individual payouts
    const payouts = partners.map(p => ({
        organization_id,
        distribution_id: distribution.id,
        partner_id: p.id,
        vault_id: payload.payout_vault_id,
        share_pct_at_time: Number(p.profit_share_percentage),
        payout_amount: (partners_pool * Number(p.profit_share_percentage)) / 100,
    }));

    if (payouts.length === 0) {
        return { success: true, distribution: { id: distribution.id, net_profit, organization_profit: org_profit, partners_pool, payouts: [] } };
    }

    // 4. Insert all partner_payout records (for audit trail)
    const { error: payoutsError } = await supabaseAdmin.from('partner_payouts').insert(payouts);
    if (payoutsError) throw ServerError('فشل في إدراج مدفوعات الشركاء');

    // 5. Separate reinvesting vs cash-out partners
    const reinvestIds = new Set(payload.reinvesting_partner_ids || []);
    const cashPayouts = payouts.filter(p => !reinvestIds.has(p.partner_id));
    const reinvestPayouts = payouts.filter(p => reinvestIds.has(p.partner_id));

    // 6. Deduct only cash payouts from vault
    const totalCashPayout = cashPayouts.reduce((sum, p) => sum + p.payout_amount, 0);
    if (totalCashPayout > 0) {
        const { data: vault } = await supabaseAdmin
            .from('vaults')
            .select('balance')
            .eq('id', payload.payout_vault_id)
            .single();
        if (!vault || vault.balance < totalCashPayout) throw BadRequest('رصيد الخزينة لا يكفي لتوزيع الأرباح النقدية');

        await supabaseAdmin
            .from('vaults')
            .update({ balance: vault.balance - totalCashPayout })
            .eq('id', payload.payout_vault_id);

        // Record vault transaction for the cash payout
        await supabaseAdmin.from('vault_transactions').insert({
            organization_id,
            source_vault_id: payload.payout_vault_id,
            amount: totalCashPayout,
            transaction_type: 'PROFIT_DISTRIBUTION',
            employee_id,
        });
    }

    // 7. For reinvesting partners: directly increase their capital (bypass vault)
    for (const p of reinvestPayouts) {
        const { data: partnerData } = await supabaseAdmin
            .from('partners')
            .select('current_capital')
            .eq('id', p.partner_id)
            .single();

        if (partnerData) {
            await supabaseAdmin
                .from('partners')
                .update({ current_capital: Number(partnerData.current_capital) + Number(p.payout_amount) })
                .eq('id', p.partner_id);
        }
    }

    // 8. Recalculate profit shares after reinvestments (only if any reinvestment happened)
    if (reinvestPayouts.length > 0) {
        const { data: allActive } = await supabaseAdmin
            .from('partners')
            .select('id, current_capital')
            .eq('organization_id', organization_id)
            .eq('status', 'ACTIVE');

        const totalCapital = (allActive || []).reduce((sum, p) => sum + Number(p.current_capital), 0);
        for (const p of allActive || []) {
            const newShare = totalCapital > 0 ? ((Number(p.current_capital) / totalCapital) * 100) : 0;
            await supabaseAdmin
                .from('partners')
                .update({ profit_share_percentage: Math.round(newShare * 100) / 100 })
                .eq('id', p.id);
        }
    }

    return {
        success: true,
        distribution: {
            id: distribution.id,
            net_profit,
            organization_profit: org_profit,
            partners_pool,
            payouts: payouts.map(p => ({ partner_id: p.partner_id, amount: p.payout_amount })),
        },
    };
};

// ---------------------------------------------------------------------------
// Partner ledger: unified chronological statement
// ---------------------------------------------------------------------------
export const getPartnerLedger = async (organization_id: string, partner_id: string) => {
    // Fetch APPROVED transactions
    const { data: transactions, error: txErr } = await supabaseAdmin
        .from('partner_transactions')
        .select('id, created_at, transaction_type, amount, vault_id, status')
        .eq('partner_id', partner_id)
        .eq('organization_id', organization_id)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: true });

    if (txErr) throw ServerError('فشل تحميل كشف الشريك');

    // Fetch profit payouts with distribution period info
    const { data: payouts, error: payErr } = await supabaseAdmin
        .from('partner_payouts')
        .select('id, created_at, payout_amount, distribution:profit_distributions(period_start, period_end)')
        .eq('partner_id', partner_id)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: true });

    if (payErr) throw ServerError('فشل تحميل توزيعات الأرباح');

    // Merge and sort
    const ledger = [
        ...(transactions || []).map(tx => ({
            id: `tx-${tx.id}`,
            date: tx.created_at,
            type: tx.transaction_type === 'DEPOSIT' ? 'إيداع' : 'سحب',
            amount: tx.transaction_type === 'WITHDRAWAL' ? -Number(tx.amount) : Number(tx.amount),
            description: `${tx.transaction_type === 'DEPOSIT' ? 'إيداع' : 'سحب'} رأس مال`,
            source: tx.vault_id,
        })),
        ...(payouts || []).map(p => ({
            id: `pay-${p.id}`,
            date: p.created_at,
            type: 'ربح',
            amount: Number(p.payout_amount),
            description: `أرباح الفترة ${(p.distribution as any)?.period_start?.slice(0,10)} إلى ${(p.distribution as any)?.period_end?.slice(0,10)}`,
            source: null,
        })),
    ];

    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return ledger;
};