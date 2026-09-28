// server/src/controllers/audit.ts

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as auditService from '../services/audit';
import { Forbidden } from '../utils/errors';

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const logs = await auditService.getLogs(organization_id);
    res.json({ logs });
});

export const clearLogs = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    
    // Hardcoded Sovereign Protection: Only the OWNER can wipe history
    if (employee.role !== 'OWNER') {
        // Log the illegal attempt!
        await auditService.logAction(
            employee.organization_id, 
            employee.auth_id, 
            'محاولة وصول غير مصرح بها', 
            'الأمن', 
            'محاولة مسح السجلات التاريخية بدون صلاحيات المالك', 
            'critical',
            req
        );
        throw Forbidden('غير مصرح لك بمسح السجلات الأمنية.');
    }

    await auditService.clearLogs(employee.organization_id);

    // Leave a permanent trace that the logs were cleared
    await auditService.logAction(
        employee.organization_id, 
        employee.auth_id, 
        'مسح السجل الأمني', 
        'الأمن', 
        'تم مسح كامل السجل التاريخي', 
        'critical',
        req
    );

    res.json({ success: true });
});