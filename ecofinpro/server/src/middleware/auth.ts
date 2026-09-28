import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { asyncHandler } from '../utils/asyncHandler';
import { Unauthorized, Forbidden } from '../utils/errors';

// --------------------------------------------------
// authenticate — verifies the Supabase JWT and attaches req.user
// --------------------------------------------------
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw Unauthorized('Missing token');
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        throw Unauthorized('Invalid token');
    }

    (req as any).user = user;
    next();
});

// --------------------------------------------------
// isSuperAdmin — must run AFTER authenticate
// CRITICAL FIX: Also check is_active flag on super_admins table
// to block deactivated admin accounts
// --------------------------------------------------
export const isSuperAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    if (!userId) throw Unauthorized('مطلوب تسجيل الدخول');

    const { data: employee, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, is_active')
        .eq('auth_id', userId)
        .single();

    if (empError || !employee) {
        throw Forbidden('مرفوض: يتطلب صلاحيات المشرف العام.');
    }

    // Block deactivated employee accounts
    if (!employee.is_active) {
        throw Forbidden('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
    }

    const { data: superAdmin, error: saError } = await supabaseAdmin
        .from('super_admins')
        .select('id, organization_id')
        .eq('id', employee.id)
        .single();

    if (saError || !superAdmin) {
        throw Forbidden('مرفوض: يتطلب صلاحيات المشرف العام.');
    }

    // Attach employee context for downstream controllers
    (req as any).employee = {
        id: employee.id,
        organization_id: superAdmin.organization_id,
        auth_id: userId,
        branch_id: null,
        role: 'SUPER_ADMIN',
        permissions: [],
        is_active: employee.is_active,
    } as AuthenticatedEmployee;

    next();
});

// --------------------------------------------------
// isOwner — must run AFTER authenticate.
// CRITICAL FIX: Also check is_active flag to block deactivated owner accounts
// --------------------------------------------------
// server/src/middleware/auth.ts
export interface AuthenticatedEmployee {
    id: string;
    organization_id: string;
    auth_id: string;
    branch_id: string | null;
    role: string;
    permissions: string[];
    is_active?: boolean;
    username?: string;  // ADD THIS
    email?: string;     // ADD THIS
}

export const isOwner = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    if (!userId) throw Unauthorized('مطلوب تسجيل الدخول');

    const { data: employee, error } = await supabaseAdmin
        .from('employees')
        .select('id, organization_id, role, is_active')
        .eq('auth_id', userId)
        .single();

    if (error || !employee) {
        throw Forbidden('تعذر تحديد المؤسسة الخاصة بك.');
    }

    // Block deactivated accounts at middleware level
    if (!employee.is_active) {
        throw Forbidden('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
    }

    if (employee.role !== 'OWNER') {
        throw Forbidden('هذه العملية متاحة لمالك المنشأة فقط.');
    }

    (req as any).employee = {
        ...employee,
        auth_id: userId,
        permissions: Array.isArray((employee as any).permissions) ? (employee as any).permissions : [],
    } as AuthenticatedEmployee;
    next();
});

// --------------------------------------------------
// authorizeModule(moduleKey) — must run AFTER authenticate.
//
// Unlike isOwner, POS (and CRM, inventory, etc.) must be reachable by any
// employee whose `permissions` array includes that module — Cashiers,
// Managers, whoever the Owner granted access to via User Management.
// Owners always pass, regardless of their own permissions array, exactly
// mirroring the "Owners see every item" rule already implemented in
// Sidebar.tsx's client-side filtering — this is that same rule enforced
// server-side so it can't be bypassed by calling the API directly.
//
// Looks the employee row up ONCE (same shape/cost as isOwner) and attaches
// req.employee so every downstream controller — pos.ts, customers.ts, and
// any future module — can read organization_id/branch_id/role without a
// second query, exactly like controllers/users.ts already relies on
// req.employee from isOwner.
// --------------------------------------------------
export const authorizeModule = (moduleKey: string) =>
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user?.id;
        if (!userId) throw Unauthorized('مطلوب تسجيل الدخول');

        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .select('id, organization_id, branch_id, role, permissions, is_active')
            .eq('auth_id', userId)
            .single();

        if (error || !employee) {
            throw Forbidden('تعذر تحديد المؤسسة الخاصة بك.');
        }

        if (!employee.is_active) {
            throw Forbidden('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
        }

        const permissions: string[] = Array.isArray(employee.permissions) ? employee.permissions : [];
        const hasAccess = employee.role === 'OWNER' || permissions.includes(moduleKey);

        if (!hasAccess) {
            throw Forbidden('ليست لديك صلاحية الوصول لهذه الوحدة.');
        }

        (req as any).employee = {
            id: employee.id,
            organization_id: employee.organization_id,
            branch_id: employee.branch_id,
            role: employee.role,
            permissions,
        } as AuthenticatedEmployee;
        next();
    });

// Authorize by employee role(s) – must run AFTER authenticate
export const authorizeRole = (...allowedRoles: string[]) =>
    asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).user?.id;
        if (!userId) throw Unauthorized('مطلوب تسجيل الدخول');

        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .select('id, organization_id, branch_id, role, permissions, is_active')
            .eq('auth_id', userId)
            .single();

        if (error || !employee) {
            throw Forbidden('تعذر تحديد المؤسسة الخاصة بك.');
        }

        if (!employee.is_active) {
            throw Forbidden('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
        }

        if (!allowedRoles.includes(employee.role)) {
            throw Forbidden('هذه الوحدة متاحة للمالك والمشرفين فقط.');
        }

        (req as any).employee = {
            id: employee.id,
            organization_id: employee.organization_id,
            branch_id: employee.branch_id,
            role: employee.role,
            permissions: employee.permissions,
        } as AuthenticatedEmployee;
        next();
    });

// --------------------------------------------------
// attachEmployee — attaches the authenticated employee record to req.employee
// CRITICAL FIX: Check is_active flag and safely parse permissions array
// --------------------------------------------------
export const attachEmployee = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    if (!userId) throw Unauthorized('مطلوب تسجيل الدخول');

    const { data: employee, error } = await supabaseAdmin
        .from('employees')
        .select('id, organization_id, branch_id, role, permissions, is_active, username')
        .eq('auth_id', userId)
        .single();

    if (error || !employee) {
        throw Forbidden('لم يتم العثور على موظف مرتبط بهذا الحساب.');
    }

    if (!employee.is_active) {
        throw Forbidden('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
    }

    (req as any).employee = {
        id: employee.id,
        organization_id: employee.organization_id,
        branch_id: employee.branch_id,
        role: employee.role,
        permissions: Array.isArray(employee.permissions) ? employee.permissions : [],
        username: employee.username,
        email: (req as any).user?.email,
    } as AuthenticatedEmployee;

    next();
});