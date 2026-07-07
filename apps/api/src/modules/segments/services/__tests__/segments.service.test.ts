import { describe, expect, it, vi } from 'vitest'
import { SegmentsRepository } from '../../repositories/segments.repository'
import { SegmentsService } from '../segments.service'

describe('SegmentsService direct RPC behavior', () => {
  it('loads filter options from the distinct contact RPCs and normalizes non-array results', async () => {
    const supabase = {
      rpc: vi.fn((name: string) => {
        if (name === 'get_distinct_contact_tags') {
          return Promise.resolve({ data: ['vip', 'trial'], error: null })
        }
        if (name === 'get_distinct_contact_countries') {
          return Promise.resolve({ data: null, error: null })
        }
        throw new Error(`Unexpected RPC: ${name}`)
      }),
    }
    const service = new SegmentsService(new SegmentsRepository())

    await expect(service.getFilterOptions(supabase as never)).resolves.toEqual({
      tags: ['vip', 'trial'],
      countries: [],
    })
    expect(supabase.rpc).toHaveBeenCalledWith('get_distinct_contact_tags')
    expect(supabase.rpc).toHaveBeenCalledWith('get_distinct_contact_countries')
  })

  it('previews segment contacts through RPC and returns zero for null data', async () => {
    const filters = { tags: ['vip'] }
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const service = new SegmentsService(new SegmentsRepository())

    await expect(service.previewSegment(supabase as never, filters)).resolves.toBe(0)
    expect(supabase.rpc).toHaveBeenCalledWith('preview_segment_contacts', {
      p_filters: filters,
    })
  })

  it('logs and rethrows preview RPC errors', async () => {
    const error = new Error('RPC unavailable')
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error }),
    }
    const service = new SegmentsService(new SegmentsRepository())
    const logger = service as unknown as { logger: { error: ReturnType<typeof vi.fn> } }
    logger.logger.error = vi.fn()

    await expect(service.previewSegment(supabase as never, {})).rejects.toThrow(error)
    expect(logger.logger.error).toHaveBeenCalledWith('Preview RPC failed: RPC unavailable')
  })
})
