/**
 * Studio feature types — Chat, Conversations, Messages
 */

import type { PresentationEditMode } from '@/lib/artifacts/artifact-types'
import type {
  PresentationComment,
  PresentationElementTrace,
} from '@/lib/artifacts/comment-artifact-types'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import type { UiSelectedArtifact } from '@/lib/chat/ui-selected-artifact'

export type { Campaign } from '@/lib/campaigns/campaign-api'
export type {
  Ad,
  AdCampaign,
  AdFormat,
  AdPlacementImage,
  AdSet,
  Avatar,
  CarouselCard,
  ConversationDocument,
  EmailArtifact,
  Offer,
  Presentation,
  PresentationAsset,
  PresentationBundle,
  PresentationEditMode,
  PresentationFile,
  Sequence,
  SequenceEmail,
  SocialPost,
} from '@/lib/artifacts/artifact-types'
export type {
  FunnelComment,
  FunnelElementTrace,
  PresentationComment,
  PresentationElementTrace,
} from '@/lib/artifacts/comment-artifact-types'
export type {
  A2ATurn,
  IntegrationDoctor,
  IntegrationRepairAction,
  MessageContentBlock,
} from '@/lib/chat/message-content-blocks'
export type {
  DocumentAttachment,
  DocumentExtractionStrategy,
  DocumentIntelligenceMetadata,
  DocumentIntelligenceStatus,
  DocumentTextQuality,
} from '@/lib/chat/document-attachments'
export type { UiSelectedArtifact } from '@/lib/chat/ui-selected-artifact'

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string | null
  content_blocks: ContentBlock[] | null
  metadata: Record<string, unknown>
  model_id?: string | null
  created_at: string
}

export interface ChatTimelineEvent {
  id: string
  seq: number
  type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface ChatStatusResponse {
  active: boolean
  messageId: string | null
  runId?: string | null
  resumeCursor?: string | null
  lastEventAt?: string | null
  failureCode?: 'stream_interrupted' | 'context_window_exceeded'
  message?: Message | null
  timelineEvents?: ChatTimelineEvent[]
}

export interface ChatStreamRunState {
  runId: string
  messageId: string
  cursor: string | null
  updatedAt: number
}

export interface ContentBlock {
  id: string
  type: 'text' | 'reasoning' | 'tool_call' | 'tool_result' | 'status'
  content: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Conversation Types
// ============================================================================

export type ConversationStatus = 'active' | 'archived' | 'deleted'
export type ConversationShareLevel = 'view' | 'edit' | 'admin'
export type ConversationShareEntityType = 'user' | 'org'

export interface ConversationCreator {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export interface Conversation {
  id: string
  user_id: string
  campaign_id: string | null
  title: string | null
  agent_id: string | null
  status: ConversationStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  /** Latest message timestamp; drives history age/sort. Not bumped by open/title/pin/scope. */
  last_message_at?: string | null
  default_model_id?: string | null
  forked_from?: { conversation_id: string; message_id: string; forked_at: string } | null
  creator?: ConversationCreator | null
  effective_level?: ConversationShareLevel | null
  /** Client-only: last message preview */
  last_message?: string | null
  /** Client-only: unread count */
  message_count?: number
  /** Per-user activity state returned by the conversations feed. */
  is_unread?: boolean
  /** Whether the latest chat UI contains an unresolved user action. */
  needs_action?: boolean
}

export interface ConversationShareRecord {
  id: string
  conversation_id: string
  org_id: string | null
  entity_type: ConversationShareEntityType
  entity_id: string
  level: ConversationShareLevel
  created_by: string
  created_at: string
}

// ============================================================================
// SSE Event Types — matches backend stream-events.ts
// ============================================================================

export type SSEEventType =
  | 'message_start'
  | 'status'
  | 'tool_start'
  | 'tool_update'
  | 'tool_end'
  | 'ui_block'
  | 'generation_start'
  | 'generation_end'
  | 'content_delta'
  | 'content_snapshot'
  | 'timeline_snapshot'
  | 'a2a_message'
  | 'error'
  | 'done'

/** Tool step persisted in message metadata for reload */
export interface PersistedStep {
  name: string
  label: string
  status: 'completed' | 'failed'
}

// ============================================================================
// API Types
// ============================================================================

export interface HighlightedArtifact {
  id: string
  type: string
  label: string
}

export type MessageReferenceKind =
  | 'artifact'
  | 'media'
  | 'mission'
  | 'conversation'
  | 'person'
  | 'campaign'

export interface MessageReference {
  kind: MessageReferenceKind
  id: string
  label: string
  /** Artifact sub-type (offer, funnel, etc.) or media mime_type or mission status */
  type?: string
  /** Source campaign — present when cross-referencing another campaign (Phase 2) */
  campaign_id?: string
  /** Person Brain connected to a portal or managed Slack identity. */
  brain_id?: string
}

export type ChatScopeKind =
  | 'personal'
  | 'campaign'
  | 'shared_space'
  | 'channel'
  | 'mission'
  | 'unknown'

export interface SendMessageParams {
  conversation_id?: string
  campaign_id?: string | null
  space_id?: string | null
  scope_kind?: ChatScopeKind
  content: string
  /** Supports concrete model IDs and strategy values: auto, auto:economy, auto:power */
  model?: string
  source?: string
  model_settings?: {
    reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
    context_window_tokens?: number
    speed_mode?: 'standard' | 'fast'
    cortex_max?: boolean
  }
  documents?: DocumentAttachment[]
  highlighted_artifacts?: HighlightedArtifact[]
  message_references?: MessageReference[]
  ui_selected_artifact?: UiSelectedArtifact
  suppressUserMessage?: boolean
  /** Invisible context delivered to the agent in a separate `[CONTEXT]` block. Never persisted into the user message. */
  system_context?: string
}

export interface CreateConversationParams {
  title?: string
  campaign_id?: string
  agent_id?: string
  /** Team chat: empty thread auto-expires after idle TTL if still no messages */
  draft?: boolean
}

// ============================================================================
// Artifact Types
// ============================================================================

export interface OfferStepMeta {
  number: number
  name: string
  description: string
}

export const OFFER_STEPS: OfferStepMeta[] = [
  {
    number: 1,
    name: 'Product & Market Analysis',
    description: 'What we sell and to whom',
  },
  { number: 2, name: 'Power Offer', description: 'The irresistible offer statement' },
  { number: 3, name: 'Buyer Persona', description: 'Deep psychological buyer profile' },
  { number: 4, name: 'ICP Analysis', description: 'Ideal customer profile' },
  { number: 5, name: 'Competitive Edge', description: 'What makes this unique' },
  { number: 6, name: 'Unique Mechanisms', description: 'The proprietary method' },
]

export type FunnelEditMode = 'preview' | 'markup' | 'edit' | 'tweaks' | 'comments'

export interface FunnelMarkupStroke {
  id: string
  funnel_id: string
  funnel_page_id: string | null
  points: PresentationMarkupStrokePoint[]
  color: string
}

export interface PresentationMarkupStrokePoint {
  x: number
  y: number
}

export interface PresentationMarkupStroke {
  id: string
  presentation_id: string
  slide_index: number | null
  points: PresentationMarkupStrokePoint[]
  color: string
}

export interface PresentationSlideThumbnail {
  index: number
  label: string
  title?: string | null
}

export interface PresentationEditRequest {
  presentation_id: string
  mode: PresentationEditMode
  prompt: string
  comments?: PresentationComment[]
  element_trace?: PresentationElementTrace | null
  drawing_data_url?: string | null
}
