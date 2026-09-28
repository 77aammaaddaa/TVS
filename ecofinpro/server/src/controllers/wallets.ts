import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as walletService from '../services/wallets';
import * as auditService from '../services/audit';
import { BadRequest } from '../utils/errors';

// Helper to safely extract employee context
const getEmployee = (req: Request) => {
    const emp = (req as any).employee;
    if (!emp) throw BadRequest('Unauthorized: Employee context missing');
    return emp;
};

export const getMyWallet = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, organization_id } = getEmployee(req);
    const result = await walletService.getMyWallet(employee_id, organization_id);
    res.status(200).json({ status: 'success', data: result });
});

export const settleWallet = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id, role } = getEmployee(req);
    
    if (!['OWNER', 'MODERATOR', 'ACCOUNTANT'].includes(role)) {
        throw BadRequest('ليس لديك صلاحية تسوية المحفظة');
    }

    const { wallet_id, actual_cash } = req.body;
    if (!wallet_id || actual_cash === undefined) throw BadRequest('Wallet ID and actual cash are required');
    if (actual_cash < 0) throw BadRequest('Actual cash cannot be negative');

    const result = await walletService.settleWallet(wallet_id, Number(actual_cash), organization_id, employee_id);

    // 🛡️ AUDIT LOG: Settle Wallet
    const difference = result.difference || 0;
    const severity = difference < 0 ? 'warning' : 'info';
    
    let auditDetails = `تم تسوية وإغلاق محفظة محصل. الرصيد المتوقع: ${result.expected_balance} ج.م، الفعلي المورد: ${result.actual_cash} ج.م.`;
    if (difference < 0) {
        auditDetails += ` (تنبيه: يوجد عجز بقيمة ${Math.abs(difference)} ج.م تم تسجيله كمديونية)`;
    } else if (difference > 0) {
        auditDetails += ` (ملاحظة: يوجد زيادة بقيمة ${difference} ج.م)`;
    }

    await auditService.logAction(
        organization_id,
        auth_id,
        'تسوية محفظة محصل',
        'المالية والتحصيل',
        auditDetails,
        severity,
        req
    );

    res.status(200).json({ status: 'success', data: result });
});

export const recordExpense = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = getEmployee(req);
    const { wallet_id, amount, description } = req.body;
    
    if (!wallet_id || !amount) throw BadRequest('Wallet ID and amount are required');
    
    const result = await walletService.recordFieldExpense(wallet_id, Number(amount), description || '', employee_id, organization_id);

    // 🛡️ AUDIT LOG: Field Expense
    await auditService.logAction(
        organization_id,
        auth_id,
        'سحب مصروفات حقلية',
        'المالية والتحصيل',
        `تم سحب مبلغ ${amount} ج.م من محفظة المحصل. السبب: ${description || 'غير محدد'}`,
        'info',
        req
    );

    res.status(200).json({ status: 'success', data: result });
});