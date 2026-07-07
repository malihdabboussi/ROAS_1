/**
 * Domain Types
 * Ported from legacy: apps/app-backend/src/modules/domains/types/domains.types.ts
 */

// Status flow: pending → dns_verifying → dns_verified → ssl_pending → verified → error
export type DomainStatus =
  | 'pending'
  | 'dns_verifying'
  | 'dns_verified'
  | 'ssl_pending'
  | 'verified'
  | 'ssl_failed'
  | 'error'

export interface CustomDomain {
  id: string
  domain_name: string
  domain: string
  landing_page_id: string | null
  funnel_id: string | null
  user_id: string
  domain_type?: 'generated' | 'custom'
  environment?: 'production' | 'staging'

  vercel_project_id: string
  vercel_domain_response?: VercelDomainResponse

  status: DomainStatus
  verification_records?: DnsRecord[]
  last_verification_check?: string
  error_message?: string

  created_at: string
  updated_at: string
}

export interface VercelDomainResponse {
  name: string
  apexName: string
  projectId: string
  redirect?: string
  redirectStatusCode?: number
  gitBranch?: string
  updatedAt: number
  createdAt: number
  verification?: DomainVerification[]
  configured?: boolean
  configuredBy?: string
  configuredChangedAt?: number
  nameservers?: string[]
  serviceType: string
  cnames?: string[]
  aValues?: string[]
  error?: VercelDomainError
}

export interface DomainVerification {
  type: string
  domain: string
  value: string
  reason: string
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT'
  name: string
  value: string
  ttl?: number
}

export interface VercelDomainError {
  code: string
  message: string
}

export interface DomainCache {
  domain_name: string
  landing_page_slug: string
  user_id: string
  cached_at: string
}

// Response types
export interface AddDomainResponse {
  success: boolean
  domain?: CustomDomain
  error?: string
  verification_records?: DnsRecord[]
}

export interface VerifyDomainResponse {
  success: boolean
  status: DomainStatus
  error?: string
  verification_records?: DnsRecord[]
}

export interface RemoveDomainResponse {
  success: boolean
  error?: string
}

export interface ListDomainsResponse {
  success: boolean
  domains: CustomDomain[]
  error?: string
}

export interface ConnectDomainResponse {
  success: boolean
  domain?: CustomDomain
  connected: boolean
  error?: string
}

export interface ConnectFunnelResponse {
  success: boolean
  domain?: CustomDomain
  connected: boolean
  funnel?: { id: string; title: string } | null
  published_url?: string | null
  error?: string
}

export interface DisconnectFunnelResponse {
  success: boolean
  disconnected: boolean
  funnel?: { id: string; title: string } | null
  published_url?: string | null
  error?: string
}

export interface ConnectPresentationResponse {
  success: boolean
  domain?: CustomDomain
  connected: boolean
  presentation?: { id: string; name: string } | null
  published_url?: string | null
  error?: string
}

export interface DisconnectPresentationResponse {
  success: boolean
  disconnected: boolean
  presentation?: { id: string; name: string } | null
  published_url?: string | null
  error?: string
}

export interface ConnectProjectResponse {
  success: boolean
  domain?: CustomDomain
  connected: boolean
  project?: { id: string; name: string } | null
  published_url?: string | null
  error?: string
}

export interface DisconnectProjectResponse {
  success: boolean
  disconnected: boolean
  project?: { id: string; name: string } | null
  published_url?: string | null
  error?: string
}

export interface GenerateSubdomainResponse {
  success: boolean
  domain?: CustomDomain
  error?: string
  existing_domain?: string
}

export interface DomainConfigResponse {
  success: boolean
  data?: VercelDomainResponse
  verification_records?: DnsRecord[]
  error?: string
}

export const PAGE_TYPE_URL_PREFIXES: Record<string, string> = {
  opt_in: '/optin',
  sales: '/sales',
  checkout: '/checkout',
  thank_you: '/thank-you',
  upsell: '/upsell',
  downsell: '/downsell',
  webinar: '/webinar',
  landing: '',
  custom: '',
}
