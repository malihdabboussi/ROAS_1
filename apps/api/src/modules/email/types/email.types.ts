import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'

// Domain Authentication
export type DomainStatus = 'pending' | 'verifying' | 'verified' | 'failed'

export interface DnsRecord {
  type: 'cname' | 'txt' | 'mx'
  host: string
  data: string
  valid: boolean
}

export interface SendGridDomainResponse {
  id: number
  user_id: number
  subdomain: string
  domain: string
  username: string
  ips: string[]
  custom_spf: boolean
  default: boolean
  legacy: boolean
  automatic_security: boolean
  valid: boolean
  dns: {
    mail_cname: DnsRecord
    dkim1: DnsRecord
    dkim2: DnsRecord
  }
}

export interface SendGridValidationResponse {
  id: number
  valid: boolean
  validation_results: {
    mail_cname: { valid: boolean; reason: string | null }
    dkim1: { valid: boolean; reason: string | null }
    dkim2: { valid: boolean; reason: string | null }
    spf?: { valid: boolean; reason: string | null }
  }
}

export interface EmailDomain {
  id: string
  user_id: string
  domain: string
  subdomain: string
  sendgrid_domain_id: string | number
  status: DomainStatus
  dns_records: DnsRecord[]
  is_default: boolean
  created_at: string
  updated_at: string
  verified_at: string | null
  inbound_parse_enabled: boolean
  inbound_parse_hostname: string | null
  mx_verified: boolean
  mx_verified_at: string | null
}

// Sender Identity
export interface EmailSenderIdentity {
  id: string
  user_id: string
  domain_id: string
  sendgrid_sender_id: number | null
  nickname: string
  from_email: string
  from_name: string
  reply_to_email: string
  reply_to_name: string | null
  address: string
  address_2: string | null
  city: string
  state: string | null
  zip: string | null
  country: string
  signature: string | null
  is_verified: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface SendGridSenderResponse {
  id: number
  nickname: string
  from: { email: string; name: string }
  reply_to: { email: string; name?: string }
  address: string
  address_2?: string
  city: string
  state?: string
  zip?: string
  country: string
  verified: { status: boolean; reason: string | null }
  locked: boolean
  created_at: number
  updated_at: number
}

// Email Sending
export interface EmailRecipient {
  email: string
  name?: string
}

export interface SendGridMailMessage {
  to: EmailRecipient | EmailRecipient[]
  from: EmailRecipient
  replyTo?: EmailRecipient
  subject: string
  text?: string
  html?: string
  templateId?: string
  dynamicTemplateData?: Record<string, unknown>
  categories?: string[]
  customArgs?: Record<string, string>
  headers?: Record<string, string>
  trackingSettings?: {
    clickTracking?: { enable: boolean; enableText?: boolean }
    openTracking?: { enable: boolean }
    subscriptionTracking?: { enable: boolean; text?: string; html?: string }
    ganalytics?: {
      enable: boolean
      utmSource?: string
      utmMedium?: string
      utmCampaign?: string
    }
  }
  mailSettings?: {
    sandboxMode?: { enable: boolean }
    footer?: { enable: boolean; text?: string; html?: string }
  }
  asm?: { groupId: number; groupsToDisplay?: number[] }
}

// Webhook Events
export type SendGridEventType =
  | 'processed'
  | 'dropped'
  | 'delivered'
  | 'deferred'
  | 'bounce'
  | 'open'
  | 'click'
  | 'spamreport'
  | 'spam_report'
  | 'unsubscribe'
  | 'group_unsubscribe'
  | 'group_resubscribe'

export interface SendGridWebhookEvent {
  email: string
  timestamp: number
  event: SendGridEventType
  sg_event_id: string
  sg_message_id: string
  'smtp-id'?: string
  category?: string | string[]
  url?: string
  useragent?: string
  ip?: string
  reason?: string
  status?: string
  response?: string
  type?: string
  bounce_classification?: string
  [key: string]: unknown
}

export type EmailSendStatus =
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

export interface EmailSend {
  id: string
  user_id: string
  domain_id: string
  lead_id: string | null
  from_email: string
  subject: string | null
  html_body: string | null
  status: EmailSendStatus
  sendgrid_message_id: string | null
  batch_id: string | null
  sequence_id: string | null
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
  updated_at: string | null
}

export interface EmailEvent {
  id: string
  email_send_id: string
  event_type: SendGridEventType
  event_data: Record<string, unknown>
  sg_event_id: string
  timestamp: string
  ip_address: string | null
  user_agent: string | null
  url: string | null
  created_at: string
}

export type SuppressionReason =
  | 'bounce'
  | 'spam_report'
  | 'unsubscribe'
  | 'manual'
  | 'preference_center'
  | 'global_unsubscribe'

export interface EmailSuppression {
  id: string
  user_id: string
  email: string
  reason: SuppressionReason
  bounce_type: string | null
  bounce_reason: string | null
  created_at: string
}

export interface EmailSettings {
  pause_on_reply: boolean
  stop_keywords_enabled: boolean
  stop_keywords: string[]
}

export interface InboundParsedEmail {
  from: string
  to: string
  cc?: string
  subject: string
  text?: string
  html?: string
  headers: string
  envelope: string
  attachments?: number
  'attachment-info'?: string
  SPF?: string
  dkim?: string
  spam_score?: string
  spam_report?: string
}
