import { db } from './dexie';
import { Asset, Liability } from '@/types';

/**
 * البيانات المبدئية للأصول الواقعية الخاصة بالنظام
 */
const initialAssets: Asset[] = [
  // أصول الكيان الفردي (Person)
  {
    id: 'A01',
    name: 'Cash',
    entity_id: 'Person',
    category: 'Liquid',
    asset_type: 'متداول',
    liquid_type: 'Cash',
    opening_balance: 420,
    current_value: 6965,
    valuation_method: 'Liquid',
    date_updated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'A02',
    name: 'Thnder (أسهم بورصة)',
    entity_id: 'Person',
    category: 'Knowledge',
    asset_type: 'غير متداول',
    liquid_type: 'Investment',
    opening_balance: 5110,
    current_value: 5170,
    valuation_method: 'Knowledge',
    historical_cost: 5110,
    age_years: 0,
    quality_multiplier: 5,
    date_updated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'A03',
    name: 'meza ahly',
    entity_id: 'Person',
    category: 'Liquid',
    asset_type: 'متداول',
    liquid_type: 'E Wallet',
    opening_balance: 510,
    current_value: 220,
    valuation_method: 'Liquid',
    date_updated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'A06',
    name: 'Redmi 14c',
    entity_id: 'Person',
    category: 'Hardware',
    asset_type: 'غير متداول',
    liquid_type: 'Asset Hardware',
    opening_balance: 6037.5,
    current_value: 6037.5,
    valuation_method: 'Hardware',
    historical_cost: 7000,
    age_years: 1,
    quality_multiplier: 4,
    date_updated: new Date().toISOString().split('T')[0]
  },

  // أصول شركة الخدمات التقنية (TVS)
  {
    id: 'A04',
    name: 'TVS vcash',
    entity_id: 'TVS',
    category: 'Liquid',
    asset_type: 'متداول',
    liquid_type: 'E Wallet',
    opening_balance: 750,
    current_value: 850,
    valuation_method: 'Liquid',
    date_updated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'A07',
    name: 'Redmi 10',
    entity_id: 'TVS',
    category: 'Hardware',
    asset_type: 'غير متداول',
    liquid_type: 'Asset Hardware',
    opening_balance: 1328.91,
    current_value: 1328.91,
    valuation_method: 'Hardware',
    historical_cost: 7000,
    age_years: 4,
    quality_multiplier: 1,
    date_updated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'A32',
    name: 'Eco Fine Pro',
    entity_id: 'TVS',
    category: 'Digital',
    asset_type: 'غير متداول',
    liquid_type: 'Asset Digital',
    opening_balance: 10000,
    current_value: 10000,
    valuation_method: 'Digital',
    historical_cost: 10000,
    date_updated: new Date().toISOString().split('T')[0]
  },

  // أصول متجر التجارة الإلكترونية (Mkank Store)
  {
    id: 'A05',
    name: 'Ms vcash',
    entity_id: 'Mkank Store',
    category: 'Liquid',
    asset_type: 'متداول',
    liquid_type: 'E Wallet',
    opening_balance: 15,
    current_value: 15,
    valuation_method: 'Liquid',
    date_updated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'A08',
    name: 'Mkank Store EGY VALUE',
    entity_id: 'Mkank Store',
    category: 'Knowledge',
    asset_type: 'غير متداول',
    liquid_type: 'Asset Digital',
    opening_balance: 26572.1,
    current_value: 26572.1,
    valuation_method: 'Knowledge',
    historical_cost: 50000,
    age_years: 6,
    quality_multiplier: 1,
    date_updated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'A09',
    name: 'Mkank Store SAU Value',
    entity_id: 'Mkank Store',
    category: 'Knowledge',
    asset_type: 'غير متداول',
    liquid_type: 'Asset Digital',
    opening_balance: 16200,
    current_value: 16200,
    valuation_method: 'Knowledge',
    historical_cost: 20000,
    age_years: 2,
    quality_multiplier: 1,
    date_updated: new Date().toISOString().split('T')[0]
  }
];

/**
 * الديون والالتزامات الأولية
 */
const initialLiabilities: Liability[] = [
  {
    id: 'L01',
    creditor: 'مامو',
    amount: 300,
    paid_amount: 0,
    remaining_balance: 300,
    status: 'مستحق عاجل',
    due_date: '2026-07-01',
    entity_id: 'TVS'
  },
  {
    id: 'L02',
    creditor: 'بيبا اشرف',
    amount: 1200,
    paid_amount: 0,
    remaining_balance: 1200,
    status: 'مستحق عاجل',
    due_date: '2026-06-01',
    entity_id: 'Person'
  },
  {
    id: 'L03',
    creditor: 'يوسف راوتر',
    amount: 2000,
    paid_amount: 1000,
    remaining_balance: 1000,
    status: 'مسدد جزئيا',
    due_date: '2026-07-10',
    entity_id: 'Person'
  },
  {
    id: 'L05',
    creditor: 'جمعيه شهر ٨',
    amount: 2000,
    paid_amount: 0,
    remaining_balance: 2000,
    status: 'مستحق عاجل',
    due_date: '2026-08-10',
    entity_id: 'Person'
  }
];

/**
 * دالة تهيئة وحقن قواعد البيانات إذا كانت فارغة
 */
export async function seedInitialData(): Promise<void> {
  const assetCount = await db.assets.count();
  
  if (assetCount === 0) {
    console.log('🌱 جاري حقن البيانات المبدئية لـ CoreBalance OS 3.0...');
    
    // إضافة الأصول والديون المبدئية دفعة واحدة
    await db.assets.bulkAdd(initialAssets);
    await db.liabilities.bulkAdd(initialLiabilities);
    
    console.log('✅ تم تجهيز قواعد البيانات المحلية بنجاح!');
  }
}