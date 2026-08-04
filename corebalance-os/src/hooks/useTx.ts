/**
 * CoreBalance OS 3.0 - Atomic Transaction Engine Hook
 * هُوك المعاملات الذرية والخصم الأوتوماتيكي من الديون والأصول
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useAppStore } from '@/store/useAppStore';
import { Transaction } from '@/types';
import { validateTransactionEntity } from '@/logic/isolation';

export function useTx() {
  const activeEntity = useAppStore((state) => state.activeEntity);

  // جلب سجل حركات الكيان النشط مرتبة أحدثها أولاً
  const transactions = useLiveQuery(
    () => db.transactions.where('entity_id').equals(activeEntity).reverse().toArray(),
    [activeEntity]
  ) ?? [];

  /**
   * تنفيذ حركة مالية ذرية وتحديث كافة الجداول المترابطة
   */
  const executeTransaction = async (tx: Transaction): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. جلب الأصل المستخدم من قاعدة البيانات
      const asset = await db.assets.get(tx.asset_used);
      
      // 2. فحص جدار الحماية وعزل الكيانات
      const validation = validateTransactionEntity(asset, tx.entity_id);
      if (!validation.isValid || !asset) {
        return { success: false, error: validation.errorMessage };
      }

      // 3. بدء صفقة مالية ذرية (Dexie Transaction)
      await db.transaction('rw', [db.assets, db.transactions, db.liabilities], async () => {
        // أ. إضافة سجل الحركة
        await db.transactions.add({
          ...tx,
          trans_date: tx.trans_date || new Date().toISOString().split('T')[0]
        });

        // ب. تحديث رصيد الأصل المستخدم
        let newAssetValue = asset.current_value;
        if (tx.type === 'إيراد') {
          newAssetValue += tx.amount;
        } else if (tx.type === 'مصروف') {
          newAssetValue -= tx.amount;
        } else if (tx.type === 'تحويل داخلي' && tx.to_asset) {
          newAssetValue -= tx.amount;
          // إضافة القيمة للأصل الهدف
          const targetAsset = await db.assets.get(tx.to_asset);
          if (targetAsset) {
            await db.assets.update(tx.to_asset, {
              current_value: targetAsset.current_value + tx.amount
            });
          }
        }

        await db.assets.update(tx.asset_used, { current_value: newAssetValue });

        // ج. الأتمتة التلقائية للخصم من الديون (Auto Debt Deduction)
        if (tx.liability_id && tx.type === 'مصروف') {
          const debt = await db.liabilities.get(tx.liability_id);
          if (debt) {
            const newPaidAmount = debt.paid_amount + tx.amount;
            const newRemaining = debt.amount - newPaidAmount;
            
            let newStatus = debt.status;
            if (newRemaining <= 0) {
              newStatus = 'مسدد بالكامل';
            } else if (newPaidAmount > 0) {
              newStatus = 'مسدد جزئيا';
            }

            await db.liabilities.update(tx.liability_id, {
              paid_amount: newPaidAmount,
              remaining_balance: Math.max(0, newRemaining),
              status: newStatus
            });
          }
        }
      });

      return { success: true };
    } catch (err: any) {
      console.error('فشل تنفيذ الحركة المالية:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء حفظ الحركة.' };
    }
  };

  return {
    transactions,
    executeTransaction,
    isLoading: transactions === undefined
  };
}