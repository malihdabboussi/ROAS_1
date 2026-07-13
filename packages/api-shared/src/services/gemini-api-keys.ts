export type GeminiEnvReader = (key: string) => string | undefined

/** Fallback env vars are tried in order after GEMINI_API_KEY. */
export const GEMINI_API_KEY_FALLBACK_ENV_KEYS = [
  'GEMINI_API_KEY_FALLBACK',
  'GEMINI_API_KEY_FALLBACK_2',
] as const

/**
 * Resolve Gemini API keys in priority order:
 * GEMINI_API_KEY → GEMINI_API_KEY_FALLBACK → GEMINI_API_KEY_FALLBACK_2
 */
export function resolveGeminiApiKeys(read: GeminiEnvReader): string[] {
  const keys: string[] = []
  const seen = new Set<string>()

  const add = (value: string | undefined) => {
    const trimmed = value?.trim()
    if (!trimmed || seen.has(trimmed)) return
    keys.push(trimmed)
    seen.add(trimmed)
  }

  add(read('GEMINI_API_KEY'))
  for (const envKey of GEMINI_API_KEY_FALLBACK_ENV_KEYS) {
    add(read(envKey))
  }

  return keys
}

/** HTTP statuses where switching to the next Gemini API key may succeed. */
export function shouldTryNextGeminiApiKey(status: number): boolean {
  return status === 401 || status === 403
}
