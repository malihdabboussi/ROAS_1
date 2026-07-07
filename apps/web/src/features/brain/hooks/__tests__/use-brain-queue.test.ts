import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBrainQueue } from '../use-brain-queue'
import { listActiveImportJobs } from '../../services/user-brain-import.service'

vi.mock('../../services/user-brain-import.service', () => ({
  cancelImportJob: vi.fn(),
  dismissImportJob: vi.fn(),
  listActiveImportJobs: vi.fn(),
  retryImportJob: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel),
      }
      return channel
    }),
    removeChannel: vi.fn(),
  }),
}))

const listActiveImportJobsMock = vi.mocked(listActiveImportJobs)

describe('useBrainQueue', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not surface cached global jobs while the queue is disabled for an unresolved scope', async () => {
    const cachedJob = {
      id: 'job-1',
      job_type: 'remember_document',
      title: 'Personal upload',
      status: 'queued' as const,
      brain_id: null,
      created_at: '2026-06-15T08:00:00.000Z',
      updated_at: '2026-06-15T08:00:00.000Z',
      completed_at: null,
      result: null,
      last_error: null,
    }
    listActiveImportJobsMock.mockResolvedValueOnce([cachedJob])

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useBrainQueue({ enabled }),
      { initialProps: { enabled: true } },
    )

    await waitFor(() => expect(result.current.jobs).toHaveLength(1))

    rerender({ enabled: false })

    await waitFor(() => expect(result.current.jobs).toEqual([]))
  })

  it('passes the user brain target when the personal brain queue is scoped', async () => {
    listActiveImportJobsMock.mockResolvedValueOnce([])

    renderHook(() => useBrainQueue({ targetBrain: 'user' }))

    await waitFor(() =>
      expect(listActiveImportJobsMock).toHaveBeenCalledWith({
        brainId: undefined,
        campaignId: undefined,
        targetBrain: 'user',
        limit: undefined,
      }),
    )
  })
})
