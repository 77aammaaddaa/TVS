// server/src/routes/vaults.ts
import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import { listVaults } from '../controllers/vaults';

const router = Router();
router.use(authenticate);                   
router.get('/', authorizeModule('pos'), listVaults);
export default router;