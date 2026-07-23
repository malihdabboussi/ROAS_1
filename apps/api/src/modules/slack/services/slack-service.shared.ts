export interface OAuthStatePayload {
  user_id: string
  agent_key: string
  ts: number
  nonce: string
  return_to?: string
  org_id?: string | null
}

export interface PendingInstallTokens {
  accessToken: string
  refreshToken: string | null
  ts: number
}

export interface ResolvedSlackSenderContext {
  platform_id: string
  display_name: string
  username?: string
  email: string | null
  vibey_user_id: string | null
}

export const SLACK_MAX_TEXT_LENGTH = 3900
export const SLACK_MAX_BLOCKS = 50
export const SLACK_SECTION_MAX_LENGTH = 3000
export const SLACK_AGENT_STREAM_TIMEOUT_MS = 10 * 60 * 1000

export const CREDITS_EXHAUSTED_SLACK_MESSAGE =
  "I'm out of credits for this account. Add credits in the app, then send this again."
export const MACHINE_WAKE_START_SLACK_MESSAGE = 'Waking up your agent. This can take 20-60 seconds.'
export const MACHINE_UNREACHABLE_SLACK_MESSAGE =
  "I couldn't wake your agent this time. Try again in a minute."
export const MACHINE_NOT_READY_SLACK_MESSAGE =
  "Your agent started, but it wasn't ready in time. Try again in a minute."
export const GENERIC_SLACK_AGENT_ERROR_MESSAGE =
  "I couldn't process this message. Try again in a moment."

export const SUPABASE_USER_ACCESS_TOKEN_KEY = 'supabase_user_access_token'
export const SUPABASE_USER_REFRESH_TOKEN_KEY = 'supabase_user_refresh_token'
