export type AdStrategyKey =
  | 'visual_contrast'
  | 'founder_authority'
  | 'product_hero'
  | 'ugc_native'
  | 'bold_offer'
  | 'social_proof'
  | 'problem_symptom'
  | 'transformation'
  | 'comparison'
  | 'curiosity_pattern'

export type AdFormatRecommendation = 'single_image' | 'carousel' | 'video' | 'story'

export interface AdStrategyDefinition {
  key: AdStrategyKey
  name: string
  description: string
  whenToUse: string
  requiredAssets: string[]
  recommendedFormat: AdFormatRecommendation
  defaultPromptTemplate: string
  suggestedOverlay: string
}

export const AD_STRATEGIES: readonly AdStrategyDefinition[] = [
  {
    key: 'visual_contrast',
    name: 'Visual Contrast',
    description: 'Side-by-side before/after — pain state vs winning state.',
    whenToUse: 'Transformation offers, coaching, business growth, fitness.',
    requiredAssets: [],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Minimal text — let the visual contrast carry the message.',
    defaultPromptTemplate:
      'Dark cinematic ad creative, side-by-side split composition. Left: {{pain_state}}. Right: {{win_state}}. Same industry, same timeframe, different outcome. Moody lighting, high contrast, minimal on-image text. Brand accent: {{accent_color}}.',
  },
  {
    key: 'founder_authority',
    name: 'Founder Authority',
    description: 'Face + credibility + bold promise.',
    whenToUse: 'Personal brands, coaching, consulting, high-ticket.',
    requiredAssets: ['headshot'],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Headline + credential line.',
    defaultPromptTemplate:
      'Professional ad creative featuring a confident founder portrait. {{headline}}. Clean layout, brand colors {{primary_color}} and {{accent_color}}, authority positioning, premium feel.',
  },
  {
    key: 'product_hero',
    name: 'Product Hero',
    description: 'Product or offer as the visual anchor.',
    whenToUse: 'E-commerce, courses, SaaS, physical products.',
    requiredAssets: ['product_image'],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Product name + offer hook.',
    defaultPromptTemplate:
      'Premium product hero ad. {{product_description}} centered prominently. Clean background using {{primary_color}}, soft studio lighting, aspirational but realistic.',
  },
  {
    key: 'ugc_native',
    name: 'UGC Native',
    description: 'Looks like an organic creator post — low polish, high trust.',
    whenToUse: 'Cold audiences, scroll-stopping, social proof angles.',
    requiredAssets: [],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Casual headline, phone-screenshot aesthetic.',
    defaultPromptTemplate:
      'UGC-style native ad, phone camera aesthetic, authentic lighting, slightly imperfect framing, feels like a real person posting about {{offer}}. Not stock-photo clean.',
  },
  {
    key: 'bold_offer',
    name: 'Bold Offer',
    description: 'Direct response — the offer itself is the hook.',
    whenToUse: 'Retargeting, offer-aware audiences, webinars, free trainings.',
    requiredAssets: [],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Large offer text + CTA.',
    defaultPromptTemplate:
      'Bold direct-response ad. Large typography for {{offer_headline}}. High-energy design, brand colors {{primary_color}} and {{accent_color}}, strong CTA placement bottom third.',
  },
  {
    key: 'social_proof',
    name: 'Social Proof',
    description: 'Testimonials, numbers, screenshots, proof stack.',
    whenToUse: 'Warm audiences, credibility-building, results-focused offers.',
    requiredAssets: [],
    recommendedFormat: 'carousel',
    suggestedOverlay: 'Stat or quote callout.',
    defaultPromptTemplate:
      'Social proof ad creative. Show {{proof_element}} — testimonial screenshot, star rating, or result metric. Clean, trustworthy layout, brand colors {{primary_color}}.',
  },
  {
    key: 'problem_symptom',
    name: 'Problem / Symptom',
    description: 'Dramatize the pain visually.',
    whenToUse: 'Problem-aware audiences, health, business frustration angles.',
    requiredAssets: [],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Symptom headline only.',
    defaultPromptTemplate:
      'Problem-focused ad visual dramatizing {{pain_symptom}}. Dark moody atmosphere, relatable scenario specific to {{audience}}, viewer should feel "that is me". Minimal text.',
  },
  {
    key: 'transformation',
    name: 'Transformation',
    description: 'Aspirational end state — who they become.',
    whenToUse: 'Coaching, fitness, lifestyle, identity shifts.',
    requiredAssets: [],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Transformation promise headline.',
    defaultPromptTemplate:
      'Aspirational transformation ad showing {{desired_outcome}}. Golden hour lighting, emotional resonance, viewer wants to become this person. Brand accent {{accent_color}}.',
  },
  {
    key: 'comparison',
    name: 'Comparison',
    description: 'Old way vs new way.',
    whenToUse: 'Category disruption, method differentiation, SaaS vs legacy.',
    requiredAssets: [],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Old way / new way labels.',
    defaultPromptTemplate:
      'Comparison ad creative. Left labeled "Old Way": {{old_way}}. Right labeled "New Way": {{new_way}}. Clean split layout, brand colors, clear visual hierarchy.',
  },
  {
    key: 'curiosity_pattern',
    name: 'Curiosity Pattern Interrupt',
    description: 'Weird/specific visual that stops scroll.',
    whenToUse: 'Cold audiences, pattern interrupt, curiosity hooks.',
    requiredAssets: [],
    recommendedFormat: 'single_image',
    suggestedOverlay: 'Curiosity hook only — one line.',
    defaultPromptTemplate:
      'Pattern-interrupt ad visual. Unexpected specific detail about {{curiosity_hook}}. Stops the scroll, feels slightly weird or counterintuitive, dark cinematic mood.',
  },
] as const

export const AD_STRATEGY_BY_KEY: Record<AdStrategyKey, AdStrategyDefinition> = Object.fromEntries(
  AD_STRATEGIES.map((s) => [s.key, s]),
) as Record<AdStrategyKey, AdStrategyDefinition>

export function getAdStrategy(key: AdStrategyKey): AdStrategyDefinition {
  return AD_STRATEGY_BY_KEY[key]
}
