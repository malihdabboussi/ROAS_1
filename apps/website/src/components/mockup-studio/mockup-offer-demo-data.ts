/** Static offer payload for AppMockup: same shape as production `Offer` workbook steps. */
export const MOCKUP_OFFER_DEMO = {
  name: 'SaaS Launch Offer',
  step1_data: {
    what_we_sell:
      'Vibey Studio: a conversational workspace that ships funnels, sequences, presentations, and ads from one brief.',
    who_we_sell_to: 'B2B SaaS founders and lean GTM teams from roughly $500K–$15M ARR.',
    product:
      'Campaign-scoped artifacts with preview, publish hooks, and CRM integrations: not a generic chat UI bolted onto marketing.',
    target_market:
      'PLG and sales-led SaaS in devtools, revenue ops, and vertical workflow software.',
  },
  step2_data: {
    step2_power_offer_statement:
      'In one conversation, get a complete lead system: landing page, presentation, nurture sequence, and ad variants: ready to publish.',
    step2_major_benefit:
      'Cut weeks of coordination into a single guided build with on-brand output.',
    step2_secondary_benefit:
      'Every artifact stays attached to the same campaign brief and Brain context.',
    step2_tertiary_benefit:
      'Reuse the scaffold on the next launch without re-explaining positioning.',
    step2_vehicle: 'Studio chat, artifact tree, previews, and handoff to your stack.',
    step2_common_objection: '"Our product is too technical for AI copy."',
    step2_call_to_action:
      'Book a 15-minute pipeline audit and we map the three biggest funnel leaks for free.',
  },
  step3_data: {
    step3_demographics: 'VP Marketing, Head of Growth, or founder-led GTM; US/EU; team 5–80.',
    step3_core_problem:
      'Shipping cohesive campaigns across landing, email, paid, and social without a full creative bench.',
    step3_powerful_emotions: [
      'Fear of wasted spend',
      'Relief when a system actually ships',
      'Pride in looking premium',
    ],
    step3_biggest_fears: [
      'Launching another page that does not convert',
      'Inconsistent story between ads and email',
      'Junior hires publishing off-brand copy',
    ],
    step3_perfect_outcomes: [
      'One narrative from first touch to demo booked',
      'Reusable campaign scaffold for the next quarter',
      'Clear handoff to sales with context intact',
    ],
    step3_main_objections: [
      'Tone will miss our technical nuance',
      'We tried AI copy and it felt generic',
    ],
    step3_comprehensive_summary:
      'They want speed without sacrificing positioning: a system that respects ICP nuance and keeps artifacts aligned.',
  },
} as const

export type MockupOfferDemo = typeof MOCKUP_OFFER_DEMO
