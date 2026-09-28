// server/src/routes/audit.ts

import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as auditController from '../controllers/audit';

const router = Router();

router.use(authenticate);

// We gate the view behind 'settings' permission, but clearing is hard-gated to OWNER in the controller
router.get('/', authorizeModule('settings'), auditController.getLogs);
router.delete('/', auditController.clearLogs);

export default router;