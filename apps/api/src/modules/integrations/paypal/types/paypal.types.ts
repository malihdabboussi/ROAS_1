export type PayPalOAuthTokenResponse = {
  scope?: string
  access_token: string
  token_type: string
  app_id?: string
  expires_in: number
  nonce?: string
  refresh_token?: string
}

export type PayPalUserInfo = {
  sub?: string
  user_id?: string
  payer_id?: string
  email?: string
  email_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
  address?: Record<string, unknown>
  verified_account?: boolean
}

export type PayPalUserIntegration = {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: 'pending' | 'connected' | 'error' | 'disconnected'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  connected_at: string | null
  metadata: Record<string, unknown> | null
}
