import type { ConfigService } from '@nestjs/config'
import { describe, expect, it, vi } from 'vitest'
import { VALID_ACTIONS } from '../dtos/artifact-action.dto'
import { ACTION_METHOD_MAP } from './artifact-action.registry'
import { ArtifactMissionsMediaService } from './artifact-missions-media.service'
import type { ArtifactPostActionVerifier } from './artifact-post-action-verification.service'
import { ArtifactsService } from './artifacts.service'

const stubMissionsMedia = new ArtifactMissionsMediaService({
  loadCookiesForYtDlp: vi.fn(async () => null),
} as any)
const TEST_CONVERSATION_ID = '11111111-1111-4111-8111-111111111111'
const TEST_SESSION_KEY = `agent:vibey:user-1:${TEST_CONVERSATION_ID}`
const VALID_PRESENTATION_DATA = {
  name: 'Smoke Deck',
  source_mode: 'html_bundle',
  entry_file: 'index.html',
  files: [
    {
      path: 'index.html',
      role: 'entry',
      content: '<!doctype html><html><body><section>Smoke deck</section></body></html>',
    },
  ],
}

function makeConfigMock(): ConfigService {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
      throw new Error(`Unexpected getOrThrow key: ${key}`)
    }),
    get: vi.fn((_key: string, fallback?: string) => fallback ?? ''),
  } as unknown as ConfigService
}

function makeService(options?: {
  activeWorkingSet?: Record<string, unknown>
  scope?: Record<string, unknown>
  docsSearch?: { search: (data: Record<string, unknown>) => Promise<unknown> }
  spaceRetrievalService?: {
    search: (supabase: unknown, input: Record<string, unknown>) => Promise<unknown>
  }
  postActionVerifier?: ArtifactPostActionVerifier
}): any {
  const mcpActions = VALID_ACTIONS.filter((a) => a.includes('mcp'))
  const mcpHandlers = Object.fromEntries(mcpActions.map((a) => [a, vi.fn()]))
  const artifactMcpService = { getHandlers: () => mcpHandlers }
  const requestContext = {
    get: vi.fn(),
    set: vi.fn(),
    getScope: vi.fn(() => options?.scope ?? null),
    getActiveWorkingSet: vi.fn(
      () => options?.activeWorkingSet ?? { byType: {}, lastTouched: null },
    ),
    setActiveArtifact: vi.fn(),
  }

  const service = new ArtifactsService(
    makeConfigMock(),
    { logError: vi.fn() } as any,
    requestContext as any,
    {} as any,
    {} as any,
    { tagMemory: vi.fn() } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    stubMissionsMedia,
    undefined,
    undefined,
    artifactMcpService as any,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    options?.docsSearch as any,
    undefined,
    options?.spaceRetrievalService as any,
  ) as any

  service.setPostActionVerifierForTests?.(
    options?.postActionVerifier ?? {
      verify: vi.fn(async () => ({ status: 'verified' as const, checks: [] })),
    },
  )

  return service
}

describe('ArtifactsService action registry characterization', () => {
  it('keeps action envelope aligned with dto + method mapping', () => {
    const mappedActions = Object.keys(ACTION_METHOD_MAP).sort()
    const dtoActions = [...VALID_ACTIONS].sort()
    expect(mappedActions).toEqual(dtoActions)
  })

  it('builds handlers for every action in the action dto', () => {
    const service = makeService()
    const registry = service.getActionRegistryForTests() as Record<string, unknown>
    for (const action of VALID_ACTIONS) {
      expect(typeof registry[action]).toBe('function')
    }
  })

  it('describes an action contract through the action registry', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))

    const result = await service.executeAction(
      'describe_action',
      { action_name: 'update_presentation' },
      'agent:x:stub',
    )

    expect(result).toMatchObject({
      success: true,
      action: 'update_presentation',
      optional: expect.arrayContaining(['name', 'generated_html']),
      aliases: { title: 'name' },
    })
  })

  it('rejects on-hold Projects and Supabase actions before authz and handler dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().create_project = vi.fn(async () => ({ success: true }))
    service.getActionRegistryForTests().supabase_run_sql = vi.fn(async () => ({ success: true }))

    const projectResult = await service.executeAction(
      'create_project',
      { name: 'Paused app' },
      TEST_SESSION_KEY,
    )
    const supabaseResult = await service.executeAction(
      'supabase_run_sql',
      { project_id: 'project-1', sql: 'select 1' },
      TEST_SESSION_KEY,
    )

    for (const result of [projectResult, supabaseResult]) {
      expect(result).toMatchObject({
        success: false,
        error_code: 'ACTION_ON_HOLD',
        error_class: 'validation',
        effect_state: 'failed_before_effect',
        retry_policy: {
          mode: 'do_not_retry_terminal',
          reason: expect.stringContaining('Do not retry the same action'),
        },
      })
      expect(String(result.error)).toContain('not available to agents')
    }
    expect(service.authorizeAction).not.toHaveBeenCalled()
    expect(service.getActionRegistryForTests().create_project).not.toHaveBeenCalled()
    expect(service.getActionRegistryForTests().supabase_run_sql).not.toHaveBeenCalled()
  })

  it('dispatches hosted Vibey MCP docs search through the registry contract', async () => {
    const docsSearch = {
      search: vi.fn(async () => ({
        citations: [{ slug: 'campaigns/campaign-dashboard', title: 'Campaign Dashboard' }],
      })),
    }
    const service = makeService({ docsSearch })
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))

    const result = await service.executeAction(
      'search_vibey_docs',
      { query: 'campaign dashboard', match_count: 1 },
      'agent:x:stub',
    )

    expect(result).toEqual({
      citations: [{ slug: 'campaigns/campaign-dashboard', title: 'Campaign Dashboard' }],
    })
    expect(docsSearch.search).toHaveBeenCalledWith({ query: 'campaign dashboard', match_count: 1 })
  })

  it('dispatches Space context search with active scope defaults', async () => {
    vi.stubEnv('SCOPE_V2_DEFAULTS', 'all')
    const spaceRetrievalService = {
      search: vi.fn(async () => ({
        success: true,
        query: 'retainer guardrails',
        count: 1,
        context_sufficient: true,
        results: [],
      })),
    }
    const service = makeService({
      scope: {
        space_id: '00000000-0000-4000-8000-000000000001',
        campaign_id: '00000000-0000-4000-8000-000000000002',
        scope_kind: 'campaign',
        org_id: 'org-1',
      },
      spaceRetrievalService,
    })
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.resolveUserId = vi.fn(() => 'user-1')
    service.resolveOrgId = vi.fn(() => 'org-1')
    const userClient = { from: vi.fn() }
    service.getUserClient = vi.fn(async () => userClient)

    const result = await service.executeAction(
      'search_space_context',
      { query: 'retainer guardrails', source_types: ['space_doc'], limit: 7 },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({ success: true, query: 'retainer guardrails' })
    expect(spaceRetrievalService.search).toHaveBeenCalledWith(
      userClient,
      expect.objectContaining({
        query: 'retainer guardrails',
        userId: 'user-1',
        orgId: 'org-1',
        spaceId: '00000000-0000-4000-8000-000000000001',
        campaignId: '00000000-0000-4000-8000-000000000002',
        sourceTypes: ['space_doc'],
        limit: 7,
      }),
    )
    vi.unstubAllEnvs()
  })

  it('dispatches critical action envelopes through the registry contract', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))

    service.createOffer = vi.fn(async () => ({ success: true, id: 'offer-1' }))
    service.createFunnel = vi.fn(async () => ({ success: true, id: 'funnel-1' }))
    service.createPresentation = vi.fn(async () => ({ success: true, id: 'lm-1' }))
    service.patchState = vi.fn(async () => ({ success: true }))
    service.useIntegration = vi.fn(async () => ({ success: true }))
    service.generateImage = vi.fn(async () => ({
      success: true,
      image_url: 'https://example.com/a.png',
    }))
    service.createMission = vi.fn(async () => ({ id: 'mission-1', status: 'inbox' }))
    service.getActionRegistryForTests().create_pdf = vi.fn(async () => ({
      success: true,
      id: 'pdf-1',
    }))
    service.getActionRegistryForTests().create_docx = vi.fn(async () => ({
      success: true,
      id: 'docx-1',
    }))

    expect(await service.executeAction('create_offer', {}, 'agent:x:stub')).toEqual({
      success: true,
      id: 'offer-1',
    })
    expect(await service.executeAction('create_funnel', {}, 'agent:x:stub')).toEqual({
      success: true,
      id: 'funnel-1',
    })
    expect(
      await service.executeAction('create_presentation', VALID_PRESENTATION_DATA, 'agent:x:stub'),
    ).toEqual({ success: true, id: 'lm-1' })
    expect(await service.executeAction('create_pdf', {}, 'agent:x:stub')).toEqual({
      success: true,
      id: 'pdf-1',
    })
    expect(
      await service.executeAction(
        'create_docx',
        { title: 'DOCX', content: 'Body' },
        'agent:x:stub',
      ),
    ).toEqual({
      success: true,
      id: 'docx-1',
    })
    expect(await service.executeAction('patch_state', {}, 'agent:x:stub')).toEqual({
      success: true,
    })
    expect(
      await service.executeAction(
        'use_integration',
        { service: 'stripe', integration_action: 'list_customers' },
        'agent:x:stub',
      ),
    ).toEqual({
      success: true,
    })
    expect(
      await service.executeAction(
        'use_integration',
        { service: 'stripe', action: 'list_customers' },
        'agent:x:stub',
      ),
    ).toEqual({
      success: true,
    })
    expect(service.useIntegration).toHaveBeenLastCalledWith(
      { service: 'stripe', integration_action: 'list_customers' },
      'agent:x:stub',
    )
    expect(await service.executeAction('generate_image', {}, 'agent:x:stub')).toEqual({
      success: true,
      image_url: 'https://example.com/a.png',
    })
    service.analyzeImage = vi.fn(async () => ({ success: true, analyses: [] }))
    expect(
      await service.executeAction(
        'analyze_image',
        { image_url: 'https://example.com/a.png' },
        'agent:x:stub',
      ),
    ).toEqual({
      success: true,
      analyses: [],
    })
    expect(
      await service.executeAction('create_mission', { title: 'Mission smoke' }, 'agent:x:stub'),
    ).toEqual({
      id: 'mission-1',
      status: 'inbox',
    })
  })

  it('rejects conflicting canonical and alias keys before dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().get_task = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'get_task',
      { space_id: 'space-1', task_id: 'task-1', taskId: 'task-2' },
      'agent:x:stub',
    )

    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('taskId->task_id')
    expect(result).toMatchObject({
      error_code: 'ARTIFACT_SCHEMA_CONFLICT',
      error_class: 'validation',
      reliability: 'high_confidence',
      effect_state: 'failed_before_effect',
      retry_policy: {
        mode: 'retry_with_corrected_payload',
        max_attempts: 1,
      },
    })
    expect(String(result.agent_instruction)).toContain('conflicting alias pair')
    expect(service.getActionRegistryForTests().get_task).not.toHaveBeenCalled()
  })

  it('rejects missing non-resolvable required fields after authorization and before dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().list_agent_skills = vi.fn(async () => ({
      success: true,
    }))

    const result = await service.executeAction(
      'list_agent_skills',
      { space_id: 'space-1' },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: false,
      error: 'agent_key is required for list_agent_skills',
      error_code: 'ARTIFACT_SCHEMA_VALIDATION',
      error_class: 'validation',
      reliability: 'high_confidence',
      retry_policy: {
        mode: 'retry_with_corrected_payload',
        max_attempts: 1,
      },
    })
    expect(String(result.agent_instruction)).toContain('correct the named field')
    expect(service.authorizeAction).toHaveBeenCalledWith(
      'list_agent_skills',
      { space_id: 'space-1' },
      TEST_SESSION_KEY,
    )
    expect(service.getActionRegistryForTests().list_agent_skills).not.toHaveBeenCalled()
  })

  it('rejects process_media operation mistakes before handler dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().process_media = vi.fn(async () => ({
      success: true,
    }))

    const result = await service.executeAction(
      'process_media',
      { operation: 'trim', url: 'https://example.com/video.mp4' },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_ACTION_PREFLIGHT',
      error_class: 'validation',
      effect_state: 'failed_before_effect',
    })
    expect(String(result.error)).toMatch(/duration_seconds/i)
    expect(service.getActionRegistryForTests().process_media).not.toHaveBeenCalled()
  })

  it('rejects analyze_video source/settings mistakes before handler dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().analyze_video = vi.fn(async () => ({
      success: true,
    }))

    const result = await service.executeAction(
      'analyze_video',
      {
        media_url: 'https://example.com/video.mp4',
        extract_frames: false,
        transcribe: false,
      },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_ACTION_PREFLIGHT',
      error_class: 'validation',
      effect_state: 'failed_before_effect',
    })
    expect(String(result.error)).toMatch(/extract_frames|transcribe/i)
    expect(service.getActionRegistryForTests().analyze_video).not.toHaveBeenCalled()
  })

  it('dispatches transcribe_audio with normalized audio source fields', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().transcribe_audio = vi.fn(async () => ({
      success: true,
      analysis: { transcript: 'hello', transcript_segments: [] },
    }))

    const result = await service.executeAction(
      'transcribe_audio',
      { audioUrl: 'https://example.com/voice.ogg' },
      TEST_SESSION_KEY,
    )

    expect(result).toEqual({
      success: true,
      analysis: { transcript: 'hello', transcript_segments: [] },
    })
    expect(service.getActionRegistryForTests().transcribe_audio).toHaveBeenCalledWith(
      { media_url: 'https://example.com/voice.ogg' },
      TEST_SESSION_KEY,
      undefined,
    )
  })

  it('rejects contact array replacements without confirmation before handler dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().update_contact = vi.fn(async () => ({
      success: true,
    }))

    const result = await service.executeAction(
      'update_contact',
      { contact_id: 'contact-1', tags: ['vip'] },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_ACTION_PREFLIGHT',
      error_class: 'validation',
      effect_state: 'failed_before_effect',
    })
    expect(String(result.error)).toContain('confirm_replace_arrays')
    expect(service.getActionRegistryForTests().update_contact).not.toHaveBeenCalled()
  })

  it('rejects use_integration malformed params before handler dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.resolveUserId = vi.fn(() => 'user-1')
    service.getUserClient = vi.fn(async () => ({}))
    service.integrationsRepository = {
      listDetailedCapabilities: vi.fn(async () => ({
        data: [
          {
            action_slug: 'send_email',
            parameters: { required: ['subject'] },
          },
        ],
        error: null,
      })),
    }
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'use_integration',
      { service: 'gmail', integration_action: 'send_email', params: {} },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_ACTION_PREFLIGHT',
      error_class: 'validation',
      effect_state: 'failed_before_effect',
    })
    expect(String(result.error)).toMatch(/params/i)
    expect(service.useIntegration).not.toHaveBeenCalled()
  })

  it('rejects use_mcp_tool malformed arguments before handler dispatch', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().use_mcp_tool = vi.fn(async () => ({
      success: true,
    }))

    const result = await service.executeAction(
      'use_mcp_tool',
      { server_name: 'docs', tool_name: 'search', arguments: 'query=docs' },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_ACTION_PREFLIGHT',
      error_class: 'validation',
      effect_state: 'failed_before_effect',
    })
    expect(String(result.error)).toMatch(/arguments/i)
    expect(service.getActionRegistryForTests().use_mcp_tool).not.toHaveBeenCalled()
  })

  it('returns authorization denial before required field hints', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({
      allowed: false,
      reason: 'Action is restricted to another agent.',
    }))
    service.getActionRegistryForTests().list_agent_skills = vi.fn(async () => ({
      success: true,
    }))

    const result = await service.executeAction(
      'list_agent_skills',
      { space_id: 'space-1' },
      TEST_SESSION_KEY,
    )

    expect((result as { success?: boolean }).success).toBe(false)
    expect(String((result as { error?: string }).error)).toContain(
      'Action is restricted to another agent.',
    )
    expect(String((result as { error?: string }).error)).not.toContain('agent_key is required')
    expect(service.getActionRegistryForTests().list_agent_skills).not.toHaveBeenCalled()
  })

  it('normalizes plain failed handler results into the agent tool error contract', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.createOffer = vi.fn(async () => ({
      success: false,
      message: 'offer_id is required',
      source: 'handler',
    }))

    const result = await service.executeAction('create_offer', {}, TEST_SESSION_KEY)

    expect(result).toMatchObject({
      success: false,
      message: 'offer_id is required',
      source: 'handler',
      error: 'offer_id is required',
      error_code: 'ARTIFACT_VALIDATION',
      error_class: 'validation',
      reliability: 'probable',
      effect_state: 'failed_before_effect',
      retry_policy: {
        mode: 'retry_with_corrected_payload',
        max_attempts: 1,
        stop_after_same_error: true,
      },
      correction: {
        summary: 'Fix the named missing or invalid fields before retrying.',
      },
      user_explanation: {
        intent: 'correct_and_retry',
        sentence: expect.stringContaining('let me adjust and try again'),
      },
      forbidden_user_framing: expect.arrayContaining(['platform error', 'internal issue']),
    })
  })

  it('preserves structured failed handler contracts returned by leaf actions', async () => {
    const service = makeService()
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    const leafContract = {
      success: false,
      error: 'Presentation was saved, but preview delivery failed',
      error_code: 'ARTIFACT_DELIVERY_FAILED',
      error_class: 'platform_data_query_failed',
      reliability: 'high_confidence',
      effect_state: 'succeeded_delivery_failed',
      retry_policy: {
        mode: 'do_not_retry_use_fallback',
        max_attempts: 0,
        stop_after_same_error: true,
        reason: 'The artifact is already saved; use another delivery path.',
      },
      correction: {
        summary: 'Use a different delivery path for the saved artifact.',
      },
      fallback: {
        summary: 'Offer PDF or image export for the saved artifact.',
      },
      agent_diagnosis: 'The artifact save completed and only preview delivery failed.',
      agent_instruction: 'Continue from the saved artifact and choose an alternate delivery path.',
      user_explanation: {
        intent: 'use_alternate_delivery',
        sentence: 'The slides were saved, so I will show them another way.',
      },
      forbidden_user_framing: ['platform error', 'platform rendering issue', 'internal issue'],
      observability: {
        fingerprint: 'artifact.delivery_failed',
        report_level: 'warn',
      },
    }
    service.createPresentation = vi.fn(async () => leafContract)

    const result = await service.executeAction(
      'create_presentation',
      VALID_PRESENTATION_DATA,
      TEST_SESSION_KEY,
    )

    expect(result).toBe(leafContract)
    expect(result).toMatchObject({
      error_code: 'ARTIFACT_DELIVERY_FAILED',
      effect_state: 'succeeded_delivery_failed',
      user_explanation: {
        sentence: 'The slides were saved, so I will show them another way.',
      },
    })
  })

  it('runs post-action verification before returning successful handler results', async () => {
    const verifier: ArtifactPostActionVerifier = {
      verify: vi.fn(async () => ({ status: 'verified', checks: [] })),
    }
    const service = makeService({ postActionVerifier: verifier })
    const successResult = { success: true, id: 'offer-1' }
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.createOffer = vi.fn(async () => successResult)

    const result = await service.executeAction('create_offer', { title: 'Offer' }, TEST_SESSION_KEY)

    expect(result).toBe(successResult)
    expect(verifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create_offer',
        data: { title: 'Offer' },
        result: successResult,
        sessionKey: TEST_SESSION_KEY,
      }),
    )
  })

  it('skips post-action verification when the handler already failed', async () => {
    const verifier: ArtifactPostActionVerifier = {
      verify: vi.fn(async () => ({ status: 'verified', checks: [] })),
    }
    const service = makeService({ postActionVerifier: verifier })
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.createOffer = vi.fn(async () => ({
      success: false,
      error: 'offer_id is required',
    }))

    const result = await service.executeAction('create_offer', {}, TEST_SESSION_KEY)

    expect((result as { success?: boolean }).success).toBe(false)
    expect(verifier.verify).not.toHaveBeenCalled()
  })

  it('returns structured delivery failure when post-action verification fails', async () => {
    const failureResult = {
      success: false,
      error: 'Offer was created, but delivery could not be verified.',
      error_code: 'ARTIFACT_DELIVERY_FAILED',
      error_class: 'platform_data_query_failed',
      reliability: 'high_confidence',
      effect_state: 'succeeded_delivery_failed',
      retry_policy: {
        mode: 'do_not_retry_use_fallback',
        max_attempts: 0,
        stop_after_same_error: true,
      },
      fallback: {
        summary: 'Use a different delivery path for the saved artifact.',
      },
    }
    const verifier: ArtifactPostActionVerifier = {
      verify: vi.fn(async () => ({
        status: 'failed',
        checks: [],
        failureResult,
      })),
    }
    const service = makeService({ postActionVerifier: verifier })
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.createOffer = vi.fn(async () => ({ success: true, id: 'offer-1' }))

    const result = await service.executeAction('create_offer', { title: 'Offer' }, TEST_SESSION_KEY)

    expect(result).toBe(failureResult)
    expect(result).toMatchObject({
      error_code: 'ARTIFACT_DELIVERY_FAILED',
      effect_state: 'succeeded_delivery_failed',
      retry_policy: {
        mode: 'do_not_retry_use_fallback',
      },
    })
  })

  it('preserves durable output receipts when post-action verification fails after creation', async () => {
    const receipt = {
      type: 'artifact_preview',
      id: 'artifact-presentation-presentation-1',
      artifactType: 'presentation',
      artifactId: 'presentation-1',
      name: 'Titan Medical Strategy Deck',
      status: 'draft',
    }
    const verifier: ArtifactPostActionVerifier = {
      verify: vi.fn(async () => ({
        status: 'failed',
        checks: [],
        failureResult: {
          success: false,
          error: 'Presentation requires source repair.',
          error_code: 'ARTIFACT_PRESENTATION_CONTRACT_REPAIR_REQUIRED',
          effect_state: 'partial_effect',
        },
      })),
    }
    const service = makeService({ postActionVerifier: verifier })
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.createPresentation = vi.fn(async () => ({
      success: true,
      id: 'presentation-1',
      ui_blocks: [receipt],
    }))

    const result = await service.executeAction(
      'create_presentation',
      { ...VALID_PRESENTATION_DATA, name: 'Titan Medical Strategy Deck' },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: false,
      effect_state: 'partial_effect',
      ui_blocks: [receipt],
    })
  })

  it('fills a missing presentation_id before schema validation and dispatch', async () => {
    vi.stubEnv('ARTIFACT_RESOLVER_V1', 'true')
    const service = makeService({
      activeWorkingSet: {
        byType: {
          presentation: [
            {
              type: 'presentation',
              id: 'deck-1',
              label: 'Launch Deck',
              campaign_id: 'campaign-1',
              source: 'user_attached',
              updated_at: 100,
            },
          ],
        },
        lastTouched: null,
      },
      scope: { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    })
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().patch_presentation = vi.fn(async (data) => ({
      success: true,
      received: data,
    }))

    const result = await service.executeAction(
      'patch_presentation',
      { value: 'Sharper headline' },
      TEST_SESSION_KEY,
    )

    expect(result).toEqual({
      success: true,
      received: { value: 'Sharper headline', campaign_id: 'campaign-1', presentation_id: 'deck-1' },
    })
    expect(service.getActionRegistryForTests().patch_presentation).toHaveBeenCalledWith(
      { value: 'Sharper headline', campaign_id: 'campaign-1', presentation_id: 'deck-1' },
      TEST_SESSION_KEY,
      undefined,
    )
    vi.unstubAllEnvs()
  })

  it('returns a clarification block instead of dispatching ambiguous target edits', async () => {
    vi.stubEnv('ARTIFACT_RESOLVER_V1', 'true')
    const service = makeService({
      activeWorkingSet: {
        byType: {
          presentation: [
            {
              type: 'presentation',
              id: 'deck-1',
              label: 'Launch Deck',
              campaign_id: 'campaign-1',
              source: 'user_attached',
              updated_at: 100,
            },
            {
              type: 'presentation',
              id: 'deck-2',
              label: 'Sales Deck',
              campaign_id: 'campaign-1',
              source: 'user_attached',
              updated_at: 101,
            },
          ],
        },
        lastTouched: null,
      },
      scope: { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    })
    service.authorizeAction = vi.fn(async () => ({ allowed: true }))
    service.getActionRegistryForTests().patch_presentation = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'patch_presentation',
      { value: 'Sharper headline' },
      TEST_SESSION_KEY,
    )

    expect(result).toMatchObject({
      success: true,
      ui_blocks: [
        {
          type: 'clarification',
          title: 'Which artifact should I update?',
          status: 'pending',
        },
      ],
    })
    expect(
      (result as { ui_blocks: Array<{ questions: Array<{ options: unknown[] }> }> }).ui_blocks[0]
        ?.questions[0]?.options,
    ).toHaveLength(2)
    expect(service.getActionRegistryForTests().patch_presentation).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
