/**
 * Brain feature types: Memory graph, connections, health
 */

// ============================================================================
// Memory Types
// ============================================================================

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
  node_type?:
    | 'memory'
    | 'experience'
    | 'snapshot'
    | 'sk_entry'
    | 'sk_source'
    | 'belief'
    | 'perspective'
    | 'company_object'
    | 'company_signal'
    | 'knowledge_item'
    | 'knowledge_source'
  object_type?: string
  knowledge_scope?: 'space' | 'campaign'
  knowledge_source_type?: KnowledgeGraphSourceType
  retrieve_via?: KnowledgeRetrieveVia | null
  metadata?: Record<string, unknown> | null
  source_updated_at?: string | null
  indexed_at?: string | null
  content_hash?: string | null
  chunk_count?: number | null
  space_id?: string | null
  campaign_id?: string | null
  parent_type?: string | null
  parent_id?: string | null
  signal_type?: string
  retrieval_rule?: Record<string, unknown>
  source_signal_ids?: string[]
  episode_id?: string | null
  occurred_at?: string | null
  occurred_until?: string | null
  asserted_at?: string | null
  valid_from?: string | null
  valid_until?: string | null
  effective_from?: string | null
  effective_until?: string | null
  evidence_started_at?: string | null
  evidence_ended_at?: string | null
  temporal_status?: string | null
  temporal_confidence?: number | null
  temporal_source?: string | null
  // Emotional metadata (Dispenza Layer 2)
  source_emotion?: string
  emotional_valence?: number // -1.0 to 1.0
  emotional_intensity?: number // 0.0 to 1.0
  speaker_intent?: string
  // Snapshot-specific fields
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
  // Document-specific fields
  memory_count?: number
  summary?: string
  status?: string
  // SK (Specific Knowledge) fields
  entry_type?: string
  domain?: string
  mastery?: number
  media_type?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
  media_url?: string | null
  media_mime_type?: string | null
  // Belief / Perspective pattern fields (Dispenza Layers 4-5)
  pattern_name?: string
  description?: string | null
  belief_status?: 'emerging' | 'active' | 'challenged' | 'transforming' | 'resolved'
  perspective_status?: 'emerging' | 'active' | 'shifting' | 'transformed'
  blind_spots?: string
  influence_areas?: string[]
  belief_ids?: string[]
  supporting_memories?: string[]
}

export type KnowledgeGraphSourceType =
  | 'space'
  | 'space_view'
  | 'space_doc'
  | 'space_task'
  | 'space_activity'
  | 'space_deliverable'
  | 'instagram_research_item'
  | 'tiktok_research_item'
  | 'youtube_research_item'
  | 'twitter_research_item'
  | 'mission'
  | 'mission_subtask'
  | 'mission_deliverable'
  | 'conversation_document'
  | 'contact'
  | 'channel'
  | 'channel_message'
  | 'media_asset'
  | 'funnel'
  | 'funnel_page'
  | 'form'
  | 'form_response'
  | 'offer'
  | 'email'
  | 'sequence'
  | 'sequence_email'
  | 'presentation'
  | 'avatar'
  | 'social_post'
  | 'ad_campaign'
  | 'ad_set'
  | 'ad'
  | 'blog_post'
  | 'campaign_overview_snapshot'
  | 'social_reporting_snapshot'
  | 'funnel_analytics_snapshot'
  | 'email_analytics_snapshot'
  | 'ads_performance_snapshot'
  | 'finance_overview_snapshot'
  | 'campaign_node'
  | 'campaign_source'

export interface KnowledgeRetrieveVia {
  action: string
  data: Record<string, unknown>
}

// ============================================================================
// Emotional Intelligence Types (Dispenza Layers 3-5)
// ============================================================================

export interface EmotionalResponse {
  id: string
  memory_id: string
  emotion: string
  valence?: number
  intensity?: number
  context?: string
  created_at: string
}

export interface BeliefPattern {
  id: string
  pattern_name: string
  description?: string
  emotional_signature?: {
    dominant_emotion?: string
    avg_valence?: number
    avg_intensity?: number
    /** Optional; stored in jsonb from Atlas alongside memories-style intent */
    speaker_intent?: string
    intent?: string
  }
  supporting_memories?: string[]
  strength: number
  status: 'emerging' | 'active' | 'challenged' | 'transforming' | 'resolved'
  detected_at: string
  created_at?: string
  updated_at?: string
}

export interface Perspective {
  id: string
  name: string
  description?: string
  beliefs?: string[]
  influence_areas?: string[]
  strength: number
  status: 'emerging' | 'active' | 'shifting' | 'transformed'
  blind_spots?: string
  narrative_md?: string
  detected_at?: string
  created_at?: string
  updated_at?: string
}

export interface EmotionalProfile {
  subject_id: string
  dominant_emotions: Array<{
    emotion: string
    count: number
    avgValence: number
    avgIntensity: number
  }>
  active_beliefs: BeliefPattern[]
  perspectives: Perspective[]
  recent_responses: EmotionalResponse[]
  most_charged_memories: BrainMemory[]
  summary: {
    total_responses: number
    active_beliefs: number
    active_perspectives: number
  }
}

// ============================================================================
// Narrative Page Types (Cortex Max)
// ============================================================================

export interface NarrativePage {
  id: string
  slug: string
  title: string
  page_type: 'topic' | 'entity' | 'synthesis' | 'capsule'
  summary: string | null
  content_md: string
  source_refs: Array<{ type: string; id: string }>
  tags: string[]
  status: string
  version: number
  updated_at: string
}

export type BrainTimelineItemType =
  | 'event'
  | 'decision'
  | 'shift'
  | 'milestone'
  | 'contradiction'
  | 'formation'
  | 'resolution'

export interface BrainTimelineItem {
  id: string
  timeline_id: string
  brain_id: string
  episode_id: string | null
  item_type: BrainTimelineItemType | string
  title: string
  description: string | null
  occurred_at: string | null
  occurred_until: string | null
  asserted_at: string | null
  valid_from: string | null
  valid_until: string | null
  temporal_status: string
  temporal_confidence: number | null
  temporal_source: string | null
  importance: number
  confidence: number
  source_type: string | null
  source_id: string | null
  source_title: string | null
  related_node_type: string | null
  related_node_id: string | null
  evidence_refs: Array<Record<string, unknown>>
  dedupe_key: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BrainTimeline {
  id: string
  brain_id: string
  timeline_type: string
  target_type: string
  target_id: string | null
  title: string
  summary: string | null
  status: string
  evidence_started_at: string | null
  evidence_ended_at: string | null
  valid_from: string | null
  valid_until: string | null
  temporal_status: string
  temporal_confidence: number | null
  temporal_source: string | null
  metadata: Record<string, unknown>
  created_by_agent_key: string | null
  created_at: string
  updated_at: string
  items?: BrainTimelineItem[]
}

export type CompanyCortexObjectType =
  | 'belief'
  | 'perspective'
  | 'tension'
  | 'standard'
  | 'move'
  | 'anti_pattern'
  | 'protocol'
  | 'decision'
  | 'retrieval_rule'

export interface CompanyCortexObject {
  id: string
  org_id: string
  brain_id: string
  object_type: CompanyCortexObjectType
  title: string
  truth: string
  status: 'emerging' | 'active' | 'challenged' | 'transforming' | 'retired'
  confidence: number
  confidence_basis: Record<string, unknown>
  source_signal_ids: string[]
  evidence_refs: Array<Record<string, unknown>>
  retrieval_rule: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CompanyCortexSignal {
  id: string
  org_id: string
  brain_id: string
  signal_type: string
  truth: string
  scope: Record<string, unknown>
  evidence_refs: Array<Record<string, unknown>>
  confidence: number
  confidence_basis: Record<string, unknown>
  reason: string | null
  context_form: string | null
  status: string
  source: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_decision: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Connection Types
// ============================================================================

export interface BrainConnection {
  id: string
  source_memory_id: string
  target_memory_id: string
  relationship_type: string
  strength: number
}

// ============================================================================
// Graph Data
// ============================================================================

export interface BrainGraphData {
  nodes: BrainMemory[]
  connections: BrainConnection[]
  stats: {
    total_memories: number
    total_experiences?: number
    total_snapshots?: number
    total_connections?: number
    by_type: Record<string, number>
    by_snapshot_type?: Record<string, number>
    hub_nodes: Array<{ id: string; content: string; connection_count: number }>
    /**
     * Backend signal: true when the node window was capped by the request
     * `limit`. When false the load already contains every node, so the store
     * skips its full-graph (limit=10000) follow-up fetch. Undefined (older
     * backend) is treated as possibly-truncated.
     */
    nodes_truncated?: boolean
    /**
     * Backend signal: true when the requested window was clamped to the
     * server maximum. A capped window is the complete loadable graph — the
     * store must not keep re-requesting a larger one.
     */
    node_window_capped?: boolean
  }
}

// ============================================================================
// Health Data
// ============================================================================

export interface BrainHealthData {
  status: string
  total_memories: number
  total_connections: number
  last_capture: string | null
  last_recall: string | null
  embedding_queue: number
  /** Full-brain aggregates for legend (not capped by graph load limits). */
  connections_by_type?: Record<string, number>
  memory_counts_by_type?: Record<string, number>
  sk_entries_by_type?: Record<string, number>
  experience_sources?: number
}

export interface PendingCapture {
  id: string
  brain_id: string
  snapshots: Array<Record<string, unknown>>
  agent_id?: string | null
  context?: string | null
  source_type?: string | null
  status: string
  auto_accept_at?: string | null
  created_at: string
}
