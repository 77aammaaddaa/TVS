import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as suppliersService from '../services/suppliers';
import * as auditService from '../services/audit';
import { BadRequest } from '../utils/errors';

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    const supplier = await suppliersService.createSupplier(req.body, organization_id);

    await auditService.logAction(
        organization_id,
        auth_id,
        'إضافة مورد',
        'الموردين',
        `تم إضافة المورد: ${supplier.name}`,
        'info',
        req
    );

    res.status(201).json({ success: true, supplier });
});

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const search = req.query.search as string | undefined;
    const suppliers = await suppliersService.listSuppliers(organization_id, search);
    res.json({ suppliers });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    const supplierId = req.params.id;

    const updated = await suppliersService.updateSupplier(supplierId, req.body, organization_id);

    await auditService.logAction(
        organization_id,
        auth_id,
        'تحديث بيانات مورد',
        'الموردين',
        `تم تحديث بيانات المورد: ${updated.name}`,
        'info',
        req
    );

    res.json({ success: true, supplier: updated });
});

export const deactivateSupplier = asyncHandler(async (req: Request, res: Response) => {
    const { id: employee_id, auth_id, organization_id } = (req as any).employee;
    const supplierId = req.params.id;

    await suppliersService.deactivateSupplier(supplierId, organization_id);

    await auditService.logAction(
        organization_id,
        auth_id,
        'تعطيل مورد',
        'الموردين',
        `تم تعطيل المورد`,
        'warning',
        req
    );

    res.json({ success: true });
});

export const getSupplierStatement = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const supplierId = req.params.id;
    const statement = await suppliersService.getSupplierOutstanding(supplierId, organization_id);
    res.json(statement);
});