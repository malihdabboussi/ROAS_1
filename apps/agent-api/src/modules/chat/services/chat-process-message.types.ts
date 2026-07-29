import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatScopeKind, DocumentIntelligenceMetadata } from '@vibey/api-shared'
import type { ChatModelSettings } from './chat-model-input.service'
import type { ChatTurnTimingSpan } from './chat-turn-session.service'
import type { SendFn } from './openclaw-proxy.service'

export interface DocumentAttachment {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  dataUrl?: string
  fileUrl?: string
  mimeType?: string
  mediaAssetId?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

export interface HighlightedArtifact {
  id: string
  type: string
  label: string
}

export interface MessageReference {
  kind: 'artifact' | 'media' | 'mission' | 'conversation' | 'person'
  id: string
  label: string
  type?: string
  campaign_id?: string
  brain_id?: string
}

export interface UiSelectedArtifact {
  id: string
  type: string
  label?: string
  campaign_id?: string | null
  parent?: {
    type: string
    id: string
  } | null
}

export interface ChannelUser {
  platform_id: string
  username?: string
  display_name: string
  language?: string
  relationship_kind?: 'internal'
  is_connection_owner?: boolean
  personal_brain_access?: boolean
  organization_wide_data_access?: boolean
}

export interface ProcessMessageOptions {
  supabase: SupabaseClient
  conversationId: string
  content: string
  agentKey?: string
  runId?: string
  messageId?: string
  requestId?: string | null
  model?: string
  modelSettings?: ChatModelSettings
  userId: string
  accessToken: string
  refreshToken?: string
  campaignId?: string | null
  spaceId?: string | null
  scopeKind?: ChatScopeKind
  orgId?: string
  orgMemberId?: string | null
  organizationWideDataAccess?: boolean
  source?: string
  channelUser?: ChannelUser
  previousResponseId?: string
  documents?: DocumentAttachment[]
  highlightedArtifacts?: HighlightedArtifact[]
  messageReferences?: MessageReference[]
  uiSelectedArtifact?: UiSelectedArtifact
  hidden?: boolean
  systemContext?: string
  signal?: AbortSignal
  timingSpans?: ChatTurnTimingSpan[]
  send: SendFn
}

export type ChatProcessTerminalStatus = 'done' | 'failed' | 'failed_recoverable' | 'cancelled'

export interface ChatProcessResult {
  status: ChatProcessTerminalStatus
  message?: string
}
