import { describe, expect, it, vi } from 'vitest'
import { BrainCrossPollinatorRepository } from '../../repositories/brain-cross-pollinator.repository'
import { BrainCrossPollinatorService } from '../brain-cross-pollinator.service'
import { BrainImportJobsService } from '../brain-import-jobs.service'

type BrainImportJobRecord = {
  id: string
  user_id: string
  job_type: string
  title: string
  dedupe_key: string
  payload: Record<string, unknown>
  status: string
  attempts: number
  max_attempts: number
  next_attempt_at: string
  last_error: string | null
  result: Record<string, unknown> | null
  completed_at: string | null
  chunks_total: number | null
  chunks_completed: number | null
}

function baseJob(partial: Partial<BrainImportJobRecord>): BrainImportJobRecord {
  return {
    id: 'job-1',
    user_id: 'user-1',
    job_type: 'document_remember',
    title: 'Test',
    dedupe_key: 'd',
    payload: {},
    status: 'processing',
    attempts: 1,
    max_attempts: 3,
    next_attempt_at: new Date().toISOString(),
    last_error: null,
    result: null,
    completed_at: null,
    chunks_total: null,
    chunks_completed: null,
    ...partial,
  }
}

describe('Brain runtime routing', () => {
  it('does not pre-wake Fly before Atlas import execution', async () => {
    const callOpenClawForBrainJob = vi
      .fn()
      .mockResolvedValue({ content: 'JOB_STATUS:completed\nsaved' })
    const moduleRef = { get: vi.fn() }
    const service = new BrainImportJobsService(moduleRef as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    await (service as any).executeViaAtlas(
      baseJob({
        job_type: 'document_remember',
        title: 'Doc',
        user_id: 'user-railway',
        payload: {
          content: 'Useful content',
          sourceType: 'document',
        },
      }),
    )

    expect(moduleRef.get).not.toHaveBeenCalled()
    expect(callOpenClawForBrainJob).toHaveBeenCalledWith(
      'user-railway',
      'atlas',
      expect.any(String),
      expect.any(String),
      undefined,
      'user',
      undefined,
      null,
      { lane: 'brain-import:job-1' },
    )
  })

  it('does not pre-wake Fly before Atlas cross-pollination matching', async () => {
    const callOpenClawForBrainJob = vi.fn().mockResolvedValue({ content: '[]' })
    const moduleRef = { get: vi.fn() }
    const service = new BrainCrossPollinatorService(
      moduleRef as any,
      new BrainCrossPollinatorRepository(),
    )
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    const matches = await (service as any).callAtlasForMatching(
      'user-railway',
      'Title: Meeting',
      '## Campaign context',
      null,
    )

    expect(matches).toEqual([])
    expect(moduleRef.get).not.toHaveBeenCalled()
    expect(callOpenClawForBrainJob).toHaveBeenCalledWith(
      'user-railway',
      'atlas',
      expect.any(String),
      expect.any(String),
      undefined,
      undefined,
      undefined,
      null,
    )
  })

  it('creates a pending cross-pollination suggestion and notification for valid matches', async () => {
    const insertedSuggestions: Array<Record<string, unknown>> = []
    const insertedNotifications: Array<Record<string, unknown>> = []
    const callOpenClawForBrainJob = vi.fn().mockResolvedValue({
      content: JSON.stringify([
        {
          campaign_id: 'campaign-1',
          campaign_name: 'Launch Plan',
          reason: 'The call includes launch positioning.',
        },
      ]),
    })
    const makeQuery = (table: string) => {
      const query: Record<string, unknown> = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        not: vi.fn(() => query),
        in: vi.fn(() => query),
        limit: vi.fn(async () => ({
          data:
            table === 'ns_brains'
              ? [{ id: 'brain-1', campaign_id: 'campaign-1', name: 'Launch Brain' }]
              : [],
          error: null,
        })),
        insert: vi.fn((value: Record<string, unknown>) => {
          if (table === 'brain_cross_suggestions') insertedSuggestions.push(value)
          if (table === 'user_notifications') insertedNotifications.push(value)
          return query
        }),
        maybeSingle: vi.fn(async () => ({ data: { id: 'suggestion-1' }, error: null })),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => {
          if (table === 'campaigns') {
            return Promise.resolve(
              resolve({ data: [{ id: 'campaign-1', title: 'Launch Plan' }], error: null }),
            )
          }
          if (table === 'ns_narrative_pages') {
            return Promise.resolve(
              resolve({
                data: [
                  {
                    brain_id: 'brain-1',
                    slug: 'capsule',
                    title: 'Capsule',
                    page_type: 'capsule',
                    summary: 'Launch context',
                    content_md: 'Campaign launch context',
                  },
                ],
                error: null,
              }),
            )
          }
          if (table === 'user_notifications') {
            return Promise.resolve(resolve({ data: [], error: null }))
          }
          return Promise.resolve(resolve({ data: [], error: null }))
        },
      }
      return query
    }
    const admin = { from: vi.fn((table: string) => makeQuery(table)) }
    const repository = new BrainCrossPollinatorRepository()
    ;(repository as any).getAdminClient = () => admin
    const service = new BrainCrossPollinatorService({ get: vi.fn() } as any, repository)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    await service.analyzeCrossPollination(
      {
        id: 'job-1',
        user_id: 'user-1',
        job_type: 'fathom_meeting_import',
        title: 'Launch call',
        payload: {
          meeting: {
            title: 'Launch call',
            default_summary: { markdown_formatted: 'We discussed launch positioning.' },
          },
        },
      },
      'org-1',
    )

    expect(insertedSuggestions).toEqual([
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        source_job_id: 'job-1',
        target_campaign_id: 'campaign-1',
        target_campaign_name: 'Launch Plan',
        reason: 'The call includes launch positioning.',
        status: 'pending',
      }),
    ])
    expect(insertedNotifications).toEqual([
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        type: 'brain_cross_suggestion',
        metadata: { suggestion_id: 'suggestion-1', campaign_id: 'campaign-1' },
      }),
    ])
  })
})
