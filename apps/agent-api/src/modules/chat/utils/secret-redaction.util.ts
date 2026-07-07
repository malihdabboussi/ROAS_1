export const SECRET_REQUEST_BLOCK_MESSAGE =
  "I can't take API keys, tokens, or secrets in chat. I'll use the available Vibey tools and connected integrations instead."

const SECRET_VALUE_REPLACEMENT = '[REDACTED_SECRET]'

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\bsk-(?:proj-|or-|ant-|live-|test-)?[A-Za-z0-9_-]{8,}\b/g,
  /\bsk_[A-Za-z0-9_-]{8,}\b/g,
  /\b(?:shpat_|ghp_|github_pat_|glpat-|xox[baprs]-|nxapi-)[A-Za-z0-9_-]{8,}\b/g,
  /\b(sb_secret|sb_publishable)_[A-Za-z0-9_-]+/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]{20,}\b/g,
]

const SECRET_ASSIGNMENT_PATTERN =
  /\b([A-Z][A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY|CLIENT[_-]?SECRET|ACCESS[_-]?KEY)[A-Z0-9_]*)\s*[:=]\s*(['"]?)([^\s'",;`]{8,})\2/gi

const SECRET_KEY_PATTERN =
  /(api[_-]?key|token|secret|password|credential|authorization|bearer|private[_-]?key|client[_-]?secret|access[_-]?key)/i

const POLICY_DISCUSSION_PATTERN =
  /\b(?:never|do\s+not|don't|shouldn['’]t|must\s+not)\b[\s\S]{0,100}\b(?:ask|request|collect|accept|paste|provide|share)\b[\s\S]{0,100}\b(?:api\s*key|token|secret|password|credential|private\s*key)/i

const SECRET_REQUEST_PATTERNS: RegExp[] = [
  /\b(?:please\s+)?(?:send|share|paste|provide|give|enter|submit|drop|reply\s+with|tell\s+me)\b[\s\S]{0,140}\b(?:your\s+)?(?:api\s*key|access\s*token|auth\s*token|bearer\s*token|secret|password|private\s*key|client\s*secret|OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY)\b/i,
  /\b(?:i|we|this|the\s+app|the\s+function|the\s+integration)\s+(?:need|will\s+need|would\s+need|require|requires)\b[\s\S]{0,120}\b(?:your\s+)?(?:api\s*key|access\s*token|auth\s*token|bearer\s*token|secret|password|private\s*key|client\s*secret|OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY)\b/i,
  /\b(?:set|configure|add|put)\b[\s\S]{0,100}\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|API[_-]?KEY|ACCESS[_-]?TOKEN|CLIENT[_-]?SECRET)\b/i,
  /\b(?:what(?:'s|\s+is)|do\s+you\s+have)\s+your\b[\s\S]{0,80}\b(?:api\s*key|access\s*token|auth\s*token|secret|password|private\s*key)\b/i,
]

export function redactSecretsInText(input: string): string {
  if (!input) return input
  let redacted = input.replace(
    SECRET_ASSIGNMENT_PATTERN,
    (_match, name: string) => `${name}=${SECRET_VALUE_REPLACEMENT}`,
  )
  for (const pattern of SECRET_VALUE_PATTERNS) {
    pattern.lastIndex = 0
    redacted = redacted.replace(pattern, SECRET_VALUE_REPLACEMENT)
  }
  return redacted
}

export function containsUserSecretRequest(input: string): boolean {
  if (!input || POLICY_DISCUSSION_PATTERN.test(input)) return false
  return SECRET_REQUEST_PATTERNS.some((pattern) => pattern.test(input))
}

export function sanitizeUserVisibleSecrets(input: string): string {
  const redacted = redactSecretsInText(input)
  return containsUserSecretRequest(redacted) ? SECRET_REQUEST_BLOCK_MESSAGE : redacted
}

export function redactSecretsDeep(value: unknown, depth = 0): unknown {
  if (depth > 20) return '[REDACTED_DEPTH_LIMIT]'
  if (typeof value === 'string') return sanitizeUserVisibleSecrets(value)
  if (Array.isArray(value)) return value.map((item) => redactSecretsDeep(item, depth + 1))
  if (!value || typeof value !== 'object') return value

  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SECRET_KEY_PATTERN.test(key)
      ? SECRET_VALUE_REPLACEMENT
      : redactSecretsDeep(item, depth + 1)
  }
  return output
}
