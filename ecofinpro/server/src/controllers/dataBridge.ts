import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequest } from '../utils/errors';
import * as dataBridgeService from '../services/dataBridge';
import * as auditService from '../services/audit'; // adjust import path as needed

export const importData = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    const file = req.file;
    const { table, mapping } = req.body;

    if (!file) throw BadRequest('يرجى إرفاق ملف.');
    if (!table || !mapping) throw BadRequest('بيانات المطابقة أو الجدول مفقودة.');

    let parsedMapping;
    try {
        parsedMapping = JSON.parse(mapping);
    } catch {
        throw BadRequest('هيكل بيانات المطابقة غير صالح.');
    }

    const result = await dataBridgeService.importData(
        employee.organization_id,
        table,
        file.buffer,
        file.originalname,
        parsedMapping
    );

    // Audit log
    await auditService.logAction(
        employee.organization_id,
        employee.auth_id,
        'DATA_IMPORT',
        'data-bridge',
        `Imported ${table}: ${result.inserted} inserted, ${result.duplicates_skipped} duplicates skipped`,
        'info',
        req
    );

    res.status(200).json({ success: true, ...result });
});

export const exportData = asyncHandler(async (req: Request, res: Response) => {
    const employee = (req as any).employee;
    const { table } = req.params;
    const csvString = await dataBridgeService.exportData(employee.organization_id, table);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="EcoFin_Export_${table}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csvString);
});