export class AppError extends Error {
    public readonly statusCode: number;
    public readonly details?: unknown;

    constructor(message: string, statusCode = 500, details?: unknown) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype); // Restore prototype chain
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

// Convenience factories for the cases we hit constantly.
export const BadRequest = (message: string, details?: unknown) => new AppError(message, 400, details);
export const Unauthorized = (message: string) => new AppError(message, 401);
export const Forbidden = (message: string) => new AppError(message, 403);
export const NotFound = (message: string) => new AppError(message, 404);
export const Conflict = (message: string) => new AppError(message, 409);
export const ServerError = (message: string, details?: unknown) => new AppError(message, 500, details);