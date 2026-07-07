import { backendGet } from '@/lib/api/backend-client'

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

export interface SenderIdentitiesListResponse {
  success: boolean
  senderIdentities: EmailSenderIdentity[]
}

export const senderIdentitiesApi = {
  list: () => backendGet<SenderIdentitiesListResponse>('/api/email/sender-identities'),
}
