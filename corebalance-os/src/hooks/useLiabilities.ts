/**
 * CoreBalance OS 3.0 - Reactive Liabilities Hook
 * هُوك تفاعلي لتتبع المديونيات والمستحقات والجمعيات
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useAppStore } from '@/store/useAppStore';
import { Liability } from '@/types';

export function useLiabilities() {
  const activeEntity = useAppStore((state) => state.activeEntity);

  // جلب ديون الكيان النشط مرتبة حسب تاريخ الاستحقاق
  const liabilities = useLiveQuery(
    () => db.liabilities.where('entity_id').equals(activeEntity).sortBy('due_date'),
    [activeEntity]
  ) ?? [];

  // جلب الديون المستحقة عاجلاً فقط
  const urgentLiabilities = liabilities.filter(
    (l) => l.status === 'مستحق عاجل' || l.status === 'غير مسدد'
  );

  /**
   * إضافة دَيْن أو جمعية جديدة
   */
  const addLiability = async (debt: Liability) => {
    await db.liabilities.put(debt);
  };

  return {
    liabilities,
    urgentLiabilities,
    addLiability,
    isLoading: liabilities === undefined
  };
}