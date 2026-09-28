import { Router } from 'express';
import { authenticate, isSuperAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as superAdminController from '../controllers/superAdmin'

const router = Router();

// Every route below requires a valid Super Admin session.
router.use(authenticate, isSuperAdmin);

// Licenses & Organizations
router.post('/licenses', asyncHandler(superAdminController.createLicense));
router.get('/licenses', asyncHandler(superAdminController.getLicenses));
router.put('/licenses/:id', asyncHandler(superAdminController.updateLicense));
router.delete('/licenses/:id', asyncHandler(superAdminController.deleteLicense));

router.get('/organizations', asyncHandler(superAdminController.getOrganizations));
router.put('/organizations/:id', asyncHandler(superAdminController.toggleOrganization));

// Super Admins
router.get('/admins', asyncHandler(superAdminController.getAdmins));
router.post('/admins', asyncHandler(superAdminController.createAdmin));
router.delete('/admins/:id', asyncHandler(superAdminController.deleteAdmin));

// Add to server/src/routes/superAdmin.ts
router.get('/session', authenticate, async (req, res) => {
    res.json({ session: true });
});

router.post('/logout', authenticate, async (req, res) => {
    res.json({ success: true });
});

export default router;