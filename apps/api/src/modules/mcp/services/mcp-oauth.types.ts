export interface OAuthClientRow {
  client_id: string
  client_name: string
  client_uri: string | null
  logo_uri: string | null
  redirect_uris: string[]
  is_enabled: boolean
  metadata?: Record<string, unknown>
}

export interface AuthorizationRequestRow {
  request_id: string
  request_signature: string
  client_id: string
  redirect_uri: string
  resource: string
  scope: string
  scopes: string[]
  state: string | null
  code_challenge: string
  code_challenge_method: 'S256'
  org_id: string | null
  client_metadata: Record<string, unknown>
  expires_at: string
  consumed_at: string | null
}
