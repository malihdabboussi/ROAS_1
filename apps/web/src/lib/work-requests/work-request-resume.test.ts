import { describe, expect, it } from 'vitest'
import {
  extractWorkRequestTokenFromUrl,
  synthesizeWorkRequestBlocksFromText,
} from './work-request-resume'

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

describe('synthesizeWorkRequestBlocksFromText', () => {
  it('builds a work_request card from a pasted review URL', () => {
    const token = 'b'.repeat(43)
    expect(
      synthesizeWorkRequestBlocksFromText({
        content: `Review here: https://app.roas.io/request-review/${token}`,
        title: 'Replay page',
        existingBlocks: [{ type: 'text' }],
      }),
    ).toEqual([
      {
        type: 'work_request',
        id: `work-request-from-text-${token.slice(0, 12)}`,
        title: 'Replay page',
        reviewUrl: `https://app.roas.io/request-review/${token}`,
        status: 'pending',
      },
    ])
  })

  it('does not duplicate an existing work_request block', () => {
    const token = 'c'.repeat(43)
    expect(
      synthesizeWorkRequestBlocksFromText({
        content: `https://app.roas.io/request-review/${token}`,
        existingBlocks: [{ type: 'work_request' }],
      }),
    ).toEqual([])
  })
})
