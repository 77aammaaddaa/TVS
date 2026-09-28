// server/src/services/users.ts
//
// Employee ("User Management") service — the piece that was missing.
// Mirrors services/superAdmin.ts's createLicense(): a multi-step write
// (Supabase Auth user -> persons row -> employees row) wrapped in a
// TransactionTracker so a failure partway through gets undone, exactly
// like activateWorkspace()/createLicense() already do elsewhere.

import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, NotFound, Conflict } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';
import { generateTempPassword } from '../utils/password';
import {
    isNonEmptyString,
    isValidEmail,
    isValidPassword,
    isValidPhoneNumber,
    isValidRole,
    isValidPermissions,
} from '../utils/validation';

// ==================================================
// Types
// ==================================================
export interface CreateEmployeePayload {
    full_name: string;
    email: string;
    username: string;
    password?: string; // optional — auto-generated (utils/password.ts) if omitted
    phone: string;
    role: string;
    permissions: string[];
    branch_id?: string | null;
    national_id?: string;
}

export interface UpdateEmployeePayload {
    role?: string;
    permissions?: string[];
    branch_id?: string | null;
    phone?: string;
    is_active?: boolean;
    full_name?: string;
}

export interface EmployeeRecord {
    id: string;
    auth_id: string | null;
    organization_id: string;
    branch_id: string | null;
    role: string;
    username: string | null;
    phone: string | null;
    permissions: string[];
    is_active: boolean;
    created_at: string;
    person?: { full_name: string | null; national_id: string | null } | null;
}

// ==================================================
// CREATE EMPLOYEE
// Owner-only (enforced by the controller, which also resolves organizationId).
// ==================================================
export async function createEmployee(
    payload: CreateEmployeePayload,
    organizationId: string
): Promise<{
    employee: EmployeeRecord;
    credentials: { email: string; username: string; temp_password?: string };
}> {
    const { full_name, email, username, phone, role, permissions, branch_id, national_id } = payload;

    if (!isNonEmptyString(full_name)) throw BadRequest('الاسم الكامل مطلوب.');
    if (!isValidEmail(email)) throw BadRequest('البريد الإلكتروني غير صالح.');
    if (!isNonEmptyString(username) || username.trim().length < 3) {
        throw BadRequest('اسم المستخدم يجب ألا يقل عن 3 أحرف.');
    }
    if (!isValidPhoneNumber(phone)) throw BadRequest('رقم الهاتف غير صالح.');
    if (!isValidRole(role)) throw BadRequest('الدور الوظيفي غير صالح.');
    // Owners provision themselves via the Super Admin module only — never here.
    if (role === 'OWNER' || role === 'SUPER_ADMIN') {
        throw BadRequest('لا يمكن إنشاء مالك أو مشرف عام من هذه الشاشة.');
    }
    if (!isValidPermissions(permissions)) throw BadRequest('الصلاحيات المحددة غير صالحة.');

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // DB enforces case-insensitive uniqueness (idx_employees_username_ci);
    // check up front so we can return a clean 409 instead of a raw PG error.
    const { data: existingUsername } = await supabaseAdmin
        .from('employees')
        .select('id')
        .ilike('username', trimmedUsername)
        .maybeSingle();
    if (existingUsername) throw Conflict('اسم المستخدم هذا مستخدم بالفعل.');

    let password = payload.password?.trim();
    let generatedPassword: string | undefined;
    if (!password) {
        generatedPassword = generateTempPassword();
        password = generatedPassword;
    } else if (!isValidPassword(password)) {
        throw BadRequest('كلمة المرور ضعيفة (8 أحرف على الأقل، حرف ورقم على الأقل).');
    }

    if (branch_id) {
        const { data: branch } = await supabaseAdmin
            .from('branches')
            .select('id')
            .eq('id', branch_id)
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (!branch) throw BadRequest('الفرع المحدد غير صحيح.');
    }

    const tx = new TransactionTracker();

    try {
        // 1. Supabase Auth identity
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: trimmedEmail,
            password,
            email_confirm: true,
        });
        if (authError || !authUser?.user) {
            // Supabase returns 422/"already registered" for duplicate emails.
            throw new AppError(authError?.message || 'فشل إنشاء حساب الدخول.', 500);
        }
        tx.track(async () => {
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        });

        // 2. persons row (organization-scoped, shared by employees/customers/etc.)
        const { data: person, error: personError } = await supabaseAdmin
            .from('persons')
            .insert({
                organization_id: organizationId,
                full_name: full_name.trim(),
                phone: phone.trim(),
                national_id: national_id?.trim() || null,
            })
            .select('id')
            .single();
        if (personError || !person) {
            throw new AppError('فشل إنشاء سجل الموظف الأساسي.', 500, personError?.message);
        }
        tx.track(async () => {
            await supabaseAdmin.from('persons').delete().eq('id', person.id);
        });

        // 3. employees row — 1:1 with persons, id = person.id
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .insert({
                id: person.id,
                auth_id: authUser.user.id,
                organization_id: organizationId,
                branch_id: branch_id || null,
                role,
                username: trimmedUsername,
                phone: phone.trim(),
                permissions,
                is_active: true,
            })
            .select(
                'id, auth_id, organization_id, branch_id, role, username, phone, permissions, is_active, created_at'
            )
            .single();
        if (employeeError || !employee) {
            throw new AppError('فشل إنشاء حساب الموظف.', 500, employeeError?.message);
        }

        return {
            employee: {
                ...employee,
                person: { full_name: full_name.trim(), national_id: national_id?.trim() || null },
            },
            credentials: {
                email: trimmedEmail,
                username: trimmedUsername,
                temp_password: generatedPassword,
            },
        };
    } catch (err) {
        await tx.rollback();
        if (err instanceof AppError) throw err;
        throw new AppError((err as Error).message, 500);
    }
}

// ==================================================
// LIST EMPLOYEES — scoped to the caller's organization, owner excluded
// (the owner manages their own account elsewhere, e.g. Settings).
// ==================================================
export async function listEmployees(organizationId: string): Promise<EmployeeRecord[]> {
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select(
            'id, auth_id, organization_id, branch_id, role, username, phone, permissions, is_active, created_at, persons(full_name, national_id)'
        )
        .eq('organization_id', organizationId)
        .neq('role', 'OWNER')
        .order('created_at', { ascending: false });

    if (error) throw new AppError('فشل تحميل قائمة الموظفين.', 500, error.message);

    return (data || []).map((row: any) => ({
        ...row,
        person: row.persons ? { full_name: row.persons.full_name, national_id: row.persons.national_id } : null,
    }));
}

// ==================================================
// UPDATE EMPLOYEE — role, permissions, branch, phone, active state, name.
// ==================================================
export async function updateEmployee(
    employeeId: string,
    payload: UpdateEmployeePayload,
    organizationId: string
) {
    const { data: existing, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('id, role, organization_id')
        .eq('id', employeeId)
        .eq('organization_id', organizationId)
        .maybeSingle();

    if (fetchError || !existing) throw NotFound('الموظف غير موجود.');
    if (existing.role === 'OWNER') throw BadRequest('لا يمكن تعديل حساب المالك من هذه الشاشة.');

    const employeeUpdates: Record<string, unknown> = {};

    if (payload.role !== undefined) {
        if (!isValidRole(payload.role) || payload.role === 'OWNER' || payload.role === 'SUPER_ADMIN') {
            throw BadRequest('الدور الوظيفي غير صالح.');
        }
        employeeUpdates.role = payload.role;
    }
    if (payload.permissions !== undefined) {
        if (!isValidPermissions(payload.permissions)) throw BadRequest('الصلاحيات المحددة غير صالحة.');
        employeeUpdates.permissions = payload.permissions;
    }
    if (payload.branch_id !== undefined) employeeUpdates.branch_id = payload.branch_id;
    if (payload.phone !== undefined) {
        if (!isValidPhoneNumber(payload.phone)) throw BadRequest('رقم الهاتف غير صالح.');
        employeeUpdates.phone = payload.phone.trim();
    }
    if (payload.is_active !== undefined) employeeUpdates.is_active = payload.is_active;

    if (Object.keys(employeeUpdates).length > 0) {
        const { error } = await supabaseAdmin.from('employees').update(employeeUpdates).eq('id', employeeId);
        if (error) throw new AppError('فشل تحديث بيانات الموظف.', 500, error.message);
    }

    if (payload.full_name !== undefined) {
        if (!isNonEmptyString(payload.full_name)) throw BadRequest('الاسم الكامل مطلوب.');
        const { error } = await supabaseAdmin
            .from('persons')
            .update({ full_name: payload.full_name.trim() })
            .eq('id', employeeId);
        if (error) throw new AppError('فشل تحديث اسم الموظف.', 500, error.message);
    }

    return { success: true };
}

// ==================================================
// RESET EMPLOYEE PASSWORD
// ==================================================
export async function resetEmployeePassword(employeeId: string, newPassword: string, organizationId: string) {
    if (!isNonEmptyString(newPassword) || !isValidPassword(newPassword)) {
        throw BadRequest('كلمة المرور الجديدة ضعيفة (8 أحرف على الأقل، حرف ورقم).');
    }

    const { data: employee, error } = await supabaseAdmin
        .from('employees')
        .select('id, auth_id, role, organization_id')
        .eq('id', employeeId)
        .eq('organization_id', organizationId)
        .maybeSingle();

    if (error || !employee) throw NotFound('الموظف غير موجود.');
    if (employee.role === 'OWNER') throw BadRequest('لا يمكن تغيير كلمة مرور المالك من هذه الشاشة.');
    if (!employee.auth_id) throw new AppError('لا يوجد حساب دخول مرتبط بهذا الموظف.', 500);

    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(employee.auth_id, {
        password: newPassword,
    });
    if (pwError) throw new AppError('فشل تحديث كلمة المرور.', 500, pwError.message);

    return { success: true };
}

// ==================================================
// ACTIVATE / DEACTIVATE
// Deliberately a soft flag, never a hard delete — payments, expenses,
// inventory_transactions, vault_transactions and shift_sessions all carry
// employee_id (ON DELETE SET NULL), so deleting an employee row would
// silently orphan historical financial records.
// ==================================================
export async function setEmployeeActive(employeeId: string, isActive: boolean, organizationId: string) {
    return updateEmployee(employeeId, { is_active: isActive }, organizationId);
}