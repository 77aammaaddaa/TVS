import { Router } from 'express';
import * as collectionController from '../controllers/collections';
import { authenticate, authorizeModule } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/record', authorizeModule('collections'), collectionController.recordCollection);

router.get('/installments', authorizeModule('collections'), collectionController.getPendingInstallments);

export default router;