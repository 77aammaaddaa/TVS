import { supabaseAdmin } from '../utils/supabase';
import { AppError, BadRequest, NotFound, Forbidden } from '../utils/errors';
import { TransactionTracker } from '../utils/transaction';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const SCORE_WEIGHTS = {
    housing_quality: 0.20,
    neighborhood_quality: 0.20,
    income_stability: 0.20,
    employment_status: 0.15,
    property_ownership: 0.15,
    overall_impression: 0.10,
};

export interface CreateSurveyInput {
    customer_id: string;
    guarantor_id?: string | null;
    new_guarantor_name?: string;
    new_guarantor_phone?: string;
    latitude: number;
    longitude: number;
    gps_accuracy?: number;
    housing_quality: number;
    neighborhood_quality: number;
    income_stability: number;
    employment_status: number;
    property_ownership: number;
    overall_impression: number;
    recommendation?: string;
    photos: Express.Multer.File[];
    signature?: Express.Multer.File;
}

export async function createSurvey(input: CreateSurveyInput, employeeId: string, organizationId: string) {
    const { customer_id, guarantor_id, new_guarantor_name, new_guarantor_phone } = input;

    if (!customer_id) throw BadRequest('العميل مطلوب');
    if (!input.latitude || !input.longitude) throw BadRequest('إحداثيات GPS مطلوبة');

    let finalGuarantorId: string | null = guarantor_id || null;
    const tx = new TransactionTracker();

    if (!finalGuarantorId && new_guarantor_name && new_guarantor_phone) {
        const personId = crypto.randomUUID();

        const { error: personErr } = await supabaseAdmin
        .from('persons')
        .insert({ id: personId, organization_id: organizationId, full_name: new_guarantor_name, phone: new_guarantor_phone });
        
        if (personErr) throw new AppError('فشل إنشاء سجل الضامن', 500, personErr.message);

        tx.track(async () => {
        await supabaseAdmin.from('persons').delete().eq('id', personId);
        });

        const { data: newGuarantor, error: guaErr } = await supabaseAdmin
        .from('guarantors')
        .insert({ id: personId, organization_id: organizationId, full_name: new_guarantor_name, phone: new_guarantor_phone })
        .select('id')
        .single();

        if (guaErr || !newGuarantor) {
        await tx.rollback();
        throw new AppError('فشل إنشاء الضامن', 500, guaErr?.message);
        }

        tx.track(async () => {
        await supabaseAdmin.from('guarantors').delete().eq('id', personId);
        });

        finalGuarantorId = newGuarantor.id;
    } else if (!finalGuarantorId) {
        throw BadRequest('يجب تحديد الضامن أو إدخال اسم ورقم ضامن جديد');
    }

    const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('latitude, longitude, id')
        .eq('id', customer_id)
        .eq('organization_id', organizationId)
        .single();

    if (!customer) throw NotFound('العميل غير موجود');

    let isSuspicious = false;
    if (customer.latitude && customer.longitude) {
        const dist = haversineDistance(customer.latitude, customer.longitude, input.latitude, input.longitude);
        if (dist > 500) isSuspicious = true;
    }

    const surveyId = crypto.randomUUID();

    const { error: surveyErr } = await supabaseAdmin
        .from('field_surveys')
        .insert({
        id: surveyId,
        organization_id: organizationId,
        employee_id: employeeId,
        customer_id: customer_id,
        guarantor_id: finalGuarantorId,
        latitude: input.latitude,
        longitude: input.longitude,
        gps_accuracy: input.gps_accuracy,
        is_suspicious_location: isSuspicious,
        housing_quality: input.housing_quality,
        neighborhood_quality: input.neighborhood_quality,
        income_stability: input.income_stability,
        employment_status: input.employment_status,
        property_ownership: input.property_ownership,
        overall_impression: input.overall_impression,
        recommendation: input.recommendation,
        status: 'PENDING',
        });

    if (surveyErr) {
        await tx.rollback();
        throw new AppError('فشل حفظ الاستبيان', 500, surveyErr.message);
    }

    tx.track(async () => {
        await supabaseAdmin.from('field_surveys').delete().eq('id', surveyId);
    });

    const attachmentIds: string[] = [];
    try {
        const bucket = supabaseAdmin.storage.from('survey_files');

        if (input.photos && input.photos.length > 0) {
        for (const file of input.photos) {
            const filePath = `${organizationId}/${surveyId}/photos/${file.originalname}`;
            const { error: uploadErr } = await bucket.upload(filePath, file.buffer, { contentType: file.mimetype });
            if (uploadErr) throw uploadErr;

            const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/survey_files/${filePath}`;
            const { data: att, error: attErr } = await supabaseAdmin
            .from('survey_attachments')
            .insert({ survey_id: surveyId, url, attachment_type: 'photo' })
            .select('id')
            .single();
            if (attErr) throw attErr;
            attachmentIds.push(att.id);
        }
        }

        if (input.signature) {
        const filePath = `${organizationId}/${surveyId}/signature/${input.signature.originalname}`;
        const { error: uploadErr } = await bucket.upload(filePath, input.signature.buffer, { contentType: input.signature.mimetype });
        if (uploadErr) throw uploadErr;

        const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/survey_files/${filePath}`;
        const { data: att, error: attErr } = await supabaseAdmin
            .from('survey_attachments')
            .insert({ survey_id: surveyId, url, attachment_type: 'signature' })
            .select('id')
            .single();
        if (attErr) throw attErr;
        attachmentIds.push(att.id);
        }
    } catch (err: any) {
        for (const attId of attachmentIds) {
        await supabaseAdmin.from('survey_attachments').delete().eq('id', attId);
        }
        await tx.rollback();
        throw new AppError('فشل رفع المرفقات', 500, err.message);
    }

    return { surveyId, is_suspicious: isSuspicious };
}

export async function listSurveys(organizationId: string) {
    const { data, error } = await supabaseAdmin
        .from('field_surveys')
        .select(`
        id, status, is_suspicious_location, recommendation,
        housing_quality, neighborhood_quality, income_stability,
        employment_status, property_ownership, overall_impression,
        created_at, reviewed_at, rejection_reason,
        employee:employees(id, person:persons(full_name)),
        customer:customers(id, full_name, phone, address),
        guarantor:guarantors(id, full_name, phone),
        attachments:survey_attachments(id, url, attachment_type)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) throw new AppError('فشل تحميل الاستبيانات', 500, error.message);
    return data;
}

export async function approveSurvey(surveyId: string, reviewerId: string, organizationId: string) {
    const { data: survey, error } = await supabaseAdmin
        .from('field_surveys')
        .select('*')
        .eq('id', surveyId)
        .eq('organization_id', organizationId)
        .single();

    if (error || !survey) throw NotFound('الاستبيان غير موجود');
    if (survey.status !== 'PENDING') throw BadRequest('الاستبيان ليس قيد المراجعة');

    const scores: Record<string, number> = {
        housing_quality: survey.housing_quality,
        neighborhood_quality: survey.neighborhood_quality,
        income_stability: survey.income_stability,
        employment_status: survey.employment_status,
        property_ownership: survey.property_ownership,
        overall_impression: survey.overall_impression,
    };

    let totalScore = 0;
    for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
        totalScore += (scores[key] || 5) * weight;
    }
    const finalScore = Math.round(totalScore * 10);

    const { error: updateSurveyErr } = await supabaseAdmin
        .from('field_surveys')
        .update({ status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
        .eq('id', surveyId);

    if (updateSurveyErr) throw new AppError('فشل تحديث حالة الاستبيان', 500, updateSurveyErr.message);

    const { error: customerErr } = await supabaseAdmin
        .from('customers')
        .update({ credit_score: finalScore })
        .eq('id', survey.customer_id)
        .eq('organization_id', organizationId);

    if (customerErr) throw new AppError('فشل تحديث درجة العميل', 500, customerErr.message);

    return { finalScore };
}

export async function rejectSurvey(surveyId: string, reviewerId: string, organizationId: string, reason?: string) {
    const { data: survey, error } = await supabaseAdmin
        .from('field_surveys')
        .select('*')
        .eq('id', surveyId)
        .eq('organization_id', organizationId)
        .single();

    if (error || !survey) throw NotFound('الاستبيان غير موجود');
    if (survey.status !== 'PENDING') throw BadRequest('الاستبيان ليس قيد المراجعة');

    const { error: updateErr } = await supabaseAdmin
        .from('field_surveys')
        .update({
        status: 'REJECTED',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
        })
        .eq('id', surveyId);

    if (updateErr) throw new AppError('فشل رفض الاستبيان', 500, updateErr.message);
}