// server/src/types/express.d.ts
import { AuthenticatedEmployee } from '../middleware/auth';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                app_metadata?: Record<string, unknown>;
                user_metadata?: Record<string, unknown>;
            };
            employee?: AuthenticatedEmployee;
        }
    }
}

export {};