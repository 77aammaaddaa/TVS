import { Router } from 'express';
import * as walletController from '../controllers/wallets';
import { authenticate, authorizeModule } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/my-wallet', authorizeModule('wallets'), walletController.getMyWallet);
router.post('/settle', authorizeModule('wallets'), walletController.settleWallet);
router.post('/expense', authorizeModule('wallets'), walletController.recordExpense);

export default router;