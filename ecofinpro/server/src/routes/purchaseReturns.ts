import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as returnsController from '../controllers/purchaseReturns';

const router = Router();
router.use(authenticate);
router.use(authorizeModule('purchases'));

router.post('/', returnsController.createPurchaseReturn);

export default router;