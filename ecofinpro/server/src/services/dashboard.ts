import { supabaseAdmin } from '../utils/supabase';
import { ServerError } from '../utils/errors';

export const getHomeData = async (organization_id: string, employee: any) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let data: any = { role: employee.role };

        if (employee.role === 'CASHIER' || employee.role === 'OWNER') {
            const { data: shift } = await supabaseAdmin
                .from('shifts')
                .select('id, starting_balance, opened_at')
                .eq('employee_id', employee.id)
                .eq('organization_id', organization_id)
                .is('closed_at', null)
                .maybeSingle();

            const { data: sales } = await supabaseAdmin
                .from('payments')
                .select('amount')
                .eq('employee_id', employee.id)
                .eq('organization_id', organization_id)
                .gte('created_at', today.toISOString())
                .lt('created_at', tomorrow.toISOString());

            data.cashier = {
                activeShift: shift || null,
                todaySales: (sales || []).reduce((sum, s) => sum + Number(s.amount), 0)
            };
        }

        if (employee.role === 'COLLECTOR' || employee.role === 'OWNER') {
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('id, balance')
                .eq('employee_id', employee.id)
                .eq('organization_id', organization_id)
                .eq('status', 'OPEN')
                .maybeSingle();

            const { data: collections } = await supabaseAdmin
                .from('wallet_transactions')
                .select('amount')
                .eq('wallet_id', wallet?.id || '')
                .eq('transaction_type', 'COLLECTION')
                .gte('created_at', today.toISOString())
                .lt('created_at', tomorrow.toISOString());

            data.collector = {
                walletBalance: wallet ? Number(wallet.balance) : 0,
                todayCollections: (collections || []).reduce((sum, c) => sum + Number(c.amount), 0)
            };
        }

        if (['WH_MANAGER', 'OWNER', 'MODERATOR'].includes(employee.role)) {
            const { count: lowStockCount } = await supabaseAdmin
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organization_id)
                .lte('stock_quantity', 5); // Assuming 5 is the low stock threshold

            data.warehouse = {
                lowStockCount: lowStockCount || 0
            };
        }

        return data;
    } catch (err: any) {
        throw ServerError('فشل تحميل بيانات لوحة التحكم الرئيسية: ' + err.message);
    }
};

export const getGoldenData = async (organization_id: string) => {
    try {
        const [vaultsRes, walletsRes, receivablesRes, payablesRes] = await Promise.all([
            // 1. Total Vault Cash
            supabaseAdmin.from('vaults')
                .select('balance')
                .eq('organization_id', organization_id),
            
            // 2. Total Wallet Cash
            supabaseAdmin.from('wallets')
                .select('balance')
                .eq('organization_id', organization_id)
                .eq('status', 'OPEN'),
            
            // 3. Outstanding Receivables (Pending Installments)
            supabaseAdmin.from('installments')
                .select('amount, paid_amount')
                .eq('organization_id', organization_id)
                .in('status', ['PENDING', 'PARTIALLY_PAID']),
            
            // 4. Outstanding Payables (Pending/Approved Unpaid Purchases)
            supabaseAdmin.from('purchase_invoices')
                .select('outstanding_amount')
                .eq('organization_id', organization_id)
                .in('status', ['APPROVED', 'PENDING'])
        ]);

        const totalVaultCash = (vaultsRes.data || []).reduce((sum, v) => sum + Number(v.balance), 0);
        const totalWalletCash = (walletsRes.data || []).reduce((sum, w) => sum + Number(w.balance), 0);
        
        const totalReceivables = (receivablesRes.data || []).reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount || 0)), 0);
        const totalPayables = (payablesRes.data || []).reduce((sum, p) => sum + Number(p.outstanding_amount), 0);

        // Chart Data: Last 7 Days Revenue vs Expenses
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0,0,0,0);
            const nextD = new Date(d);
            nextD.setDate(nextD.getDate() + 1);

            const [rev, exp] = await Promise.all([
                supabaseAdmin.from('payments').select('amount').eq('organization_id', organization_id).gte('created_at', d.toISOString()).lt('created_at', nextD.toISOString()),
                supabaseAdmin.from('expenses').select('amount').eq('organization_id', organization_id).gte('created_at', d.toISOString()).lt('created_at', nextD.toISOString())
            ]);

            const dayRev = (rev.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
            const dayExp = (exp.data || []).reduce((sum, e) => sum + Number(e.amount), 0);

            chartData.push({
                name: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
                revenue: dayRev,
                expense: dayExp
            });
        }

        return {
            financials: {
                totalCash: totalVaultCash + totalWalletCash,
                totalVaultCash,
                totalWalletCash,
                totalReceivables,
                totalPayables,
                netLiquidity: (totalVaultCash + totalWalletCash + totalReceivables) - totalPayables
            },
            chartData
        };
    } catch (err: any) {
        throw ServerError('فشل تحميل الإحصائيات الذهبية: ' + err.message);
    }
};