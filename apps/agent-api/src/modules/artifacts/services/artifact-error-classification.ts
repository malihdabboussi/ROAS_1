export type ArtifactErrorClass =
  | 'system_auth'
  | 'integration_disconnected'
  | 'rate_limit'
  | 'credits_exhausted'
  | 'wrong_action_family'
  | 'permission_denied'
  | 'validation'
  | 'integration_validation'
  | 'platform_schema_contract_mismatch'
  | 'platform_data_query_failed'
  | 'system_fault'

const SYSTEM_AUTH_PATTERNS = [
  'missing request context access token',
  'invalid x-session-key',
  'user mismatch',
  'missing x-session-key header',
  'missing refresh token',
  'failed to refresh supabase token',
]
const INTEGRATION_PATTERNS = [
  'not connected',
  'not enabled',
  'auth config missing',
  'integration_id or toolkit_slug is required',
  'is not connected',
  'is disabled',
  'analytics access token unavailable',
]
const RATE_LIMIT_PATTERNS = [
  'rate limit',
  'rate_limit',
  'rate-limit',
  '429',
  'quota',
  'resource_exhausted',
  'too many requests',
]
const CREDITS_PATTERNS = ['credits_exhausted', 'credits exhausted', 'payment required']
const WRONG_ACTION_FAMILY_PATTERNS = [
  'wrong brain:',
  'wrong action family',
  'correct action family',
  'is restricted to atlas',
  'is restricted to hr',
  'must be delegated to atlas',
  'must be delegated to hr',
  'delegate to atlas',
  'delegate/ask atlas',
  'delegate/ask hr',
  'atlas brain/narrative action',
  'for decks use create_presentation',
  'not a presentation artifact',
  'strategy model node',
  'not an artifact',
  'user memory, not deliverables',
  'saves to the user brain',
]
const PERMISSION_DENIED_PATTERNS = [
  'only admins or members of this agent’s team can update it',
  "only admins or members of this agent's team can update it",
  'only creators, admins, or owners can create agents',
  'only admins can create manager agents',
  'creators can only create inside teams they belong to',
  'you can only create agents inside teams you belong to',
  'insufficient brain permissions',
  'could not verify brain permissions',
  'access denied',
  'forbidden',
]
const VALIDATION_PATTERNS = [
  'is required',
  'are required',
  'not found',
  'no fields to update',
  'no valid fields to update',
  'no updates provided',
  'must be a valid',
  'must be in the future',
  'invalid format',
  'structurally invalid',
  'marker_not_unique',
  'fallback_find_not_found',
  'fallback_find_not_unique',
  'incomplete_persona',
  'unknown action',
  'slug_conflict',
  'unique constraint',
  'duplicate key',
  'violates check constraint',
  'pgrst116',
  'contains 0 rows',
]
const INTEGRATION_VALIDATION_PATTERNS = [
  'integration action failed',
  'composio',
  'tool_slug',
  'tool slug',
  'tool not found',
  'invalid tool',
  'invalid arguments',
  'invalid params',
]
const PLATFORM_DATA_QUERY_PATTERNS = ['postgrest', 'pgrst', 'db error', 'database error']

function matchesAny(message: string, patterns: string[]): boolean {
  const lower = message.toLowerCase()
  return patterns.some((pattern) => lower.includes(pattern))
}

function isPlatformSchemaContractMismatch(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('pgrst204') ||
    (lower.includes('could not find') && lower.includes('column') && lower.includes('schema cache'))
  )
}

export function toArtifactErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : String(error)
}

export function classifyArtifactError(error: unknown): ArtifactErrorClass {
  const message = toArtifactErrorMessage(error)
  if (matchesAny(message, SYSTEM_AUTH_PATTERNS)) return 'system_auth'
  if (matchesAny(message, WRONG_ACTION_FAMILY_PATTERNS)) return 'wrong_action_family'
  if (matchesAny(message, PERMISSION_DENIED_PATTERNS)) return 'permission_denied'
  if (matchesAny(message, CREDITS_PATTERNS)) return 'credits_exhausted'
  if (matchesAny(message, RATE_LIMIT_PATTERNS)) return 'rate_limit'
  if (matchesAny(message, INTEGRATION_PATTERNS)) return 'integration_disconnected'
  if (matchesAny(message, INTEGRATION_VALIDATION_PATTERNS)) return 'integration_validation'
  if (isPlatformSchemaContractMismatch(message)) return 'platform_schema_contract_mismatch'
  if (matchesAny(message, VALIDATION_PATTERNS)) return 'validation'
  if (matchesAny(message, PLATFORM_DATA_QUERY_PATTERNS)) return 'platform_data_query_failed'
  return 'system_fault'
}
