import { Router } from 'express';
import { authenticate, attachEmployee, authorizeModule, authorizeRole } from '../middleware/auth';
import * as customersController from '../controllers/customers';

const router = Router();

// Helper: allow both 'crm' and 'pos' permissions
const crmOrPos = (req: any, res: any, next: any) => {
    authorizeModule('crm')(req, res, (err?: any) => {
        if (!err) return next();
        authorizeModule('pos')(req, res, next);
    });
};

router.use(authenticate);

router.post('/', crmOrPos, customersController.createCustomer);
router.get('/', authenticate, attachEmployee, customersController.listCustomers);
router.get('/:id', authenticate, attachEmployee, customersController.getCustomer); // for edit pre-fill
router.put('/:id', authorizeRole('OWNER', 'MODERATOR'), customersController.updateCustomer);
router.get('/:id/credit-profile', authenticate, customersController.getCustomerCreditProfile);

export default router;