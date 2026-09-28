import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Forbidden } from '../utils/errors';
import * as surveysService from '../services/surveys';

export const createSurvey = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    const result = await surveysService.createSurvey({
        customer_id: req.body.customer_id,
        guarantor_id: req.body.guarantor_id || null,
        new_guarantor_name: req.body.new_guarantor_name,
        new_guarantor_phone: req.body.new_guarantor_phone,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        gps_accuracy: req.body.gps_accuracy ? parseFloat(req.body.gps_accuracy) : undefined,
        housing_quality: parseInt(req.body.housing_quality, 10),
        neighborhood_quality: parseInt(req.body.neighborhood_quality, 10),
        income_stability: parseInt(req.body.income_stability, 10),
        employment_status: parseInt(req.body.employment_status, 10),
        property_ownership: parseInt(req.body.property_ownership, 10),
        overall_impression: parseInt(req.body.overall_impression, 10),
        recommendation: req.body.recommendation,
        photos: files?.['photos'] || [],
        signature: files?.['signature']?.[0] || undefined,
        },
        employee.id,
        employee.organization_id
    );
    res.status(201).json({ success: true, ...result });
});

export const listSurveys = asyncHandler(async (req: Request, res: Response) => {
    const surveys = await surveysService.listSurveys((req as any).employee.organization_id);
    res.json({ surveys });
});

export const approveSurvey = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    if (employee.role !== 'OWNER' && employee.role !== 'MODERATOR') {
        throw Forbidden('غير مصرح لك بالموافقة على الاستبيانات');
    }
    const result = await surveysService.approveSurvey(req.params.id, employee.id, employee.organization_id);
    res.json({ success: true, ...result });
});

export const rejectSurvey = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    if (employee.role !== 'OWNER' && employee.role !== 'MODERATOR') {
        throw Forbidden('غير مصرح لك برفض الاستبيانات');
    }
    await surveysService.rejectSurvey(req.params.id, employee.id, employee.organization_id, req.body.reason);
    res.json({ success: true });
});