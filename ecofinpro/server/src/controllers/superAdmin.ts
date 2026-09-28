import { Request, Response } from 'express';
import {supabaseAdmin} from '../utils/supabase';
import * as superAdminService from '../services/superAdmin';

export async function createLicense(req: Request, res: Response) {
    const result = await superAdminService.createLicense(req.body);
    return res.status(201).json({ success: true, ...result });
}

export async function getLicenses(req: Request, res: Response) {
    const licenses = await superAdminService.listLicenses();
    return res.json({ licenses });
}

export async function updateLicense(req: Request, res: Response) {
    const license = await superAdminService.updateLicense(req.params.id, req.body);
    return res.json({ success: true, license });
}

export async function deleteLicense(req: Request, res: Response) {
    await superAdminService.deleteLicense(req.params.id);
    return res.json({ success: true });
}

export async function getOrganizations(req: Request, res: Response) {
    const organizations = await superAdminService.listOrganizations();
    return res.json({ organizations });
}

export async function toggleOrganization(req: Request, res: Response) {
    const organization = await superAdminService.toggleOrganizationStatus(req.params.id, !!req.body.is_active);
    return res.json({ success: true, organization });
}

export async function getAdmins(req: Request, res: Response) {
    const admins = await superAdminService.listAdmins();
    return res.json({ admins });
}

export async function createAdmin(req: Request, res: Response) {
    const callerUser = (req as any).user;

    if (!callerUser) {
        return res.status(401).json({ error: 'غير مصرح (Unauthorized)' });
    }

    const { data: callerRecord, error } = await supabaseAdmin
        .from('super_admins') // (Change to 'employees' if your super admins live there)
        .select('organization_id')
        .eq('auth_id', callerUser.id)
        .single();

    if (error || !callerRecord) {
        return res.status(403).json({ error: 'تعذر العثور على المؤسسة الخاصة بك.' });
    }

    const result = await superAdminService.createAdmin(req.body, callerRecord.organization_id);

    return res.status(201).json({ success: true, ...result });
}

export async function deleteAdmin(req: Request, res: Response) {
    await superAdminService.deleteAdmin(req.params.id);
    return res.json({ success: true });
}