export const ANTHROPIC_CLAUDE_INTEGRATION_ID = 'anthropic_claude'
export const ANTHROPIC_CLAUDE_PROVIDER = 'anthropic'
export const ANTHROPIC_CLAUDE_VAULT_LABEL = 'setup-token:default'
export const ANTHROPIC_CLAUDE_VAULT_SECRET_TYPE = 'token'
export const ANTHROPIC_CLAUDE_TOKEN_PREFIX = 'sk-ant-oat01-'
export const ANTHROPIC_CLAUDE_TOKEN_MIN_LENGTH = 80

export type AnthropicClaudeStatus = {
  connected: boolean
  status: string | null
  connectedAt: string | null
}
