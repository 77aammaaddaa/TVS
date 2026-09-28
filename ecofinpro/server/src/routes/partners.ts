import { Router } from 'express';
import { authenticate, isOwner } from '../middleware/auth';
import * as partnersController from '../controllers/partners';

const router = Router();

router.use(authenticate, isOwner);

router.get('/', partnersController.listPartners);
router.post('/', partnersController.createPartner);
router.post('/transactions', partnersController.transactCapital);

// New routes
router.put('/transactions/:id/status', partnersController.approveTransaction);
router.get('/pending-withdrawals', partnersController.getPendingWithdrawals);
router.get('/:partnerId/ledger', partnersController.getPartnerLedger);

router.get('/calculate-profits', partnersController.calculateProfits);
router.post('/distribute', partnersController.distributeProfits);

export default router;