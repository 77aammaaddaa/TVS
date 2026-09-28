import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as inventoryService from '../services/inventory';

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const products = await inventoryService.listProducts(organization_id);
    res.json({ products });
});

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const categories = await inventoryService.listCategories(organization_id);
    res.json({ categories });
});

export const updateProductDetails = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const { id: product_id } = req.params;
    
    const result = await inventoryService.updateProductDetails(product_id, req.body, organization_id);
    res.json(result);
});