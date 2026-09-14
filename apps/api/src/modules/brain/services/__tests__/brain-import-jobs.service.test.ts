import { describe, expect, it, vi } from 'vitest'
import { BrainImportJobsRuntimeRepository } from '../../repositories/brain-import-jobs-runtime.repository'
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

describe('BrainImportJobsService', () => {
  it('routes all queue job types through Atlas OpenClaw with the correct target brain', async () => {
    const callOpenClawForBrainJob = vi
      .fn()
      .mockResolvedValue({ content: 'JOB_STATUS:completed\nok' })
    const moduleRef = { get: vi.fn() }
    const service = new BrainImportJobsService(moduleRef as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    const cases = [
      {
        job: baseJob({
          job_type: 'document_remember',
          title: 'Doc',
          payload: { content: 'body', sourceType: 'document' },
        }),
        expectPromptIncludes: 'Target brain: user',
        expectPromptIncludesAction: 'save_user_memory',
        expectBrainId: undefined as string | undefined,
      },
      {
        job: baseJob({
          job_type: 'user_link_import',
          title: 'Link',
          payload: { url: 'https://example.com' },
        }),
        expectPromptIncludes: 'Target brain: user',
        expectPromptIncludesAction: 'save_user_memory',
        expectBrainId: undefined as string | undefined,
      },
      {
        job: baseJob({
          job_type: 'sk_ingest',
          title: 'SK',
          payload: {
            brainId: 'brain-1',
            text: 'train text',
            sourceType: 'note',
            title: 'SK title',
          },
        }),
        expectPromptIncludes: 'Target brain: agent',
        expectPromptIncludesAction: 'ingest_agent_brain_text',
        expectBrainId: 'brain-1',
      },
      {
        job: baseJob({
          job_type: 'sk_link_ingest',
          title: 'SK link',
          payload: { brainId: 'brain-1', url: 'https://a.com', title: 'L' },
        }),
        expectPromptIncludes: 'Target brain: agent',
        expectPromptIncludesAction: 'ingest_agent_brain_text',
        expectBrainId: 'brain-1',
      },
      {
        job: baseJob({
          job_type: 'fathom_meeting_import',
          title: 'Fathom',
          payload: {
            meeting: {
              id: 'm1',
              title: 'Call',
              transcript: [{ speaker: { display_name: 'A' }, text: 'hi' }],
            },
          },
        }),
        expectPromptIncludes: 'Target brain: user',
        expectPromptIncludesAction: 'save_user_memory',
        expectBrainId: undefined as string | undefined,
      },
      {
        job: baseJob({
          job_type: 'campaign_file_import',
          title: 'Camp file',
          payload: {
            campaignId: 'camp-1',
            title: 'Doc',
            content: 'c',
            sourceType: 'upload',
          },
        }),
        expectPromptIncludes: 'Target brain: campaign',
        expectPromptIncludesAction: 'atlas_save_brain_context',
        expectCampaignId: 'camp-1',
        expectBrainId: undefined as string | undefined,
      },
      {
        job: baseJob({
          job_type: 'campaign_fathom_import',
          title: 'Camp fathom',
          payload: {
            campaignId: 'camp-f',
            meeting: {
              id: 'mf',
              title: 'M',
              transcript: [{ text: 't' }],
            },
          },
        }),
        expectPromptIncludes: 'Target brain: campaign',
        expectPromptIncludesAction: 'atlas_save_brain_context',
        expectCampaignId: 'camp-f',
        expectBrainId: undefined as string | undefined,
      },
      {
        job: baseJob({
          job_type: 'campaign_url_import',
          title: 'Camp url',
          payload: { campaignId: 'camp-u', url: 'https://x.com' },
        }),
        expectPromptIncludes: 'Target brain: campaign',
        expectPromptIncludesAction: 'atlas_save_brain_context',
        expectCampaignId: 'camp-u',
        expectBrainId: undefined as string | undefined,
      },
    ] as const

    for (const {
      job,
      expectPromptIncludes,
      expectPromptIncludesAction,
      expectCampaignId,
      expectBrainId,
    } of cases) {
      callOpenClawForBrainJob.mockClear()
      await (service as any).executeViaAtlas(job)

      expect(callOpenClawForBrainJob).toHaveBeenCalled()
      const [
        uid,
        agentKey,
        systemPrompt,
        userPrompt,
        campaignId,
        targetBrain,
        brainId,
        orgId,
        opts,
      ] = callOpenClawForBrainJob.mock.calls[0]
      expect(uid).toBe('user-1')
      expect(agentKey).toBe('atlas')
      expect(systemPrompt).toContain(expectPromptIncludes)
      expect(systemPrompt).toContain(expectPromptIncludesAction)
      if (expectCampaignId !== undefined) {
        expect(campaignId).toBe(expectCampaignId)
      } else {
        expect(campaignId).toBeUndefined()
      }
      expect(brainId).toBe(expectBrainId)
      expect(orgId).toBeNull()
      expect(opts).toEqual({ lane: `brain-import:${job.id}` })
      expect(typeof userPrompt).toBe('string')
      expect(userPrompt.length).toBeGreaterThan(0)
      expect(typeof targetBrain).toBe('string')
    }
  })

  it('includes campaign file sourceType in the Atlas user prompt', async () => {
    const callOpenClawForBrainJob = vi
      .fn()
      .mockResolvedValue({ content: 'JOB_STATUS:completed\nok' })
    const moduleRef = { get: vi.fn() }
    const service = new BrainImportJobsService(moduleRef as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    const job = baseJob({
      job_type: 'campaign_file_import',
      title: 'Drive Doc',
      payload: {
        campaignId: 'camp-1',
        title: 'Drive Doc',
        content: 'Extracted OCR text',
        sourceType: 'drive',
        domain: 'general',
      },
    })

    await (service as any).executeViaAtlas(job)

    expect(callOpenClawForBrainJob).toHaveBeenCalledWith(
      'user-1',
      'atlas',
      expect.any(String),
      expect.stringContaining('"sourceType": "drive"'),
      'camp-1',
      'campaign',
      undefined,
      null,
      { lane: 'brain-import:job-1' },
    )
    expect(callOpenClawForBrainJob.mock.calls[0]?.[2]).toContain('target_brain: "campaign"')
    expect(callOpenClawForBrainJob.mock.calls[0]?.[2]).toContain('campaign_id: "camp-1"')
    expect(callOpenClawForBrainJob.mock.calls[0]?.[2]).toContain('campaign_capability')
    expect(callOpenClawForBrainJob.mock.calls[0]?.[2]).toContain(
      'action: "atlas_save_brain_context"',
    )
    expect(callOpenClawForBrainJob.mock.calls[0]?.[2]).toContain(
      'Do not call read_skill, describe_action, or save_user_memory',
    )
    expect(callOpenClawForBrainJob.mock.calls[0]?.[2]).toContain(
      'Only report JOB_STATUS:completed after the save action returns success: true',
    )
  })

  it.each([
    [0, 0, 'no persisted Campaign Brain memory'],
    [1, 0, 'Campaign Brain memories are missing retrieval embeddings'],
  ])(
    'rejects a completed campaign Slack import with memory=%i embedded=%i',
    async (memoryCount, embeddedCount, expectedError) => {
      const runtimeRepository = {
        getAdminClient: vi.fn(() => ({})),
        findCampaignSlackImportEvidence: vi.fn(async () => ({
          brainId: 'brain-1',
          memoryCount,
          embeddedCount,
        })),
        updateJobForAttempt: vi.fn(async () => ({ error: null })),
        updateSlackMappingSynced: vi.fn(async () => ({ error: null })),
      }
      const service = new BrainImportJobsService(
        { get: vi.fn() } as any,
        undefined as any,
        runtimeRepository as any,
      )
      ;(service as any).emitJobNotification = vi.fn(async () => undefined)

      await expect(
        (service as any).markJobSucceeded(
          baseJob({
            job_type: 'campaign_slack_import',
            payload: {
              targetCampaignId: 'campaign-1',
              teamId: 'team-1',
              channelId: 'channel-1',
              periodStartTs: '1786042676.000000',
            },
          }),
          { status: 'completed' },
        ),
      ).rejects.toThrow(expectedError)

      expect(runtimeRepository.updateJobForAttempt).not.toHaveBeenCalled()
    },
  )

  it('accepts a completed campaign Slack import with fully embedded source evidence', async () => {
    const runtimeRepository = {
      getAdminClient: vi.fn(() => ({})),
      findCampaignSlackImportEvidence: vi.fn(async () => ({
        brainId: 'brain-1',
        memoryCount: 2,
        embeddedCount: 2,
      })),
      updateJobForAttempt: vi.fn(async () => ({ error: null })),
      updateSlackMappingSynced: vi.fn(async () => ({ error: null })),
    }
    const service = new BrainImportJobsService(
      { get: vi.fn() } as any,
      undefined as any,
      runtimeRepository as any,
    )
    ;(service as any).emitJobNotification = vi.fn(async () => undefined)

    await expect(
      (service as any).markJobSucceeded(
        baseJob({
          job_type: 'campaign_slack_import',
          payload: {
            mappingId: 'mapping-1',
            targetCampaignId: 'campaign-1',
            teamId: 'team-1',
            channelId: 'channel-1',
            periodStartTs: '1786042676.000000',
            periodEndTs: '1786593852.000000',
          },
        }),
        { status: 'completed' },
      ),
    ).resolves.toBeUndefined()

    expect(runtimeRepository.updateJobForAttempt).toHaveBeenCalledWith(
      {},
      'job-1',
      1,
      expect.objectContaining({ status: 'succeeded' }),
    )
    expect(runtimeRepository.updateSlackMappingSynced).toHaveBeenCalledWith(
      {},
      'mapping-1',
      expect.objectContaining({ last_message_ts: '1786593852.000000' }),
    )
  })

  it('fails closed when OpenResponses reports an Atlas import failure', async () => {
    const callOpenClawForBrainJob = vi.fn().mockResolvedValue({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'JOB_STATUS:failed — campaign brain save was rejected',
            },
          ],
        },
      ],
    })
    const service = new BrainImportJobsService({ get: vi.fn() } as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    await expect(
      (service as any).executeViaAtlas(
        baseJob({
          job_type: 'campaign_file_import',
          payload: { campaignId: 'camp-1', content: 'Useful campaign context' },
        }),
      ),
    ).rejects.toThrow('Atlas could not process: campaign brain save was rejected')
  })

  it('fails closed when OpenResponses is JSON-encoded inside a string field', async () => {
    const callOpenClawForBrainJob = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: 'JOB_STATUS:failed — campaign capability rejected the save',
              },
            ],
          },
        ],
      }),
    })
    const service = new BrainImportJobsService({ get: vi.fn() } as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    await expect(
      (service as any).executeViaAtlas(
        baseJob({
          job_type: 'campaign_file_import',
          payload: { campaignId: 'camp-1', content: 'Useful campaign context' },
        }),
      ),
    ).rejects.toThrow('Atlas could not process: campaign capability rejected the save')
  })

  it('fails closed when Atlas omits the required terminal status', async () => {
    const callOpenClawForBrainJob = vi.fn().mockResolvedValue({
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'Saved the context.' }] }],
    })
    const service = new BrainImportJobsService({ get: vi.fn() } as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    await expect(
      (service as any).executeViaAtlas(
        baseJob({ job_type: 'document_remember', payload: { content: 'Useful context' } }),
      ),
    ).rejects.toThrow('Atlas could not process: Missing required JOB_STATUS terminal marker')
  })

  it('skips empty Slack periods without calling Atlas', async () => {
    const callOpenClawForBrainJob = vi.fn()
    const service = new BrainImportJobsService({ get: vi.fn() } as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })
    vi.spyOn(service as any, 'buildMissionInput').mockResolvedValue({
      targetBrain: 'user',
      contentType: 'slack_period',
      title: 'Analyze Slack #sales',
      input: { content: '' },
    })

    await expect(
      (service as any).executeViaAtlas(
        baseJob({ job_type: 'slack_period_import', title: 'Analyze Slack #sales' }),
      ),
    ).resolves.toMatchObject({
      status: 'skipped',
      reason: 'Nothing to save from that Slack period.',
      chunks_processed: 0,
    })
    expect(callOpenClawForBrainJob).not.toHaveBeenCalled()
  })

  it('treats Slack Atlas empty-ingest failures as skipped jobs', async () => {
    const callOpenClawForBrainJob = vi.fn().mockResolvedValue({
      content: 'JOB_STATUS:failed — The Slack period contains no message content to ingest',
    })
    const service = new BrainImportJobsService({ get: vi.fn() } as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })
    vi.spyOn(service as any, 'buildMissionInput').mockResolvedValue({
      targetBrain: 'user',
      contentType: 'slack_period',
      title: 'Analyze Slack #sales',
      input: { content: 'A real Slack digest with enough text to send to Atlas.' },
    })

    await expect(
      (service as any).executeViaAtlas(
        baseJob({ job_type: 'slack_period_import', title: 'Analyze Slack #sales' }),
      ),
    ).resolves.toMatchObject({
      status: 'skipped',
      reason: 'Nothing to save from that Slack period.',
    })
    expect(callOpenClawForBrainJob).toHaveBeenCalled()
  })

  it('runs campaign file jobs through Atlas OpenClaw (no direct CampaignsService path)', async () => {
    const callOpenClawForBrainJob = vi
      .fn()
      .mockResolvedValue({ content: 'JOB_STATUS:completed\nsaved' })
    const moduleRef = { get: vi.fn() }
    const service = new BrainImportJobsService(moduleRef as any)
    ;(service as any).getGateway = () => ({ callOpenClawForBrainJob })

    const result = await (service as any).executeViaAtlas(
      baseJob({
        job_type: 'campaign_file_import',
        title: 'File import',
        user_id: 'user-2',
        payload: {
          campaignId: 'camp-2',
          title: 'File import',
          content: 'Useful content',
          sourceType: 'upload',
          domain: 'general',
        },
      }),
    )

    expect(callOpenClawForBrainJob).toHaveBeenCalledWith(
      'user-2',
      'atlas',
      expect.any(String),
      expect.any(String),
      'camp-2',
      'campaign',
      undefined,
      null,
      { lane: 'brain-import:job-1' },
    )
    expect(result).toMatchObject({
      status: 'completed',
      chunks_processed: 1,
    })
  })

  it('classifies Fly credit exhaustion as non-transient', () => {
    const service = new BrainImportJobsService({ get: vi.fn() } as any)
    const isCreditsExhausted = (message: string) =>
      (service as any).isCreditsExhaustedError(message)

    expect(
      isCreditsExhausted(
        'Agent request failed (402): {"error":"credits_exhausted","message":"You have run out of credits."}',
      ),
    ).toBe(true)
    expect(isCreditsExhausted('Gateway connection error: fetch failed')).toBe(false)
  })

  it('classifies provider rate limits and keeps them out of gateway wake-ups', () => {
    const service = new BrainImportJobsService({ get: vi.fn() } as any)
    const isRateLimit = (message: string) => (service as any).isRateLimitError(message)
    const isUnavailable = (message: string) => (service as any).isAgentUnavailableError(message)
    const format = (message: string) => (service as any).formatJobFailureMessage(message)

    expect(
      isRateLimit(
        'provider_error: All models failed (4): openrouter/anthropic/claude-opus-4.6: API rate limit reached. (rate_limit)',
      ),
    ).toBe(true)
    expect(isUnavailable('OpenClaw stream failed')).toBe(false)
    expect(isUnavailable('Gateway connection error: fetch failed')).toBe(true)
    expect(format('API rate limit reached. (rate_limit)')).toContain('rate limit')
    expect((service as any).getBackoffMs(1, 'API rate limit reached')).toBe(15 * 60 * 1000)
  })

  it('dedupes runtime BullMQ jobs by brain import job id', async () => {
    const queue = { add: vi.fn().mockResolvedValue({}) }
    const service = new BrainImportJobsService(
      { get: vi.fn() } as any,
      undefined as any,
      new BrainImportJobsRuntimeRepository(),
      queue as any,
    )

    await (service as any).enqueueRuntimeJob('job-1')
    await (service as any).enqueueRuntimeJob('job-1', 30_000)

    expect(queue.add).toHaveBeenCalledTimes(2)
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'brain-import-job',
      { jobId: 'job-1' },
      expect.objectContaining({
        delay: 0,
        jobId: 'brain-import-job-1',
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 1,
      }),
    )
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'brain-import-job',
      { jobId: 'job-1' },
      expect.objectContaining({
        delay: 30_000,
        jobId: 'brain-import-job-1',
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 1,
      }),
    )
  })
})
