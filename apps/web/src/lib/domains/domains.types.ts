export type DomainStatus =
  | 'pending'
  | 'dns_verifying'
  | 'dns_verified'
  | 'ssl_pending'
  | 'verified'
  | 'ssl_failed'
  | 'error'

export type DnsRecord = {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT'
  name: string
  value: string
  ttl?: number
}

export type CustomDomain = {
  id: string
  domain_name: string
  domain: string
  user_id: string

  domain_type?: 'generated' | 'custom'
  environment?: 'production' | 'staging'

  landing_page_id: string | null
  funnel_id: string | null

  status: DomainStatus
  verification_records?: DnsRecord[] | null
  last_verification_check?: string | null
  error_message?: string | null

  created_at: string
  updated_at: string
}

export type ListDomainsResponse = {
  success: boolean
  domains: CustomDomain[]
  error?: string
}

export type AddDomainResponse = {
  success: boolean
  domain?: CustomDomain
  verification_records?: DnsRecord[]
  error?: string
}

export type VerifyDomainResponse = {
  success: boolean
  status: DomainStatus
  verification_records?: DnsRecord[]
  error?: string
}

export type RemoveDomainResponse = {
  success: boolean
  error?: string
}

export type DomainConfigResponse = {
  success: boolean
  verification_records?: DnsRecord[]
  error?: string
}
