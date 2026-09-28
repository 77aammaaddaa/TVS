import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as inventoryController from '../controllers/inventory';

const router = Router();

router.use(authenticate);

// Listings
router.get('/products', authorizeModule('inventory'), inventoryController.listProducts);
router.get('/categories', authorizeModule('inventory'), inventoryController.listCategories);

// Governance-safe updates
router.put('/products/:id', authorizeModule('inventory'), inventoryController.updateProductDetails);

export default router;