import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as shiftsController from '../controllers/shifts';
import { Forbidden } from '../utils/errors';

const router = Router();

router.use(authenticate);

// Middleware to guard historical data
const requireManagement = (req: Request, res: Response, next: NextFunction) => {
    const employee = (req as any).employee;
    if (['OWNER', 'MODERATOR', 'ACCOUNTANT'].includes(employee.role)) {
        return next();
    }
    throw Forbidden('هذه الصلاحية محصورة على الإدارة فقط');
};

// Field operations (cashier)
router.get('/active', authorizeModule('pos'), shiftsController.getActiveShift);
router.post('/open', authorizeModule('pos'), shiftsController.openShift);
router.post('/close/:id', authorizeModule('pos'), shiftsController.closeShift);

// Historical view (management only)
router.get('/history', authorizeModule('pos'), requireManagement, shiftsController.listHistoricalShifts);

export default router;