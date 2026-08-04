import Dexie, { Table } from 'dexie';
import { Asset, Transaction, Liability, SVEValuation } from '@/types';
import { DB_NAME, DB_VERSION, DB_SCHEMA } from './schema';

/**
 * فئة قاعدة بيانات CoreBalance OS المحلية (IndexedDB Container)
 */
export class CoreBalanceDatabase extends Dexie {
  // تعريف الجداول مع الربط المباشر بـ TypeScript Interfaces
  assets!: Table<Asset, string>;
  transactions!: Table<Transaction, string>;
  liabilities!: Table<Liability, string>;
  sve_valuations!: Table<SVEValuation, string>;

  constructor() {
    super(DB_NAME);
    
    // تطبيق المخطط والفهارس
    this.version(DB_VERSION).stores(DB_SCHEMA);
  }
}

// تصدير نسخة واحدة موحدة لاستخدامها في كافة الـ Hooks والمكونات
export const db = new CoreBalanceDatabase();