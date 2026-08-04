/**
 * CoreBalance OS 3.0 - Reactive Assets Hook
 * هُوك تفاعلي لتتبع وتحديث أرصدة الأصول والخزائن
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useAppStore } from '@/store/useAppStore';
import { Asset } from '@/types';
import { computeSVE } from '@/logic/sve';

export function useAssets() {
  const activeEntity = useAppStore((state) => state.activeEntity);

  // جلب كافة الأصول التابعة للكيان النشط لحظياً عند أي تغيير
  const entityAssets = useLiveQuery(
    () => db.assets.where('entity_id').equals(activeEntity).toArray(),
    [activeEntity]
  ) ?? [];

  // جلب جميع الأصول لكافة الكيانات (للميزانية الموحدة)
  const allAssets = useLiveQuery(() => db.assets.toArray()) ?? [];

  /**
   * إضافة أو تحديث أصل وإعادة حساب SVE أوتوماتيكياً
   */
  const saveAsset = async (assetData: Asset) => {
    // حساب القيمة العادلة من محرك SVE
    const sveResult = computeSVE(assetData);
    const updatedAsset: Asset = {
      ...assetData,
      current_value: sveResult.fair_value,
      date_updated: new Date().toISOString().split('T')[0]
    };

    await db.assets.put(updatedAsset);
    await db.sve_valuations.put(sveResult);
  };

  return {
    assets: entityAssets,
    allAssets,
    saveAsset,
    isLoading: entityAssets === undefined
  };
}