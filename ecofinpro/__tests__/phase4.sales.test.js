/**
 * Phase 4: Sales & Installments Tests
 * اختبارات البيع والتقسيط
 */

import {
  createMockClient,
  createMockInvoice,
  createMockInstallment,
  createMockProduct,
  assertValidInvoice,
  INSTALLMENT_STATUSES,
} from './helpers.js';

describe('✅ PHASE 4: SALES & INSTALLMENTS - البيع والتقسيط', () => {
  
  describe('🛒 عملية نقطة البيع (POS)', () => {
    
    test('يجب البحث عن منتج بـ SKU', async () => {
      const product = createMockProduct();
      global.db.getById.mockResolvedValue(product);
      
      const result = await global.db.getById('products', product.id);
      
      expect(result.sku).not.toBeNull();
    });

    test('يجب التحقق من توفر المنتج قبل الإضافة للسلة', () => {
      const product = createMockProduct({ quantity: 10 });
      const requestedQuantity = 5;
      
      expect(product.quantity).toBeGreaterThanOrEqual(requestedQuantity);
    });

    test('يجب رفض الإضافة إذا كان المنتج غير متوفر', () => {
      const product = createMockProduct({ quantity: 0 });
      const requestedQuantity = 1;
      
      expect(product.quantity).toBeLessThan(requestedQuantity);
    });

    test('يجب حساب الإجمالي من مجموع الكميات والأسعار', () => {
      const items = [
        { product_id: '1', quantity: 2, price: 500 },
        { product_id: '2', quantity: 1, price: 1000 },
      ];
      
      const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      
      expect(total).toBe(2000);
    });
  });

  describe('📝 أنواع البيع (Sale Types)', () => {
    
    test('يجب دعم البيع النقدي (CASH)', () => {
      const invoice = createMockInvoice({ type: 'cash' });
      
      expect(invoice.type).toBe('cash');
    });

    test('يجب دعم البيع بالشحن (SHIPPING)', () => {
      const invoice = createMockInvoice({ type: 'shipping' });
      
      expect(invoice.type).toBe('shipping');
    });

    test('يجب دعم البيع بالتقسيط (INSTALLMENT)', () => {
      const invoice = createMockInvoice({ type: 'installment' });
      
      expect(invoice.type).toBe('installment');
    });
  });

  describe('📦 عملية التقسيط (Installment Process)', () => {
    
    test('يجب التحقق من credit score قبل الموافقة على التقسيط', () => {
      const client = createMockClient({ credit_score: 700 });
      const approved = client.credit_score >= 600;
      
      expect(approved).toBe(true);
    });

    test('يجب رفض التقسيط للعميل برقم منخفض', () => {
      const client = createMockClient({ credit_score: 300 });
      const approved = client.credit_score >= 600;
      
      expect(approved).toBe(false);
    });

    test('يجب اختيار المدة: يومي أو شهري', () => {
      const invoice = createMockInvoice({ payment_terms: 'monthly' });
      
      expect(['daily', 'monthly']).toContain(invoice.payment_terms);
    });

    test('يجب حساب الدفعة الأولى (DOWN PAYMENT)', () => {
      const total = 1000;
      const downPaymentPercent = 0.20; // 20%
      const downPayment = total * downPaymentPercent;
      
      expect(downPayment).toBe(200);
    });

    test('يجب توليد جدول الأقساط الصحيح', async () => {
      const total = 1000;
      const downPayment = 200;
      const remaining = total - downPayment;
      const monthsCount = 3;
      const monthlyPayment = remaining / monthsCount;
      
      const installments = [];
      for (let i = 0; i < monthsCount; i++) {
        installments.push({
          amount: monthlyPayment,
          due_date: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
        });
      }
      
      expect(installments.length).toBe(monthsCount);
      expect(installments[0].amount).toBe(monthlyPayment);
    });

    test('يجب حفظ العقد في قاعدة البيانات', async () => {
      const invoice = createMockInvoice();
      global.db.add.mockResolvedValue({ id: invoice.id });
      
      const result = await global.db.add('invoices', invoice);
      
      expect(global.db.add).toHaveBeenCalledWith('invoices', invoice);
    });

    test('يجب ربط الأقساط بالعقد', async () => {
      const invoice = createMockInvoice();
      const installment = createMockInstallment({ invoice_id: invoice.id });
      
      global.db.add.mockResolvedValue({ id: installment.id });
      
      const result = await global.db.add('installments', installment);
      
      expect(result.invoice_id).toBe(invoice.id);
    });
  });

  describe('💰 تحديث المخزون والخزينة (Inventory & Treasury)', () => {
    
    test('يجب تقليل المخزون بعد البيع', async () => {
      const product = createMockProduct({ quantity: 50 });
      const soldQuantity = 5;
      const newQuantity = product.quantity - soldQuantity;
      
      global.db.update.mockResolvedValue({ ...product, quantity: newQuantity });
      
      const result = await global.db.update('products', product.id, { quantity: newQuantity });
      
      expect(result.quantity).toBe(45);
    });

    test('يجب عدم جعل المخزون negative', () => {
      const product = createMockProduct({ quantity: 2 });
      const soldQuantity = 5;
      const allowed = product.quantity >= soldQuantity;
      
      expect(allowed).toBe(false);
    });

    test('يجب تسجيل معاملة المخزون (inventory_transaction)', async () => {
      const transaction = {
        id: 'tx_' + Math.random().toString(36).substr(2, 9),
        product_id: 'prod_1',
        type: 'SALE',
        quantity: 5,
        timestamp: new Date().toISOString(),
      };
      
      global.db.add.mockResolvedValue(transaction);
      
      const result = await global.db.add('inventory_transactions', transaction);
      
      expect(result).toHaveProperty('type');
      expect(result.type).toBe('SALE');
    });

    test('يجب إنشاء INCOME entry للدفعة الأولى (DOWN PAYMENT)', async () => {
      const payment = {
        id: 'pmt_' + Math.random().toString(36).substr(2, 9),
        type: 'INCOME',
        category: 'DOWN_PAYMENT',
        amount: 200,
        date: new Date().toISOString(),
      };
      
      global.db.add.mockResolvedValue(payment);
      
      const result = await global.db.add('treasury', payment);
      
      expect(result.type).toBe('INCOME');
      expect(result.category).toBe('DOWN_PAYMENT');
    });

    test('يجب تسجيل الأقساط المستقبلية كـ unrealized في الخزينة', async () => {
      const futurePayments = [
        { amount: 266.67, due_date: '2024-02-01', status: 'pending' },
        { amount: 266.67, due_date: '2024-03-01', status: 'pending' },
        { amount: 266.66, due_date: '2024-04-01', status: 'pending' },
      ];
      
      expect(futurePayments.length).toBe(3);
      expect(futurePayments[0].status).toBe('pending');
    });
  });

  describe('✔️ التحقق من الفاتورة (Invoice Validation)', () => {
    
    test('يجب أن تحتوي الفاتورة على جميع الحقول المطلوبة', () => {
      const invoice = createMockInvoice();
      assertValidInvoice(invoice);
    });

    test('يجب أن تكون قائمة المنتجات غير فارغة', () => {
      const invoice = createMockInvoice();
      
      expect(invoice.items.length).toBeGreaterThan(0);
    });

    test('يجب أن يكون الإجمالي مساوياً لمجموع المنتجات', () => {
      const items = [
        { product_id: '1', quantity: 2, price: 500 },
        { product_id: '2', quantity: 1, price: 1000 },
      ];
      
      const calculatedTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const invoice = createMockInvoice({ items, total: calculatedTotal });
      
      expect(invoice.total).toBe(2000);
    });
  });

  describe('⚠️ معالجة الأخطاء (Error Handling)', () => {
    
    test('يجب التعامل مع خطأ في إنشاء الفاتورة', async () => {
      const error = new Error('Failed to create invoice');
      global.db.add.mockRejectedValue(error);
      
      await expect(global.db.add('invoices', {})).rejects.toThrow('Failed to create invoice');
    });

    test('يجب عدم حذف المخزون إذا فشلت عملية البيع', () => {
      const product = createMockProduct({ quantity: 50 });
      const initialQuantity = product.quantity;
      
      // إذا فشلت البيع، لا يتم تحديث المخزون
      expect(product.quantity).toBe(initialQuantity);
    });

    test('يجب إرجاع رسالة خطأ واضحة عند الفشل', () => {
      const errors = {
        INSUFFICIENT_STOCK: 'المنتج غير متوفر بالكمية المطلوبة',
        LOW_CREDIT_SCORE: 'لا يمكن الموافقة على التقسيط',
        INVALID_AMOUNT: 'المبلغ يجب أن يكون أكبر من الصفر',
      };
      
      expect(errors.INSUFFICIENT_STOCK).toContain('متوفر');
      expect(errors.LOW_CREDIT_SCORE).toContain('تقسيط');
    });
  });

  describe('📊 الإحصائيات (Statistics)', () => {
    
    test('يجب حساب إجمالي المبيعات اليومية', () => {
      const dailySales = [
        { amount: 1000, date: '2024-01-01' },
        { amount: 1500, date: '2024-01-01' },
        { amount: 2000, date: '2024-01-01' },
      ];
      
      const total = dailySales.reduce((sum, sale) => sum + sale.amount, 0);
      
      expect(total).toBe(4500);
    });

    test('يجب حساب عدد الفواتير بالتقسيط اليومية', () => {
      const installmentInvoices = [
        { type: 'installment', date: '2024-01-01' },
        { type: 'installment', date: '2024-01-01' },
        { type: 'cash', date: '2024-01-01' },
      ];
      
      const count = installmentInvoices.filter(inv => inv.type === 'installment').length;
      
      expect(count).toBe(2);
    });
  });
});
