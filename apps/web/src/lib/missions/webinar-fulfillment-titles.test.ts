import { describe, expect, it } from 'vitest'
import { formatWebinarSubtaskTitle } from './webinar-fulfillment-titles'

describe('formatWebinarSubtaskTitle', () => {
  it('numbers agent tasks and strips skill slugs', () => {
    expect(
      formatWebinarSubtaskTitle('Pre-call strategy map (auto-skill-1-roas-precall-strategy)'),
    ).toBe('Task 2 — Pre-call strategy map')
    expect(formatWebinarSubtaskTitle('Copy Package (roas-webinar-copy-package)')).toBe(
      'Task 8A — Complete webinar copy package',
    )
    expect(formatWebinarSubtaskTitle('Task 8A — Complete webinar copy package')).toBe(
      'Task 8A — Complete webinar copy package',
    )
    expect(formatWebinarSubtaskTitle('Landing Page Copy (roas-landing-page-copy)')).toBe(
      'Task 8B — Landing page copy',
    )
  })

  it('leaves gates numbered without rewriting approve copy', () => {
    expect(formatWebinarSubtaskTitle('Gate 2 — approve Copy Package')).toBe(
      'Gate 2 — approve Copy Package',
    )
  })
})
