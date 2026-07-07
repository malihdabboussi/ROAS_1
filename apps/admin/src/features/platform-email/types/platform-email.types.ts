export type PlatformEmailConfig = {
  id: string
  domain: string | null
  subdomain: string | null
  sendgrid_domain_id: number | null
  domain_status: string | null
  dns_records: unknown
  domain_verified_at: string | null
  sender_email: string | null
  sender_name: string | null
  sendgrid_sender_id: number | null
  sender_verified: boolean
  reply_to_email: string | null
  address: string | null
  city: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export type PlatformEmailGetResponse = { config: PlatformEmailConfig | null }
