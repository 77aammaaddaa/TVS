// server/src/routes/auth.ts
import { Router } from 'express';
import { authenticate, isOwner, attachEmployee } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as authController from '../controllers/auth';

const router = Router();

// Accepts { identifier, password } — identifier is username OR email.
router.post('/login', asyncHandler(authController.login));

// Side-effect-free license lookup. ActivationPage uses it to decide
// /login vs /claim; ClaimPage uses it to display the read-only
// license/org/owner-email fields.
router.post('/check-license', asyncHandler(authController.checkLicense));

// Option B: org/employee/auth-user already exist (created by the Super
// Admin module). This sets username + real password and flips is_used.
// Replaces the old heavier /claim (which used to create the org itself).
router.post('/activate-workspace', asyncHandler(authController.activateWorkspace));

router.post('/forgot-password', asyncHandler(authController.forgotPassword));

// FIX (critical): this used to have NO auth middleware at all — any caller
// could pass an arbitrary Supabase auth UID + newPassword and take over
// that account. Per the design doc this is an Owner-only, in-app action
// (UserManagementModule), so it must run through authenticate + isOwner
// exactly like every other owner-scoped route. The service layer also
// re-verifies org scope (see auth.service.patched.ts) so a middleware
// mistake here isn't the only line of defense.
router.post(
    '/reset-owner-password',
    authenticate,
    isOwner,
    asyncHandler(authController.resetOwnerPassword)
);

// Get current authenticated user
router.get(
    '/me',
    authenticate,
    attachEmployee,
    asyncHandler(authController.getCurrentUser)
);

// Logout - client will clear tokens
router.post(
    '/logout',
    authenticate,
    asyncHandler(authController.logout)
);

export default router;