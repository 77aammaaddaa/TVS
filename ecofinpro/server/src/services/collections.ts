import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest } from '../utils/errors';

export const recordCollection = async (
    contract_id: string,
    amount: number,
    wallet_id: string,
    employee_id: string,
    organization_id: string
    ) => {
    if (amount <= 0) throw BadRequest('Collection amount must be greater than zero');

    // 1. Validate Contract
    const { data: contract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, status')
        .eq('id', contract_id)
        .eq('organization_id', organization_id)
        .maybeSingle();

    if (contractError || !contract) throw BadRequest('Contract not found or access denied');
    if (contract.status === 'VOID') throw BadRequest('Cannot collect on a voided contract');

    // 2. Validate Wallet State
    const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('id, status')
        .eq('id', wallet_id)
        .eq('employee_id', employee_id) 
        .eq('organization_id', organization_id)
        .maybeSingle();

    if (walletError || !wallet) throw BadRequest('Wallet not found');
    if (wallet.status !== 'OPEN') throw BadRequest('Your wallet is currently closed. Please contact an administrator.');

    // 3. Fetch Main Vault (Required to satisfy payments.vault_id NOT NULL constraint)
    const { data: mainVault } = await supabaseAdmin
        .from('vaults')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('is_main_vault', true)
        .maybeSingle();

    if (!mainVault) throw new AppError('Main vault not configured for this organization', 500);

    // 4. Insert Payment (DB Triggers handle cascading installments & wallet/commission credits)
    const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
        organization_id,
        contract_id,
        vault_id: mainVault.id, 
        amount,
        payment_method: 'FIELD_COLLECTION',
        employee_id,
        is_collection: true,
        wallet_id
        })
        .select()
        .single();

    if (paymentError) throw new AppError(`Failed to record collection: ${paymentError.message}`, 500);

    // 5. Fetch updated wallet balance to return to frontend immediately
    const { data: updatedWallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('id', wallet_id)
        .single();

    return {
        payment,
        newWalletBalance: updatedWallet?.balance || 0
    };
};

// Add this to the bottom of your server/src/services/collections.ts

export const getPendingInstallments = async (organization_id: string) => {
    const { data, error } = await supabaseAdmin
        .from('installments')
        .select(`
            *,
            contracts!inner (
                id, 
                customer_id,
                customers (
                    id, 
                    full_name, 
                    phone, 
                    credit_score, 
                    monthly_income,
                    national_id
                )
            )
        `)
        .in('status', ['PENDING', 'PARTIALLY_PAID'])
        .eq('organization_id', organization_id) // 🔒 Tenant Isolation Security
        .order('due_date', { ascending: true });

    if (error) {
        throw new AppError(`Failed to fetch installments: ${error.message}`, 500);
    }

    return data || [];
};