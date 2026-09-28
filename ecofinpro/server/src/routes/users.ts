import { Router } from 'express';
import { authenticate, isOwner } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as usersController from '../controllers/users';

const router = Router();

// Every route below requires a logged-in OWNER. isOwner also attaches
// req.employee (id, organization_id, role) so controllers don't need to
// re-look-up the caller's organization on every request.
router.use(authenticate, isOwner);

router.post('/', asyncHandler(usersController.createEmployee));
router.get('/', asyncHandler(usersController.getEmployees));
router.put('/:id', asyncHandler(usersController.updateEmployee));
router.put('/:id/password', asyncHandler(usersController.resetEmployeePassword));
router.put('/:id/status', asyncHandler(usersController.toggleEmployeeActive));

export default router;