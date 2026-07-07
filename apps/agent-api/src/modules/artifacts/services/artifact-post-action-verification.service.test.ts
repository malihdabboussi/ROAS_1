import { describe, expect, it, vi, afterEach } from 'vitest'

import { ACTION_METHOD_MAP } from './artifact-action.registry'
import {
  ArtifactPostActionVerificationService,
  type ArtifactPostActionVerificationHost,
} from './artifact-post-action-verification.service'
import {
  classifyPostActionVerificationAction,
  getPostActionVerificationPolicy,
} from './artifact-post-action-verification.config'

const sessionKey = 'agent:vibey:user-1:11111111-1111-1111-1111-111111111111'

function makeReadbackClient(data: Record<string, unknown> | null, error: Error | null = null) {
  const maybeSingle = vi.fn(async () => ({ data, error }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return {
    client: { from },
    from,
    select,
    eq,
    maybeSingle,
  }
}

function makeHost(client: unknown): ArtifactPostActionVerificationHost {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => client),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ArtifactPostActionVerificationService', () => {
  it('classifies every registered artifact action as required or intentionally not required', () => {
    const unclassifiedActions = Object.keys(ACTION_METHOD_MAP).filter(
      (action) => classifyPostActionVerificationAction(action) === 'unclassified',
    )

    expect(unclassifiedActions).toEqual([])
  })

  it('marks read-only actions as not required', () => {
    const policy = getPostActionVerificationPolicy('list_presentations')

    expect(policy.status).toBe('not_required')
    expect(policy.reason).toContain('read-only')
  })

  it('fails a write action when no technical proof is returned', async () => {
    const verifier = new ArtifactPostActionVerificationService()
    const outcome = await verifier.verify({
      host: makeHost(makeReadbackClient(null).client),
      action: 'create_presentation',
      data: { title: 'Launch' },
      result: { success: true },
      sessionKey,
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.failureResult).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_DELIVERY_FAILED',
      effect_state: 'succeeded_delivery_failed',
      retry_policy: {
        mode: 'do_not_retry_use_fallback',
      },
    })
  })

  it('passes when a returned artifact can be read back from the database', async () => {
    const readback = makeReadbackClient({ id: 'funnel-1' })
    const verifier = new ArtifactPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(readback.client),
      action: 'create_funnel',
      data: {},
      result: {
        ui_blocks: [
          {
            type: 'artifact_preview',
            artifactType: 'funnel',
            artifactId: 'funnel-1',
          },
        ],
      },
      sessionKey,
    })

    expect(outcome.status).toBe('verified')
    expect(readback.from).toHaveBeenCalledWith('funnels')
    expect(readback.eq).toHaveBeenCalledWith('id', 'funnel-1')
  })

  it('passes when a brain log action returns a readable entry id', async () => {
    const readback = makeReadbackClient({ id: 'brain-log-1' })
    const verifier = new ArtifactPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(readback.client),
      action: 'log_brain_event',
      data: { event_type: 'library_sync', summary: 'Updated pattern notes.' },
      result: {
        success: true,
        entry: { id: 'brain-log-1', event_type: 'library_sync' },
      },
      sessionKey,
    })

    expect(outcome.status).toBe('verified')
    expect(readback.from).toHaveBeenCalledWith('ns_brain_log')
    expect(readback.eq).toHaveBeenCalledWith('id', 'brain-log-1')
  })

  it('passes when a brain belief action returns a readable pattern id', async () => {
    const readback = makeReadbackClient({ id: 'pattern-1' })
    const verifier = new ArtifactPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(readback.client),
      action: 'create_brain_belief_pattern',
      data: { pattern_name: 'Launch urgency', description: 'Launch windows create momentum.' },
      result: {
        success: true,
        pattern: { id: 'pattern-1', pattern_name: 'Launch urgency' },
      },
      sessionKey,
    })

    expect(outcome.status).toBe('verified')
    expect(readback.from).toHaveBeenCalledWith('ns_belief_patterns')
    expect(readback.eq).toHaveBeenCalledWith('id', 'pattern-1')
  })

  it('fails when a returned database artifact cannot be read back', async () => {
    const readback = makeReadbackClient(null)
    const verifier = new ArtifactPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(readback.client),
      action: 'create_funnel',
      data: {},
      result: {
        ui_blocks: [
          {
            type: 'artifact_preview',
            artifactType: 'funnel',
            artifactId: 'missing-funnel',
          },
        ],
      },
      sessionKey,
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.failureResult).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_DELIVERY_FAILED',
      effect_state: 'succeeded_delivery_failed',
    })
  })

  it('reads back saved Brain memories by memory_id before marking the action verified', async () => {
    const readback = makeReadbackClient({ id: 'memory-1' })
    const verifier = new ArtifactPostActionVerificationService()

    const outcome = await verifier.verify({
      host: makeHost(readback.client),
      action: 'save_user_memory',
      data: { content: 'User prefers concise campaign summaries.', memory_type: 'preference' },
      result: { success: true, memory_id: 'memory-1' },
      sessionKey,
    })

    expect(outcome.status).toBe('verified')
    expect(readback.from).toHaveBeenCalledWith('ns_memories')
    expect(readback.eq).toHaveBeenCalledWith('id', 'memory-1')
  })

  it('accepts Brain ingestion counts as provider acknowledgement proof', async () => {
    const verifier = new ArtifactPostActionVerificationService()
    const outcome = await verifier.verify({
      host: makeHost(makeReadbackClient(null).client),
      action: 'ingest_user_brain_text',
      data: { title: 'Campaign notes', text: 'Reusable launch notes for the campaign.' },
      result: { success: true, memories_created: 2 },
      sessionKey,
    })

    expect(outcome.status).toBe('verified')
    expect(outcome.checks).toContainEqual(
      expect.objectContaining({
        type: 'provider_ack',
        status: 'passed',
        detail: expect.stringContaining('memories_created'),
      }),
    )
  })

  it('does not let unverified Brain writes claim the memory was saved', async () => {
    const verifier = new ArtifactPostActionVerificationService()
    const outcome = await verifier.verify({
      host: makeHost(makeReadbackClient(null).client),
      action: 'ingest_user_brain_text',
      data: { title: 'Campaign notes', text: 'Reusable launch notes for the campaign.' },
      result: { success: true, memories_created: 0 },
      sessionKey,
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.failureResult).toMatchObject({
      success: false,
      error_code: 'ARTIFACT_DELIVERY_FAILED',
      effect_state: 'unknown_effect',
      user_explanation: {
        intent: 'verify_brain_write',
        sentence: expect.not.stringContaining('I created it'),
      },
      observability: {
        fingerprint: 'artifact.brain_delivery_unverified',
      },
    })
    expect(String(outcome.failureResult?.agent_instruction)).toContain(
      'Do not tell the user this Brain save is done',
    )
  })

  it('passes when a returned public URL is reachable', async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetch)

    const verifier = new ArtifactPostActionVerificationService()
    const outcome = await verifier.verify({
      host: makeHost(makeReadbackClient(null).client),
      action: 'publish_form',
      data: {},
      result: { success: true, url: 'https://example.test/forms/live' },
      sessionKey,
    })

    expect(outcome.status).toBe('verified')
    expect(fetch).toHaveBeenCalledWith(
      'https://example.test/forms/live',
      expect.objectContaining({ method: 'HEAD' }),
    )
  })

  it('passes external side-effect actions when the provider returns an acknowledgement id', async () => {
    const verifier = new ArtifactPostActionVerificationService()
    const outcome = await verifier.verify({
      host: makeHost(makeReadbackClient(null).client),
      action: 'create_calendar_event',
      data: {},
      result: { success: true, event_id: 'evt-123' },
      sessionKey,
    })

    expect(outcome.status).toBe('verified')
  })
})
