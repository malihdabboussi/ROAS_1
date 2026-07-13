import { describe, expect, it } from 'vitest'
import { resolveGeminiApiKeys, shouldTryNextGeminiApiKey } from './gemini-api-keys'

describe('resolveGeminiApiKeys', () => {
  it('returns primary only when fallback is unset', () => {
    expect(
      resolveGeminiApiKeys((key) => (key === 'GEMINI_API_KEY' ? ' primary-key ' : undefined)),
    ).toEqual(['primary-key'])
  })

  it('returns primary then fallback when both are set', () => {
    const env: Record<string, string> = {
      GEMINI_API_KEY: 'key-3',
      GEMINI_API_KEY_FALLBACK: 'key-2',
      GEMINI_API_KEY_FALLBACK_2: 'key-1',
    }
    expect(resolveGeminiApiKeys((key) => env[key])).toEqual(['key-3', 'key-2', 'key-1'])
  })

  it('dedupes duplicate keys across env vars', () => {
    const env: Record<string, string> = {
      GEMINI_API_KEY: 'same-key',
      GEMINI_API_KEY_FALLBACK: 'same-key',
      GEMINI_API_KEY_FALLBACK_2: 'other-key',
    }
    expect(resolveGeminiApiKeys((key) => env[key])).toEqual(['same-key', 'other-key'])
  })
})

describe('shouldTryNextGeminiApiKey', () => {
  it('returns true for auth and permission errors', () => {
    expect(shouldTryNextGeminiApiKey(401)).toBe(true)
    expect(shouldTryNextGeminiApiKey(403)).toBe(true)
  })

  it('returns false for rate limits and server errors', () => {
    expect(shouldTryNextGeminiApiKey(429)).toBe(false)
    expect(shouldTryNextGeminiApiKey(500)).toBe(false)
  })
})
