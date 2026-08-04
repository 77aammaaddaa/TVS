/**
 * CoreBalance OS 3.0 - Dexie.js Schema & Index Specifications
 * فهارس ومخطط قواعد البيانات المحلية
 */

export const DB_NAME = 'CoreBalanceDB';
export const DB_VERSION = 1;

/**
 * فهارس البحث والتصفية للجداول:
 * ملاحظة: الحقل الأول هو المفتاح الرئيسي (Primary Key).
 */
export const DB_SCHEMA = {
  // جدول الأصول: مفتاح أصلي id، وفهارس للكيان والفئة ونوع التقييم
  assets: 'id, entity_id, category, asset_type, valuation_method',

  // جدول الحركات: مفتاح تلقائي id، وفهارس للأصل المستخدم والكيان والتاريخ والحالة
  transactions: '++id, asset_used, entity_id, type, trans_date, liability_id, category',

  // جدول الخصوم والديون: مفتاح id، وفهارس للكيان والحالة وتاريخ الاستحقاق
  liabilities: 'id, entity_id, status, due_date, creditor',

  // جدول تقييمات SVE: مفتاح أصل asset_id، وفهرس للكيان وطريقة التقييم
  sve_valuations: 'asset_id, entity_id, valuation_method'
};