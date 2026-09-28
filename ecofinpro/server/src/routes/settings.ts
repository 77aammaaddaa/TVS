// server/src/routes/settings.ts
import { Router } from 'express';
import { authenticate, attachEmployee, authorizeRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as settingsController from '../controllers/settings';

const router = Router();

// All settings routes require authentication
router.use(authenticate);
router.use(attachEmployee);

// GET /api/settings - Get current org settings (any authenticated user)
router.get(
    '/',
    asyncHandler(settingsController.getSettings)
);

// PUT /api/settings - Update settings
// NOTE: authorizeRole accepts variadic args: ('OWNER', 'MODERATOR', 'ADMIN')
router.put(
    '/',
    authorizeRole('OWNER', 'MODERATOR', 'ADMIN'),
    asyncHandler(settingsController.updateSettings)
);

// POST /api/settings/reset - Reset to defaults (OWNER only)
router.post(
    '/reset',
    authorizeRole('OWNER'),
    asyncHandler(settingsController.resetSettings)
);

export default router;