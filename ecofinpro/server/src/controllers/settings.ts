// server/src/controllers/settings.ts
import { Request, Response } from 'express';
import * as settingsService from '../services/settings';
import * as auditService from '../services/audit';
import { AuthenticatedEmployee } from '../middleware/auth';

export async function getSettings(req: Request, res: Response) {
    const employee = req.employee as AuthenticatedEmployee;
    const settings = await settingsService.getSettings(employee.organization_id);

    return res.json({
        status: 'success',
        data: settings.config_data || {}
    });
}

export async function updateSettings(req: Request, res: Response) {
    const employee = req.employee as AuthenticatedEmployee;
    const { config_data } = req.body;

    if (!config_data) {
        return res.status(400).json({
            status: 'error',
            error: 'بيانات الإعدادات مطلوبة.'
        });
    }

    const settings = await settingsService.updateSettings(
        employee.organization_id,
        config_data,
        employee.id
    );

    // FIX: Correct argument order for logAction
    await auditService.logAction(
        employee.organization_id,    // 1st: organization_id
        employee.auth_id || employee.id,  // 2nd: user_id
        'UPDATE_SETTINGS',          // 3rd: action
        'settings',                 // 4th: module
        `قام ${employee.username || employee.id} بتحديث إعدادات النظام`,  // 5th: details
        'warning',                  // 6th: severity
        req                         // 7th: req (for IP/user agent)
    );

    return res.json({
        status: 'success',
        data: settings.config_data
    });
}

export async function resetSettings(req: Request, res: Response) {
    const employee = req.employee as AuthenticatedEmployee;
    const settings = await settingsService.resetSettings(
        employee.organization_id,
        employee.id
    );

    // FIX: Correct argument order for logAction
    await auditService.logAction(
        employee.organization_id,    // 1st: organization_id
        employee.auth_id || employee.id,  // 2nd: user_id
        'RESET_SETTINGS',           // 3rd: action
        'settings',                 // 4th: module
        `قام ${employee.username || employee.id} بإعادة تعيين إعدادات النظام`,  // 5th: details
        'critical',                 // 6th: severity
        req                         // 7th: req
    );

    return res.json({
        status: 'success',
        data: settings.config_data
    });
}