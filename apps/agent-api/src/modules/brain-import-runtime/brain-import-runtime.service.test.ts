import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainImportRuntimeService } from './services/brain-import-runtime.service'

function makeConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'MAIN_API_URL') return 'http://main-api.local/'
      if (key === 'INTERNAL_API_TOKEN') return 'internal-token'
      return undefined
    }),
  }
}

function makeClaimResponse() {
  return {
    success: true,
    claimed: true,
    job_id: 'import-job-1',
    attempts: 1,
    execution: {
      jobId: 'import-job-1',
      userId: 'user-1',
      orgId: 'org-1',
      jobType: 'document_remember',
      title: 'Doc',
      attempts: 1,
      agentKey: 'atlas',
      targetBrain: 'user',
      contentType: 'document',
      brainId: 'brain-1',
      lane: 'brain-import:import-job-1',
      systemPrompt: 'system prompt',
      chunksTotal: 1,
      chunks: [{ index: 0, total: 1, userPrompt: 'user prompt' }],
    },
  }
}

describe('BrainImportRuntimeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  function makeRuntimeDeps() {
    return {
      agentRuntime: {
        resolveGatewayAgentId: vi.fn(() => 'org-org-1-atlas'),
      },
      runtimeReadiness: {
        ensureRuntimeReady: vi.fn(async () => ({ ready: true })),
      },
    }
  }

  it('claims from API, executes Atlas through agent-api, and marks the job succeeded', async () => {
    const artifacts = {
      proxyOpenClawResponses: vi.fn(async () => ({
        content: 'JOB_STATUS:completed — imported',
      })),
    }
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/claim')) {
        return new Response(JSON.stringify(makeClaimResponse()), { status: 200 })
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const { agentRuntime, runtimeReadiness } = makeRuntimeDeps()
    const service = new BrainImportRuntimeService(
      makeConfig() as never,
      artifacts as never,
      agentRuntime as never,
      runtimeReadiness as never,
    )

    await expect(service.execute('import-job-1')).resolves.toEqual({
      type: 'terminal',
      status: 'done',
      job_id: 'import-job-1',
      result: {
        status: 'completed',
        reason: 'imported',
        chunks_processed: 1,
        atlasResponse: 'JOB_STATUS:completed — imported',
      },
    })

    expect(artifacts.proxyOpenClawResponses).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openclaw:org-org-1-atlas',
        stream: false,
        lane: 'brain-import:import-job-1',
        input: 'user prompt',
        instructions: 'system prompt',
        metadata: expect.objectContaining({
          user_id: 'user-1',
          agent_key: 'atlas',
          org_id: 'org-1',
        }),
      }),
      expect.stringContaining('agent:org-org-1-atlas:atlas-brain-job-user-1'),
      'org-org-1-atlas',
      expect.objectContaining({
        correlationId: 'brain-import-import-job-1',
        orgId: 'org-1',
      }),
    )
    expect(agentRuntime.resolveGatewayAgentId).toHaveBeenCalledWith('atlas', 'org-1', 'user-1')
    expect(runtimeReadiness.ensureRuntimeReady).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'atlas',
      gatewayAgentId: 'org-org-1-atlas',
    })
    expect(runtimeReadiness.ensureRuntimeReady.mock.invocationCallOrder[0]).toBeLessThan(
      artifacts.proxyOpenClawResponses.mock.invocationCallOrder[0],
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://main-api.local/api/internal/brain/import-jobs/import-job-1/claim',
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://main-api.local/api/internal/brain/import-jobs/import-job-1/progress',
      expect.any(Object),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://main-api.local/api/internal/brain/import-jobs/import-job-1/succeed',
      expect.any(Object),
    )
    expect(fetchMock.mock.calls.map(([url]) => String(url))).not.toContain(
      'http://main-api.local/api/internal/brain/import-jobs/import-job-1/process',
    )
  })

  it('marks the API-owned job lifecycle failed when Atlas execution fails', async () => {
    const artifacts = {
      proxyOpenClawResponses: vi.fn(async () => ({
        content: 'JOB_STATUS:failed — no content',
      })),
    }
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/claim')) {
        return new Response(JSON.stringify(makeClaimResponse()), { status: 200 })
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const { agentRuntime, runtimeReadiness } = makeRuntimeDeps()
    const service = new BrainImportRuntimeService(
      makeConfig() as never,
      artifacts as never,
      agentRuntime as never,
      runtimeReadiness as never,
    )

    await expect(service.execute('import-job-1')).resolves.toEqual(
      expect.objectContaining({
        type: 'terminal',
        status: 'failed',
        job_id: 'import-job-1',
        message: 'Atlas could not process: no content',
      }),
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'http://main-api.local/api/internal/brain/import-jobs/import-job-1/fail',
      expect.objectContaining({
        body: JSON.stringify({
          attempts: 1,
          message: 'Atlas could not process: no content',
        }),
      }),
    )
    expect(runtimeReadiness.ensureRuntimeReady).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'atlas',
      gatewayAgentId: 'org-org-1-atlas',
    })
    expect(agentRuntime.resolveGatewayAgentId).toHaveBeenCalledWith('atlas', 'org-1', 'user-1')
  })
})
