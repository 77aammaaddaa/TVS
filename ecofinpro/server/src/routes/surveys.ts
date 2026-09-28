import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorizeModule } from '../middleware/auth';
import * as surveysController from '../controllers/surveys';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.use(authenticate);

router.post('/',
    authorizeModule('pos'),
    upload.fields([
        { name: 'photos', maxCount: 5 },
        { name: 'signature', maxCount: 1 },
    ]),
    surveysController.createSurvey
);

router.get('/', authorizeModule('pos'), surveysController.listSurveys);
router.put('/:id/approve', authorizeModule('pos'), surveysController.approveSurvey);
router.put('/:id/reject', authorizeModule('pos'), surveysController.rejectSurvey);

export default router;