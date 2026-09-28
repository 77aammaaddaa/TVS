// server/src/middleware/errorHandler.ts
//
// Mount this LAST, after all routes: app.use(errorHandler)
// Every controller/service throws AppError (see utils/errors.ts); anything
// else (a raw Error, a Supabase error object, etc.) is treated as a 500.

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message, details: err.details });
    }

    logger.error({ err: err instanceof Error ? err.stack : err, url: req.url, method: req.method }, 'Unhandled server error');
    return res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم' });
}

// 404 fallback for unknown routes — mount right before errorHandler.
export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({ error: 'المسار غير موجود' });
}