/**
 * Ported from apps/web/src/features/brain/types/brain.types.ts — keep in sync for 1:1 Brain UI.
 */

export interface BrainMemory {
  id: string
  content: string
  memory_type: string
  source_type: string
  source_id?: string
  source_title?: string
  speaker?: string
  agent_id?: string
  significance: number
  confidence: number
  tags: string[]
  recalled_count: number
  created_at: string
  updated_at: string
  node_type?: 'memory' | 'experience' | 'snapshot' | 'sk_entry' | 'sk_source'
  source_emotion?: string
  emotional_valence?: number
  emotional_intensity?: number
  speaker_intent?: string
  snapshot_type?: string
  name?: string
  core?: string
  one_liner?: string
  story?: string
  moment?: string
  emotion?: { feeling?: string; intensity?: number } | string
  source?: string
  trigger_pattern?: string
  method?: string
  steps?: string[] | string
  filter?: string
  challenge?: string
  break_test?: string
  risks?: string
  proof?: string
  significance_score?: number
  memory_count?: number
  summary?: string
  status?: string
  entry_type?: string
  domain?: string
  mastery?: number
  media_type?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  media_url?: string | null
  media_mime_type?: string | null
}

export interface BrainConnection {
  id: string
  source_memory_id: string
  target_memory_id: string
  relationship_type: string
  strength: number
}

export const ENTRY_TYPE_COLORS: Record<string, string> = {
  concept: '--brain-fact-rgb',
  framework: '--brain-framework-rgb',
  protocol: '--brain-conn-supports-rgb',
  principle: '--brain-principle-rgb',
  technique: '--brain-insight-rgb',
  quote: '--brain-story-rgb',
  case_study: '--brain-event-rgb',
  definition: '--brain-decision-rgb',
}

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  concept: 'Concept',
  framework: 'Framework',
  protocol: 'Protocol',
  principle: 'Principle',
  technique: 'Technique',
  quote: 'Quote',
  case_study: 'Case Study',
  definition: 'Definition',
}

export const MEMORY_TYPE_COLORS: Record<string, string> = {
  fact: '--brain-fact-rgb',
  decision: '--brain-decision-rgb',
  insight: '--brain-insight-rgb',
  story: '--brain-story-rgb',
  framework: '--brain-framework-rgb',
  preference: '--brain-preference-rgb',
  event: '--brain-event-rgb',
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
  snapshot: 'Snapshot',
}

export const SNAPSHOT_TYPE_COLORS: Record<string, string> = {
  Belief: '--brain-belief-rgb',
  Model: '--brain-model-rgb',
  Rule: '--brain-rule-rgb',
  Conviction: '--brain-conviction-rgb',
  Principle: '--brain-principle-rgb',
}

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

export const RELATIONSHIP_COLORS: Record<string, string> = {
  supports: '--brain-conn-supports-rgb',
  elaborates: '--brain-conn-elaborates-rgb',
  related_to: '--brain-conn-related-to-rgb',
  caused_by: '--brain-conn-caused-by-rgb',
  evolved_from: '--brain-conn-evolved-from-rgb',
  contradicts: '--brain-conn-contradicts-rgb',
  emerged_from: '--brain-conn-doc-source-rgb',
}
