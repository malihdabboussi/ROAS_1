import { describe, expect, it, vi } from 'vitest'

type DreamRunResult = {
  runId: string
  chunksProcessed: number
  sourceCounts: Record<string, number>
  signalsCreated: number
  skipped?: boolean
}

async function loadDailyDreamRunner() {
  const modulePath = './company-daily-dream-runner.service'
  const mod = await import(modulePath)
  expect(mod.CompanyDailyDreamRunnerService).toBeTypeOf('function')
  return mod.CompanyDailyDreamRunnerService as new (deps: {
    runRepository: {
      findByDedupeKey(key: string): Promise<Record<string, unknown> | null>
      createRun(input: Record<string, unknown>): Promise<{ id: string }>
      completeRun(id: string, output: Record<string, unknown>): Promise<void>
    }
    collector: {
      collect(input: Record<string, unknown>): Promise<{
        groups: Array<{ id: string; text: string }>
        sourceCounts: Record<string, number>
      }>
    }
    triage: {
      triageGroups(
        groups: Array<{ id: string; text: string }>,
        options: { maxGroups: number },
      ): Promise<{ included: Array<{ id: string; text: string }> }>
    }
    atlas: {
      runDailyDreamChunk(input: Record<string, unknown>): Promise<{ signals: unknown[] }>
    }
  }) => {
    runDailyDream(input: {
      orgId: string
      brainId: string
      userId: string
      localDate: string
      windowStart: string
      windowEnd: string
      manual?: boolean
    }): Promise<DreamRunResult>
  }
}

describe('CompanyDailyDreamRunnerService contract', () => {
  it('processes 20 conversations inside one org/day dream run with internal chunking', async () => {
    const CompanyDailyDreamRunnerService = await loadDailyDreamRunner()
    const groups = Array.from({ length: 20 }, (_, index) => ({
      id: `conversation-${index + 1}`,
      text: `Conversation ${index + 1}: I love how this feels subtle and useful.`,
    }))
    const runRepository = {
      findByDedupeKey: vi.fn().mockResolvedValue(null),
      createRun: vi.fn().mockResolvedValue({ id: 'run-1' }),
      completeRun: vi.fn().mockResolvedValue(undefined),
    }
    const atlas = {
      runDailyDreamChunk: vi.fn().mockResolvedValue({ signals: [{ type: 'standard' }] }),
    }
    const service = new CompanyDailyDreamRunnerService({
      runRepository,
      collector: {
        collect: vi.fn().mockResolvedValue({
          groups,
          sourceCounts: { conversations: 20, messages: 40 },
        }),
      },
      triage: {
        triageGroups: vi.fn().mockResolvedValue({ included: groups }),
      },
      atlas,
    })

    const result = await service.runDailyDream({
      orgId: 'org-1',
      brainId: 'brain-1',
      userId: 'user-1',
      localDate: '2026-05-18',
      windowStart: '2026-05-18T00:00:00.000Z',
      windowEnd: '2026-05-19T00:00:00.000Z',
    })

    expect(runRepository.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        brain_id: 'brain-1',
        dedupe_key: 'company-dream-org-1-2026-05-18',
      }),
    )
    expect(atlas.runDailyDreamChunk).toHaveBeenCalled()
    expect(atlas.runDailyDreamChunk).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        brainId: 'brain-1',
        userId: 'user-1',
      }),
    )
    expect(result.runId).toBe('run-1')
    expect(result.sourceCounts).toEqual({ conversations: 20, messages: 40 })
    expect(result.chunksProcessed).toBeGreaterThanOrEqual(1)
  })

  it('does not reprocess the same org/day unless manual rerun is requested', async () => {
    const CompanyDailyDreamRunnerService = await loadDailyDreamRunner()
    const runRepository = {
      findByDedupeKey: vi.fn().mockResolvedValue({ id: 'existing-run' }),
      createRun: vi.fn(),
      completeRun: vi.fn(),
    }
    const atlas = { runDailyDreamChunk: vi.fn() }
    const service = new CompanyDailyDreamRunnerService({
      runRepository,
      collector: { collect: vi.fn() },
      triage: { triageGroups: vi.fn() },
      atlas,
    })

    const result = await service.runDailyDream({
      orgId: 'org-1',
      brainId: 'brain-1',
      userId: 'user-1',
      localDate: '2026-05-18',
      windowStart: '2026-05-18T00:00:00.000Z',
      windowEnd: '2026-05-19T00:00:00.000Z',
    })

    expect(result).toMatchObject({ runId: 'existing-run', skipped: true })
    expect(runRepository.createRun).not.toHaveBeenCalled()
    expect(atlas.runDailyDreamChunk).not.toHaveBeenCalled()
  })
})
