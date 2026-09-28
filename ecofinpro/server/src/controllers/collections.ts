import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as collectionService from '../services/collections';
import * as auditService from '../services/audit';
import { BadRequest } from '../utils/errors';

const getEmployee = (req: Request) => {
    const emp = (req as any).employee;
    if (!emp) throw BadRequest('Unauthorized: Employee context missing');
    return emp;
};

export const recordCollection = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = getEmployee(req);
    const { contract_id, amount, wallet_id } = req.body;

    if (!contract_id || !amount || !wallet_id) {
        throw BadRequest('Contract ID, amount, and wallet ID are required');
    }

    const result = await collectionService.recordCollection(
        contract_id,
        Number(amount),
        wallet_id,
        employee_id,
        organization_id
    );

    // 🛡️ AUDIT LOG: Record Collection
    await auditService.logAction(
        organization_id,
        auth_id,
        'تحصيل قسط',
        'المالية والتحصيل',
        `تم تحصيل مبلغ ${amount} ج.م على العقد رقم #${contract_id.substring(0, 8)} وإضافته لمحفظة المحصل.`,
        'info',
        req
    );

    res.status(201).json({ status: 'success', data: result });
});

// Add this to your server/src/controllers/collections.ts

export const getPendingInstallments = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = getEmployee(req);
    
    const installments = await collectionService.getPendingInstallments(organization_id);
    
    res.status(200).json({ status: 'success', data: installments });
});