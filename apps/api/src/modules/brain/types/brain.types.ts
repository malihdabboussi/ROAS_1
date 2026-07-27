import type { BrainTemporalPayload } from '@vibey/api-shared'

// ── Memory types ──────────────────────────────────────────────────────────────

export type MemoryType =
  | 'fact'
  | 'decision'
  | 'insight'
  | 'story'
  | 'framework'
  | 'preference'
  | 'event'
export type SnapshotType = 'Model' | 'Rule' | 'Conviction' | 'Principle'
export type ConnectionType =
  | 'supports'
  | 'contradicts'
  | 'elaborates'
  | 'caused_by'
  | 'evolved_from'
  | 'related_to'
export type SourceType =
  | 'manual'
  | 'conversation'
  | 'fathom'
  | 'fireflies'
  | 'api'
  | 'openclaw'
  | 'crystallize'

export interface Memory {
  id: string
  content: string
  content_hash: string
  memory_type: MemoryType
  source_type: string
  source_id: string | null
  source_title: string | null
  project_id: string | null
  agent_id: string | null
  speaker: string | null
  confidence: number
  significance: number
  embedding: number[] | null
  tags: string[]
  metadata: Record<string, unknown>
  media_type: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  media_url: string | null
  media_mime_type: string | null
  recalled_count: number
  last_recalled_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface MemoryConnection {
  id: string
  source_memory_id: string
  target_memory_id: string
  relationship: ConnectionType
  strength: number
  created_by: string
  created_at: string
}

export interface NeuralSnapshot {
  id: string
  name: string
  type: SnapshotType
  core: string
  one_liner: string | null
  story: string | null
  moment: string | null
  emotion: { intensity: number; feeling: string } | null
  source: string | null
  trigger_pattern: string | null
  method: string | null
  steps: string | null
  filter: string | null
  challenge: string | null
  break_test: string | null
  risks: string | null
  proof: string | null
  confidence: number
  significance_score: number | null
  tags: string[]
  source_type: string | null
  source_id: string | null
  embedding: number[] | null
  created_at: string
  updated_at: string
}

export interface MemoryVersion {
  id: string
  memory_id: string
  content_previous: string
  edited_by: string | null
  created_at: string
}

export interface MemorySession {
  id: string
  session_key: string
  last_message_id: string | null
  last_processed_at: string | null
  memories_created: number
  skipped_reason: string | null
  created_at: string
}

// ── Graph types (for the visualization endpoint) ─────────────────────────────

export interface GraphNode {
  id: string
  content: string
  memory_type: string
  source_type: string
  source_title: string | null
  speaker: string | null
  significance: number
  confidence: number
  tags: string[]
  project_id: string | null
  agent_id: string | null
  recalled_count: number
  created_at: string
  age_category: 'new' | 'recent' | 'older'
  status: 'new' | 'active' | 'expiring'
  node_type: 'memory' | 'document' | 'snapshot'
}

export interface GraphEdge {
  id: string
  source_memory_id: string
  target_memory_id: string
  relationship_type: string
  strength: number
}

export interface BrainStats {
  total: number
  connections: number
  this_week: number
  by_type: Record<string, number>
  by_source: Record<string, number>
  most_recalled: Array<{ id: string; content: string; memory_type: string; recalled_count: number }>
  most_connected: Array<{ id: string; content: string; connection_count: number }>
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateMemoryDto {
  content: string
  memory_type: MemoryType
  source_type?: string
  source_id?: string
  source_title?: string
  project_id?: string
  agent_id?: string
  speaker?: string
  confidence?: number
  significance?: number
  tags?: string[]
  metadata?: Record<string, unknown>
  media_type?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  media_url?: string
  media_mime_type?: string
  media_base64?: string
  media_caption?: string
}

export interface UpdateMemoryDto {
  content?: string
  memory_type?: MemoryType
  tags?: string[]
  significance?: number
  metadata?: Record<string, unknown>
  edited_by?: string
}

export interface SearchMemoryDto {
  query: string
  limit?: number
  threshold?: number
  memory_type?: MemoryType
  source_type?: string
  project_id?: string
  tags?: string[]
  min_significance?: number
  org_id?: string | null
}

export interface CreateSnapshotDto {
  name: string
  type: SnapshotType
  core: string
  one_liner?: string
  story?: string
  moment?: string
  emotion?: { intensity: number; feeling: string }
  source?: string
  trigger_pattern?: string
  method?: string
  steps?: string
  filter?: string
  challenge?: string
  break_test?: string
  risks?: string
  proof?: string
  confidence?: number
  significance_score?: number
  tags?: string[]
  source_type?: string
  source_id?: string
}

export interface CreateConnectionDto {
  target_id: string
  relationship: ConnectionType
  strength?: number
}

export interface ProcessConversationDto {
  owner_id?: string
  org_id?: string | null
  session_key?: string
  source_type?: string
  source_id?: string
  source_title?: string
  agent_id?: string
  /** When set, memories are saved into this campaign's brain (client/campaign knowledge). */
  campaign_id?: string
  /** Explicit brain override; preferred over campaign_id when both are present. */
  brain_id?: string
  messages: Array<{ role?: string; speaker?: string; content?: string; text?: string }>
  agent_name?: string
}

export interface CrystallizeDto {
  input: string
  source_type?: string
  source_id?: string
  temporal?: BrainTemporalPayload | null
}

// ── Meeting ingestion (Fathom / Fireflies → Brain) ──────────────────────────

export interface MeetingTranscriptEntry {
  speaker: string
  text: string
  timestamp?: string
}

export interface MeetingTranscript {
  userId: string
  provider: 'fathom' | 'fireflies'
  meetingId: string
  title: string
  transcript: MeetingTranscriptEntry[]
  summary?: string
  actionItems?: string[]
  date?: string
}

export type BrainScopeType = 'user' | 'agent' | 'campaign' | 'customer' | 'company'
export type BrainNodeTransferType = 'memory' | 'snapshot' | 'sk_entry' | 'sk_source' | 'experience'
export type BrainNodeTransferOperation = 'copy' | 'move'

export interface BrainNodeTransferScope {
  type: BrainScopeType
  agent_id?: string
  campaign_id?: string
}

export interface BrainNodeTransferDto {
  operation: BrainNodeTransferOperation
  node_type: BrainNodeTransferType
  node_id: string
  source_scope: BrainNodeTransferScope
  target_scope: BrainNodeTransferScope
  connected_node_ids?: string[]
  source_type?: string
  source_id?: string | null
  source_title?: string | null
}

/** Batch copy/move all memories (and optional snapshots) sharing source_title in the source scope. */
export interface BrainNodeTransferBySourceDto {
  operation: BrainNodeTransferOperation
  source_title: string
  source_type?: string
  source_id?: string | null
  source_scope: BrainNodeTransferScope
  target_scope: BrainNodeTransferScope
}

/** Reassign memories on the user's default brain to a source group. */
export interface AssignMemorySourceDto {
  memory_ids?: string[]
  /** When set, updates rows whose source_title equals this value. */
  match_source_title?: string
  /** When true, updates rows with null or empty source_title. */
  match_orphan_source_title?: boolean
  new_source_title: string
  new_source_id?: string | null
}
