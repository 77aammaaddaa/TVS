import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as vaultsController from '../controllers/vaults';

const router = Router();
router.use(authenticate);
router.use(authorizeModule('vaults'));      // dedicated module permission

router.get('/', vaultsController.listVaults);
router.post('/', vaultsController.createVault);
router.put('/:id', vaultsController.updateVault);
router.post('/transfer', vaultsController.transfer);
router.get('/:id/ledger', vaultsController.getLedger);

export default router;