import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { EmailDnsRecord, EmailDomain, EmailSenderIdentity } from '../types/email.types'

// --- Domain API ---

interface DomainsListResponse {
  success: boolean
  domains: EmailDomain[]
}

interface DomainAddResponse {
  success: boolean
  domain: EmailDomain
  dnsRecords: EmailDnsRecord[]
  message?: string
  error?: string
}

interface DomainVerifyResponse {
  success: boolean
  domain: EmailDomain
  allValid: boolean
  isValid: boolean
  records: EmailDnsRecord[]
  message?: string
}

interface DomainReplyTrackingResponse {
  success: boolean
  domain: EmailDomain
  mxRecord?: EmailDnsRecord
  message?: string
}

interface MxVerifyResponse {
  success: boolean
  valid: boolean
  mxRecords: string[]
  error?: string
  message?: string
}

export const emailDomainsApi = {
  list: () => backendGet<DomainsListResponse>('/api/email/domains'),

  add: (data: {
    domain: string
    subdomain?: string
    isDefault?: boolean
    customDkimSelector?: string
  }) => backendPost<DomainAddResponse>('/api/email/domains', data),

  verify: (domainId: string) =>
    backendPost<DomainVerifyResponse>(`/api/email/domains/${domainId}/verify`, {}),

  setDefault: (domainId: string) =>
    backendPost<{ success: boolean }>(`/api/email/domains/${domainId}/default`, {}),

  remove: (domainId: string) => backendDelete(`/api/email/domains/${domainId}`),

  enableReplyTracking: (domainId: string) =>
    backendPost<DomainReplyTrackingResponse>(
      `/api/email/domains/${domainId}/reply-tracking/enable`,
      {},
    ),

  disableReplyTracking: (domainId: string) =>
    backendPost<DomainReplyTrackingResponse>(
      `/api/email/domains/${domainId}/reply-tracking/disable`,
      {},
    ),

  verifyMx: (domainId: string) =>
    backendPost<MxVerifyResponse>(`/api/email/domains/${domainId}/reply-tracking/verify-mx`, {}),
}

// --- Sender Identity API ---

interface SenderIdentitiesListResponse {
  success: boolean
  senderIdentities: EmailSenderIdentity[]
}

interface SenderIdentityResponse {
  success: boolean
  senderIdentity: EmailSenderIdentity
  error?: string
}

export const senderIdentitiesApi = {
  list: () => backendGet<SenderIdentitiesListResponse>('/api/email/sender-identities'),

  create: (data: {
    domainId: string
    nickname: string
    fromEmail: string
    fromName: string
    replyToEmail?: string
    replyToName?: string
    address: string
    address2?: string
    city: string
    state?: string
    zip?: string
    country: string
  }) => backendPost<SenderIdentityResponse>('/api/email/sender-identities', data),

  update: (identityId: string, data: Record<string, unknown>) =>
    backendPatch<SenderIdentityResponse>(`/api/email/sender-identities/${identityId}`, data),

  remove: (identityId: string) => backendDelete(`/api/email/sender-identities/${identityId}`),

  setDefault: (identityId: string) =>
    backendPost<{ success: boolean }>(`/api/email/sender-identities/${identityId}/default`, {}),

  syncStatus: (identityId: string) =>
    backendPost<SenderIdentityResponse>(
      `/api/email/sender-identities/${identityId}/sync-status`,
      {},
    ),

  syncFromSendGrid: () =>
    backendPost<{ success: boolean; synced: number }>('/api/email/sender-identities/sync', {}),
}

// --- Email Logs API ---

export interface EmailLogRow {
  id: string
  email_type: 'single' | 'sequence' | 'broadcast'
  recipient_email: string | null
  recipient_name: string | null
  from_email: string | null
  subject: string | null
  status: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
  is_archived: boolean
  html_body?: string | null
  sequence_name?: string | null
  broadcast_name?: string | null
}

interface EmailLogsResponse {
  success: boolean
  logs: EmailLogRow[]
  total: number
}

export const emailLogsApi = {
  getLogs: (params: {
    status?: string
    type?: string
    startDate?: string
    endDate?: string
    includeArchived?: boolean
    limit: number
    offset: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set('status', params.status)
    if (params.type) searchParams.set('type', params.type)
    if (params.startDate) searchParams.set('startDate', params.startDate)
    if (params.endDate) searchParams.set('endDate', params.endDate)
    if (params.includeArchived) searchParams.set('includeArchived', 'true')
    searchParams.set('limit', params.limit.toString())
    searchParams.set('offset', params.offset.toString())
    return backendGet<EmailLogsResponse>(`/api/email/logs?${searchParams.toString()}`)
  },

  archiveLog: (logId: string, archive: boolean) =>
    backendPatch<{ success: boolean }>(`/api/email/logs/${logId}/archive`, {
      archive,
    }),
}
