export interface VibeyMcpTokenClaims {
  user_id: string
  org_id: string | null
  client_id: string
  client_name: string | null
  client_logo_uri: string | null
  scopes: string[]
  exp: number
  supabase_access_token: string
  supabase_refresh_token: string | null
}

export interface VibeyMcpRequestContext {
  claims: VibeyMcpTokenClaims
}

export interface VibeyMcpToolCallContext {
  toolName: string
  args: Record<string, unknown>
  claims: VibeyMcpTokenClaims
}
