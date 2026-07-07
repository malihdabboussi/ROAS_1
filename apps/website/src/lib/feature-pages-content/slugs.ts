export const FEATURE_SLUGS = [
  'your-team',
  'the-brain',
  'spaces',
  'studio',
  'documents',
  'missions',
  'autopilot',
  'skills',
  'integrations',
  'capabilities',
  'funnels',
  'brain',
  'team',
  'ads',
  'email-sequences',
  'social-content',
  'leads',
] as const

export type FeatureSlug = (typeof FEATURE_SLUGS)[number]
