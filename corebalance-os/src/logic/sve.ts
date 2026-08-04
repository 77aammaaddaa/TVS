/**
 * CoreBalance OS 3.0 - Smart Valuation Engine (SVE)
 * محرك التقييم الذكي للأصول والتحديث المستمر للقيمة العادلة
 */

import { Asset, SVEValuation, ValuationMethod } from '@/types';

/**
 * خريطة معامل الجودة والحالة الفنية للأجهزة (Hardware Quality Multiplier Table)
 * 1 -> 0.60 (متهالك/ضعيف)
 * 2 -> 0.80 (مقبول)
 * 3 -> 1.00 (جيد/قياسي)
 * 4 -> 1.15 (جيد جداً)
 * 5 -> 1.30 (ممتاز/كالجديد)
 */
const HARDWARE_QUALITY_MAP: Record<number, number> = {
  1: 0.60,
  2: 0.80,
  3: 1.00,
  4: 1.15,
  5: 1.30,
};

/**
 * حساب القيمة العادلة للأصل الصلب (Hardware Valuation)
 * المعادلة: FairValue = Cost * (1 - 0.25)^t * m
 */
export function calculateHardwareValuation(
  historicalCost: number,
  ageYears: number,
  qualityMultiplierScore: number = 3
): number {
  if (historicalCost <= 0) return 0;
  
  const depreciationRate = 0.25; // نسبة الإهلاك السنوي 25%
  const timeFactor = Math.pow(1 - depreciationRate, Math.max(0, ageYears));
  const multiplier = HARDWARE_QUALITY_MAP[qualityMultiplierScore] ?? 1.0;

  const fairValue = historicalCost * timeFactor * multiplier;
  return Number(fairValue.toFixed(2));
}

/**
 * حساب القيمة العادلة للأصل المعرفي (Knowledge Valuation)
 * المعادلة: FairValue = Cost * (1 - 0.10)^t
 */
export function calculateKnowledgeValuation(
  historicalCost: number,
  ageYears: number
): number {
  if (historicalCost <= 0) return 0;

  const depreciationRate = 0.10; // نسبة الإهلاك المعرفي السنوي 10%
  const timeFactor = Math.pow(1 - depreciationRate, Math.max(0, ageYears));

  const fairValue = historicalCost * timeFactor;
  return Number(fairValue.toFixed(2));
}

/**
 * حساب القيمة العادلة للأصل الرقمي (Digital Valuation)
 * المعادلة: FairValue = Cost * Multiplier
 */
export function calculateDigitalValuation(
  historicalCost: number,
  profitMultiplier: number = 1.0
): number {
  if (historicalCost <= 0) return 0;
  const fairValue = historicalCost * Math.max(0.1, profitMultiplier);
  return Number(fairValue.toFixed(2));
}

/**
 * الدالة المحورية الشاملة لحساب SVE لأي أصل
 */
export function computeSVE(asset: Asset): SVEValuation {
  const cost = asset.historical_cost ?? asset.opening_balance ?? 0;
  const age = asset.age_years ?? 0;
  const multiplier = asset.quality_multiplier ?? 1;

  let fairValue = asset.current_value;

  switch (asset.valuation_method) {
    case 'Hardware':
      fairValue = calculateHardwareValuation(cost, age, multiplier);
      break;

    case 'Knowledge':
      fairValue = calculateKnowledgeValuation(cost, age);
      break;

    case 'Digital':
      fairValue = calculateDigitalValuation(cost, multiplier);
      break;

    case 'Liquid':
    default:
      fairValue = asset.current_value; // السيولة بنسبة 1:1
      break;
  }

  return {
    asset_id: asset.id,
    name: asset.name,
    valuation_method: asset.valuation_method,
    historical_cost: cost,
    replacement_cost: 0,
    doc_score: 0,
    transfer_score: 0,
    auto_score: 0,
    income_score: 0,
    confidence_score: 0,
    age_years: age,
    quality_multiplier: multiplier,
    fair_value: fairValue,
    entity_id: asset.entity_id,
    updated_at: new Date().toISOString()
  };
}