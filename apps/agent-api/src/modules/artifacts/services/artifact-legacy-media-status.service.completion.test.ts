import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyMediaStatusService } from './artifact-legacy-media-status.service'

const MINUTE_MS = 60_000

/**
 * In-memory stand-in for the media_generation_jobs row with genuinely atomic
 * claim semantics: the claim flips are synchronous inside the async mock, so
 * two concurrent getVideoStatus calls interleave at await points but exactly
 * one caller can win each claim — the same guarantee the single-row UPDATE
 * gives in Postgres.
 */
function makeJobStore(overrides: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = {
    id: 'job-1',
    user_id: 'user-1',
    campaign_id: null,
    space_id: 'space-1',
    provider: 'replicate',
    provider_job_id: 'prediction-1',
    status: 'processing',
    media_asset_id: null,
    result_url: null,
    error: null,
    prompt: 'A sunrise timelapse',
    model: 'kling-v3',
    duration_seconds: 5,
    completion_claimed_at: null as string | null,
    billing_claimed_at: null as string | null,
    billing_claimed_by: null as string | null,
    billing_recorded_at: null as string | null,
    ...overrides,
  }
  let usageEventExists = false

  const jobsService = {
    findMediaJobForUser: vi.fn(async () => ({ ...state })),
    claimMediaJobCompletion: vi.fn(
      async (
        _supabase: unknown,
        input: { jobId: string; claimedBy: string; staleBeforeIso: string },
      ) => {
        if (state.status !== 'starting' && state.status !== 'processing') return false
        const claimedAt = state.completion_claimed_at
          ? Date.parse(String(state.completion_claimed_at))
          : null
        if (claimedAt !== null && claimedAt >= Date.parse(input.staleBeforeIso)) return false
        state.completion_claimed_at = new Date().toISOString()
        state.completion_claimed_by = input.claimedBy
        return true
      },
    ),
    claimMediaJobBilling: vi.fn(async (_supabase: unknown, input: Record<string, string>) => {
      if (state.billing_recorded_at) return false
      const claimedAt = state.billing_claimed_at
        ? Date.parse(String(state.billing_claimed_at))
        : null
      if (claimedAt !== null && claimedAt >= Date.parse(input.staleBeforeIso)) return false
      state.billing_claimed_at = new Date().toISOString()
      state.billing_claimed_by = input.claimedBy
      return true
    }),
    completeMediaJobBilling: vi.fn(async (_supabase: unknown, input: Record<string, string>) => {
      if (state.billing_claimed_by !== input.claimedBy) throw new Error('lost billing lease')
      state.billing_recorded_at = new Date().toISOString()
      state.billing_claimed_at = null
      state.billing_claimed_by = null
      usageEventExists = true
    }),
    releaseMediaJobBilling: vi.fn(async (_supabase: unknown, input: Record<string, string>) => {
      if (state.billing_claimed_by !== input.claimedBy) return
      state.billing_claimed_at = null
      state.billing_claimed_by = null
    }),
    hasProviderUsageEvent: vi.fn(async () => usageEventExists),
    updateMediaJob: vi.fn(
      async (_supabase: unknown, _jobId: string, updates: Record<string, unknown>) => {
        Object.assign(state, updates)
      },
    ),
  }

  return {
    state,
    jobsService,
    setUsageEventExists: (value: boolean) => {
      usageEventExists = value
    },
  }
}

function makeUploads() {
  const counters = { uploads: 0, posters: 0 }
  const uploadService = {
    uploadMediaFromUrl: vi.fn(async () => {
      counters.uploads += 1
      counters.posters += 1 // poster extraction is 1:1 with each video upload
      return { success: true, url: 'https://cdn.example.com/video.mp4', asset: { id: 'asset-1' } }
    }),
    uploadMediaFromBytes: vi.fn(async () => {
      counters.uploads += 1
      counters.posters += 1
      return { success: true, url: 'https://cdn.example.com/video.mp4', asset: { id: 'asset-1' } }
    }),
  }
  return { counters, uploadService }
}

function makeCredits() {
  return {
    getUnitCost: vi.fn(async () => 0.1),
    processFixedCostUsage: vi.fn(async () => ({ credits: 1, balance: 10, apiCost: 0.5 })),
  }
}

function makeTarget(
  credits: ReturnType<typeof makeCredits>,
  overrides: Record<string, unknown> = {},
) {
  return {
    credits,
    replicateApiToken: 'token',
    serviceClient: {},
    logger: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), warn: vi.fn() },
    isMissionSessionKey: vi.fn(() => false),
    parseAgentIdFromSessionKey: vi.fn(() => 'vibey'),
    parseConversationId: vi.fn(() => null),
    requestContext: undefined,
    resolveOrgId: vi.fn(() => null),
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => ({})),
    getGoogleClient: vi.fn(() => null),
    ...overrides,
  }
}

function makeService(jobsService: Record<string, unknown>, uploadService: Record<string, unknown>) {
  return new ArtifactLegacyMediaStatusService(
    jobsService as never,
    uploadService as never,
    {} as never,
  )
}

function stubReplicate(prediction: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => prediction })),
  )
}

function makeGoogleAi(operation: Record<string, unknown>) {
  return { operations: { getVideosOperation: vi.fn(async () => operation) } }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('video completion ownership (replicate)', () => {
  it('agent poll racing the sweeper: exactly one upload, one poster, one debit, one succeeded update', async () => {
    const store = makeJobStore()
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({
      id: 'prediction-1',
      status: 'succeeded',
      output: ['https://replicate/out.mp4'],
    })

    const pollTarget = makeTarget(credits)
    const sweepTarget = makeTarget(credits, {
      parseAgentIdFromSessionKey: vi.fn(() => 'media-sweeper'),
    })

    const [pollResult, sweepResult] = (await Promise.all([
      service.getVideoStatus(pollTarget, { job_id: 'job-1' }, 'session-1'),
      service.getVideoStatus(sweepTarget, { job_id: 'job-1' }),
    ])) as Array<Record<string, unknown>>

    expect(counters.uploads).toBe(1)
    expect(counters.posters).toBe(1)
    expect(credits.processFixedCostUsage).toHaveBeenCalledTimes(1)
    const succeededUpdates = store.jobsService.updateMediaJob.mock.calls.filter(
      ([, , updates]) => (updates as Record<string, unknown>).status === 'succeeded',
    )
    expect(succeededUpdates).toHaveLength(1)
    expect(store.state.status).toBe('succeeded')

    const results = [pollResult, sweepResult]
    const winner = results.find((r) => r.url)
    const loser = results.find((r) => r !== winner)!
    expect(winner).toEqual(
      expect.objectContaining({ success: true, status: 'succeeded', media_asset_id: 'asset-1' }),
    )
    expect(loser.success).toBe(true)
    expect(['processing', 'succeeded']).toContain(loser.status)
  })

  it('sweeper racing another sweeper: single completion', async () => {
    const store = makeJobStore()
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({
      id: 'prediction-1',
      status: 'succeeded',
      output: ['https://replicate/out.mp4'],
    })

    const targets = [makeTarget(credits), makeTarget(credits)]
    await Promise.all(targets.map((t) => service.getVideoStatus(t, { job_id: 'job-1' })))

    expect(counters.uploads).toBe(1)
    expect(credits.processFixedCostUsage).toHaveBeenCalledTimes(1)
    expect(store.jobsService.claimMediaJobCompletion).toHaveBeenCalledTimes(2)
  })

  it('loser whose reload sees the finished job returns the canonical asset', async () => {
    const store = makeJobStore({
      status: 'succeeded',
      media_asset_id: 'asset-1',
      result_url: 'https://cdn.example.com/video.mp4',
    })
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)

    const result = (await service.getVideoStatus(makeTarget(credits), {
      job_id: 'job-1',
    })) as Record<string, unknown>

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        status: 'succeeded',
        media_asset_id: 'asset-1',
        url: 'https://cdn.example.com/video.mp4',
      }),
    )
    expect(counters.uploads).toBe(0)
    expect(credits.processFixedCostUsage).not.toHaveBeenCalled()
    expect(store.jobsService.claimMediaJobCompletion).not.toHaveBeenCalled()
  })

  it('caller that loses the claim while the winner is mid-completion returns processing', async () => {
    const store = makeJobStore({ completion_claimed_at: new Date().toISOString() })
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({
      id: 'prediction-1',
      status: 'succeeded',
      output: ['https://replicate/out.mp4'],
    })

    const result = (await service.getVideoStatus(makeTarget(credits), {
      job_id: 'job-1',
    })) as Record<string, unknown>

    expect(result).toEqual(
      expect.objectContaining({ success: true, job_id: 'job-1', status: 'processing' }),
    )
    expect(counters.uploads).toBe(0)
    expect(credits.processFixedCostUsage).not.toHaveBeenCalled()
  })

  it('recovers a stale claim after the bounded timeout and completes the job', async () => {
    const store = makeJobStore({
      completion_claimed_at: new Date(Date.now() - 30 * MINUTE_MS).toISOString(),
    })
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({
      id: 'prediction-1',
      status: 'succeeded',
      output: ['https://replicate/out.mp4'],
    })

    const result = (await service.getVideoStatus(makeTarget(credits), {
      job_id: 'job-1',
    })) as Record<string, unknown>

    expect(result).toEqual(expect.objectContaining({ success: true, status: 'succeeded' }))
    expect(counters.uploads).toBe(1)
    expect(credits.processFixedCostUsage).toHaveBeenCalledTimes(1)
    expect(store.state.status).toBe('succeeded')
  })

  it('releases a failed billing lease so a stale completion retry eventually bills once', async () => {
    const store = makeJobStore()
    const { uploadService } = makeUploads()
    const credits = makeCredits()
    credits.processFixedCostUsage
      .mockRejectedValueOnce(new Error('temporary credit service failure'))
      .mockResolvedValueOnce({ credits: 1, balance: 10, apiCost: 0.5 })
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({ id: 'prediction-1', status: 'succeeded', output: ['https://replicate/out.mp4'] })

    await expect(
      service.getVideoStatus(makeTarget(credits), { job_id: 'job-1' }, 'session-1'),
    ).rejects.toThrow('temporary credit service failure')
    expect(store.state.billing_recorded_at).toBeNull()
    expect(store.state.billing_claimed_at).toBeNull()

    store.state.completion_claimed_at = new Date(Date.now() - 30 * MINUTE_MS).toISOString()
    const result = (await service.getVideoStatus(
      makeTarget(credits),
      { job_id: 'job-1' },
      'session-1',
    )) as Record<string, unknown>

    expect(result).toEqual(expect.objectContaining({ success: true, status: 'succeeded' }))
    expect(credits.processFixedCostUsage).toHaveBeenCalledTimes(2)
    expect(store.state.billing_recorded_at).toEqual(expect.any(String))
  })

  it('does not re-debit after billing settled when the final job update crashes', async () => {
    const store = makeJobStore()
    const originalUpdate = store.jobsService.updateMediaJob.getMockImplementation()!
    store.jobsService.updateMediaJob
      .mockImplementationOnce(async (...args: unknown[]) => {
        const updates = args[2] as Record<string, unknown>
        if (updates.status === 'succeeded') throw new Error('database connection reset')
        return originalUpdate(...(args as [unknown, string, Record<string, unknown>]))
      })
      .mockImplementation(originalUpdate)
    const { uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({ id: 'prediction-1', status: 'succeeded', output: ['https://replicate/out.mp4'] })

    await expect(
      service.getVideoStatus(makeTarget(credits), { job_id: 'job-1' }, 'session-1'),
    ).rejects.toThrow('database connection reset')
    expect(store.state.billing_recorded_at).toEqual(expect.any(String))

    store.state.completion_claimed_at = new Date(Date.now() - 30 * MINUTE_MS).toISOString()
    await service.getVideoStatus(makeTarget(credits), { job_id: 'job-1' }, 'session-1')

    expect(credits.processFixedCostUsage).toHaveBeenCalledTimes(1)
    expect(store.state.status).toBe('succeeded')
  })

  it('retry after a stale claim never re-debits when billing was already recorded', async () => {
    const store = makeJobStore({
      completion_claimed_at: new Date(Date.now() - 30 * MINUTE_MS).toISOString(),
      billing_recorded_at: new Date(Date.now() - 30 * MINUTE_MS).toISOString(),
    })
    const { uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({
      id: 'prediction-1',
      status: 'succeeded',
      output: ['https://replicate/out.mp4'],
    })

    const result = (await service.getVideoStatus(makeTarget(credits), {
      job_id: 'job-1',
    })) as Record<string, unknown>

    expect(result).toEqual(expect.objectContaining({ success: true, status: 'succeeded' }))
    expect(credits.processFixedCostUsage).not.toHaveBeenCalled()
    expect(store.state.status).toBe('succeeded')
  })

  it('skips the debit when a legacy usage event already exists for the provider job', async () => {
    const store = makeJobStore()
    store.setUsageEventExists(true)
    const { uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({
      id: 'prediction-1',
      status: 'succeeded',
      output: ['https://replicate/out.mp4'],
    })

    const result = (await service.getVideoStatus(makeTarget(credits), {
      job_id: 'job-1',
    })) as Record<string, unknown>

    expect(result).toEqual(expect.objectContaining({ success: true, status: 'succeeded' }))
    expect(credits.processFixedCostUsage).not.toHaveBeenCalled()
  })

  it('claims completion before marking a terminal provider failure', async () => {
    const store = makeJobStore()
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({ id: 'prediction-1', status: 'failed', error: 'NSFW content' })

    const result = (await service.getVideoStatus(makeTarget(credits), {
      job_id: 'job-1',
    })) as Record<string, unknown>

    expect(result).toEqual(
      expect.objectContaining({ success: false, status: 'failed', error: 'NSFW content' }),
    )
    expect(store.jobsService.claimMediaJobCompletion).toHaveBeenCalledTimes(1)
    expect(store.state.status).toBe('failed')
    expect(counters.uploads).toBe(0)
    expect(credits.processFixedCostUsage).not.toHaveBeenCalled()
  })

  it('caller that loses the claim on a provider failure returns the canonical failure', async () => {
    const store = makeJobStore()
    const { uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    stubReplicate({ id: 'prediction-1', status: 'failed', error: 'NSFW content' })

    const results = (await Promise.all([
      service.getVideoStatus(makeTarget(credits), { job_id: 'job-1' }),
      service.getVideoStatus(makeTarget(credits), { job_id: 'job-1' }),
    ])) as Array<Record<string, unknown>>

    const failedUpdates = store.jobsService.updateMediaJob.mock.calls.filter(
      ([, , updates]) => (updates as Record<string, unknown>).status === 'failed',
    )
    expect(failedUpdates).toHaveLength(1)
    expect(store.state.status).toBe('failed')
    // The winner reports the canonical failure. The loser reports either the
    // canonical failure (reload after the winner's update) or processing
    // (reload while the winner is mid-update) — never a second failure write.
    expect(results.some((r) => r.success === false && r.status === 'failed')).toBe(true)
    for (const result of results) {
      if (result.success === false) expect(result.status).toBe('failed')
      else expect(result.status).toBe('processing')
    }
  })

  it('a transient provider poll error takes no claim and makes no terminal update', async () => {
    const store = makeJobStore()
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 502 })),
    )

    const result = (await service.getVideoStatus(makeTarget(credits), {
      job_id: 'job-1',
    })) as Record<string, unknown>

    expect(result).toEqual(expect.objectContaining({ success: false, error: 'Poll error: 502' }))
    expect(store.jobsService.claimMediaJobCompletion).not.toHaveBeenCalled()
    expect(store.jobsService.updateMediaJob).not.toHaveBeenCalled()
    expect(counters.uploads).toBe(0)
  })
})

describe('video completion ownership (google)', () => {
  function makeGoogleStore() {
    return makeJobStore({ provider: 'google', provider_job_id: 'operations/op-1' })
  }

  it('poll racing the sweeper on a finished google operation: single upload and debit', async () => {
    const store = makeGoogleStore()
    const { counters, uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    const ai = makeGoogleAi({
      done: true,
      response: {
        generatedVideos: [{ video: { videoBytes: Buffer.from('vid').toString('base64') } }],
      },
    })

    const targets = [
      makeTarget(credits, { getGoogleClient: vi.fn(() => ai) }),
      makeTarget(credits, { getGoogleClient: vi.fn(() => ai) }),
    ]
    const results = (await Promise.all(
      targets.map((t) => service.getVideoStatus(t, { job_id: 'job-1' })),
    )) as Array<Record<string, unknown>>

    expect(counters.uploads).toBe(1)
    expect(counters.posters).toBe(1)
    expect(credits.processFixedCostUsage).toHaveBeenCalledTimes(1)
    expect(store.state.status).toBe('succeeded')
    expect(results.some((r) => r.status === 'succeeded' && r.url)).toBe(true)
  })

  it('claims completion before marking a google operation error as failed', async () => {
    const store = makeGoogleStore()
    const { uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    const ai = makeGoogleAi({ error: { code: 3, message: 'invalid prompt' } })

    const result = (await service.getVideoStatus(
      makeTarget(credits, { getGoogleClient: vi.fn(() => ai) }),
      { job_id: 'job-1' },
    )) as Record<string, unknown>

    expect(result).toEqual(expect.objectContaining({ success: false, status: 'failed' }))
    expect(store.jobsService.claimMediaJobCompletion).toHaveBeenCalledTimes(1)
    expect(store.state.status).toBe('failed')
  })

  it('a still-running google operation takes no claim', async () => {
    const store = makeGoogleStore()
    const { uploadService } = makeUploads()
    const credits = makeCredits()
    const service = makeService(store.jobsService, uploadService)
    const ai = makeGoogleAi({ done: false })

    const result = (await service.getVideoStatus(
      makeTarget(credits, { getGoogleClient: vi.fn(() => ai) }),
      { job_id: 'job-1' },
    )) as Record<string, unknown>

    expect(result).toEqual(expect.objectContaining({ success: true, status: 'processing' }))
    expect(store.jobsService.claimMediaJobCompletion).not.toHaveBeenCalled()
  })
})
