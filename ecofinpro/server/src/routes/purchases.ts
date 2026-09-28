import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as purchasesController from '../controllers/purchases';
import { Forbidden } from '../utils/errors';

const router = Router();

router.use(authenticate);
router.use(authorizeModule('purchases'));

// Only OWNER / MODERATOR can approve, reject, or settle
const requireManagement = (req: Request, res: Response, next: NextFunction) => {
    const employee = (req as any).employee;
    if (['OWNER', 'MODERATOR', 'WAREHOUSE_MANAGER'].includes(employee.role)) {
        return next();
    }
    throw Forbidden('هذه الصلاحية محصورة على المالك أو المدير فقط');
};

// Standard CRUD
router.post('/', purchasesController.createPurchase);
router.get('/', purchasesController.listPurchases);

// Management actions
router.put('/:id/approve', requireManagement, purchasesController.approvePurchase);
router.put('/:id/reject', requireManagement, purchasesController.rejectPurchase);   // NEW
router.post('/:id/settle', requireManagement, purchasesController.settlePurchaseDebt);

export default router;