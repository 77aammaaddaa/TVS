import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as dashboardService from '../services/dashboard';
import { Forbidden } from '../utils/errors';

export const getHomeData = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    const data = await dashboardService.getHomeData(employee.organization_id, employee);
    res.status(200).json({ status: 'success', data });
});

export const getGoldenData = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    
    // Strict RBAC enforcement for the Golden Dashboard
    if (!['OWNER', 'MODERATOR'].includes(employee.role)) {
        throw Forbidden('غير مصرح لك بالوصول إلى لوحة الإدارة العليا');
    }

    const data = await dashboardService.getGoldenData(employee.organization_id);
    res.status(200).json({ status: 'success', data });
});