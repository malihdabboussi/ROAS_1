export type GhlTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  userType?: 'Location' | 'Company'
  locationId?: string
  companyId?: string
  userId?: string
}

export type GhlUserIntegration = {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: 'pending' | 'connected' | 'error' | 'disconnected'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  connected_at: string | null
  last_sync_at: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
}

export type GhlContact = {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  name?: string
  phone?: string
}

export type GhlSendEmailInput = {
  contactId: string
  emailFrom: string
  emailTo: string
  subject: string
  html?: string
  message?: string
  emailCc?: string[]
  emailBcc?: string[]
}
