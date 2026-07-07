import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'

export type ContactEmailStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'dropped'
  | 'spam'
  | 'unsubscribed'
  | 'failed'

export interface ContactEmailEvent {
  id: string
  email_send_id: string
  event_type: string
  timestamp: string
  created_at: string
  event_data?: Record<string, unknown>
}

export interface ContactEmailTimelineItem {
  id: string
  lead_id: string | null
  from_email: string
  subject: string | null
  html_body: string | null
  status: ContactEmailStatus
  error_message: string | null
  sendgrid_message_id: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
  updated_at: string | null
  events: ContactEmailEvent[]
}

export interface ConversationPreviewMessage {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
}

export type ContactConversationChannel = 'widget' | 'telegram' | 'app'

export interface ContactConversationItem {
  id: string
  title: string | null
  agent_id: string | null
  status: string | null
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown> | null
  channel?: ContactConversationChannel
  agent_name?: string | null
  agent_image_url?: string | null
  preview_messages: ConversationPreviewMessage[]
}

export interface ConversationThreadMessage {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
}

export interface ContactEmailsResponse {
  emails: ContactEmailTimelineItem[]
  total: number
}

export interface ContactConversationsResponse {
  conversations: ContactConversationItem[]
  suggested_conversations: ContactConversationItem[]
  total: number
}

export async function fetchContactEmails(
  contactId: string,
  opts?: { limit?: number; offset?: number; summary?: boolean },
): Promise<ContactEmailsResponse> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  // summary list omits html_body (fetched per email on expand via fetchContactEmail)
  if (opts?.summary) params.set('bodies', 'summary')
  const qs = params.toString()
  return cachedFetch(`contact-emails:${contactId}:${qs}`, () =>
    backendGet<ContactEmailsResponse>(
      `/api/leads/contacts/${contactId}/emails${qs ? `?${qs}` : ''}`,
    ),
  )
}

/** Full single email (incl. html_body) — used when an email card is expanded. */
export async function fetchContactEmail(
  contactId: string,
  emailId: string,
): Promise<{ email: ContactEmailTimelineItem }> {
  return cachedFetch(`contact-email:${contactId}:${emailId}`, () =>
    backendGet<{ email: ContactEmailTimelineItem }>(
      `/api/leads/contacts/${contactId}/emails/${emailId}`,
    ),
  )
}

export async function fetchContactConversations(
  contactId: string,
  opts?: { limit?: number; offset?: number },
): Promise<ContactConversationsResponse> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  const qs = params.toString()
  return cachedFetch(`contact-conversations:v2:${contactId}:${qs}`, () =>
    backendGet<ContactConversationsResponse>(
      `/api/leads/contacts/${contactId}/conversations${qs ? `?${qs}` : ''}`,
    ),
  )
}

/** Full thread page (ascending; latest page without `before`). Older pages via `before` = oldest loaded created_at. */
export async function fetchConversationMessages(
  conversationId: string,
  opts?: { before?: string | null; limit?: number },
): Promise<ConversationThreadMessage[]> {
  const params = new URLSearchParams()
  if (opts?.before) params.set('before', opts.before)
  params.set('limit', String(opts?.limit ?? 50))
  const qs = params.toString()
  return backendGet<ConversationThreadMessage[]>(
    `/api/conversations/${conversationId}/messages?${qs}`,
  )
}

export async function sendContactEmail(
  contactId: string,
  payload: { subject: string; body: string; from_identity_id?: string | null },
): Promise<{ email: ContactEmailTimelineItem }> {
  return backendPost<{ email: ContactEmailTimelineItem }>(
    `/api/leads/contacts/${contactId}/send-email`,
    payload,
  )
}

export async function linkConversationToContact(
  contactId: string,
  conversationId: string,
): Promise<{ conversation: ContactConversationItem }> {
  return backendPatch<{ conversation: ContactConversationItem }>(
    `/api/leads/contacts/${contactId}/conversations/${conversationId}/link`,
    {},
  )
}
