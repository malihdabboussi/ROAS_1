export type DomainStatus = 'pending' | 'verifying' | 'verified' | 'failed'

export interface EmailDnsRecord {
  type: 'cname' | 'txt' | 'mx'
  host: string
  data: string
  valid: boolean
}

export interface EmailDomain {
  id: string
  user_id: string
  domain: string
  subdomain: string | null
  sendgrid_domain_id: string | number
  status: DomainStatus
  dns_records: EmailDnsRecord[]
  is_default: boolean
  created_at: string
  updated_at: string
  verified_at: string | null
  inbound_parse_enabled: boolean
  inbound_parse_hostname: string | null
  mx_verified: boolean
  mx_verified_at: string | null
}

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
