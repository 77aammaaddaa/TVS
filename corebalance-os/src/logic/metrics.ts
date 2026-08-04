/**
 * CoreBalance OS 3.0 - Dashboard Metrics & Financial Ratios Engine
 * محرك حساب مؤشرات الأداء المالي، الميزانية العمومية، ومعدلات الأمان
 */

import { Asset, DashboardMetrics, EntityId, Liability, Transaction } from '@/types';

/**
 * حساب إجمالي قيم الأصول لكيان معين
 */
export function calculateTotalAssetValue(assets: Asset[], entityId?: EntityId): number {
  const filtered = entityId ? assets.filter((a) => a.entity_id === entityId) : assets;
  return filtered.reduce((sum, asset) => sum + (asset.current_value || 0), 0);
}

/**
 * حساب إجمالي السيولة النقدية المتاحة فوراً (Cash & E-Wallets)
 */
export function calculateLiquidAssetsTotal(assets: Asset[], entityId?: EntityId): number {
  const filtered = entityId ? assets.filter((a) => a.entity_id === entityId) : assets;
  return filtered
    .filter((a) => a.asset_type === 'متداول')
    .reduce((sum, asset) => sum + (asset.current_value || 0), 0);
}

/**
 * حساب قيمة الأصول المعرفية والتكنولوجية والأنظمة (IP & Systems Value)
 */
export function calculateIPAndSystemsTotal(assets: Asset[], entityId?: EntityId): number {
  const filtered = entityId ? assets.filter((a) => a.entity_id === entityId) : assets;
  return filtered
    .filter((a) => a.asset_type === 'غير متداول')
    .reduce((sum, asset) => sum + (asset.current_value || 0), 0);
}

/**
 * حساب إجمالي المتبقي من الديون والالتزامات قائمة السداد
 */
export function calculateTotalLiabilities(liabilities: Liability[], entityId?: EntityId): number {
  const filtered = entityId ? liabilities.filter((l) => l.entity_id === entityId) : liabilities;
  return filtered
    .filter((l) => l.status !== 'مسدد بالكامل')
    .reduce((sum, debt) => sum + (debt.amount - debt.paid_amount), 0);
}

/**
 * حساب مؤشر أمان التشغيل بالشهور (Runway Index)
 * المعادلة: السيولة المتداولة / متوسط المصاريف الشهرية
 */
export function calculateRunwayIndex(
  liquidAssets: number,
  monthlyExpenses: number
): number {
  if (monthlyExpenses <= 0) return 999; // أمان كامل عند عدم وجود مصاريف
  const runway = liquidAssets / monthlyExpenses;
  return Number(runway.toFixed(2));
}

/**
 * حساب نسبة الديون إلى الأصول % (Debt Ratio)
 */
export function calculateDebtRatio(totalLiabilities: number, totalAssets: number): number {
  if (totalAssets <= 0) return totalLiabilities > 0 ? 100 : 0;
  const ratio = (totalLiabilities / totalAssets) * 100;
  return Number(ratio.toFixed(1));
}

/**
 * الدالة الجامعة لحساب كافة مؤشرات لوحة التحكم لكيان معين
 */
export function computeDashboardMetrics(
  entityId: EntityId,
  assets: Asset[],
  liabilities: Liability[],
  transactions: Transaction[]
): DashboardMetrics {
  const totalAssets = calculateTotalAssetValue(assets, entityId);
  const liquidAssets = calculateLiquidAssetsTotal(assets, entityId);
  const ipAndSystems = calculateIPAndSystemsTotal(assets, entityId);
  const totalLiabilities = calculateTotalLiabilities(liabilities, entityId);

  // حساب صافي الثروة
  const netWorth = totalAssets - totalLiabilities;

  // حساب متوسط المصاريف الشهرية للكيان من سجل الحركات
  const entityExpenses = transactions
    .filter((t) => t.entity_id === entityId && t.type === 'مصروف')
    .reduce((sum, t) => sum + t.amount, 0);

  // افترضنا هنا متوسط شهري مبسط للتجربة أو الاعتماد على إجمالي المصاريف
  const estimatedMonthlyExpenses = entityExpenses > 0 ? entityExpenses : 1000;
  const runwayIndex = calculateRunwayIndex(liquidAssets, estimatedMonthlyExpenses);
  const debtRatio = calculateDebtRatio(totalLiabilities, totalAssets);

  // حساب نسبة الدخل المنظم الذاتي %
  const totalRevenues = transactions
    .filter((t) => t.entity_id === entityId && t.type === 'إيراد')
    .reduce((sum, t) => sum + t.amount, 0);

  const systemRevenues = transactions
    .filter((t) => t.entity_id === entityId && t.type === 'إيراد' && t.income_nature === 'System')
    .reduce((sum, t) => sum + t.amount, 0);

  const systemIncomePercent = totalRevenues > 0 ? Number(((systemRevenues / totalRevenues) * 100).toFixed(1)) : 0;

  return {
    entity_id: entityId,
    net_worth: Number(netWorth.toFixed(2)),
    growth_rate: 0, // يتم حسابه بالمقارنة التاريخية في Wealth_S
    liquid_assets: Number(liquidAssets.toFixed(2)),
    ip_and_systems: Number(ipAndSystems.toFixed(2)),
    runway_index: runwayIndex,
    debt_ratio: debtRatio,
    system_income_percent: systemIncomePercent
  };
}