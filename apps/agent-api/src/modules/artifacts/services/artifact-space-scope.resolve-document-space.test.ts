import { describe, expect, it, vi } from 'vitest'
import { resolveDocumentSpaceId } from './artifact-space-scope'

function makeSpacesQuery(rows: Array<Record<string, unknown>>) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe('spaces')
      return {
        select: vi.fn(() => ({
          eq: vi.fn((key: string, value: unknown) => {
            expect(key).toBe('campaign_id')
            expect(value).toBe('campaign-1')
            return {
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: rows, error: null })),
              })),
            }
          }),
        })),
      }
    }),
  }
}

describe('resolveDocumentSpaceId', () => {
  it('prefers explicit space_id over campaign lookup', async () => {
    const supabase = { from: vi.fn() }
    const spaceId = await resolveDocumentSpaceId(
      supabase as never,
      { space_id: 'explicit-space' },
      'campaign-1',
    )
    expect(spaceId).toBe('explicit-space')
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('skips Flow concepts when picking a campaign space for docs', async () => {
    const supabase = makeSpacesQuery([
      {
        id: 'flow-concepts',
        schema: { custom_data: { vibey_flows_concept_space: true } },
      },
      { id: 'new-workspace', schema: { icon: 'layout-grid' } },
    ])

    const spaceId = await resolveDocumentSpaceId(supabase as never, {}, 'campaign-1')
    expect(spaceId).toBe('new-workspace')
  })

  it('falls back to the only campaign space when no non-flows space exists', async () => {
    const supabase = makeSpacesQuery([
      {
        id: 'flow-concepts',
        schema: { custom_data: { vibey_flows_concept_space: true } },
      },
    ])

    const spaceId = await resolveDocumentSpaceId(supabase as never, {}, 'campaign-1')
    expect(spaceId).toBe('flow-concepts')
  })

  it('returns null when campaign has no space', async () => {
    const supabase = makeSpacesQuery([])
    const spaceId = await resolveDocumentSpaceId(supabase as never, {}, 'campaign-1')
    expect(spaceId).toBeNull()
  })
})
