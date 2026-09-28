// server/src/controllers/auth.ts
import { Request, Response } from 'express';
import * as authService from '../services/auth';
import { AuthenticatedEmployee } from '../middleware/auth';

export async function login(req: Request, res: Response) {
    const { identifier, password, license_key } = req.body;
    const result = await authService.login(identifier, password, license_key);
    return res.json(result);
}

export async function checkLicense(req: Request, res: Response) {
    const license = await authService.checkLicense(req.body.license_key);
    return res.json(license);
}

export async function activateWorkspace(req: Request, res: Response) {
    const result = await authService.activateWorkspace(req.body);
    return res.json(result);
}

export async function forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    return res.json({ success: true });
}

export async function resetOwnerPassword(req: Request, res: Response) {
    const caller = req.employee as AuthenticatedEmployee;
    await authService.resetOwnerPassword(req.body.userId, req.body.newPassword, caller.organization_id);
    return res.json({ success: true });
}

// NEW: Get current user from attached employee
export async function getCurrentUser(req: Request, res: Response) {
    const employee = req.employee as AuthenticatedEmployee;
    
    if (!employee) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Return the employee data (already attached by middleware)
    return res.json({
        id: employee.id,
        personId: employee.id,
        email: (req as any).user?.email || '',
        username: employee.username || (req as any).user?.email || '',
        role: employee.role,
        branchId: employee.branch_id,
        orgId: employee.organization_id,
        permissions: employee.permissions || [],
        isSuperAdmin: false // Super admin is handled separately
    });
}

// NEW: Logout
export async function logout(req: Request, res: Response) {
    // Note: JWT tokens are stateless. In production, you might want to:
    // 1. Add token to a blacklist table
    // 2. Use a short-lived access token + refresh token rotation
    // For now, just return success (client will clear local tokens)
    return res.json({ success: true });
}