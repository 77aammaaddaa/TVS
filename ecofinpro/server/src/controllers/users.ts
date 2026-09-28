// server/src/controllers/users.ts

import { Request, Response } from 'express';
import type { AuthenticatedEmployee } from '../middleware/auth';
import * as usersService from '../services/users';
import * as auditService from '../services/audit';

// Helper to extract the full employee context for audit logging
function getEmployee(req: Request): AuthenticatedEmployee {
    return (req as any).employee as AuthenticatedEmployee;
}

export async function createEmployee(req: Request, res: Response) {
    const emp = getEmployee(req);
    const result = await usersService.createEmployee(req.body, emp.organization_id);
    
    // 🛡️ AUDIT LOG: User Creation
    await auditService.logAction(
        emp.organization_id,
        emp.auth_id,
        'إنشاء حساب موظف',
        'إدارة المستخدمين',
        `تم إنشاء حساب للموظف: ${req.body.full_name} (${req.body.username}) بصلاحية ${req.body.role}`,
        'info',
        req
    );

    return res.status(201).json({ success: true, ...result });
}

export async function getEmployees(req: Request, res: Response) {
    const emp = getEmployee(req);
    const employees = await usersService.listEmployees(emp.organization_id);
    return res.json({ employees });
}

export async function updateEmployee(req: Request, res: Response) {
    const emp = getEmployee(req);
    const result = await usersService.updateEmployee(req.params.id, req.body, emp.organization_id);
    
    // 🛡️ AUDIT LOG: User Update
    await auditService.logAction(
        emp.organization_id,
        emp.auth_id,
        'تعديل حساب موظف',
        'إدارة المستخدمين',
        `تم تعديل بيانات أو صلاحيات الموظف (ID: ${req.params.id})`,
        'info',
        req
    );

    return res.json(result);
}

export async function resetEmployeePassword(req: Request, res: Response) {
    const emp = getEmployee(req);
    const result = await usersService.resetEmployeePassword(req.params.id, req.body.new_password, emp.organization_id);
    
    // 🛡️ AUDIT LOG: Password Reset (Security Action)
    await auditService.logAction(
        emp.organization_id,
        emp.auth_id,
        'إعادة تعيين كلمة المرور',
        'إدارة المستخدمين',
        `تم تغيير كلمة المرور للموظف (ID: ${req.params.id}) بأمر من الإدارة`,
        'warning', // Elevated severity for security events
        req
    );

    return res.json(result);
}

export async function toggleEmployeeActive(req: Request, res: Response) {
    const emp = getEmployee(req);
    const isActive = !!req.body.is_active;
    const result = await usersService.setEmployeeActive(req.params.id, isActive, emp.organization_id);
    
    // 🛡️ AUDIT LOG: Account Deactivation/Activation
    await auditService.logAction(
        emp.organization_id,
        emp.auth_id,
        isActive ? 'تفعيل حساب موظف' : 'تعطيل حساب موظف',
        'إدارة المستخدمين',
        `تم ${isActive ? 'تفعيل' : 'تعطيل'} وصول الموظف (ID: ${req.params.id}) إلى النظام`,
        isActive ? 'info' : 'warning',
        req
    );

    return res.json(result);
}