import { Router } from 'express';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as dashboardController from '../controllers/dashboard';

const router = Router();

// 1. Verify the user is logged in via Supabase
router.use(authenticate);

// 2. Fetch employee details (role, org_id) and ensure they have dashboard access
router.use(authorizeModule('dashboard'));

// 3. Define the endpoints
router.get('/home', dashboardController.getHomeData);
router.get('/golden', dashboardController.getGoldenData);

export default router;