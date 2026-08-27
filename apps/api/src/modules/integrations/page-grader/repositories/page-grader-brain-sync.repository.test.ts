import { describe, expect, it, vi } from 'vitest'
import { PageGraderBrainSyncRepository } from './page-grader-brain-sync.repository'

function createSupabase(memoryCount: number, embeddedCount: number) {
  const brainQuery: Record<string, unknown> = {
    select: vi.fn(() => brainQuery),
    eq: vi.fn(() => brainQuery),
    limit: vi.fn(() => brainQuery),
    maybeSingle: vi.fn(async () => ({ data: { id: 'brain-1' }, error: null })),
  }
  let memoryQueryNumber = 0
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'ns_brains') return brainQuery
      memoryQueryNumber += 1
      const count = memoryQueryNumber === 1 ? memoryCount : embeddedCount
      const memoryQuery: Record<string, unknown> = {
        select: vi.fn(() => memoryQuery),
        eq: vi.fn(() => memoryQuery),
        like: vi.fn(() => memoryQuery),
        not: vi.fn(async () => ({ count, error: null })),
        then: (resolve: (value: unknown) => unknown) => resolve({ count, error: null }),
      }
      return memoryQuery
    }),
  }
  return supabase
}

describe('PageGraderBrainSyncRepository', () => {
  it('rejects campaign knowledge that exists only in the generic retrieval index', async () => {
    const repository = new PageGraderBrainSyncRepository()
    const supabase = createSupabase(32, 0)

    await expect(repository.hasCampaignKnowledge(supabase as never, 'campaign-1')).resolves.toBe(
      false,
    )
    expect(supabase.from).not.toHaveBeenCalledWith('space_semantic_objects')
  })

  it('accepts campaign knowledge only when every Page Grader memory is embedded', async () => {
    const repository = new PageGraderBrainSyncRepository()

    await expect(
      repository.hasCampaignKnowledge(createSupabase(32, 32) as never, 'campaign-1'),
    ).resolves.toBe(true)
  })
})
