// server/src/controllers/pos.ts

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as posService from '../services/pos';

export const createSale = asyncHandler(async (req: Request, res: Response) => {
    const { id: employeeId, branch_id, organization_id } = (req as any).employee;
    const result = await posService.createSale(req.body, employeeId, branch_id, organization_id);
    res.status(201).json({ success: true, ...result });
});

export const listSales = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const { branch_id, sale_type, from, to } = req.query as Record<string, string>;
    const sales = await posService.listSales(organization_id, { branch_id, sale_type, from, to });
    res.json({ sales });
});

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const products = await posService.listAvailableProducts(organization_id);
    res.json({ products });
});

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const categories = await posService.listCategories(organization_id);
    res.json({ categories });
});

export const listVaults = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const vaults = await posService.listVaults(organization_id);
    res.json({ vaults });
});