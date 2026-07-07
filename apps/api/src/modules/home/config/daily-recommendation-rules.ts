export type DailyRecommendationKey =
  | 'customer_brain'
  | 'feed_brain'
  | 'cortex_max'
  | 'nightly_dreaming'
  | 'review_signals'
  | 'skill_recommendations'
  | 'first_integration'
  | 'connect_slack'
  | 'connect_telegram'
  | 'sender_domain'
  | 'custom_domain'
  | 'first_automation'
  | 'first_funnel'
  | 'import_contacts'
  | 'invite_teammate'
  | 'first_form'
  | 'first_custom_skill'

export type DailyRecommendationTier = 1 | 2 | 3

export interface DailyRecommendationFacts {
  customerBrainEnabled?: boolean
  defaultBrainId?: string | null
  defaultBrainCortexMax?: boolean
  defaultBrainMemoryCount?: number
  companyCortexEnabled?: boolean
  companyCortexSchedule?: string | null
  proposedSignalCount?: number
  skillRecommendationsEnabled?: boolean
  connectedIntegrationCount?: number
  slackMappingCount?: number
  telegramChannelCount?: number
  emailSendCount?: number
  verifiedEmailDomainCount?: number
  publishedFunnelCount?: number
  customDomainCount?: number
  spaceCount?: number
  enabledAutomationCount?: number
  contactCount?: number
  activeOrgMemberCount?: number
  pendingInviteCount?: number
  formCount?: number
  customSkillCount?: number
}

export interface DailyRecommendationRule {
  key: DailyRecommendationKey
  tier: DailyRecommendationTier
  orgOnly: boolean
  adminOnly: boolean
  recurring: boolean
  // Rules sharing a rotationSlot occupy one slot in the daily rotation (slack/telegram).
  rotationSlot?: string
  isUnmet(facts: DailyRecommendationFacts): boolean
}

// Registry order = priority order within a tier.
export const DAILY_RECOMMENDATION_RULES: DailyRecommendationRule[] = [
  {
    key: 'customer_brain',
    tier: 1,
    orgOnly: false,
    adminOnly: true,
    recurring: false,
    isUnmet: (f) => f.customerBrainEnabled !== true,
  },
  {
    key: 'feed_brain',
    tier: 1,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.defaultBrainMemoryCount ?? 0) < 10,
  },
  {
    key: 'cortex_max',
    tier: 1,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) =>
      f.defaultBrainCortexMax !== true &&
      Boolean(f.defaultBrainId) &&
      (f.defaultBrainMemoryCount ?? 0) >= 50,
  },
  {
    key: 'nightly_dreaming',
    tier: 1,
    orgOnly: true,
    adminOnly: true,
    recurring: false,
    isUnmet: (f) => f.companyCortexEnabled !== true || f.companyCortexSchedule === 'manual_only',
  },
  {
    key: 'review_signals',
    tier: 1,
    orgOnly: true,
    adminOnly: true,
    recurring: true,
    isUnmet: (f) => (f.proposedSignalCount ?? 0) > 0,
  },
  {
    key: 'skill_recommendations',
    tier: 1,
    orgOnly: true,
    adminOnly: true,
    recurring: false,
    isUnmet: (f) => f.skillRecommendationsEnabled !== true,
  },
  {
    key: 'first_integration',
    tier: 2,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.connectedIntegrationCount ?? 0) === 0,
  },
  {
    key: 'connect_slack',
    tier: 2,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    rotationSlot: 'connect_channel',
    isUnmet: (f) => (f.slackMappingCount ?? 0) === 0,
  },
  {
    key: 'connect_telegram',
    tier: 2,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    rotationSlot: 'connect_channel',
    isUnmet: (f) => (f.telegramChannelCount ?? 0) === 0,
  },
  {
    key: 'sender_domain',
    tier: 2,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.emailSendCount ?? 0) > 0 && (f.verifiedEmailDomainCount ?? 0) === 0,
  },
  {
    key: 'custom_domain',
    tier: 2,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.publishedFunnelCount ?? 0) > 0 && (f.customDomainCount ?? 0) === 0,
  },
  {
    key: 'first_automation',
    tier: 3,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.spaceCount ?? 0) > 0 && (f.enabledAutomationCount ?? 0) === 0,
  },
  {
    key: 'first_funnel',
    tier: 3,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.publishedFunnelCount ?? 0) === 0,
  },
  {
    key: 'import_contacts',
    tier: 3,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.contactCount ?? 0) === 0,
  },
  {
    key: 'invite_teammate',
    tier: 3,
    orgOnly: true,
    adminOnly: true,
    recurring: false,
    isUnmet: (f) => (f.activeOrgMemberCount ?? 0) === 1 && (f.pendingInviteCount ?? 0) === 0,
  },
  {
    key: 'first_form',
    tier: 3,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.formCount ?? 0) === 0,
  },
  {
    key: 'first_custom_skill',
    tier: 3,
    orgOnly: false,
    adminOnly: false,
    recurring: false,
    isUnmet: (f) => (f.customSkillCount ?? 0) === 0,
  },
]

export const DAILY_RECOMMENDATION_KEYS = DAILY_RECOMMENDATION_RULES.map((rule) => rule.key) as [
  DailyRecommendationKey,
  ...DailyRecommendationKey[],
]
