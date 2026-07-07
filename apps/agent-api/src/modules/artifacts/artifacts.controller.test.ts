import { BadRequestException, HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactOpenClawProxyController } from './controllers/artifact-openclaw-proxy.controller'
import { ArtifactsController } from './controllers/artifacts.controller'

function makeResponse() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    write: vi.fn(),
    end: vi.fn(),
  }
  return res
}

function makeController(overrides: Record<string, unknown> = {}) {
  const artifactsService = {
    assertCreditsForSession: vi.fn(async () => undefined),
    executeAction: vi.fn(async () => ({ id: 'artifact-1' })),
    proxyOpenClawChatCompletions: vi.fn(async () => ({ ok: true })),
    proxyOpenClawResponses: vi.fn(async () => ({ ok: true })),
    proxyOpenClawResponsesStream: vi.fn(async () => undefined),
    ...overrides,
  }
  const missionContextEnricher = {
    enrichMissionBody: vi.fn(async () => undefined),
  }
  const anthropicClaudeAdminAuth = {
    resolveRuntimeCredential: vi.fn(async () => null),
  }
  const openAICodexAdminAuth = {
    resolveRuntimeCredential: vi.fn(async () => null),
  }

  return {
    controller: new ArtifactsController(artifactsService as never),
    openClawController: new ArtifactOpenClawProxyController(
      artifactsService as never,
      missionContextEnricher as never,
      anthropicClaudeAdminAuth as never,
      openAICodexAdminAuth as never,
    ),
    artifactsService,
    missionContextEnricher,
    anthropicClaudeAdminAuth,
    openAICodexAdminAuth,
  }
}

describe('ArtifactsController', () => {
  it('maps failed artifact action results to BadRequestException without dropping the contract', async () => {
    const failure = {
      success: false,
      error: 'Missing offer id',
      error_code: 'ARTIFACT_VALIDATION',
      error_class: 'validation',
      reliability: 'high_confidence',
      effect_state: 'failed_before_effect',
      retry_policy: {
        mode: 'retry_with_corrected_payload',
        max_attempts: 1,
        stop_after_same_error: true,
        reason: 'Correct the missing offer id before retrying.',
      },
      correction: {
        summary: 'Add offer_id before retrying.',
      },
      fallback: null,
      agent_diagnosis: 'The payload is missing the offer id.',
      agent_instruction: 'Correct the payload before retrying.',
      user_explanation: {
        intent: 'correct_and_retry',
        sentence: 'I need one more detail before I can update that offer.',
      },
      forbidden_user_framing: ['platform error', 'internal issue'],
      observability: {
        fingerprint: 'artifact.validation',
        report_level: 'info',
      },
    }
    const { controller, artifactsService } = makeController({
      executeAction: vi.fn(async () => failure),
    })

    let caught: unknown
    try {
      await controller.handleAction({ action: 'update_offer_step', data: { step: 1 } }, 'session-1')
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(BadRequestException)
    expect((caught as BadRequestException).getResponse()).toEqual(failure)

    expect(artifactsService.assertCreditsForSession).toHaveBeenCalledWith('session-1')
    expect(artifactsService.executeAction).toHaveBeenCalledWith(
      'update_offer_step',
      { step: 1 },
      'session-1',
    )
  })

  it('streams progress, result, done marker, and closes the response', async () => {
    const { controller, artifactsService } = makeController({
      executeAction: vi.fn(async (_action, _data, _sessionKey, onProgress) => {
        await onProgress('Halfway there')
        return { id: 'artifact-1' }
      }),
    })
    const res = makeResponse()

    await controller.handleActionStream(
      { action: 'create_offer', data: { title: 'Offer' } },
      'session-1',
      res as never,
    )

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-transform')
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive')
    expect(artifactsService.assertCreditsForSession).toHaveBeenCalledWith('session-1')
    expect(res.write).toHaveBeenCalledWith(
      'data: {"type":"progress","message":"Halfway there"}\n\n',
    )
    expect(res.write).toHaveBeenCalledWith(
      'data: {"type":"result","result":{"id":"artifact-1"}}\n\n',
    )
    expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n')
    expect(res.end).toHaveBeenCalled()
  })

  it('delegates OpenClaw chat completions with session metadata', async () => {
    const { openClawController, artifactsService } = makeController()
    const body = { metadata: { user_id: 'user-1' }, messages: [] }

    const result = await openClawController.proxyOpenClawChatCompletions(
      body,
      'session-1',
      'gateway-agent',
      'org-1',
    )

    expect(result).toEqual({ ok: true })
    expect(artifactsService.assertCreditsForSession).toHaveBeenCalledWith(
      'session-1',
      body.metadata,
    )
    expect(artifactsService.proxyOpenClawChatCompletions).toHaveBeenCalledWith(
      body,
      'session-1',
      'gateway-agent',
      'org-1',
    )
  })

  it('enriches mission OpenClaw responses before non-stream proxying', async () => {
    const { openClawController, artifactsService, missionContextEnricher } = makeController()
    const body = {
      metadata: {
        user_id: 'user-1',
        agent_key: 'ceo',
        campaign_id: 'campaign-from-metadata',
        org_id: 'org-from-metadata',
      },
      input: [],
    }
    const res = makeResponse()

    await openClawController.proxyOpenClawResponses(
      body,
      'session-1',
      'gateway-agent',
      'correlation-1',
      'mission-1',
      'campaign-header',
      'subtask-1',
      'org-header',
      'identity-1',
      'trace-1',
      'baggage-1',
      res as never,
    )

    expect(artifactsService.assertCreditsForSession).toHaveBeenCalledWith(
      'session-1',
      body.metadata,
      'org-header',
    )
    expect(missionContextEnricher.enrichMissionBody).toHaveBeenCalledWith(
      body,
      'user-1',
      'ceo',
      'campaign-from-metadata',
      'org-from-metadata',
    )
    expect(artifactsService.proxyOpenClawResponses).toHaveBeenCalledWith(
      body,
      'session-1',
      'gateway-agent',
      {
        correlationId: 'correlation-1',
        missionId: 'mission-1',
        subtaskId: 'subtask-1',
        orgId: 'org-header',
        identitySuffix: 'identity-1',
      },
      {
        sentryTrace: 'trace-1',
        baggage: 'baggage-1',
      },
    )
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })

  it('rewrites mission Codex subscription models and attaches runtime credentials', async () => {
    const { openClawController, artifactsService, openAICodexAdminAuth } = makeController()
    openAICodexAdminAuth.resolveRuntimeCredential.mockResolvedValueOnce({
      provider: 'openai-codex',
      accessToken: 'codex-token',
    })
    const body = {
      model: 'openrouter/openai-codex/gpt-5.5',
      metadata: {
        user_id: 'admin-1',
        agent_key: 'atlas',
      },
      input: [],
    }
    const res = makeResponse()

    await openClawController.proxyOpenClawResponses(
      body,
      'session-1',
      'gateway-agent',
      'correlation-1',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      res as never,
    )

    expect(openAICodexAdminAuth.resolveRuntimeCredential).toHaveBeenCalledWith('admin-1')
    expect(body).toMatchObject({
      model: 'openai-codex/gpt-5.5',
      runtime_credentials: [{ provider: 'openai-codex', access_token: 'codex-token' }],
    })
    expect(artifactsService.proxyOpenClawResponses).toHaveBeenCalledWith(
      body,
      'session-1',
      'gateway-agent',
      {
        correlationId: 'correlation-1',
        missionId: undefined,
        subtaskId: undefined,
        orgId: undefined,
        identitySuffix: undefined,
      },
      {},
    )
  })
})
