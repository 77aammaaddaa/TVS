import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as vaultsService from '../services/vaults';
import * as auditService from '../services/audit';
import { BadRequest } from '../utils/errors';

export const listVaults = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const vaults = await vaultsService.listAllVaults(organization_id);
    res.json({ vaults });
});

export const createVault = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    const vault = await vaultsService.createVault(organization_id, req.body);
    await auditService.logAction(organization_id, auth_id, 'إنشاء خزينة', 'الخزائن', `تم إنشاء الخزينة: ${vault.name}`, 'info', req);
    res.status(201).json({ success: true, vault });
});

export const updateVault = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    const vault = await vaultsService.updateVault(organization_id, req.params.id, req.body);
    await auditService.logAction(organization_id, auth_id, 'تحديث خزينة', 'الخزائن', `تم تحديث الخزينة: ${vault.name}`, 'info', req);
    res.json({ success: true, vault });
});

export const transfer = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    await vaultsService.transfer(organization_id, employee_id, req.body);
    await auditService.logAction(organization_id, auth_id, 'تحويل بين الخزائن', 'الخزائن', `تحويل ${req.body.amount}`, 'info', req);
    res.json({ success: true });
});

export const getLedger = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const ledger = await vaultsService.getLedger(organization_id, req.params.id, req.query as any);
    res.json({ transactions: ledger });
});