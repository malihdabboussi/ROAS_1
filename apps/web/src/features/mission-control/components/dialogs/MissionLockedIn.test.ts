import { describe, expect, it } from 'vitest'
import { resolveMissionStreamText } from './MissionLockedIn'

describe('resolveMissionStreamText', () => {
  it('keeps ordinary agent progress readable', () => {
    expect(resolveMissionStreamText('Drafting the client strategy map.')).toBe(
      'Drafting the client strategy map.',
    )
  })

  it('hides an incomplete structured response while it streams', () => {
    expect(resolveMissionStreamText('{"content":"Drafting')).toBeNull()
  })

  it('shows only the user-facing content from a completed structured response', () => {
    expect(
      resolveMissionStreamText(
        JSON.stringify({
          content: 'Strategy map saved and linked.',
          summary: 'Saved',
          memory_update: '',
          artifact_manifest: [{ deliverable_id: 'doc-1' }],
        }),
      ),
    ).toBe('Strategy map saved and linked.')
  })

  it('supports fenced structured responses without exposing internal keys', () => {
    expect(
      resolveMissionStreamText(
        '```json\n{"content":"Strategy ready.","artifact_manifest":[{"deliverable_id":"doc-1"}]}\n```',
      ),
    ).toBe('Strategy ready.')
  })
})
