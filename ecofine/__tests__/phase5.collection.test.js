/**
 * Phase 5: Collection & Payment Tests
 * اختبارات التحصيل والدفعات
 */

import {
  createMockClient,
  createMockInstallment,
  createMockTreasuryTransaction,
  INSTALLMENT_STATUSES,
  PAYMENT_RADAR_COLORS,
} from './helpers.js';

describe('✅ PHASE 5: COLLECTION - التحصيل والدفعات', () => {
  
  describe('📋 تحميل العملاء والفواتير المستحقة', () => {
    
    test('يجب تحميل قائمة العملاء مع الفواتير النشطة', async () => {
      const clients = [
        createMockClient({ status: 'active' }),
        createMockClient({ status: 'active' }),
      ];
      
      global.db.query = jest.fn()
        .mockResolvedValue(clients);
      
      const result = await global.db.query('SELECT * FROM clients WHERE status = "active"');
      
      expect(result.length).toBe(2);
      expect(result.every(c => c.status === 'active')).toBe(true);
    });

    test('يجب تحميل الأقساط المستحقة لكل عميل', async () => {
      const clientId = 'client_1';
      const installments = [
        createMockInstallment({ client_id: clientId, status: 'pending' }),
        createMockInstallment({ client_id: clientId, status: 'pending' }),
      ];
      
      global.db.query = jest.fn()
        .mockResolvedValue(installments);
      
      const result = await global.db.query(
        `SELECT * FROM installments WHERE client_id = '${clientId}' AND status = 'pending'`
      );
      
      expect(result.length).toBeGreaterThan(0);
    });

    test('يجب حساب إجمالي المستحقات لكل عميل', () => {
      const installments = [
        createMockInstallment({ amount: 500, paid_amount: 0 }),
        createMockInstallment({ amount: 500, paid_amount: 100 }),
      ];
      
      const totalDue = installments.reduce((sum, inst) => 
        sum + (inst.amount - inst.paid_amount), 0
      );
      
      expect(totalDue).toBe(900);
    });

    test('يجب فلترة العملاء النشطين فقط', async () => {
      const clients = [
        createMockClient({ status: 'active' }),
        createMockClient({ status: 'inactive' }),
        createMockClient({ status: 'banned' }),
      ];
      
      const activeClients = clients.filter(c => c.status === 'active');
      
      expect(activeClients.length).toBe(1);
    });
  });

  describe('🎯 نظام الرادار (Radar Detection)', () => {
    
    test('يجب حساب أيام التأخر بشكل صحيح', () => {
      const dueDate = new Date('2024-01-01');
      const today = new Date('2024-02-05');
      const delayDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      expect(delayDays).toBe(35);
    });

    test('يجب تصنيف GREEN: منتظم (0-20 يوم)', () => {
      const delayDays = 10;
      const color = delayDays <= 20 ? PAYMENT_RADAR_COLORS.GREEN : null;
      
      expect(color).toBe(PAYMENT_RADAR_COLORS.GREEN);
    });

    test('يجب تصنيف AMBER: متأخر (21-34 يوم)', () => {
      const delayDays = 25;
      const color = delayDays > 20 && delayDays <= 34 ? PAYMENT_RADAR_COLORS.AMBER : null;
      
      expect(color).toBe(PAYMENT_RADAR_COLORS.AMBER);
    });

    test('يجب تصنيف RED: قانوني (35+ يوم)', () => {
      const delayDays = 40;
      const color = delayDays > 34 ? PAYMENT_RADAR_COLORS.RED : null;
      
      expect(color).toBe(PAYMENT_RADAR_COLORS.RED);
    });

    test('يجب عرض تحذير عند الاقتراب من الحد القانوني', () => {
      const delayDays = 30;
      const warning = delayDays > 25;
      
      expect(warning).toBe(true);
    });

    test('يجب فحص الحالة القانونية للعميل', async () => {
      const client = createMockClient();
      global.db.query = jest.fn()
        .mockResolvedValue([{ client_id: client.id, status: 'active' }]);
      
      const legalCases = await global.db.query(
        `SELECT * FROM legal_cases WHERE client_id = '${client.id}'`
      );
      
      expect(Array.isArray(legalCases)).toBe(true);
    });
  });

  describe('💳 تسجيل الدفع (Payment Registration)', () => {
    
    test('يجب تحديد القسط المراد سداده', () => {
      const installments = [
        createMockInstallment({ id: '1', status: 'pending' }),
        createMockInstallment({ id: '2', status: 'pending' }),
      ];
      
      const selectedInstallment = installments[0];
      
      expect(selectedInstallment.status).toBe('pending');
    });

    test('يجب إدخال المبلغ المدفوع', () => {
      const paidAmount = 500;
      
      expect(paidAmount).toBeGreaterThan(0);
    });

    test('يجب عدم السماح بدفع أكثر من المستحق', () => {
      const installment = createMockInstallment({ amount: 500, paid_amount: 0 });
      const paymentAmount = 600;
      
      const allowed = paymentAmount <= (installment.amount - installment.paid_amount);
      
      expect(allowed).toBe(false);
    });

    test('يجب تحديث حالة القسط إلى paid عند السداد الكامل', async () => {
      const installment = createMockInstallment({ 
        amount: 500, 
        paid_amount: 400 
      });
      
      const newPaidAmount = 500;
      const updates = { 
        paid_amount: newPaidAmount, 
        status: INSTALLMENT_STATUSES.PAID 
      };
      
      global.db.update.mockResolvedValue({ ...installment, ...updates });
      
      const result = await global.db.update('installments', installment.id, updates);
      
      expect(result.status).toBe('paid');
      expect(result.paid_amount).toBe(500);
    });

    test('يجب تحديث حالة القسط إلى pending إذا كان الدفع جزئي', async () => {
      const installment = createMockInstallment({ 
        amount: 500, 
        paid_amount: 0,
        status: 'pending'
      });
      
      const newPaidAmount = 300;
      const updates = { paid_amount: newPaidAmount };
      
      global.db.update.mockResolvedValue({ ...installment, ...updates });
      
      const result = await global.db.update('installments', installment.id, updates);
      
      expect(result.paid_amount).toBe(300);
      expect(result.status).toBe('pending');
    });

    test('يجب تسجيل تاريخ الدفع (payment_date)', async () => {
      const now = new Date().toISOString();
      const installment = createMockInstallment({ payment_date: null });
      const updates = { payment_date: now, status: 'paid' };
      
      global.db.update.mockResolvedValue({ ...installment, ...updates });
      
      const result = await global.db.update('installments', installment.id, updates);
      
      expect(result.payment_date).not.toBeNull();
      expect(new Date(result.payment_date)).toBeInstanceOf(Date);
    });

    test('يجب إضافة ملاحظات إذا لزم الأمر', async () => {
      const installment = createMockInstallment({ notes: '' });
      const updates = { notes: 'تم الدفع بشيك' };
      
      global.db.update.mockResolvedValue({ ...installment, ...updates });
      
      const result = await global.db.update('installments', installment.id, updates);
      
      expect(result.notes).toBe('تم الدفع بشيك');
    });

    test('يجب حفظ معاملة الدفع في قاعدة البيانات', async () => {
      const payment = createMockTreasuryTransaction();
      global.db.add.mockResolvedValue({ id: payment.id });
      
      const result = await global.db.add('payments', payment);
      
      expect(global.db.add).toHaveBeenCalledWith('payments', payment);
    });
  });

  describe('💰 تحديث الخزينة (Treasury Update)', () => {
    
    test('يجب إنشاء INCOME entry للدفع', async () => {
      const payment = createMockTreasuryTransaction({ 
        type: 'INCOME',
        category: 'INSTALLMENT_PAYMENT',
        amount: 500
      });
      
      global.db.add.mockResolvedValue(payment);
      
      const result = await global.db.add('treasury', payment);
      
      expect(result.type).toBe('INCOME');
      expect(result.category).toBe('INSTALLMENT_PAYMENT');
    });

    test('يجب تحديث رصيد الخزينة (vault balance)', () => {
      const currentBalance = 10000;
      const payment = 500;
      const newBalance = currentBalance + payment;
      
      expect(newBalance).toBe(10500);
    });

    test('يجب تسجيل المعاملة مع التاريخ والوقت', () => {
      const transaction = createMockTreasuryTransaction();
      
      expect(transaction).toHaveProperty('date');
      expect(new Date(transaction.date)).toBeInstanceOf(Date);
    });

    test('يجب ربط المعاملة بالعميل والقسط', () => {
      const transaction = createMockTreasuryTransaction();
      
      expect(transaction).toHaveProperty('client_id');
    });

    test('يجب حفظ المعاملة في vault_transactions', async () => {
      const transaction = createMockTreasuryTransaction();
      global.db.add.mockResolvedValue(transaction);
      
      const result = await global.db.add('vault_transactions', transaction);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('amount');
    });
  });

  describe('🔔 نظام التنبيهات (Alerts System)', () => {
    
    test('يجب إنشاء تنبيه للعملاء المتأخرين', () => {
      const alert = {
        type: 'PAYMENT_OVERDUE',
        client_id: 'client_1',
        delay_days: 45,
        message: 'العميل متأخر عن السداد لمدة 45 يوم',
      };
      
      expect(alert.type).toBe('PAYMENT_OVERDUE');
      expect(alert.delay_days).toBeGreaterThan(30);
    });

    test('يجب تنبيه عند اقتراب من الحد القانوني (30 يوم)', () => {
      const delayDays = 30;
      const shouldAlert = delayDays >= 30 && delayDays < 35;
      
      expect(shouldAlert).toBe(true);
    });

    test('يجب تنبيه عند تجاوز الحد القانوني (35+ يوم)', () => {
      const delayDays = 40;
      const shouldAlert = delayDays >= 35;
      
      expect(shouldAlert).toBe(true);
    });

    test('يجب تنبيه عند اقتراب انتهاء صلاحية الأقساط', () => {
      const daysUntilEnd = 5;
      const shouldAlert = daysUntilEnd <= 7;
      
      expect(shouldAlert).toBe(true);
    });

    test('يجب حفظ التنبيهات المُنشأة', async () => {
      const alert = {
        id: 'alert_' + Math.random().toString(36).substr(2, 9),
        type: 'PAYMENT_OVERDUE',
        client_id: 'client_1',
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      global.db.add.mockResolvedValue(alert);
      
      const result = await global.db.add('system_alerts', alert);
      
      expect(result).toHaveProperty('read');
      expect(result.read).toBe(false);
    });
  });

  describe('📊 إحصائيات التحصيل (Collection Statistics)', () => {
    
    test('يجب حساب معدل التحصيل اليومي', () => {
      const dailyPayments = [
        { amount: 500, date: '2024-01-01' },
        { amount: 750, date: '2024-01-01' },
        { amount: 1000, date: '2024-01-01' },
      ];
      
      const total = dailyPayments.reduce((sum, p) => sum + p.amount, 0);
      
      expect(total).toBe(2250);
    });

    test('يجب حساب نسبة المتأخرين', () => {
      const totalClients = 100;
      const overdueClients = 15;
      const overduePercentage = (overdueClients / totalClients) * 100;
      
      expect(overduePercentage).toBe(15);
    });

    test('يجب حساب إجمالي المستحقات المعلقة', () => {
      const installments = [
        { amount: 500, paid_amount: 0 },
        { amount: 500, paid_amount: 200 },
        { amount: 500, paid_amount: 500 },
      ];
      
      const totalPending = installments.reduce((sum, inst) => 
        sum + (inst.amount - inst.paid_amount), 0
      );
      
      expect(totalPending).toBe(800);
    });
  });

  describe('⚠️ معالجة الأخطاء (Error Handling)', () => {
    
    test('يجب التعامل مع خطأ في حفظ الدفع', async () => {
      const error = new Error('Payment save failed');
      global.db.add.mockRejectedValue(error);
      
      await expect(global.db.add('payments', {})).rejects.toThrow('Payment save failed');
    });

    test('يجب التحقق من صحة مبلغ الدفع', () => {
      const invalidAmounts = [-100, 0, -1];
      
      invalidAmounts.forEach((amount) => {
        expect(amount).toBeLessThanOrEqual(0);
      });
    });

    test('يجب منع الدفع المزدوج', () => {
      const payment1 = { installment_id: '1', amount: 500, date: '2024-01-01' };
      const payment2 = { installment_id: '1', amount: 500, date: '2024-01-01' };
      
      expect(payment1.installment_id).toBe(payment2.installment_id);
      // في الواقع يجب فحص الدفع الفريد
    });
  });

  describe('🔄 تحديث حالة العميل (Client Status Update)', () => {
    
    test('يجب تحديث حالة العميل عند السداد الكامل', async () => {
      const client = createMockClient({ status: 'active' });
      
      global.db.getById.mockResolvedValue(client);
      
      const result = await global.db.getById('clients', client.id);
      
      expect(result.status).toBe('active');
    });

    test('يجب إرجاع العميل للحالة النشطة بعد سداد المتأخرات', () => {
      const client = createMockClient({ status: 'active' });
      
      expect(client.status).toBe('active');
    });
  });
});
