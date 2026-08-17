import { describe, expect, it } from 'vitest'
import { extractWorkRequestTokenFromUrl } from './work-request-resume'

describe('extractWorkRequestTokenFromUrl', () => {
  it('reads the token from a review URL', () => {
    const token = 'a'.repeat(43)
    expect(extractWorkRequestTokenFromUrl(`https://app.roas.io/request-review/${token}`)).toBe(
      token,
    )
  })

  it('rejects short or malformed tokens', () => {
    expect(extractWorkRequestTokenFromUrl('https://app.roas.io/request-review/short')).toBeNull()
    expect(extractWorkRequestTokenFromUrl('https://app.roas.io/home')).toBeNull()
  })
})
