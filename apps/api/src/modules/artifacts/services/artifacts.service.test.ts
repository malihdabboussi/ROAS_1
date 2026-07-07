import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactsService } from './artifacts.service'

function makeQuery(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    delete: vi.fn().mockReturnThis(),
  }
  return query
}

describe('ArtifactsService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T09:00:00Z'))
  })

  it('deletes an owned offer and returns delete status UI block', async () => {
    const existingQuery = makeQuery({ data: { id: 'offer-1', name: 'Launch Offer' }, error: null })
    const deleteQuery = makeQuery({ error: null })
    const supabase = {}
    const tableResults = [existingQuery, deleteQuery]
    const repository = {
      table: vi.fn(() => tableResults.shift()),
    }
    const service = new ArtifactsService(repository as never, {} as never)

    await expect(
      service.executeDelete(supabase as never, 'user-1', {
        delete_action: 'delete_offer',
        entity_id: 'offer-1',
      }),
    ).resolves.toEqual({
      success: true,
      deleted: {
        action: 'offer',
        entity_type: 'offer',
        entity_id: 'offer-1',
        entity_name: 'Launch Offer',
      },
      ui_blocks: [
        {
          type: 'delete_status',
          id: 'delete-status-offer-offer-1-1781082000000',
          delete_action: 'delete_offer',
          entity_type: 'offer',
          entity_id: 'offer-1',
          entity_name: 'Launch Offer',
          status: 'success',
          error: null,
        },
      ],
    })
    expect(repository.table).toHaveBeenNthCalledWith(1, supabase, 'offers')
    expect(repository.table).toHaveBeenNthCalledWith(2, supabase, 'offers')
  })
})
