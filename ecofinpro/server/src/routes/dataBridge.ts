import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorizeRole } from '../middleware/auth'; // changed
import * as dataBridgeController from '../controllers/dataBridge';

const router = Router();

const ALLOWED_MIMES = [
    'text/csv',
    'text/tab-separated-values',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const ALLOWED_EXTENSIONS = ['.csv', '.tsv', '.xlsx', '.xls'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
        if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم. يرجى رفع ملف CSV, TSV, XLSX, أو XLS.'));
        }
    }
});

router.use(authenticate);
router.post('/import', authorizeRole('OWNER', 'MODERATOR'), upload.single('file'), dataBridgeController.importData);
router.get('/export/:table', authorizeRole('OWNER', 'MODERATOR'), dataBridgeController.exportData);

export default router;