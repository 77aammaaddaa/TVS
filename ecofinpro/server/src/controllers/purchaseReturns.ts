import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as purchaseReturnsService from '../services/purchaseReturns';
import * as auditService from '../services/audit';

export const createPurchaseReturn = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    const result = await purchaseReturnsService.createPurchaseReturn(req.body, organization_id, employee_id);

    await auditService.logAction(
        organization_id,
        auth_id,
        'إنشاء مرتجع شراء',
        'المشتريات',
        `تم إنشاء مرتجع للفاتورة ${req.body.purchase_invoice_id}`,
        'warning',
        req
    );

    res.status(201).json({ success: true, return: result });
});