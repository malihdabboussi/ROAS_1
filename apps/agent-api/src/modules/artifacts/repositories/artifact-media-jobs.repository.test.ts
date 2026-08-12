import { describe, expect, it, vi } from 'vitest'
import { ArtifactMediaJobsRepository } from './artifact-media-jobs.repository'

/**
 * Chainable supabase mock that records every filter applied to the query so
 * the tests can assert the exact WHERE shape of the single-statement claim
 * UPDATEs — that shape is what makes the claims atomic in Postgres.
 */
function makeSupabase(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = {}
  for (const method of ['update', 'eq', 'in', 'or', 'is', 'lt', 'select']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return chain
    })
  }
  ;(chain as { then: unknown }).then = (resolve: (value: unknown) => unknown) => resolve(result)
  const from = vi.fn(() => chain)
  return { client: { from } as never, from, calls }
}

describe('ArtifactMediaJobsRepository completion claims', () => {
  it('claims completion with one conditional UPDATE over status and claim staleness', async () => {
    const { client, from, calls } = makeSupabase({ data: [{ id: 'job-1' }], error: null })
    const repository = new ArtifactMediaJobsRepository()

    const { data, error } = await repository.claimMediaJobCompletion(client, {
      jobId: 'job-1',
      claimedBy: 'media-sweeper',
      nowIso: '2026-08-12T10:00:00.000Z',
      staleBeforeIso: '2026-08-12T09:50:00.000Z',
    })

    expect(error).toBeNull()
    expect(data).toEqual([{ id: 'job-1' }])
    expect(from).toHaveBeenCalledWith('media_generation_jobs')
    expect(calls).toEqual([
      {
        method: 'update',
        args: [
          {
            completion_claimed_at: '2026-08-12T10:00:00.000Z',
            completion_claimed_by: 'media-sweeper',
          },
        ],
      },
      { method: 'eq', args: ['id', 'job-1'] },
      { method: 'in', args: ['status', ['starting', 'processing']] },
      {
        method: 'or',
        args: ['completion_claimed_at.is.null,completion_claimed_at.lt.2026-08-12T09:50:00.000Z'],
      },
      { method: 'select', args: ['id'] },
    ])
  })

  it('claims billing with a recoverable lease without marking it recorded', async () => {
    const { client, calls } = makeSupabase({ data: [{ id: 'job-1' }], error: null })
    const repository = new ArtifactMediaJobsRepository()

    const { data } = await repository.claimMediaJobBilling(client, {
      jobId: 'job-1',
      claimedBy: 'worker-1',
      nowIso: '2026-08-12T10:00:00.000Z',
      staleBeforeIso: '2026-08-12T09:50:00.000Z',
    })

    expect(data).toEqual([{ id: 'job-1' }])
    expect(calls).toEqual([
      {
        method: 'update',
        args: [
          {
            billing_claimed_at: '2026-08-12T10:00:00.000Z',
            billing_claimed_by: 'worker-1',
          },
        ],
      },
      { method: 'eq', args: ['id', 'job-1'] },
      { method: 'is', args: ['billing_recorded_at', null] },
      {
        method: 'or',
        args: ['billing_claimed_at.is.null,billing_claimed_at.lt.2026-08-12T09:50:00.000Z'],
      },
      { method: 'select', args: ['id'] },
    ])
  })

  it('records billing only for the worker holding the lease', async () => {
    const { client, calls } = makeSupabase({ data: [{ id: 'job-1' }], error: null })
    const repository = new ArtifactMediaJobsRepository()

    await repository.completeMediaJobBilling(client, {
      jobId: 'job-1',
      claimedBy: 'worker-1',
      nowIso: '2026-08-12T10:01:00.000Z',
    })

    expect(calls).toEqual([
      {
        method: 'update',
        args: [
          {
            billing_recorded_at: '2026-08-12T10:01:00.000Z',
            billing_claimed_at: null,
            billing_claimed_by: null,
          },
        ],
      },
      { method: 'eq', args: ['id', 'job-1'] },
      { method: 'eq', args: ['billing_claimed_by', 'worker-1'] },
      { method: 'is', args: ['billing_recorded_at', null] },
      { method: 'select', args: ['id'] },
    ])
  })
})
