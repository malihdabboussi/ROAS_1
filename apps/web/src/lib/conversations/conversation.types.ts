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
  default_model_id?: string | null
  forked_from?: { conversation_id: string; message_id: string; forked_at: string } | null
  creator?: ConversationCreator | null
  effective_level?: ConversationShareLevel | null
  last_message?: string | null
  message_count?: number
  is_unread?: boolean
  needs_action?: boolean
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ConversationMessageContentBlock {
  id: string
  type: string
  content: string
  metadata?: Record<string, unknown>
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string | null
  content_blocks: ConversationMessageContentBlock[] | null
  metadata: Record<string, unknown>
  model_id?: string | null
  created_at: string
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
