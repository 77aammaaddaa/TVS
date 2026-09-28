import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as purchasesService from '../services/purchases';
import * as auditService from '../services/audit';

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id, id: employee_id } = (req as any).employee;
    const purchase = await purchasesService.createPurchase(req.body, organization_id, employee_id);
    res.status(201).json({ success: true, purchase });
});

export const listPurchases = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const purchases = await purchasesService.listPurchases(organization_id);
    res.json({ purchases });
});

export const approvePurchase = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id, id: employee_id } = (req as any).employee;
    const { id: invoice_id } = req.params;
    
    const result = await purchasesService.approvePurchase(invoice_id, organization_id, employee_id);
    res.json({ success: true, ...result });
});

export const settlePurchaseDebt = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id, id: employee_id } = (req as any).employee;
    const { id: invoice_id } = req.params;
    const { vault_id, amount } = req.body;
    
    const result = await purchasesService.settlePurchaseDebt(
        invoice_id, 
        vault_id, 
        Number(amount), 
        organization_id, 
        employee_id
    );
    res.json(result);
});

export const rejectPurchase = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    const { id: invoice_id } = req.params;
    const { reason } = req.body;

    await purchasesService.rejectPurchase(invoice_id, reason, organization_id, employee_id);

    await auditService.logAction(
        organization_id,
        auth_id,
        'رفض فاتورة شراء',
        'المشتريات',
        `تم رفض الفاتورة ${invoice_id}. السبب: ${reason || 'غير محدد'}`,
        'info',
        req
    );

    res.json({ success: true });
});