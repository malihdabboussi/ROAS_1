export const OPENAI_CODEX_INTEGRATION_ID = 'openai_codex'
export const OPENAI_CODEX_PROVIDER = 'openai-codex'
export const OPENAI_CODEX_VAULT_LABEL = 'oauth:default'

export type OpenAICodexTokenBundle = {
  access: string
  refresh: string
  expires: number
  accountId: string
  email?: string | null
}

export type OpenAICodexStatus = {
  connected: boolean
  status: string | null
  accountId: string | null
  email: string | null
  connectedAt: string | null
  tokenExpiresAt: string | null
}
