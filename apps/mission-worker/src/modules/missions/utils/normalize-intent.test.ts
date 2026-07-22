import { describe, expect, it } from 'vitest'
import { normalizeIntentFull } from './normalize-intent'

describe('normalizeIntentFull', () => {
  it('preserves detailed ecology instructions within the mission plan contract', () => {
    const ecology = 'Use grounded campaign evidence. '.repeat(100)

    const normalized = normalizeIntentFull(
      {
        why: 'Ground the research',
        story: 'Verify the client before interpreting ads',
        sensory: 'A source-backed context document',
        endState: 'Verified context exists',
        ecology,
      },
      'Fallback',
    )

    expect(normalized.ecology).toBe(ecology.trim())
  })
})
