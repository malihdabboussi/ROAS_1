import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentRuntimeBrainImportProcessor } from './agent-runtime-brain-import.processor'

function makeConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'missionApi.mainApiUrl') return 'http://main-api.local/'
      if (key === 'missionApi.agentApiUrl') return 'http://agent-api.local/'
      if (key === 'missionApi.internalToken') return 'internal-token'
      return undefined
    }),
  }
}

function makeWorkerLogger() {
  return {
    logError: vi.fn(async () => undefined),
  }
}

describe('AgentRuntimeBrainImportProcessor', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('executes concrete brain import jobs through the internal Agent API executor', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: vi.fn(async () => ''),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const processor = new AgentRuntimeBrainImportProcessor(
      makeConfig() as never,
      makeWorkerLogger() as never,
    )

    await processor.process({
      id: 'runtime-job-1',
      name: 'brain-import-job',
      data: { jobId: 'import-job-1' },
    } as never)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://agent-api.local/api/internal/brain/import-jobs/import-job-1/execute',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-internal-token': 'internal-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ jobId: 'import-job-1' }),
      }),
    )
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain(
      'http://main-api.local/api/internal/brain/import-jobs/import-job-1/process',
    )
  })

  it('executes sweep jobs through the internal due-job enqueue endpoint', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 202,
      text: vi.fn(async () => ''),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const processor = new AgentRuntimeBrainImportProcessor(
      makeConfig() as never,
      makeWorkerLogger() as never,
    )

    await processor.process({
      id: 'runtime-sweep-1',
      name: 'brain-import-sweep',
      data: {},
    } as never)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://main-api.local/api/internal/brain/import-jobs/enqueue-due',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer internal-token',
        }),
        body: '{}',
      }),
    )
  })

  it('retries transient Main API enqueue failures before completing the sweep', async () => {
    vi.stubEnv('AGENT_RUNTIME_BRAIN_IMPORT_MAIN_API_MAX_ATTEMPTS', '2')
    vi.stubEnv('AGENT_RUNTIME_BRAIN_IMPORT_MAIN_API_RETRY_DELAY_MS', '1')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: vi.fn(async () => 'upstream error'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        text: vi.fn(async () => ''),
      })
    vi.stubGlobal('fetch', fetchMock)
    const workerLogger = makeWorkerLogger()
    const processor = new AgentRuntimeBrainImportProcessor(
      makeConfig() as never,
      workerLogger as never,
    )

    await processor.process({
      id: 'runtime-sweep-1',
      name: 'brain-import-sweep',
      data: {},
    } as never)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(workerLogger.logError).not.toHaveBeenCalled()
  })

  it('logs Main API request context when sweep enqueue cannot reach the API', async () => {
    vi.stubEnv('AGENT_RUNTIME_BRAIN_IMPORT_MAIN_API_MAX_ATTEMPTS', '2')
    vi.stubEnv('AGENT_RUNTIME_BRAIN_IMPORT_MAIN_API_RETRY_DELAY_MS', '1')
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    vi.stubGlobal('fetch', fetchMock)
    const workerLogger = makeWorkerLogger()
    const processor = new AgentRuntimeBrainImportProcessor(
      makeConfig() as never,
      workerLogger as never,
    )

    await expect(
      processor.process({
        id: 'runtime-sweep-1',
        name: 'brain-import-sweep',
        data: {},
      } as never),
    ).rejects.toThrow(
      'Main API brain import runtime request failed path=/api/internal/brain/import-jobs/enqueue-due',
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(workerLogger.logError).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        error_code: 'main_api_request_failed',
        context: expect.objectContaining({
          path: '/api/internal/brain/import-jobs/enqueue-due',
          targetOrigin: 'http://main-api.local',
          attempt: 2,
          maxAttempts: 2,
          retryable: true,
        }),
      }),
    )
    expect(workerLogger.logError).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        error_code: 'processor_failed',
        context: expect.objectContaining({
          bullJobId: 'runtime-sweep-1',
          jobName: 'brain-import-sweep',
          path: '/api/internal/brain/import-jobs/enqueue-due',
          targetOrigin: 'http://main-api.local',
          attempt: 2,
          maxAttempts: 2,
        }),
      }),
    )
  })
})
