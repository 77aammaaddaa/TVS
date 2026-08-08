/**
 * CoreBalance OS 3.0 - Entity Isolation Guard & Router
 * جدار الحماية المحاسبي والمنطقي لعزل الكيانات ومنع خلط السيولة
 */

import { Asset, EntityId } from '@/types';

/**
 * نتيجة فحص سلامة المعاملة
 */
export interface EntityValidationResult {
  isValid: boolean;
  errorMessage?: string;
  detectedEntity?: EntityId;
}

/**
 * فحص مطابقة الأصل المختَار للكيان المالي الحالي (Entity Match Verification)
 */
export function validateTransactionEntity(
  asset: Asset | undefined,
  targetEntityId: EntityId
): EntityValidationResult {
  if (!asset) {
    return {
      isValid: false,
      errorMessage: '⚠️ الأصل المحدد غير موجود أو غير معرف بالنظام.'
    };
  }

  // منع السحب أو الإيداع على أصل لا يتبع للكيان المستهدف
  if (asset.entity_id !== targetEntityId) {
    return {
      isValid: false,
      errorMessage: `⚠️ تنبيه حماية: الأصل (${asset.name}) يتبع للكيان [${asset.entity_id}] ولا يمكن استخدامه في كيان [${targetEntityId}].`,
      detectedEntity: asset.entity_id
    };
  }

  return {
    isValid: true,
    detectedEntity: asset.entity_id
  };
}

/**
 * تصفية الأصول حسب الكيان (Get Assets Belonging to Entity Only)
 */
export function filterAssetsByEntity(assets: Asset[], entityId: EntityId): Asset[] {
  return assets.filter((asset) => asset.entity_id === entityId);
}

/**
 * تصفية الخزائن المتداولة النقدية فقط المتاحة للشراء أو السداد
 */
export function getLiquidAssetsForEntity(assets: Asset[], entityId: EntityId): Asset[] {
  return assets.filter(
    (asset) => asset.entity_id === entityId && asset.asset_type === 'متداول'
  );
}

/**
 * التوجيه التلقائي واستخراج الكيان المناسب بناءً على كود الأصل المستخدم
 */
export function autoResolveEntityFromAsset(
  assetId: string,
  assetsList: Asset[]
): EntityId | null {
  const targetAsset = assetsList.find((a) => a.id === assetId);
  return targetAsset ? targetAsset.entity_id : null;
}