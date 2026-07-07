/**
 * Shared offer workbook section order + labels (preview UI + PDF export).
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
  ['step3_fear_relationship_impact', 'Fear Relationship Impact'],
  ['step3_hurtful_comments', 'Hurtful Comments'],
  ['step3_past_attempts', 'Past Attempts'],
  ['step3_avoidance_behaviors', 'Avoidance Behaviors'],
  ['step3_perfect_outcomes', 'Perfect Outcomes'],
  ['step3_transformation_impact', 'Transformation Impact'],
  ['step3_success_markers', 'Success Markers'],
  ['step3_secondary_gains', 'Secondary Gains'],
  ['step3_blame_targets', 'Blame Targets'],
  ['step3_main_objections', 'Main Objections'],
  ['step3_background_profile', 'Background Profile'],
  ['step3_psychological_drivers', 'Psychological Drivers'],
  ['step3_internal_voice', 'Internal Voice'],
  ['step3_content_preferences', 'Content Preferences'],
  ['step3_comprehensive_summary', 'Comprehensive Summary'],
]

const STEP4_FIELDS: [string, string][] = [
  ['step4_company_demographics', 'Company Demographics'],
  ['step4_organizational_details', 'Organizational Details'],
  ['step4_pain_points_goals', 'Pain Points & Goals'],
  ['step4_existing_solutions', 'Existing Solutions'],
  ['step4_messaging_triggers', 'Messaging Triggers'],
  ['step4_message_testing_signals', 'Message Testing Signals'],
  ['step4_buying_triggers', 'Buying Triggers'],
  ['step4_psychographics', 'Psychographics'],
  ['step4_behavioral_insights', 'Behavioral Insights'],
  ['step4_cultural_nuances', 'Cultural Nuances'],
  ['step4_competitive_landscape', 'Competitive Landscape'],
  ['step4_success_stories', 'Success Stories'],
  ['step4_final_summary', 'Final Summary'],
]

const STEP5_FIELDS: [string, string][] = [
  ['step5_company_overview', 'Company Overview'],
  ['step5_included_features', 'Included Features'],
  ['step5_challenges_solved', 'Challenges Solved'],
  ['step5_competitive_advantages', 'Competitive Advantages'],
  ['step5_differentiating_factors', 'Differentiating Factors'],
  ['step5_competitor_analysis', 'Competitor Analysis'],
  ['step5_success_stories', 'Success Stories'],
  ['step5_credibility_proof', 'Credibility Proof'],
]

const STEP6_FIELDS: [string, string][] = [
  ['unique_mechanisms', 'Unique Mechanisms'],
  ['differential_mechanisms', 'Differential Mechanisms'],
]

export type OfferSectionDef = { title: string; dataKey: string; fields: [string, string][] }

export const OFFER_WORKBOOK_SECTIONS: OfferSectionDef[] = [
  { title: 'Product & Market Analysis', dataKey: 'step1_data', fields: STEP1_FIELDS },
  { title: 'Power Offer Statement', dataKey: 'step2_data', fields: STEP2_FIELDS },
  { title: 'Buyer Persona', dataKey: 'step3_data', fields: STEP3_FIELDS },
  { title: 'ICP Analysis', dataKey: 'step4_data', fields: STEP4_FIELDS },
  { title: 'Competitive Edge', dataKey: 'step5_data', fields: STEP5_FIELDS },
  { title: 'Unique Mechanisms', dataKey: 'step6_data', fields: STEP6_FIELDS },
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
