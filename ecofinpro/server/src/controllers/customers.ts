import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as customersService from '../services/customers';
import * as auditService from '../services/audit';

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    const customer = await customersService.createCustomer(req.body, employee.organization_id);
    await auditService.logAction(
        employee.organization_id,
        employee.auth_id,
        'CREATE_CUSTOMER',
        'crm',
        `Created customer ${customer.full_name} (${customer.id})`,
        'info',
        req
    );
    res.status(201).json({ success: true, customer });
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const customers = await customersService.listCustomers(organization_id);
    res.json({ customers });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const customer = await customersService.getCustomerById(req.params.id, organization_id);
    res.json({ customer });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    const result = await customersService.updateCustomer(req.params.id, req.body, employee.organization_id);
    await auditService.logAction(
        employee.organization_id,
        employee.auth_id,
        'UPDATE_CUSTOMER',
        'crm',
        `Updated customer ${req.params.id}`,
        'info',
        req
    );
    res.json(result);
});

export const getCustomerCreditProfile = asyncHandler(async (req: Request, res: Response) => {
    const { organization_id } = (req as any).employee;
    const profile = await customersService.getCustomerCreditProfile(req.params.id, organization_id);
    res.json(profile);
});