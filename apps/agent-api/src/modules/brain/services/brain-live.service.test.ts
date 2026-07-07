import type { ConfigService } from '@nestjs/config'
import { describe, expect, it } from 'vitest'
import { BrainLiveService, type DelegationState } from './brain-live.service'

describe('BrainLiveService Phase 2 tool names', () => {
  it('exposes canonical Brain action names and removes old live voice names', () => {
    const prototype = BrainLiveService.prototype

    expect(prototype.isKnownBrainAction.call({} as BrainLiveService, 'save_user_memory')).toBe(true)
    expect(prototype.isKnownBrainAction.call({} as BrainLiveService, 'search_user_brain')).toBe(
      true,
    )
    expect(
      prototype.isKnownBrainAction.call({} as BrainLiveService, 'list_user_brain_memories'),
    ).toBe(true)
    expect(
      prototype.isKnownBrainAction.call({} as BrainLiveService, 'crystallize_user_brain'),
    ).toBe(true)

    for (const oldName of [
      'save_memory',
      'search_memory',
      'search_brain',
      'list_recent_memories',
      'trigger_crystallization',
      'save_to_other_brain',
      'copy_memory_to_brain',
      'move_memory_to_brain',
    ]) {
      expect(prototype.isKnownBrainAction.call({} as BrainLiveService, oldName)).toBe(false)
    }
  })
})

function makeDelegation(overrides: Partial<DelegationState> = {}): DelegationState {
  return {
    id: 'del-1',
    status: 'running',
    toolSteps: [],
    currentTool: null,
    content: '',
    orderedBlocks: [],
    startedAt: Date.now(),
    userId: 'user-1',
    orgId: 'org-1',
    conversationId: 'conv-1',
    agentId: 'designer',
    task: 'Create a logo',
    ...overrides,
  }
}

function createServiceWithDelegations(delegations: DelegationState[]): BrainLiveService {
  const service = Object.create(BrainLiveService.prototype) as BrainLiveService
  const map = new Map<string, DelegationState>()
  for (const d of delegations) map.set(d.id, d)
  ;(service as any).delegations = map
  return service
}

function createServiceWithConfig(values: Record<string, string | undefined>): BrainLiveService {
  const service = Object.create(BrainLiveService.prototype) as BrainLiveService
  ;(service as any).config = {
    get: (key: string) => values[key],
  } as ConfigService
  return service
}

describe('BrainLiveService.getGeminiLiveModel', () => {
  it('defaults to the supported Gemini Live model', () => {
    const service = createServiceWithConfig({})

    expect(service.getGeminiLiveModel()).toBe('models/gemini-3.1-flash-live-preview')
  })

  it('normalizes configured model ids to the models/ prefix', () => {
    const service = createServiceWithConfig({
      GEMINI_LIVE_MODEL: 'gemini-3.1-flash-live-preview',
    })

    expect(service.getGeminiLiveModel()).toBe('models/gemini-3.1-flash-live-preview')
  })

  it('keeps configured full model resource names unchanged', () => {
    const service = createServiceWithConfig({
      GEMINI_LIVE_MODEL: 'models/gemini-3.1-flash-live-preview',
    })

    expect(service.getGeminiLiveModel()).toBe('models/gemini-3.1-flash-live-preview')
  })
})

describe('BrainLiveService.listActiveDelegationsForSession', () => {
  it('returns running delegations matching user, conversation, and agent', () => {
    const d1 = makeDelegation({ id: 'del-1', status: 'running', task: 'Build funnel' })
    const d2 = makeDelegation({
      id: 'del-2',
      status: 'running',
      task: 'Create avatar',
      agentId: 'copywriter',
    })
    const d3 = makeDelegation({
      id: 'del-3',
      status: 'running',
      task: 'Write copy',
      userId: 'user-2',
    })
    const service = createServiceWithDelegations([d1, d2, d3])

    const result = service.listActiveDelegationsForSession('user-1', 'org-1', 'conv-1', 'designer')
    expect(result).toHaveLength(1)
    expect(result[0]!.delegationId).toBe('del-1')
    expect(result[0]!.task).toBe('Build funnel')
  })

  it('includes recently completed delegations within 5 minutes', () => {
    const d1 = makeDelegation({
      id: 'del-1',
      status: 'completed',
      completedAt: Date.now() - 60_000,
      task: 'Done task',
    })
    const d2 = makeDelegation({
      id: 'del-2',
      status: 'completed',
      completedAt: Date.now() - 10 * 60_000,
      task: 'Old task',
    })
    const service = createServiceWithDelegations([d1, d2])

    const result = service.listActiveDelegationsForSession('user-1', 'org-1', 'conv-1', 'designer')
    expect(result).toHaveLength(1)
    expect(result[0]!.delegationId).toBe('del-1')
  })

  it('returns empty when no delegations match', () => {
    const d1 = makeDelegation({ id: 'del-1', conversationId: 'other-conv' })
    const service = createServiceWithDelegations([d1])

    const result = service.listActiveDelegationsForSession('user-1', 'org-1', 'conv-1', 'designer')
    expect(result).toHaveLength(0)
  })

  it('sorts results by startedAt ascending', () => {
    const now = Date.now()
    const d1 = makeDelegation({ id: 'del-late', startedAt: now + 1000, task: 'Late' })
    const d2 = makeDelegation({ id: 'del-early', startedAt: now - 1000, task: 'Early' })
    const service = createServiceWithDelegations([d1, d2])

    const result = service.listActiveDelegationsForSession('user-1', 'org-1', 'conv-1', 'designer')
    expect(result).toHaveLength(2)
    expect(result[0]!.delegationId).toBe('del-early')
    expect(result[1]!.delegationId).toBe('del-late')
  })

  it('truncates content longer than 4000 chars', () => {
    const longContent = 'x'.repeat(5000)
    const d1 = makeDelegation({ id: 'del-1', content: longContent })
    const service = createServiceWithDelegations([d1])

    const result = service.listActiveDelegationsForSession('user-1', 'org-1', 'conv-1', 'designer')
    expect(result[0]!.content.length).toBeLessThanOrEqual(4003)
    expect(result[0]!.content.endsWith('...')).toBe(true)
  })
})

describe('BrainLiveService.checkDelegation', () => {
  it('reports no active delegations when none exist', async () => {
    const service = createServiceWithDelegations([])

    await expect(service.checkDelegation(undefined)).resolves.toMatchObject({
      status: 'no_active_delegations',
    })
  })

  it('uses the latest delegation when no id is provided', async () => {
    const now = Date.now()
    const service = createServiceWithDelegations([
      makeDelegation({ id: 'del-old', startedAt: now - 1000 }),
      makeDelegation({
        id: 'del-new',
        startedAt: now,
        currentTool: 'Generating image',
        toolSteps: [{ name: 'load_campaign', label: 'Loading campaign', status: 'completed' }],
      }),
    ])

    await expect(service.checkDelegation(undefined)).resolves.toMatchObject({
      delegation_id: 'del-new',
      status: 'running',
      tools_completed: 1,
      current_tool: 'Generating image',
    })
  })

  it('returns completed content, truncates long output, and removes completed delegations', async () => {
    const service = createServiceWithDelegations([
      makeDelegation({
        id: 'del-done',
        status: 'completed',
        content: 'x'.repeat(2100),
      }),
    ])

    const result = await service.checkDelegation('del-done')

    expect(result).toMatchObject({
      delegation_id: 'del-done',
      status: 'completed',
      content: `${'x'.repeat(2000)}...`,
    })
    expect(service.getDelegationState('del-done')).toBeUndefined()
  })
})

describe('BrainLiveService.queueMessage', () => {
  it('requires an active delegation when no id is provided', async () => {
    const service = createServiceWithDelegations([])

    await expect(service.queueMessage(undefined, 'change it', () => {})).resolves.toMatchObject({
      success: false,
      error: 'No running delegation found to send message to.',
    })
  })

  it('rejects follow-up messages for non-running delegations', async () => {
    const service = createServiceWithDelegations([
      makeDelegation({ id: 'del-done', status: 'completed' }),
    ])

    await expect(service.queueMessage('del-done', 'change it', () => {})).resolves.toMatchObject({
      success: false,
      error: 'Delegation del-done is completed, not running. Use delegate_work to start a new task.',
    })
  })

  it('requires the delegation session key and gateway agent id before streaming a message', async () => {
    const service = createServiceWithDelegations([makeDelegation({ id: 'del-running' })])

    await expect(
      service.queueMessage('del-running', 'change it', () => {}),
    ).resolves.toMatchObject({
      success: false,
      error: 'Delegation session key not available for message queuing.',
    })
  })
})
