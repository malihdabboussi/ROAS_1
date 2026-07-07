import { describe, expect, it, vi } from 'vitest'
import { EmotionalIntelligenceService } from '../emotional-intelligence.service'

describe('EmotionalIntelligenceService', () => {
  it('verifies memory existence and stores normalized emotional observations', async () => {
    const supabase = {}
    const repository = {
      findMemoryById: vi.fn().mockResolvedValue({ data: { id: 'mem-1' }, error: null }),
      createEmotionalResponse: vi.fn().mockResolvedValue({ id: 'resp-1' }),
    }
    const service = new EmotionalIntelligenceService({} as never, repository as never)

    await expect(
      service.recordObservation(supabase as never, {
        memory_id: 'mem-1',
        subject_id: 'user-1',
        emotion: ' JOY ',
        valence: 3,
        intensity: -2,
      }),
    ).resolves.toEqual({ status: 'recorded', response: { id: 'resp-1' } })

    expect(repository.findMemoryById).toHaveBeenCalledWith(supabase, 'mem-1')
    expect(repository.createEmotionalResponse).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        memory_id: 'mem-1',
        subject_id: 'user-1',
        emotion: 'joy',
        valence: 1,
        intensity: 0,
      }),
    )
  })
})
