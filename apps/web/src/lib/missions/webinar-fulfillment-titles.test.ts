import { describe, expect, it } from 'vitest'
import { formatWebinarSubtaskTitle } from './webinar-fulfillment-titles'

describe('formatWebinarSubtaskTitle', () => {
  it('numbers agent tasks and strips skill slugs', () => {
    expect(
      formatWebinarSubtaskTitle('Pre-call strategy map (auto-skill-1-roas-precall-strategy)'),
    ).toBe('Task 1 — Pre-call strategy map')
    expect(formatWebinarSubtaskTitle('Copy Package (roas-webinar-copy-package)')).toBe(
      'Task 5 — Copy Package',
    )
    expect(formatWebinarSubtaskTitle('Task 5 — Copy Package')).toBe('Task 5 — Copy Package')
  })

  it('leaves gates numbered without rewriting approve copy', () => {
    expect(formatWebinarSubtaskTitle('Gate 2 — approve Copy Package')).toBe(
      'Gate 2 — approve Copy Package',
    )
  })
})
