// server/src/services/auth.service.ts
//
// Option B auth flow:
//   1. Super Admin module pre-provisions org + person + employee(OWNER) +
//      Supabase Auth user (temp password) and sets saaslicenses.claimed_by_org_id
//      immediately, with is_used = false.
//   2. Owner runs /activate -> checkLicense -> /claim -> activateWorkspace.
//   3. Login accepts a username OR email in a single `identifier` field.
//   4. Forgot password is 100% Supabase native magic link — no custom OTP/SMTP.

import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, Unauthorized, Forbidden, NotFound } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';
import {
    isNonEmptyString,
    isValidEmail,
    isValidPassword,
    isValidLicenseKey,
} from '../utils/validation';
import { logger } from '../utils/logger';

// ==================================================
// LOGIN — accepts username OR email via `identifier`
// ==================================================
export interface LoginResult {
    user: {
        id: string;
        personId: string;
        email: string;
        username: string;
        role: string;
        branchId: string | null;
        orgId: string;
        permissions: unknown;
        isSuperAdmin: boolean;
    };
    session: {
        access_token: string;
        refresh_token: string;
    };
}

export const login = async (identifier: string, password: string, license_key?: string): Promise<LoginResult> => {
    if (!isNonEmptyString(identifier)) throw BadRequest('اسم المستخدم أو البريد الإلكتروني مطلوب.');
    if (!isNonEmptyString(password)) throw BadRequest('كلمة المرور مطلوبة.');

    let email = identifier.trim();
    let orgIdScope: string | null = null;

    // 1. Resolve organization scope from license key if provided
    if (license_key) {
        const { data: license } = await supabaseAdmin
            .from('saaslicenses')
            .select('claimed_by_org_id')
            .eq('license_key', license_key.trim().toUpperCase())
            .maybeSingle();
        
        if (license?.claimed_by_org_id) {
            orgIdScope = license.claimed_by_org_id;
        }
    }

    // 2. Safe scoped username lookup
    //
    // FIX: previously this fell back to an UNSCOPED lookup whenever
    // license_key was missing/invalid (orgIdScope stays null, and the
    // `.eq('organization_id', ...)` filter was just skipped). Now that
    // activateWorkspace only enforces per-org username uniqueness (see
    // above), the same username can legitimately exist in multiple orgs —
    // an unscoped query here would then resolve to whichever org's row
    // happens to match, silently breaking tenant isolation for anyone
    // whose license key is missing from the request. Username login must
    // always be scoped, so require a valid license key up front rather
    // than degrade to a global lookup.
    if (!email.includes('@')) {
        if (!orgIdScope) {
            throw BadRequest('يرجى إدخال كود التفعيل الخاص بمنشأتك لتسجيل الدخول باسم المستخدم.');
        }

        const { data: employeeByUsername, error: usernameError } = await supabaseAdmin
            .from('employees')
            .select('auth_id')
            .eq('username', email)
            .eq('organization_id', orgIdScope)
            .maybeSingle();

        if (usernameError || !employeeByUsername?.auth_id) {
            throw Unauthorized('بيانات الدخول غير صحيحة.');
        }

        const { data: resolvedAuthUser } = await supabaseAdmin.auth.admin.getUserById(employeeByUsername.auth_id);
        if (!resolvedAuthUser?.user?.email) throw Unauthorized('بيانات الدخول غير صحيحة.');

        email = resolvedAuthUser.user.email;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
    });

    if (authError || !authData.user || !authData.session) {
        throw Unauthorized('بيانات الدخول غير صحيحة.');
    }

    // ── Check super_admins FIRST (they have their own auth_id) ──
    const { data: superAdmin, error: saError } = await supabaseAdmin
        .from('super_admins')
        .select('id, organization_id')
        .eq('auth_id', authData.user.id)
        .maybeSingle();

    if (saError) {
        throw new Error(`Database error: ${saError.message}`);
    }
    
    if (superAdmin) {
        // Super admin found – no employee record needed.
        const orgId = superAdmin.organization_id;

        // Ensure the Super Admin hasn't been disabled in the employees table
        const { data: saEmployee } = await supabaseAdmin
            .from('employees')
            .select('is_active')
            .eq('auth_id', authData.user.id)
            .single();

        if (!saEmployee?.is_active) {
            throw Forbidden('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
        }

        if (license_key) {
            const { data: license, error: licenseError } = await supabaseAdmin
                .from('saaslicenses')
                .select('claimed_by_org_id')
                .eq('license_key', license_key.trim().toUpperCase())
                .maybeSingle();

            if (licenseError || !license || license.claimed_by_org_id !== orgId) {
                throw Unauthorized('المفتاح لا يتطابق مع المؤسسة الخاصة بك.');
            }
        }

        return {
            user: {
                id: authData.user.id,
                personId: superAdmin.id,
                email,
                username: email,               // or use a stored full_name if you add one later
                role: 'SUPER_ADMIN',
                branchId: null,
                orgId,
                permissions: [],
                isSuperAdmin: true,
            },
            session: {
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
            },
        };
    }

    // ── Not a super admin – fall back to normal employee lookup ──
    const { data: employee, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, role, username, branch_id, permissions, is_active, organization_id')
        .eq('auth_id', authData.user.id)
        .single();

    if (empError || !employee) {
        throw Unauthorized('لا يوجد حساب مرتبط بهذا المستخدم.');
    }

    // CRITICAL SECURITY GATE: Block disabled accounts at login level
    if (!employee.is_active) {
        throw Forbidden('هذا الحساب معطل. يرجى التواصل مع الإدارة.');
    }

    if (license_key) {
        const orgId = employee.organization_id;
        const { data: license, error: licenseError } = await supabaseAdmin
            .from('saaslicenses')
            .select('claimed_by_org_id')
            .eq('license_key', license_key.trim().toUpperCase())
            .maybeSingle();

        if (licenseError || !license || license.claimed_by_org_id !== orgId) {
            throw Unauthorized('المفتاح لا يتطابق مع المؤسسة الخاصة بك.');
        }
    }

    // Safely parse permissions - handle PostgreSQL raw strings or null
    const permissions = Array.isArray(employee.permissions) ? employee.permissions : [];

    return {
        user: {
            id: authData.user.id,
            personId: employee.id,
            email,
            username: employee.username || email,
            role: employee.role,
            branchId: employee.branch_id,
            orgId: employee.organization_id,
            permissions,
            isSuperAdmin: false,
        },
        session: {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
        },
    };
};

// ==================================================
// CHECK LICENSE — side-effect-free lookup used by both
// ActivationPage (used/unused check) and ClaimPage (read-only
// display of org name + pre-registered owner email).
// ==================================================
export interface CheckLicenseResult {
    license_key: string;
    is_used: boolean;
    plan_name: string | null;
    org_name?: string | null;
    owner_email?: string | null;
}

export async function checkLicense(licenseKey: string): Promise<CheckLicenseResult> {
    if (!isValidLicenseKey(licenseKey)) throw BadRequest('كود التفعيل غير صالح.');

    const normalizedKey = licenseKey.trim().toUpperCase();

    const { data: license, error } = await supabaseAdmin
        .from('saaslicenses')
        .select('license_key, is_used, claimed_by_org_id, plan_name')
        .eq('license_key', normalizedKey)
        .single();

    if (error || !license) {
        throw BadRequest('كود التفعيل غير صحيح.');
    }

    if (license.is_used || !license.claimed_by_org_id) {
        // Either already activated, or this key wasn't provisioned with an
        // org yet (shouldn't happen under Option B, but fail soft).
        return {
            license_key: license.license_key,
            is_used: license.is_used,
            plan_name: license.plan_name,
        };
    }

    const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', license.claimed_by_org_id)
        .single();

    const { data: owner } = await supabaseAdmin
        .from('employees')
        .select('auth_id')
        .eq('organization_id', license.claimed_by_org_id)
        .eq('role', 'OWNER')
        .maybeSingle();

    let ownerEmail: string | null = null;
    if (owner?.auth_id) {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(owner.auth_id);
        ownerEmail = authUserData?.user?.email ?? null;
    }

    return {
        license_key: license.license_key,
        is_used: license.is_used,
        plan_name: license.plan_name,
        org_name: org?.name ?? null,
        owner_email: ownerEmail,
    };
}

// ==================================================
// ACTIVATE WORKSPACE — replaces the legacy claim() flow.
// The org/person/employee/auth-user already exist (created atomically by
// the Super Admin module). This only ever: verifies the email matches the
// pre-created Auth user, sets the chosen username, sets the real password,
// and flips is_used to true.
// ==================================================
export interface ActivateWorkspacePayload {
    license_key: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}

export async function activateWorkspace(payload: ActivateWorkspacePayload) {
    const { license_key, email, username, password, confirmPassword } = payload;

    if (!isValidLicenseKey(license_key)) throw BadRequest('كود التفعيل غير صالح.');
    if (!isValidEmail(email)) throw BadRequest('البريد الإلكتروني غير صالح.');
    if (!isNonEmptyString(username) || username.trim().length < 3) {
        throw BadRequest('اسم المستخدم يجب ألا يقل عن 3 أحرف.');
    }
    if (!isValidPassword(password)) throw BadRequest('كلمة المرور ضعيفة (8 أحرف على الأقل).');
    if (password !== confirmPassword) throw BadRequest('كلمتا المرور غير متطابقتين.');

    const normalizedKey = license_key.trim().toUpperCase();

    const { data: license, error: licError } = await supabaseAdmin
        .from('saaslicenses')
        .select('id, is_used, claimed_by_org_id')
        .eq('license_key', normalizedKey)
        .single();

    if (licError || !license) throw BadRequest('كود التفعيل غير صحيح.');
    if (license.is_used) throw BadRequest('تم استخدام كود التفعيل هذا بالفعل.');
    if (!license.claimed_by_org_id) {
        throw NotFound('لم يتم تجهيز المنشأة الخاصة بهذا الكود بعد. يرجى التواصل مع الدعم.');
    }

    const { data: owner, error: ownerError } = await supabaseAdmin
        .from('employees')
        .select('id, auth_id, username')
        .eq('organization_id', license.claimed_by_org_id)
        .eq('role', 'OWNER')
        .single();

    if (ownerError || !owner || !owner.auth_id) {
        throw NotFound('لم يتم العثور على حساب المالك المرتبط بهذا الكود.');
    }

    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(
        owner.auth_id
    );
    if (authUserError || !authUserData?.user?.email) {
        throw new AppError('تعذر التحقق من بيانات الحساب.', 500);
    }

    if (authUserData.user.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        throw Unauthorized('البريد الإلكتروني لا يطابق البريد المسجل لهذا الكود.');
    }

    // FIX: this used to check username uniqueness globally (no org filter),
    // which contradicts the spec ("verifies username uniqueness within the
    // tenant scope") and would block two different customers from both
    // using e.g. "admin". Scope it to the org this license belongs to.
    // NOTE: this change is paired with the login() fix below — usernames
    // are no longer guaranteed globally unique, so identifier resolution
    // in login() must always be org-scoped.
    const trimmedUsername = username.trim();
    // CRITICAL FIX: Username uniqueness check MUST be scoped to the tenant's organization_id
    // to prevent cross-tenant collisions per architectural commandment #3
    const { data: existingUsername } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('username', trimmedUsername)
        .eq('organization_id', license.claimed_by_org_id)
        .eq('organization_id', license.claimed_by_org_id)
        .maybeSingle();

    if (existingUsername && existingUsername.id !== owner.id) {
        throw BadRequest('اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم آخر.');
    }

    const tx = new TransactionTracker();
    const previousUsername = owner.username;

    try {
        // STEP 1: Update employee username (database change #1)
        const { error: updateEmployeeError } = await supabaseAdmin
            .from('employees')
            .update({ username: trimmedUsername })
            .eq('id', owner.id);
        if (updateEmployeeError) throw new AppError('فشل تحديث اسم المستخدم.', 500);
        
        tx.track(async () => {
            await supabaseAdmin.from('employees').update({ username: previousUsername }).eq('id', owner.id);
        });

        const { error: updateLicenseError } = await supabaseAdmin
            .from('saaslicenses')
            .update({ is_used: true })
            .eq('id', license.id);
        if (updateLicenseError) throw new AppError('فشل تحديث حالة كود التفعيل.', 500);
        
        tx.track(async () => {
            await supabaseAdmin.from('saaslicenses').update({ is_used: false }).eq('id', license.id);
        });

        // DO THIS LAST: Supabase Auth Update
        const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
            owner.auth_id,
            { password }
        );
        if (updatePasswordError) throw new AppError('فشل تحديث كلمة المرور.', 500);

        return { success: true };
    } catch (err) {
        // FIX: rollback() returns any errors it hit while undoing prior
        // steps — these were being silently discarded. If the license
        // is_used revert or the username revert itself fails (e.g. a
        // transient DB error), the workspace is left in an inconsistent
        // state (license marked used with no working login, or a renamed
        // employee) with zero record of it happening. Surface these loudly.
        const rollbackErrors = await tx.rollback();
        if (rollbackErrors.length > 0) {
            logger.error(
                { license_id: license.id, owner_id: owner.id, rollback_errors: rollbackErrors },
                'activateWorkspace rollback incomplete'
            );
            // NOTE: This state needs manual follow-up (license may be stuck is_used=true
            // with the owner still unable to log in, or vice versa).
            // Consider adding a notification/alerting system in the future.
        }
        if (err instanceof AppError) throw err;
        throw new AppError((err as Error).message, 500);
    }
}

// ==================================================
// PASSWORD RESET — Supabase native magic link only.
// ==================================================
export async function forgotPassword(email: string) {
    if (!isNonEmptyString(email)) throw BadRequest('البريد الإلكتروني مطلوب.');
    if (!isValidEmail(email)) throw BadRequest('البريد الإلكتروني غير صالح.');

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/reset-password`
            : 'http://localhost:5173/reset-password',
    });

    // Intentionally do not distinguish "email not found" from success here —
    // that would let an attacker enumerate registered emails. The frontend
    // always shows the same "check your inbox" message either way.
    if (error) throw new AppError('فشل في إرسال رابط الاستعادة.', 500);
}

// FIX (critical, see auth.routes.patched.ts): this endpoint used to have no
// caller identity at all — `userId` was whatever the request body said, and
// it went straight into a Supabase Auth admin update. It now requires
// `callerOrgId` (the authenticated, isOwner-verified caller's own
// organization_id) and refuses to touch any auth user whose employee row
// isn't in that same org. This is enforced here — not just in the route
// middleware — so a routing mistake can't turn back into a cross-tenant
// account takeover.
export async function resetOwnerPassword(userId: string, newPassword: string, callerOrgId: string) {
    if (!userId || !newPassword) throw BadRequest('حقول مطلوبة مفقودة.');
    if (!callerOrgId) throw Forbidden('تعذر تحديد المؤسسة الخاصة بك.');
    if (!isValidPassword(newPassword)) throw BadRequest('كلمة المرور الجديدة ضعيفة.');

    const { data: targetEmployee, error: targetError } = await supabaseAdmin
        .from('employees')
        .select('id, organization_id')
        .eq('auth_id', userId)
        .maybeSingle();

    if (targetError || !targetEmployee) {
        throw NotFound('لم يتم العثور على هذا الحساب.');
    }
    if (targetEmployee.organization_id !== callerOrgId) {
        throw Forbidden('لا يمكنك إعادة تعيين كلمة المرور لحساب خارج مؤسستك.');
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw new AppError(error.message, 500);
}