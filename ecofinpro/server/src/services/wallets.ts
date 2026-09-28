import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest } from '../utils/errors';

export interface WalletSummary {
    wallet: any;
    transactions: any[];
    dailySummary: {
        totalCollectedToday: number;
        totalCommissionToday: number;
        totalTransactionsToday: number;
    };
}

export const getMyWallet = async (employee_id: string, organization_id: string): Promise<WalletSummary> => {
    // 1. Fetch or Auto-Create Wallet
    let { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('organization_id', organization_id)
        .maybeSingle();

    if (walletError) throw new AppError('Failed to fetch wallet data', 500);

    if (!wallet) {
        const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({
            organization_id,
            employee_id,
            balance: 0,
            starting_balance: 0,
            status: 'OPEN',
            opened_at: new Date().toISOString()
        })
        .select()
        .single();

        if (createError) throw new AppError('Failed to initialize collector wallet', 500);
        wallet = newWallet;
    }

    // 2. Fetch Recent Transactions
    const { data: transactions, error: txError } = await supabaseAdmin
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(100);

    if (txError) throw new AppError('Failed to fetch wallet transactions', 500);

    // 3. Calculate Daily Summary (Value Add)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalCollectedToday = 0;
    let totalCommissionToday = 0;
    let totalTransactionsToday = 0;

    (transactions || []).forEach(tx => {
        const txDate = new Date(tx.created_at);
        if (txDate >= today) {
        totalTransactionsToday++;
        if (tx.transaction_type === 'COLLECTION') {
            totalCollectedToday += Number(tx.amount);
        } else if (tx.transaction_type === 'COMMISSION') {
            totalCommissionToday += Number(tx.amount);
        }
        }
    });

    return {
        wallet,
        transactions: transactions || [],
        dailySummary: {
        totalCollectedToday,
        totalCommissionToday,
        totalTransactionsToday
        }
    };
};

export const settleWallet = async (
    wallet_id: string,
    actual_cash: number,
    organization_id: string,
    moderator_employee_id: string 
    ) => {
    const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('id', wallet_id)
        .eq('organization_id', organization_id)
        .single();

    if (walletError || !wallet) throw BadRequest('Wallet not found or access denied');
    if (wallet.status !== 'OPEN') throw BadRequest('Wallet is already closed');

    const expected_balance = parseFloat(String(wallet.balance)) || 0;
    const difference = actual_cash - expected_balance;
    const shortage_status = difference < 0 ? 'عجز' : difference > 0 ? 'زيادة' : null;

    const { data: mainVault, error: vaultError } = await supabaseAdmin
        .from('vaults')
        .select('id, balance')
        .eq('organization_id', organization_id)
        .eq('is_main_vault', true)
        .maybeSingle();

    if (vaultError || !mainVault) throw new AppError('Main vault not configured for this organization', 500);

    // 1. Close the wallet and zero out internal balance
    const { error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        expected_closing_balance: expected_balance,
        actual_closing_balance: actual_cash,
        shortage_status,
        balance: 0,
        starting_balance: 0
        })
        .eq('id', wallet_id);

    if (updateError) throw new AppError('Failed to update wallet status', 500);

    // 2. Move physical cash to Main Vault
    if (actual_cash > 0) {
        const currentVaultBalance = parseFloat(String(mainVault.balance)) || 0;
        
        await supabaseAdmin
        .from('vaults')
        .update({ balance: currentVaultBalance + actual_cash })
        .eq('id', mainVault.id);

        await supabaseAdmin
        .from('vault_transactions')
        .insert({
            organization_id,
            destination_vault_id: mainVault.id,
            amount: actual_cash,
            transaction_type: 'WALLET_SETTLEMENT',
            employee_id: moderator_employee_id
        });
    }

    // 3. Log settlement in wallet ledger
    await supabaseAdmin
        .from('wallet_transactions')
        .insert({
        organization_id,
        wallet_id,
        amount: actual_cash, 
        transaction_type: 'SETTLEMENT_TO_VAULT'
        });

    return { 
        message: 'تم تسوية وإغلاق المحفظة بنجاح', 
        expected_balance,
        actual_cash,
        difference,
        shortage_status 
    };
    };

export const recordFieldExpense = async (
    wallet_id: string,
    amount: number,
    description: string,
    employee_id: string,
    organization_id: string
    ) => {
    if (amount <= 0) throw BadRequest('Amount must be greater than zero');

    const { data: wallet, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('id', wallet_id)
        .eq('employee_id', employee_id)
        .single();

    if (error || !wallet) throw BadRequest('Wallet not found');
    if (wallet.status !== 'OPEN') throw BadRequest('Wallet is closed');
    
    const currentBalance = parseFloat(String(wallet.balance)) || 0;
    if (currentBalance < amount) throw BadRequest('رصيد المحفظة لا يكفي لهذا المصروف');

    // 1. Deduct from wallet
    await supabaseAdmin
        .from('wallets')
        .update({ balance: currentBalance - amount })
        .eq('id', wallet_id);

    // 2. Log transaction
    await supabaseAdmin
        .from('wallet_transactions')
        .insert({
        organization_id,
        wallet_id,
        amount: amount, 
        transaction_type: 'ADJUSTMENT',
        description: description || 'مصروفات حقلية'
        });

    return { success: true, newBalance: currentBalance - amount };
};