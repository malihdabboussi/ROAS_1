/**
 * Mirrors apps/web `offer-sections.config.ts` for mockup offer preview (website cannot import apps/web).
 */

const STEP1_FIELDS: [string, string][] = [
  ['what_we_sell', 'What We Sell'],
  ['who_we_sell_to', 'Who We Sell To'],
  ['product', 'Product Details'],
  ['target_market', 'Target Market'],
]

const STEP2_FIELDS: [string, string][] = [
  ['step2_power_offer_statement', 'Power Offer Statement'],
  ['step2_major_benefit', 'Primary Benefit'],
  ['step2_secondary_benefit', 'Secondary Benefit'],
  ['step2_tertiary_benefit', 'Tertiary Benefit'],
  ['step2_vehicle', 'How We Deliver'],
  ['step2_common_objection', 'Common Objection'],
  ['step2_call_to_action', 'Call to Action'],
]

const STEP3_FIELDS: [string, string][] = [
  ['step3_demographics', 'Demographics'],
  ['step3_core_problem', 'Core Problem'],
  ['step3_powerful_emotions', 'Powerful Emotions'],
  ['step3_biggest_fears', 'Biggest Fears'],
  ['step3_perfect_outcomes', 'Perfect Outcomes'],
  ['step3_main_objections', 'Main Objections'],
  ['step3_comprehensive_summary', 'Comprehensive Summary'],
]

export type OfferSectionDef = { title: string; dataKey: string; fields: [string, string][] }

export const OFFER_WORKBOOK_SECTIONS: OfferSectionDef[] = [
  { title: 'Product & Market Analysis', dataKey: 'step1_data', fields: STEP1_FIELDS },
  { title: 'Power Offer Statement', dataKey: 'step2_data', fields: STEP2_FIELDS },
  { title: 'Buyer Persona', dataKey: 'step3_data', fields: STEP3_FIELDS },
]

export function formatOfferFieldKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getAllOfferFields(
  stepData: Record<string, unknown>,
  predefinedFields: [string, string][],
): [string, string][] {
  const predefinedKeys = new Set(predefinedFields.map(([k]) => k))
  const extraKeys = Object.keys(stepData).filter(
    (k) =>
      !predefinedKeys.has(k) &&
      stepData[k] != null &&
      stepData[k] !== '' &&
      (typeof stepData[k] !== 'string' || (stepData[k] as string).trim() !== ''),
  )
  return [
    ...predefinedFields,
    ...extraKeys.map((k) => [k, formatOfferFieldKey(k)] as [string, string]),
  ]
}
