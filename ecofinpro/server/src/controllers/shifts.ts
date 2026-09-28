// server/src/controllers/shifts.ts

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequest } from '../utils/errors';
import * as shiftsService from '../services/shifts';
import * as auditService from '../services/audit';

export const getActiveShift = asyncHandler(async (req: Request, res: Response) => {
    const { id: employeeId, organization_id } = (req as any).employee;
    const shift = await shiftsService.getActiveShift(employeeId, organization_id);
    res.json({ shift });
});

export const openShift = asyncHandler(async (req: Request, res: Response) => {
    // Extract auth_id to map the user correctly in the audit log
    const { id: employeeId, auth_id, organization_id, branch_id } = (req as any).employee;
    const { vault_id, starting_balance } = req.body;

    if (!vault_id || starting_balance === undefined) {
        throw BadRequest('يجب اختيار الخزينة وإدخال الرصيد الافتتاحي');
    }

    const shift = await shiftsService.openShift(
        vault_id,
        Number(starting_balance),
        branch_id,
        employeeId,
        organization_id
    );

    // 🛡️ Audit Log: Record opening the shift
    await auditService.logAction(
        organization_id,
        auth_id,
        'فتح وردية جديدة',
        'الورديات',
        `تم استلام الخزينة وبدء العمل برصيد افتتاحي: ${starting_balance} ج.م`,
        'info',
        req
    );

    res.status(201).json({ success: true, shift });
});

export const closeShift = asyncHandler(async (req: Request, res: Response) => {
    // Extract auth_id here as well
    const { id: employeeId, auth_id, organization_id } = (req as any).employee;
    const { id } = req.params;
    const { actual_closing_balance, notes } = req.body;

    if (actual_closing_balance === undefined) {
        throw BadRequest('يجب إدخال الرصيد الفعلي للخزينة');
    }

    const result = await shiftsService.closeShift(
        id,
        Number(actual_closing_balance),
        notes || null,
        employeeId,
        organization_id
    );

    // 🛡️ Audit Log: Record closing the shift with dynamic severity checking
    const difference = result.difference_amount || 0;
    const severity = difference < 0 ? 'warning' : 'info';
    
    let auditDetails = `تم إغلاق الوردية وترحيل العهدة برصيد فعلي: ${actual_closing_balance} ج.م.`;
    if (difference < 0) {
        auditDetails += ` (تنبيه: يوجد عجز بقيمة ${Math.abs(difference)} ج.م)`;
    } else if (difference > 0) {
        auditDetails += ` (ملاحظة: يوجد زيادة بقيمة ${difference} ج.م)`;
    }

    await auditService.logAction(
        organization_id,
        auth_id,
        'إغلاق وردية',
        'الورديات',
        auditDetails,
        severity,
        req
    );

    res.json({ success: true, shift: result });
});

export const listHistoricalShifts = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const branch_id = req.query.branch_id as string | undefined;
    const shifts = await shiftsService.listHistoricalShifts(organization_id, branch_id || null);
    res.json({ shifts });
});