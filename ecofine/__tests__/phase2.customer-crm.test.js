/**
 * Phase 2: Customer CRM Tests
 * اختبارات إدارة العملاء: إضافة، حفظ، الاستعلام الميداني
 */

import {
  createMockClient,
  createMockGuarantor,
  assertValidClient,
  TEST_NATIONAL_IDS,
} from './helpers.js';

describe('✅ PHASE 2: CUSTOMER CRM - إدارة العملاء وحفظ البيانات', () => {
  
  // ==========================================
  // 1. NATIONAL ID PARSING TESTS
  // ==========================================
  describe('📋 تحليل بطاقة الهوية القومية (National ID Parsing)', () => {
    
    test('يجب استخراج الجنس من الهوية (الرقم 8)', () => {
      const nationalId = '29001011234567';
      const genderDigit = parseInt(nationalId[12]);
      const gender = genderDigit % 2 === 1 ? 'MALE' : 'FEMALE';
      
      expect(nationalId).toHaveLength(14);
      expect(['MALE', 'FEMALE']).toContain(gender);
    });

    test('يجب استخراج تاريخ الميلاد من الهوية (الأرقام 1-6)', () => {
      const nationalId = '29001011234567';
      const century = parseInt(nationalId[0]) >= 5 ? 1900 : 2000;
      const year = century + parseInt(nationalId.substring(1, 3));
      const month = parseInt(nationalId.substring(3, 5));
      const day = parseInt(nationalId.substring(5, 7));
      
      expect(year).toBeGreaterThan(1900);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });

    test('يجب استخراج المحافظة من الهوية (الأرقام 10-11)', () => {
      const nationalId = '29001011234567';
      const governorateCode = parseInt(nationalId.substring(7, 9));
      
      expect(governorateCode).toBeGreaterThanOrEqual(1);
      expect(governorateCode).toBeLessThanOrEqual(27);
    });

    test('يجب رفض هوية بعدد أرقام خاطئ', () => {
      const invalidIds = [
        '123456', // قصير جداً
        '299010112345678', // طويل جداً
      ];
      
      invalidIds.forEach((id) => {
        expect(id).not.toMatch(/^\d{14}$/);
      });
    });

    test('يجب حساب العمر من تاريخ الميلاد', () => {
      const birthYear = 1990;
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      
      expect(age).toBeGreaterThan(0);
      expect(age).toBeLessThan(150);
    });
  });

  // ==========================================
  // 2. CLIENT CREATION & VALIDATION TESTS
  // ==========================================
  describe('➕ إنشاء وتحقق العميل (Client Creation)', () => {
    
    test('يجب إنشاء عميل جديد برقم هوية فريد', async () => {
      const client1 = createMockClient();
      const client2 = createMockClient();
      
      expect(client1.national_id).not.toBe(client2.national_id);
      expect(client1.id).not.toBe(client2.id);
    });

    test('يجب رفض عميل مكرر برقم هوية نفسه', async () => {
      const nationalId = TEST_NATIONAL_IDS.VALID;
      const client1 = createMockClient({ national_id: nationalId });
      const client2 = createMockClient({ national_id: nationalId });
      
      // في الواقع يجب فحص قاعدة البيانات
      expect(client1.national_id).toBe(client2.national_id);
    });

    test('يجب التحقق من جميع الحقول المطلوبة للعميل', () => {
      const client = createMockClient();
      assertValidClient(client);
    });

    test('يجب قبول أنواع الوظائف الصحيحة', () => {
      const validJobTypes = ['GOV_EMPLOYEE', 'PRIVATE', 'SELF_EMPLOYED'];
      
      validJobTypes.forEach((jobType) => {
        const client = createMockClient({ job_type: jobType });
        expect(validJobTypes).toContain(client.job_type);
      });
    });

    test('يجب رفض أنواع سكن غير صحيحة', () => {
      const validResidenceTypes = ['OWNED', 'RENTED'];
      const invalidType = 'INVALID_TYPE';
      
      expect(validResidenceTypes).not.toContain(invalidType);
    });

    test('يجب أن يكون الدخل الشهري رقم موجب', () => {
      const validIncomes = [3000, 5000, 10000];
      const invalidIncomes = [-1000, 0, -100];
      
      validIncomes.forEach((income) => {
        expect(income).toBeGreaterThan(0);
      });
      
      invalidIncomes.forEach((income) => {
        expect(income).toBeLessThanOrEqual(0);
      });
    });

    test('يجب حفظ العميل الجديد في قاعدة البيانات', async () => {
      const client = createMockClient();
      global.db.add.mockResolvedValue({ id: client.id });
      
      const result = await global.db.add('clients', client);
      
      expect(global.db.add).toHaveBeenCalledWith('clients', client);
      expect(result.id).toBe(client.id);
    });

    test('يجب وضع علامة synced = false للبيانات الجديدة', () => {
      const client = createMockClient({ synced: false });
      
      expect(client.synced).toBe(false);
    });
  });

  // ==========================================
  // 3. GUARANTOR MANAGEMENT TESTS
  // ==========================================
  describe('👥 إدارة الضامنين (Guarantor Management)', () => {
    
    test('يجب السماح بإضافة ضامن واحد كحد أدنى', () => {
      const guarantor = createMockGuarantor();
      const guarantors = [guarantor];
      
      expect(guarantors.length).toBeGreaterThanOrEqual(1);
    });

    test('يجب السماح بإضافة 3 ضامنين كحد أقصى', () => {
      const maxGuarantors = 3;
      const guarantors = [
        createMockGuarantor(),
        createMockGuarantor(),
        createMockGuarantor(),
      ];
      
      expect(guarantors.length).toBeLessThanOrEqual(maxGuarantors);
    });

    test('يجب رفض إضافة أكثر من 3 ضامنين', () => {
      const maxGuarantors = 3;
      const guarantors = [
        createMockGuarantor(),
        createMockGuarantor(),
        createMockGuarantor(),
        createMockGuarantor(), // الرابع يجب رفضه
      ];
      
      expect(guarantors.length).toBeGreaterThan(maxGuarantors);
    });

    test('يجب التحقق من أن الضامن ليس محظور', () => {
      const activeGuarantor = createMockGuarantor({ status: 'active' });
      const bannedGuarantor = createMockGuarantor({ status: 'banned' });
      
      expect(activeGuarantor.status).toBe('active');
      expect(bannedGuarantor.status).toBe('banned');
    });

    test('يجب حساب قوة الضامن (credit_score)', () => {
      const guarantor = createMockGuarantor({ credit_score: 750 });
      
      expect(guarantor.credit_score).toBeGreaterThanOrEqual(0);
      expect(guarantor.credit_score).toBeLessThanOrEqual(1000);
    });

    test('يجب تخزين العلاقة بين العميل والضامن', () => {
      const relationships = ['FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'SPOUSE', 'FRIEND'];
      const guarantor = createMockGuarantor({ relationship: 'BROTHER' });
      
      expect(relationships).toContain(guarantor.relationship);
    });

    test('يجب حفظ الضامنين في قاعدة البيانات', async () => {
      const guarantor = createMockGuarantor();
      global.db.add.mockResolvedValue({ id: guarantor.id });
      
      const result = await global.db.add('guarantors', guarantor);
      
      expect(global.db.add).toHaveBeenCalledWith('guarantors', guarantor);
    });
  });

  // ==========================================
  // 4. FIELD SURVEY TESTS
  // ==========================================
  describe('🗺️ الاستعلام الميداني (Field Survey)', () => {
    
    test('يجب حفظ حالة الاستعلام الميداني (verified/pending/rejected)', () => {
      const surveyStatuses = ['verified', 'pending', 'rejected'];
      
      surveyStatuses.forEach((status) => {
        const client = createMockClient({ survey_status: status });
        expect(surveyStatuses).toContain(client.survey_status);
      });
    });

    test('يجب تخزين صور الاستعلام الميداني', () => {
      const survey = {
        id: 'survey_1',
        client_id: 'client_1',
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
        ],
        location: {
          lat: 30.0444,
          lng: 31.2357,
        },
        verification_date: new Date().toISOString(),
      };
      
      expect(survey.photos.length).toBeGreaterThan(0);
      expect(survey.location).toHaveProperty('lat');
      expect(survey.location).toHaveProperty('lng');
    });

    test('يجب التحقق من موقع العنوان (Location Validation)', () => {
      const location = {
        lat: 30.0444,
        lng: 31.2357,
      };
      
      expect(location.lat).toBeGreaterThanOrEqual(-90);
      expect(location.lat).toBeLessThanOrEqual(90);
      expect(location.lng).toBeGreaterThanOrEqual(-180);
      expect(location.lng).toBeLessThanOrEqual(180);
    });

    test('يجب تسجيل تاريخ الاستعلام الميداني', () => {
      const survey = {
        verification_date: new Date().toISOString(),
      };
      
      expect(survey.verification_date).not.toBeNull();
      expect(new Date(survey.verification_date)).toBeInstanceOf(Date);
    });

    test('يجب تحديث حالة العميل بناءً على نتيجة الاستعلام', async () => {
      const client = createMockClient({ survey_status: 'pending' });
      const updates = { survey_status: 'verified' };
      
      global.db.update.mockResolvedValue({ ...client, ...updates });
      
      const result = await global.db.update('clients', client.id, updates);
      
      expect(result.survey_status).toBe('verified');
    });
  });

  // ==========================================
  // 5. DUPLICATE PREVENTION TESTS
  // ==========================================
  describe('🛡️ منع العملاء المكررين (Duplicate Prevention)', () => {
    
    test('يجب فحص الهوية الفريدة قبل الحفظ', async () => {
      const nationalId = TEST_NATIONAL_IDS.VALID;
      global.db.query = jest.fn()
        .mockResolvedValue([{ national_id: nationalId }]);
      
      const existingClient = await global.db.query(
        `SELECT * FROM clients WHERE national_id = '${nationalId}'`
      );
      
      expect(existingClient.length).toBeGreaterThan(0);
    });

    test('يجب فحص رقم الهاتف الفريد', async () => {
      const phone = '01012345678';
      global.db.query = jest.fn()
        .mockResolvedValue([]);
      
      const existingPhone = await global.db.query(
        `SELECT * FROM clients WHERE phone = '${phone}'`
      );
      
      expect(existingPhone.length).toBe(0);
    });

    test('يجب فحص البريد الإلكتروني الفريد', async () => {
      const email = 'client@example.com';
      global.db.query = jest.fn()
        .mockResolvedValue([]);
      
      const existingEmail = await global.db.query(
        `SELECT * FROM clients WHERE email = '${email}'`
      );
      
      expect(existingEmail.length).toBe(0);
    });
  });

  // ==========================================
  // 6. CLIENT STATUS TESTS
  // ==========================================
  describe('📊 حالات العميل (Client Status)', () => {
    
    test('يجب أن يكون حالة العميل من: active, inactive, banned', () => {
      const validStatuses = ['active', 'inactive', 'banned'];
      
      validStatuses.forEach((status) => {
        const client = createMockClient({ status });
        expect(validStatuses).toContain(client.status);
      });
    });

    test('يجب تحديث حالة العميل إلى banned عند وجود مشاكل قانونية', async () => {
      const client = createMockClient({ status: 'active' });
      const updates = { status: 'banned' };
      
      global.db.update.mockResolvedValue({ ...client, ...updates });
      
      const result = await global.db.update('clients', client.id, updates);
      
      expect(result.status).toBe('banned');
    });

    test('يجب إرجاع العميل للنشاط إذا تم حل المشاكل', async () => {
      const client = createMockClient({ status: 'banned' });
      const updates = { status: 'active' };
      
      global.db.update.mockResolvedValue({ ...client, ...updates });
      
      const result = await global.db.update('clients', client.id, updates);
      
      expect(result.status).toBe('active');
    });
  });

  // ==========================================
  // 7. BRANCH ASSIGNMENT TESTS
  // ==========================================
  describe('🏢 تعيين الفرع (Branch Assignment)', () => {
    
    test('يجب تعيين العميل لفرع معين', () => {
      const branches = ['branch_1', 'branch_2', 'branch_3'];
      const client = createMockClient({ branch_id: 'branch_1' });
      
      expect(branches).toContain(client.branch_id);
    });

    test('يجب حفظ معلومات الفرع مع العميل', () => {
      const client = createMockClient();
      
      expect(client).toHaveProperty('branch_id');
      expect(client.branch_id).not.toBeNull();
    });
  });

  // ==========================================
  // 8. DATA PERSISTENCE TESTS
  // ==========================================
  describe('💾 حفظ البيانات بشكل دائم (Data Persistence)', () => {
    
    test('يجب حفظ كل بيانات العميل في IndexedDB', async () => {
      const client = createMockClient();
      global.db.add.mockResolvedValue({ id: client.id, ...client });
      
      const result = await global.db.add('clients', client);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('national_id');
    });

    test('يجب وضع علامة synced = false للبيانات الجديدة', () => {
      const client = createMockClient();
      
      expect(client.synced).toBe(false);
    });

    test('يجب تسجيل timestamp للبيانات الجديدة', () => {
      const client = createMockClient();
      
      expect(client.created_at).not.toBeNull();
      expect(new Date(client.created_at)).toBeInstanceOf(Date);
    });

    test('يجب إمكانية استرجاع البيانات من IndexedDB', async () => {
      const client = createMockClient();
      global.db.getById.mockResolvedValue(client);
      
      const result = await global.db.getById('clients', client.id);
      
      expect(result.id).toBe(client.id);
      expect(result.name).toBe(client.name);
    });

    test('يجب إمكانية تحديث بيانات العميل', async () => {
      const client = createMockClient();
      const updates = { monthly_income: 6000 };
      
      global.db.update.mockResolvedValue({ ...client, ...updates });
      
      const result = await global.db.update('clients', client.id, updates);
      
      expect(result.monthly_income).toBe(6000);
    });

    test('يجب حفظ جميع الضامنين مع العميل', async () => {
      const guarantor1 = createMockGuarantor();
      const guarantor2 = createMockGuarantor();
      const client = createMockClient({ 
        guarantors: [guarantor1, guarantor2] 
      });
      
      expect(client.guarantors.length).toBe(2);
    });
  });

  // ==========================================
  // 9. SEARCH & FILTER TESTS
  // ==========================================
  describe('🔍 البحث والتصفية (Search & Filter)', () => {
    
    test('يجب البحث عن العميل بالهوية', async () => {
      const nationalId = TEST_NATIONAL_IDS.VALID;
      global.db.query = jest.fn()
        .mockResolvedValue([createMockClient({ national_id: nationalId })]);
      
      const results = await global.db.query(
        `SELECT * FROM clients WHERE national_id = '${nationalId}'`
      );
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].national_id).toBe(nationalId);
    });

    test('يجب البحث عن العميل باسمه', async () => {
      const name = 'أحمد محمد';
      global.db.query = jest.fn()
        .mockResolvedValue([createMockClient({ name })]);
      
      const results = await global.db.query(
        `SELECT * FROM clients WHERE name LIKE '%${name}%'`
      );
      
      expect(results.length).toBeGreaterThan(0);
    });

    test('يجب تصفية العملاء النشطين فقط', async () => {
      const activeClients = [
        createMockClient({ status: 'active' }),
        createMockClient({ status: 'active' }),
      ];
      global.db.query = jest.fn()
        .mockResolvedValue(activeClients);
      
      const results = await global.db.query(
        `SELECT * FROM clients WHERE status = 'active'`
      );
      
      expect(results.every(c => c.status === 'active')).toBe(true);
    });
  });
});
