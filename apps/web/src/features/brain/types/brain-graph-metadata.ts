import type { CompanyCortexObjectType, KnowledgeGraphSourceType } from './brain.types'

export const ENTRY_TYPE_COLORS: Record<string, string> = {
  fact: '--brain-fact-rgb',
  concept: '--brain-fact-rgb',
  insight: '--brain-insight-rgb',
  framework: '--brain-framework-rgb',
  protocol: '--brain-conn-supports-rgb',
  principle: '--brain-principle-rgb',
  technique: '--brain-insight-rgb',
  quote: '--brain-story-rgb',
  case_study: '--brain-event-rgb',
  definition: '--brain-decision-rgb',
  example: '--brain-source-mission-rgb',
  heuristic: '--brain-co-retrieval_rule-rgb',
  playbook: '--brain-co-move-rgb',
}

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  fact: 'Fact',
  concept: 'Concept',
  insight: 'Insight',
  framework: 'Framework',
  protocol: 'Protocol',
  principle: 'Principle',
  technique: 'Technique',
  quote: 'Quote',
  case_study: 'Case Study',
  definition: 'Definition',
  example: 'Example',
  heuristic: 'Heuristic',
  playbook: 'Playbook',
}

export const MEMORY_TYPE_COLORS: Record<string, string> = {
  fact: '--brain-fact-rgb',
  decision: '--brain-decision-rgb',
  insight: '--brain-insight-rgb',
  story: '--brain-story-rgb',
  framework: '--brain-framework-rgb',
  preference: '--brain-preference-rgb',
  event: '--brain-event-rgb',
  principle: '--brain-principle-rgb',
  reflection: '--brain-belief-rgb',
  observation: '--brain-model-rgb',
  snapshot: '--brain-snapshot-rgb',
}

export const MEMORY_TYPE_LABELS: Record<string, string> = {
  fact: 'Fact',
  decision: 'Decision',
  insight: 'Insight',
  story: 'Story',
  framework: 'Framework',
  preference: 'Preference',
  event: 'Event',
  principle: 'Principle',
  reflection: 'Reflection',
  observation: 'Observation',
  snapshot: 'Snapshot',
}

export const SNAPSHOT_TYPE_COLORS: Record<string, string> = {
  Model: '--brain-model-rgb',
  Rule: '--brain-rule-rgb',
  Conviction: '--brain-conviction-rgb',
  Principle: '--brain-principle-rgb',
}

export const BELIEF_PATTERN_COLOR = '--brain-belief-pattern-rgb'
export const PERSPECTIVE_COLOR = '--brain-perspective-rgb'

export const CAMPAIGN_DOMAIN_COLORS: Record<string, string> = {
  strategy: '--brain-domain-strategy-rgb',
  marketing: '--brain-domain-marketing-rgb',
  finance: '--brain-domain-finance-rgb',
  operations: '--brain-domain-operations-rgb',
  creative: '--brain-domain-creative-rgb',
  general: '--brain-domain-general-rgb',
}

export const CAMPAIGN_DOMAIN_LABELS: Record<string, string> = {
  strategy: 'Strategy',
  marketing: 'Marketing',
  finance: 'Finance',
  operations: 'Operations',
  creative: 'Creative',
  general: 'General',
}

export const CAMPAIGN_SOURCE_COLORS: Record<string, string> = {
  upload: '--brain-source-upload-rgb',
  url: '--brain-source-url-rgb',
  mission: '--brain-source-mission-rgb',
  drive: '--brain-source-drive-rgb',
  dropbox: '--brain-source-dropbox-rgb',
  auto_sync: '--brain-source-auto_sync-rgb',
}

export const CAMPAIGN_SOURCE_LABELS: Record<string, string> = {
  upload: 'Upload',
  url: 'URL Import',
  mission: 'Mission Output',
  drive: 'Google Drive',
  dropbox: 'Dropbox',
  auto_sync: 'Auto Sync',
}

export const KNOWLEDGE_SOURCE_TYPE_COLORS: Record<KnowledgeGraphSourceType, string> = {
  space: '--brain-domain-general-rgb',
  space_view: '--brain-domain-strategy-rgb',
  space_doc: '--brain-document-rgb',
  space_task: '--brain-decision-rgb',
  space_activity: '--brain-event-rgb',
  space_deliverable: '--brain-source-mission-rgb',
  instagram_research_item: '--brain-domain-creative-rgb',
  tiktok_research_item: '--brain-domain-creative-rgb',
  youtube_research_item: '--brain-domain-creative-rgb',
  twitter_research_item: '--brain-domain-creative-rgb',
  mission: '--brain-domain-strategy-rgb',
  mission_subtask: '--brain-domain-operations-rgb',
  mission_deliverable: '--brain-domain-creative-rgb',
  conversation_document: '--brain-source-url-rgb',
  contact: '--brain-co-belief-rgb',
  channel: '--brain-domain-operations-rgb',
  channel_message: '--brain-event-rgb',
  media_asset: '--brain-source-upload-rgb',
  funnel: '--brain-domain-marketing-rgb',
  funnel_page: '--brain-domain-marketing-rgb',
  form: '--brain-decision-rgb',
  form_response: '--brain-fact-rgb',
  offer: '--brain-domain-finance-rgb',
  email: '--brain-source-mission-rgb',
  sequence: '--brain-domain-marketing-rgb',
  sequence_email: '--brain-domain-marketing-rgb',
  presentation: '--brain-domain-creative-rgb',
  avatar: '--brain-co-perspective-rgb',
  social_post: '--brain-domain-creative-rgb',
  ad_campaign: '--brain-domain-marketing-rgb',
  ad_set: '--brain-domain-marketing-rgb',
  ad: '--brain-domain-marketing-rgb',
  blog_post: '--brain-document-rgb',
  campaign_overview_snapshot: '--brain-snapshot-rgb',
  social_reporting_snapshot: '--brain-snapshot-rgb',
  funnel_analytics_snapshot: '--brain-snapshot-rgb',
  email_analytics_snapshot: '--brain-snapshot-rgb',
  ads_performance_snapshot: '--brain-snapshot-rgb',
  finance_overview_snapshot: '--brain-snapshot-rgb',
  campaign_node: '--brain-domain-marketing-rgb',
  campaign_source: '--brain-source-upload-rgb',
}

export const KNOWLEDGE_SOURCE_TYPE_LABELS: Record<KnowledgeGraphSourceType, string> = {
  space: 'Space',
  space_view: 'View',
  space_doc: 'Document',
  space_task: 'Task',
  space_activity: 'Activity',
  space_deliverable: 'Deliverable',
  instagram_research_item: 'Instagram research',
  tiktok_research_item: 'TikTok research',
  youtube_research_item: 'YouTube research',
  twitter_research_item: 'X research',
  mission: 'Mission',
  mission_subtask: 'Mission subtask',
  mission_deliverable: 'Mission deliverable',
  conversation_document: 'Conversation doc',
  contact: 'Contact',
  channel: 'Channel',
  channel_message: 'Channel message',
  media_asset: 'Media asset',
  funnel: 'Funnel',
  funnel_page: 'Funnel page',
  form: 'Form',
  form_response: 'Form response',
  offer: 'Offer',
  email: 'Email',
  sequence: 'Sequence',
  sequence_email: 'Sequence email',
  presentation: 'Presentation',
  avatar: 'Avatar',
  social_post: 'Social post',
  ad_campaign: 'Ad campaign',
  ad_set: 'Ad set',
  ad: 'Ad',
  blog_post: 'Blog post',
  campaign_overview_snapshot: 'Campaign overview',
  social_reporting_snapshot: 'Social reporting',
  funnel_analytics_snapshot: 'Funnel analytics',
  email_analytics_snapshot: 'Email analytics',
  ads_performance_snapshot: 'Ads performance',
  finance_overview_snapshot: 'Finance overview',
  campaign_node: 'Campaign import',
  campaign_source: 'Source',
}

export function knowledgeSourceTypeColor(sourceType: string): string {
  return (
    KNOWLEDGE_SOURCE_TYPE_COLORS[sourceType as KnowledgeGraphSourceType] ??
    '--brain-conn-related-to-rgb'
  )
}

export function knowledgeSourceTypeLabel(sourceType: string): string {
  return (
    KNOWLEDGE_SOURCE_TYPE_LABELS[sourceType as KnowledgeGraphSourceType] ??
    sourceType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

export const RELATIONSHIP_COLORS: Record<string, string> = {
  supports: '--brain-conn-supports-rgb',
  elaborates: '--brain-conn-elaborates-rgb',
  related_to: '--brain-conn-related-to-rgb',
  caused_by: '--brain-conn-caused-by-rgb',
  evolved_from: '--brain-conn-evolved-from-rgb',
  contradicts: '--brain-conn-contradicts-rgb',
  emerged_from: '--brain-conn-doc-source-rgb',
}

export const COMPANY_OBJECT_TYPE_COLORS: Record<string, string> = {
  belief: '--brain-co-belief-rgb',
  perspective: '--brain-co-perspective-rgb',
  tension: '--brain-co-tension-rgb',
  standard: '--brain-co-standard-rgb',
  move: '--brain-co-move-rgb',
  anti_pattern: '--brain-co-anti_pattern-rgb',
  protocol: '--brain-co-protocol-rgb',
  decision: '--brain-co-decision-rgb',
  retrieval_rule: '--brain-co-retrieval_rule-rgb',
}

export const COMPANY_OBJECT_TYPE_LABELS: Record<string, string> = {
  belief: 'Operating Belief',
  perspective: 'Company Perspective',
  tension: 'Company Tension',
  standard: 'Quality Standard',
  move: 'Company Move',
  anti_pattern: 'Anti-Pattern',
  protocol: 'Collaboration Protocol',
  decision: 'Decision Memory',
  retrieval_rule: 'Retrieval Rule',
}

export const COMPANY_RELATION_COLORS: Record<string, string> = {
  supports: '--brain-co-conn-supports-rgb',
  contradicts: '--brain-co-conn-contradicts-rgb',
  contains: '--brain-co-conn-contains-rgb',
  enforces: '--brain-co-conn-enforces-rgb',
  derived_from: '--brain-co-conn-derived_from-rgb',
  refines: '--brain-co-conn-refines-rgb',
}

export const COMPANY_COGNITION_OBJECT_TYPES: readonly CompanyCortexObjectType[] = [
  'belief',
  'perspective',
  'tension',
]

export function isCompanyCognitionObjectType(
  objectType: string | undefined | null,
): objectType is CompanyCortexObjectType {
  return (
    objectType != null && (COMPANY_COGNITION_OBJECT_TYPES as readonly string[]).includes(objectType)
  )
}

export const EMOTION_COLORS: Record<string, string> = {
  joy: '#22c55e',
  hope: '#10B981',
  confidence: '#3B82F6',
  curiosity: '#06B6D4',
  gratitude: '#a855f7',
  determination: '#F59E0B',
  pride: '#EF4444',
  frustration: '#f97316',
  anxiety: '#eab308',
  fear: '#ef4444',
  anger: '#dc2626',
  grief: '#6b7280',
  shame: '#78716c',
  overwhelm: '#f59e0b',
  neutral: '#64748B',
}

export const BELIEF_STATUS_COLORS: Record<string, string> = {
  emerging: '#06B6D4',
  active: '#22c55e',
  challenged: '#F59E0B',
  transforming: '#a855f7',
  resolved: '#64748B',
}
