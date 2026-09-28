import { supabaseAdmin } from '../utils/supabase';
import { generateTempPassword } from '../utils/password';
import { AppError, BadRequest, Conflict, NotFound } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';
import { isValidEmail, isValidPassword, isValidPhoneNumber, isNonEmptyString } from '../utils/validation';
import { SUBSCRIPTION_PLANS, PlanType } from '../constants/subscriptionPlans';
import crypto from 'crypto';
import { logger } from '../utils/logger';

function generateLicenseKey(orgName: string, months: number): string {
    let letters = orgName
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '')
        .substring(0, 4);

    if (!letters) letters = 'ORG';

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 random chars
    return `ECO-${letters}${months}-${randomSuffix}`;
}

export function calculateSubscriptionEndDate(months: number, baseDate: Date = new Date()): Date {
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    const day = baseDate.getUTCDate();

    const targetMonthIndex = month + months;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(day, lastDayOfTargetMonth);

    return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay, 23, 59, 59, 999));
}

// ==================================================
// CREATE LICENSE (Option B: org + person + employee(OWNER) + auth user,
// all provisioned atomically, license already linked via claimed_by_org_id)
// ==================================================
export interface CreateLicensePayload {
    org_name: string;
    org_phone: string;
    org_address: string;
    owner_name: string;
    owner_phone: string;
    owner_email: string;
    plan_name: PlanType;
}

export async function createLicense(payload: CreateLicensePayload) {
    const { org_name, org_phone, org_address, owner_name, owner_phone, owner_email, plan_name } = payload;

    if (!org_name || !org_phone || !org_address || !owner_name || !owner_email || !owner_phone || !plan_name) {
        throw BadRequest('الحقول المطلوبة: اسم المؤسسة ، عنوان المؤسسة، اسم المالك، الهاتف، البريد الإلكتروني، والخطة');
    }

    if (!isValidEmail(owner_email)) {
        throw BadRequest('البريد الإلكتروني غير صالح.');
    }
    if (!isValidPhoneNumber(org_phone) || !isValidPhoneNumber(owner_phone)) {
        throw BadRequest('رقم الهاتف غير صالح.');
    }

    const planDetails = SUBSCRIPTION_PLANS[plan_name];
    if (!planDetails) {
        throw BadRequest('خطة الاشتراك المحددة غير صالحة.');
    }
    const months = planDetails.valid_months;
    const maxBranches = planDetails.max_branches;
    const maxEmployees = planDetails.max_employees;
    const licenseKey = generateLicenseKey(org_name, months);
    const tempPassword = generateTempPassword();

    const subscriptionEndDate = calculateSubscriptionEndDate(months);

    const { data: existingUser } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('username', owner_email)
        .maybeSingle();

    if (existingUser) {
        throw Conflict('البريد الإلكتروني مسجل بالفعل لمستخدم آخر.');
    }

    const tx = new TransactionTracker();

    try {
        // 1. Auth User for the Owner
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: owner_email,
            password: tempPassword,
            email_confirm: true,
        });

        if (authError || !authUser.user) {
            throw new AppError('فشل إنشاء حساب المالك: ' + (authError?.message || 'بيانات المستخدم مفقودة'), 500);
        }

        const authUserId = authUser.user.id;
        tx.track(async () => {
            await supabaseAdmin.auth.admin.deleteUser(authUserId, true); // Hard delete
        });

        // 2. Organization
        // FIX: previously only set subscription_plan and left max_branches,
        // max_employees, and subscription_end_date NULL forever — even
        // though the schema has dedicated columns for them and the plan
        // details (maxBranches/maxEmployees/months) were already computed
        // above. Any future "has this org hit its plan limit?" check
        // against `organizations` directly (rather than joining out to
        // saaslicenses) would have silently seen NULL and never enforced
        // anything.
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: org_name,
                owner_name: owner_name,
                phone: org_phone,
                address: org_address,
                owner_phone: owner_phone,
                subscription_plan: plan_name,
                max_branches: maxBranches,
                max_employees: maxEmployees,
                subscription_end_date: subscriptionEndDate.toISOString(),
            })
            .select('id')
            .single();

        if (orgError || !org) {
            throw new AppError(orgError?.message || 'فشل إنشاء المؤسسة.', 500);
        }

        tx.track(async () => {
            await supabaseAdmin.from('organizations').delete().eq('id', org.id);
        });

        // 3. License
        // FIX: was `max_brances` (typo) — that column doesn't exist, so this
        // insert used to fail on every single call. Also now persists
        // plan_name, which checkLicense()/ClaimPage read back directly.
        //
        // NOTE: org_name/org_phone/org_address/owner_name/owner_phone/
        // owner_email were removed from the saaslicenses schema entirely
        // (confirmed dead — never read anywhere). Don't reintroduce writes
        // to them here; the live snapshot of an org's plan limits/expiry
        // now lives on `organizations` itself (written just above), with
        // `saaslicenses` as the append-only source of truth for licensing
        // history via claimed_by_org_id.
        const { data: license, error: licenseError } = await supabaseAdmin
            .from('saaslicenses')
            .insert({
                license_key: licenseKey,
                is_used: false,
                is_active: true,
                plan_name: plan_name,
                max_branches: maxBranches,
                max_employees: maxEmployees,
                valid_months: months,
                claimed_by_org_id: org.id,
                subscription_end_date: subscriptionEndDate.toISOString(),
            })
            .select('*')
            .single();

        if (!license || licenseError) {
            throw new AppError('فشل إنشاء الترخيص.', 500);
        }

        tx.track(async () => {
            await supabaseAdmin.from('saaslicenses').delete().eq('id', license.id);
        });

        // 4. Person (owner)
        const { data: person, error: personError } = await supabaseAdmin
            .from('persons')
            .insert({
                organization_id: org.id,
                full_name: owner_name,
                phone: owner_phone,
            })
            .select('id')
            .single();

        if (!person || personError) {
            throw new AppError('فشل إنشاء سجل الشخص.', 500);
        }

        tx.track(async () => {
            await supabaseAdmin.from('persons').delete().eq('id', person.id);
        });

        // 5. Default Branch — created before the employee now, so the owner
        // can be assigned to it immediately instead of sitting with a null
        // branch_id until they manually pick one later.
        const { data: branch, error: branchError } = await supabaseAdmin
            .from('branches')
            .insert({
                organization_id: org.id,
                name: 'الفرع الرئيسي',
                is_main_branch: true,
                address: 'المقر الرئيسي',
                city: 'المدينة',
                phone: org_phone,
                email: owner_email
            })
            .select('id')
            .single();

        if (!branch || branchError) {
            throw new AppError('فشل إنشاء الفرع الرئيسي: ' + (branchError?.message || 'غير معروف'), 500);
        }
        // No explicit undo needed: organizations -> branches is
        // ON DELETE CASCADE, so rolling back the org (below) cleans this up.

        // 6. Employee (owner) — username starts as the owner's email;
        // activateWorkspace() lets them replace it with a real username.
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .insert({
                id: person.id,
                organization_id: org.id,
                branch_id: branch.id,
                auth_id: authUserId,
                username: owner_email,
                phone: owner_phone,
                role: 'OWNER',
                is_active: true,
            })
            .select('id')
            .single();

        if (!employee || employeeError) {
            throw new AppError('فشل إنشاء سجل الموظف.', 500);
        }

        tx.track(async () => {
            await supabaseAdmin.from('employees').delete().eq('id', employee.id);
        });

        // 7. Default Vault
        const { data: vault, error: vaultError } = await supabaseAdmin
            .from('vaults')
            .insert({
                organization_id: org.id,
                name: 'الخزنة الرئيسية',
                is_main_vault: true,
                balance: 0.0,
                is_active: true,
            })
            .select('id')
            .single();

        if (!vault || vaultError) throw new AppError('فشل إنشاء الخزنة الرئيسية.', 500);

        tx.track(async () => {
            await supabaseAdmin.from('vaults').delete().eq('id', vault.id);
        });

        return {
            license: { ...license, organization_id: org.id },
            owner_credentials: { owner_email, temp_password: tempPassword },
        };
    } catch (err) {
        await tx.rollback();
        if (err instanceof AppError) throw err;
        throw new AppError((err as Error).message || 'فشل إنشاء المؤسسة والترخيص.', 500);
    }
}

export async function listLicenses() {
    const { data: licenses, error: licensesError } = await supabaseAdmin
        .from('saaslicenses')
        .select('*')
        .order('created_at', { ascending: false });

    if (!licenses || licensesError) {
        throw new AppError(licensesError?.message || 'فشل جلب التراخيص.', 500);
    }

    return licenses;
}

export async function updateLicense(id: string, updates: Record<string, unknown>) {
    const allowedKeys = ['is_active', 'plan_name', 'max_branches', 'max_employees', 'subscription_end_date'];
    const sanitizedUpdates: Record<string, unknown> = {};

    for (const key of allowedKeys) {
        if (key in updates) {
            sanitizedUpdates[key] = updates[key];
        }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
        throw BadRequest('لا توجد تعديلات صالحة للتحديث.');
    }

    const { data: license, error: updateError } = await supabaseAdmin
        .from('saaslicenses')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

    if (updateError) throw new AppError(updateError.message, 500);
    return license;
}

export async function deleteLicense(id: string) {
    const { data: license, error: fetchError } = await supabaseAdmin
    .from('saaslicenses')
    .select('is_used')
    .eq('id', id)
    .single();

    if (fetchError || !license) {
        throw NotFound('الترخيص غير موجود.');
    }

    if (license.is_used) {
        throw Conflict('لا يمكن حذف ترخيص مستخدم بالفعل.');
    }

    const { error } = await supabaseAdmin.from('saaslicenses').delete().eq('id', id);

    if (error) throw new AppError(error.message, 500);
}

export async function listOrganizations() {
    const { data: organizations, error: organizationsError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

    if (!organizations || organizationsError) {
        throw new AppError(organizationsError?.message || 'فشل جلب المؤسسات.', 500);
    }

    return organizations;
}

export async function toggleOrganizationStatus(id: string, isActive: boolean) {
    const { data: organization, error: updateError } = await supabaseAdmin
        .from('organizations')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

    if (updateError) throw new AppError(updateError.message, 500);

    // Synchronize all employees' active status to revoke access instantly
    await supabaseAdmin
        .from('employees')
        .update({ is_active: isActive })
        .eq('organization_id', id);

    return organization;
}

// ==================================================
// SUPER ADMINS
// ==================================================

export async function listAdmins() {
    // FIX: the old query tried to embed `employees(auth_id)` from
    // `super_admins`. PostgREST can only embed across a real foreign key,
    // and there isn't one between super_admins and employees (both are
    // independent children of persons) — that call would throw
    // "Could not find a relationship..." at runtime. auth_id is stored
    // directly on super_admins now (see createAdmin below), so read it
    // straight from the row — no join needed.
    const { data: admins, error: adminsError } = await supabaseAdmin
        .from('super_admins')
        .select('id, organization_id, created_at, auth_id, persons(full_name, phone)')
        .order('created_at', { ascending: false });

    if (!admins || adminsError) {
        throw new AppError(adminsError?.message || 'فشل جلب المشرفين.', 500);
    }

    return (admins || []).map((admin: any) => {
        const person = Array.isArray(admin.persons) ? admin.persons[0] : admin.persons;
        return {
            id: admin.id,
            organization_id: admin.organization_id,
            created_at: admin.created_at,
            full_name: person?.full_name || null,
            phone: person?.phone || null,
            auth_id: admin.auth_id || null,
        };
    });
}

export interface CreateAdminPayload {
    email: string;
    password: string;
    full_name: string;
    phone: string;
}

export async function createAdmin(payload: CreateAdminPayload, callerOrgId: string) {
    const { email, full_name, phone } = payload;

    if (!email || !full_name || !phone) {
        throw BadRequest('الحقول المطلوبة: البريد الإلكتروني، الاسم الكامل، رقم الهاتف');
    }

    if (!isValidEmail(email)) {
        throw BadRequest('البريد الإلكتروني غير صالح.');
    }

    if (!isNonEmptyString(callerOrgId)) {
        throw BadRequest('معرف المؤسسة غير صالح.');
    }

    const { data: existingUser } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('username', email)
        .maybeSingle();

    if (existingUser) {
        throw Conflict('البريد الإلكتروني مسجل بالفعل لمستخدم آخر.');
    }

    let password = payload.password;
    let passwordWasGenerated = false;
    if (!password || !isValidPassword(password)) {
        password = generateTempPassword();
        passwordWasGenerated = true;
    }

    const tx = new TransactionTracker();

    try {
        // 1. Supabase Auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
        });

        if (authError || !authUser.user) {
            throw new AppError('فشل إنشاء حساب المصادقة: ' + (authError?.message || 'غير معروف'), 500);
        }

        const authId = authUser.user.id;
        tx.track(async () => {
            await supabaseAdmin.auth.admin.deleteUser(authId);
        });

        // 2. Person
        const { data: person, error: personError } = await supabaseAdmin
            .from('persons')
            .insert({
                organization_id: callerOrgId,
                full_name: full_name,
                phone: phone,
            })
            .select('id')
            .single();
        if (personError || !person) throw new AppError('فشل إنشاء سجل الشخص.', 500);
        tx.track(async () => {
            await supabaseAdmin.from('persons').delete().eq('id', person.id);
        });

        // 3. Employee row — REQUIRED. login() and the isSuperAdmin middleware
        // both resolve auth_id -> employees.id -> super_admins.id. Without
        // this row, a newly created admin authenticates fine against
        // Supabase Auth but every request into /sa/* 403s immediately,
        // because isSuperAdmin() can never find an employees row for them.
        const normalizedEmail = email.trim().toLowerCase();

        const { error: employeeError } = await supabaseAdmin.from('employees').insert({
            id: person.id,
            organization_id: callerOrgId,
            auth_id: authId,
            username: normalizedEmail,
            phone: phone,
            role: 'SUPER_ADMIN',
            is_active: true,
        });
        if (employeeError) throw new AppError('فشل إنشاء سجل الموظف للمشرف.', 500);
        tx.track(async () => {
            await supabaseAdmin.from('employees').delete().eq('id', person.id);
        });

        // 4. Super admin record — FIX: now also stores auth_id directly
        // (the column already exists on this table), so listAdmins()/
        // deleteAdmin() never need to join out to employees at all.
        const { data: admin, error: adminError } = await supabaseAdmin
            .from('super_admins')
            .insert({
                id: person.id,
                organization_id: callerOrgId,
                auth_id: authId,
            })
            .select('id, organization_id, created_at, auth_id')
            .single();
        if (adminError || !admin) throw new AppError('فشل إنشاء سجل المشرف.', 500);

        return {
            admin: {
                ...admin,
                full_name,
                phone,
            },
            credentials: passwordWasGenerated ? { email, temp_password: password } : null,
        };
    } catch (err) {
        await tx.rollback();
        if (err instanceof AppError) throw err;
        throw new AppError((err as Error).message || 'فشل إنشاء المشرف.', 500);
    }
}

export async function deleteAdmin(id: string) {
    const { count, error: countError } = await supabaseAdmin
        .from('super_admins')
        .select('*', { count: 'exact', head: true });

    if (countError) throw new AppError(countError.message, 500);
    if (count !== null && count <= 1) {
        throw Conflict('لا يمكن حذف آخر مشرف عام.');
    }

    const { data: admin, error: fetchError } = await supabaseAdmin
        .from('super_admins')
        .select('id, auth_id')
        .eq('id', id)
        .single();

    if (fetchError || !admin) throw NotFound('المشرف غير موجود.');

    // Delete root person record (cascades to super_admins and employees)
    const { error: personDeleteError } = await supabaseAdmin
        .from('persons')
        .delete()
        .eq('id', id);

    if (personDeleteError) throw new AppError(personDeleteError.message, 500);

    if (admin.auth_id) {
        try {
            await supabaseAdmin.auth.admin.deleteUser(admin.auth_id, true);
        } catch (e) {
            logger.error({ adminId: id, error: e instanceof Error ? e.stack : e }, 'Failed to delete auth user for removed admin');
        }
    }
}