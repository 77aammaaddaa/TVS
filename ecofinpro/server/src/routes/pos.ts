// server/src/routes/pos.ts

import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as posController from '../controllers/pos';

const router = Router();

router.use(authenticate, authorizeModule('pos'));

// Catalog (read-only — used by the POS UI to render the product grid,
// category filter, and shift-open vault picker)
router.get('/products', posController.listProducts);
router.get('/categories', posController.listCategories);
router.get('/vaults', posController.listVaults);

// Sales
router.post('/transactions', posController.createSale);
router.get('/transactions', posController.listSales);

export default router;