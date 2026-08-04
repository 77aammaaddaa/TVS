/**
 * CoreBalance OS 3.0 (X-Ledger) - Master Types Definitions
 * عقد الأنواع البرمجية الموحد للنظام المالي
 */

// ==========================================
// 1. الأنواع الأساسية المرجعية (Core Unions)
// ==========================================

/** الكيانات المالية الثلاثة المستقلة */
export type EntityId = 'Person' | 'TVS' | 'Mkank Store';

/** طرق تقييم الأصول بمحرك SVE */
export type ValuationMethod = 'Hardware' | 'Digital' | 'Knowledge' | 'Liquid';

/** أنواع الأصول زمانياً */
export type AssetType = 'متداول' | 'غير متداول';

/** أنواع المعاملات والحركات المالية */
export type TransType = 'إيراد' | 'مصروف' | 'تحويل داخلي';

/** طبيعة الإيراد (نشط أم ناتج عن أنظمة أوتوماتيكية) */
export type IncomeNature = 'Active' | 'System';

/** حالات الالتزامات والديون */
export type DebtStatus = 'غير مسدد' | 'مسدد جزئيا' | 'مستحق عاجل' | 'مسدد بالكامل';

// ==========================================
// 2. هياكل البيانات الرئيسية (Data Interfaces)
// ==========================================

/** هيكل بيانات الأصل (Asset) */
export interface Asset {
  /** المفتاح الرئيسي للأصل (مثل: A01, A02) */
  id: string;
  /** الاسم التعريفي للأصل (مثل: Cash, Redmi 14c, Thnder) */
  name: string;
  /** الكيان المالك للأصل */
  entity_id: EntityId;
  /** التصنيف التشغيلي (مثل: Liquid, Hardware, Knowledge, Digital) */
  category: string;
  /** نوع السيولة زمانياً (متداول / غير متداول) */
  asset_type: AssetType;
  /** فئة الخزنة أو الوعاء (Cash, E Wallet, Investment, Asset Hardware) */
  liquid_type: string;
  /** الرصيد الافتتاحي المبدئي */
  opening_balance: number;
  /** القيمة النقدية والسيولة اللحظية الحالية */
  current_value: number;
  /** طريقة التقييم المعتمدة في محرك SVE */
  valuation_method: ValuationMethod;
  /** التكلفة التاريخية أو الشراء الأصلي (مطلوب لـ SVE) */
  historical_cost?: number;
  /** العمر بالسنوات بالكسور (مطلوب لـ SVE) */
  age_years?: number;
  /** معامل الجودة والحالة الفنية من 1 إلى 5 (مطلوب لـ SVE) */
  quality_multiplier?: number;
  /** ملاحظات إضافية */
  note?: string;
  /** تاريخ آخر سناب شوت وتحديث */
  date_updated: string;
}

/** هيكل مدخلات ومخرجات محرك التقييم الذكي (SVE Engine) */
export interface SVEValuation {
  asset_id: string;
  name: string;
  valuation_method: ValuationMethod;
  historical_cost: number;
  replacement_cost: number;
  doc_score: number;
  transfer_score: number;
  auto_score: number;
  income_score: number;
  confidence_score: number;
  age_years: number;
  quality_multiplier: number;
  /** القيمة العادلة المحسوبة أوتوماتيكياً */
  fair_value: number;
  entity_id: EntityId;
  updated_at: string;
}

/** هيكل سجل الحركة اليومية (Transaction Log) */
export interface Transaction {
  /** كود الحركة التلقائي (مثل: T0001) */
  id?: string;
  /** كود الأصل المستخدم (FK -> Asset.id) */
  asset_used: string;
  /** اسم الأصل (محسوب أوتوماتيكياً للعرض) */
  asset_name?: string;
  /** الكيان التابع له الأصل (محسوب أوتوماتيكياً لمنع التداخل) */
  entity_id: EntityId;
  /** طبيعة المعاملة */
  type: TransType;
  /** القيمة النقدية للمعاملة */
  amount: number;
  /** تصنيف سبب المعاملة (مثل: Eat, Net, Salary, Relation, Invest) */
  category: string;
  /** كود الدين أو الجمعية المرتبطة بهذه الحركة (اختياري) */
  liability_id?: string;
  /** كود الأصل الهدف (يُستخدم فقط في التحويل الداخلي) */
  to_asset?: string;
  /** تاريخ المعاملة (YYYY-MM-DD) */
  trans_date: string;
  /** طبيعة الإيراد (نشط / تلقائي) */
  income_nature?: IncomeNature;
  /** بيان أو ملاحظة الحركة */
  note?: string;
}

/** هيكل الخصوم والالتزامات والديون (Liabilities) */
export interface Liability {
  /** الكود المتسلسل للالتزام (مثل: L01, L02) */
  id: string;
  /** اسم الدائن أو الجهة المطالبة بالمال */
  creditor: string;
  /** القيمة المطلقة والأصلية للدين */
  amount: number;
  /** إجمالي المبلغ المدفوع حتى الآن */
  paid_amount: number;
  /** المتبقي من الدين (محسوب: amount - paid_amount) */
  remaining_balance: number;
  /** حالة السداد الحالية */
  status: DebtStatus;
  /** الموعد النهائي الواجب الدفع فيه */
  due_date: string;
  /** الكيان المالي الملزم بالدين */
  entity_id: EntityId;
  /** ملاحظات وبيانات إضافية */
  note?: string;
}

// ==========================================
// 3. هياكل لوحات التحكم والتحليل (Analytics & Dashboard)
// ==========================================

/** ملخص المركز المالي للكيان في الداشبورد */
export interface DashboardMetrics {
  entity_id: EntityId;
  /** صافي الثروة = إجمالي الأصول - إجمالي الخصوم */
  net_worth: number;
  /** معدل النمو مقارنة بالفترة السابقة */
  growth_rate: number;
  /** إجمالي السيولة النقدية المتداولة المتاحة فوراً */
  liquid_assets: number;
  /** تقييم الأنظمة والملكية الفكرية والأصول المعرفية */
  ip_and_systems: number;
  /** مؤشر أمان التشغيل بالشهور */
  runway_index: number;
  /** نسبة التعرض للديون % */
  debt_ratio: number;
  /** نسبة الدخل المنظم التلقائي % */
  system_income_percent: number;
}