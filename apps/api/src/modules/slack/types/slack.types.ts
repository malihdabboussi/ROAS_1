export interface SlackOAuthAccessResponse {
  ok: boolean
  error?: string
  app_id?: string
  authed_user?: {
    id?: string
    scope?: string
    access_token?: string
    token_type?: string
  }
  scope?: string
  token_type?: string
  access_token?: string
  bot_user_id?: string
  team?: {
    id?: string
    name?: string
  }
}

export interface SlackApiListConversationsResponse {
  ok: boolean
  error?: string
  response_metadata?: { next_cursor?: string }
  channels?: Array<{
    id: string
    name: string
    is_channel?: boolean
    is_private?: boolean
    is_im?: boolean
    is_member?: boolean
  }>
}

export interface SlackApiPostMessageResponse {
  ok: boolean
  error?: string
  channel?: string
  ts?: string
  message?: Record<string, unknown>
}

export interface SlackApiJoinConversationResponse {
  ok: boolean
  error?: string
  channel?: { id?: string; name?: string; is_member?: boolean }
}

export interface SlackGetUploadUrlExternalResponse {
  ok: boolean
  error?: string
  upload_url?: string
  file_id?: string
}

export interface SlackCompleteUploadExternalResponse {
  ok: boolean
  error?: string
  files?: Array<{ id?: string; title?: string; permalink?: string }>
}

export interface SlackEventEnvelope {
  token?: string
  team_id?: string
  api_app_id?: string
  type?: string
  event_id?: string
  event_time?: number
  challenge?: string
  event?: SlackEvent
}

export interface SlackEvent {
  type?: string
  user?: string
  text?: string
  channel?: string
  channel_type?: string
  ts?: string
  thread_ts?: string
  bot_id?: string
  subtype?: string
  file_id?: string
  files?: SlackFileAttachment[]
  /** reaction_added / reaction_removed */
  reaction?: string
  item?: {
    type?: string
    channel?: string
    ts?: string
  }
  item_user?: string
}

export interface SlackFileAttachment {
  id: string
  name?: string
  title?: string
  mimetype?: string
  filetype?: string
  size?: number
  url_private?: string
  url_private_download?: string
  permalink?: string
}

export interface SlackFileInfoResponse {
  ok: boolean
  error?: string
  file?: SlackFileAttachment
}

export type SlackBlock =
  | { type: 'header'; text: { type: 'plain_text'; text: string; emoji?: boolean } }
  | { type: 'section'; text: { type: 'mrkdwn'; text: string } }
  | { type: 'divider' }
  | { type: 'context'; elements: Array<{ type: 'mrkdwn'; text: string }> }
  | {
      type: 'image'
      image_url: string
      alt_text: string
      title?: { type: 'plain_text'; text: string }
    }

export interface AgentChannel {
  id: string
  user_id: string
  agent_key: string
  channel_type: string
  provider_config: Record<string, unknown>
  webhook_secret: string | null
  is_active: boolean
  org_id: string | null
  last_message_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface SlackWorkspaceChannel {
  id: string
  name: string
  is_member?: boolean
  is_private?: boolean
  is_im?: boolean
}

export interface SlackUserProfile {
  display_name?: string
  real_name?: string
  title?: string
  image_72?: string
  email?: string
}

export interface SlackWorkspaceUser {
  id: string
  name: string
  real_name?: string
  profile?: SlackUserProfile
  is_bot?: boolean
  tz?: string
  deleted?: boolean
  is_restricted?: boolean
  is_ultra_restricted?: boolean
}

export type SlackBrainTargetKind = 'user' | 'campaign' | 'agent' | 'customer'
export type SlackBrainCadence = 'daily' | 'weekly' | 'monthly'

export interface SlackBrainMapping {
  id: string
  user_id: string
  org_id: string | null
  slack_team_id: string
  slack_channel_id: string
  slack_channel_name: string
  target_kind: SlackBrainTargetKind
  target_brain_id: string | null
  target_campaign_id: string | null
  cadence: SlackBrainCadence
  last_synced_at: string | null
  last_message_ts: string | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface SlackResolvedSender {
  slackUserId: string
  displayName: string
  email: string | null
  contactId: string | null
  contactRole: string | null
  qualifiesForCustomerBrain: boolean
  vibeyUserId: string | null
  personBrainId: string | null
  relationshipKind: SlackRelationshipKind
}

export type SlackRelationshipKind = 'internal' | 'external' | 'ignored'
export type SlackRelationshipSource = 'inferred' | 'manual'
export type SlackIdentityMatchMethod = 'none' | 'email' | 'suggested_name' | 'confirmed_name'
export type SlackDeliveryMode = 'off' | 'shadow' | 'active'
export type SlackShadowActionKind = 'message' | 'workflow'
export type SlackShadowActionStatus =
  | 'proposed'
  | 'approved'
  | 'dismissed'
  | 'sending'
  | 'sent'
  | 'failed'

export interface SlackDiscoveredPerson {
  id: string
  platform_id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  title: string | null
  timezone: string | null
  email: string | null
  is_bot: boolean
  vibey_user_id: string | null
  suggested_vibey_user_id: string | null
  contact_id: string | null
  person_brain_id: string | null
  relationship_kind: SlackRelationshipKind
  relationship_source: SlackRelationshipSource
  identity_match_method: SlackIdentityMatchMethod
  identity_match_confidence: number
  delivery_mode: SlackDeliveryMode
  last_seen_at: string
  brain_id: string | null
  brain_name: string | null
  brain_kind: 'portal_user' | 'managed_person' | null
  slack_channels: string[]
}

export interface SlackPortalUser {
  user_id: string
  display_name: string
  email: string | null
  avatar_url: string | null
  role: string
}

export interface SlackPersonActivityMessage {
  ts: string
  text: string
  direction: 'inbound' | 'outbound'
  thread_ts: string | null
  is_thread_reply: boolean
  reply_count: number
}

export interface SlackShadowAction {
  id: string
  agent_key: string
  target_member_id: string | null
  action_kind: SlackShadowActionKind
  proposed_content: string
  rationale: string | null
  status: SlackShadowActionStatus
  source_channel_id: string | null
  source_message_ts: string | null
  workflow_key: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  sent_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SlackShadowActionDeliveryRecord extends SlackShadowAction {
  target: {
    platform_id: string
    delivery_mode: SlackDeliveryMode
    relationship_kind: SlackRelationshipKind
  } | null
}

export interface SlackHistoryMessage {
  user?: string
  text?: string
  ts?: string
  thread_ts?: string
  bot_id?: string
  reply_count?: number
  subtype?: string
}
