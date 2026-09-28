import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as suppliersController from '../controllers/suppliers';

const router = Router();

router.use(authenticate);
router.use(authorizeModule('suppliers'));

router.post('/', suppliersController.createSupplier);
router.get('/', suppliersController.listSuppliers);
router.put('/:id', suppliersController.updateSupplier);
router.patch('/:id/deactivate', suppliersController.deactivateSupplier);
router.get('/:id/statement', authenticate, suppliersController.getSupplierStatement);

export default router;