import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as partnersService from '../services/partners';

export const listPartners = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const partners = await partnersService.listPartners(organization_id);
    res.json({ partners });
});

export const createPartner = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const partner = await partnersService.createPartner(req.body, organization_id);
    res.status(201).json({ success: true, partner });
});

export const transactCapital = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, organization_id } = (req as any).employee;
    const { partner_id, vault_id, amount, transaction_type } = req.body;
    const updated = await partnersService.transactCapital(
        organization_id,
        partner_id,
        vault_id,
        amount,
        transaction_type,
        employee_id
    );
    res.json({ success: true, partner: updated });
});

export const approveTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const { id } = req.params;               // transaction ID
    const { status } = req.body;             // 'APPROVED' or 'REJECTED'
    await partnersService.approveTransaction(organization_id, id, status);
    res.json({ success: true });
});

export const getPendingWithdrawals = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const pending = await partnersService.listPendingWithdrawals(organization_id);
    res.json({ pending });
});

export const getPartnerLedger = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const { partnerId } = req.params;
    const ledger = await partnersService.getPartnerLedger(organization_id, partnerId);
    res.json({ ledger });
});

export const calculateProfits = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const { from, to } = req.query as { from: string; to: string };
    const data = await partnersService.calculateProfits(organization_id, from, to);
    res.json(data);
});

export const distributeProfits = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, organization_id } = (req as any).employee;
    const result = await partnersService.distributeProfits(req.body, organization_id, employee_id);
    res.json(result);
});