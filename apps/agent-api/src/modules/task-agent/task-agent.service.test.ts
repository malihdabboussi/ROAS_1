import { describe, expect, it, vi } from 'vitest'
import { TaskAgentRepository } from './repositories/task-agent.repository'
import { TaskAgentProgressService } from './services/task-agent-progress.service'
import { TaskAgentRequestContextService } from './services/task-agent-request-context.service'
import { TaskAgentService } from './services/task-agent.service'

function makeQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: result, error: null })),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    single: vi.fn(async () => ({ data: result, error: null })),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
  }
  return query
}

describe('TaskAgentService', () => {
  it('injects access policy before task context', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Task handled.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_items') {
          return makeQuery({ id: 'item-1', title: 'Task', status: 'todo' })
        }
        if (table === 'spaces') return makeQuery({ title: 'Launch', schema: {} })
        if (table === 'space_item_activity') return makeQuery({ id: 'activity-1' })
        if (table === 'space_automation_run_state') return makeQuery(null)
        return makeQuery(null)
      }),
    }
    const service = new TaskAgentService(
      new TaskAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:task:item-1'),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: true,
          brainId: 'brain-zara',
        })),
        buildFullContext: vi.fn(async () => 'AGENT BRAIN — Specific Knowledge:'),
      } as any,
      {
        resolveAgentPolicy: vi.fn(async () => ({
          effective: new Set(),
          grants: [],
          overrides: { allow_extra: [], deny: [] },
        })),
        canAgentUseCapability: vi.fn(async () => false),
      } as any,
    )

    await service.invoke({
      item_id: 'item-1',
      space_id: 'space-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      prompt: 'Handle this',
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: string }>
    }
    expect(call.input[0]?.content).toContain('ACCESS POLICY for zara:')
    expect(call.input[0]?.content).toContain('search_user_brain')
    expect(call.input[0]?.content).toContain('AGENT BRAIN')
  })

  it('seeds task space and campaign scope for artifact tools', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Task handled.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_items') {
          return makeQuery({ id: 'item-1', title: 'Task', status: 'todo' })
        }
        if (table === 'spaces') {
          return makeQuery({ title: 'Launch', schema: {}, campaign_id: 'campaign-1' })
        }
        if (table === 'space_item_activity') return makeQuery({ id: 'activity-1' })
        if (table === 'space_automation_run_state') return makeQuery(null)
        return makeQuery(null)
      }),
    }
    const buildChatSessionKey = vi.fn(() => 'agent:zara:user-1:task:item-1')
    const taskScopeContext = {
      setScope: vi.fn(),
      clearScope: vi.fn(),
    }
    const service = new TaskAgentService(
      new TaskAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey,
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({ hasAgentBrain: false, brainId: null })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      taskScopeContext as any,
    )

    await service.invoke({
      item_id: 'item-1',
      space_id: 'space-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      prompt: 'Handle this',
    })

    expect(buildChatSessionKey).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'campaign-1',
        spaceId: 'space-1',
        includeScopeSegments: true,
      }),
    )
    expect(taskScopeContext.setScope).toHaveBeenCalledWith({
      itemId: 'item-1',
      userId: 'user-1',
      campaignId: 'campaign-1',
      spaceId: 'space-1',
      orgId: null,
    })
    expect(taskScopeContext.clearScope).toHaveBeenCalledWith('item-1')
  })

  it('injects referenced slash skills into task invokes', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Task handled.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_items') {
          return makeQuery({ id: 'item-1', title: 'Task', status: 'todo' })
        }
        if (table === 'spaces') return makeQuery({ title: 'Launch', schema: {} })
        if (table === 'space_item_activity') return makeQuery({ id: 'activity-1' })
        if (table === 'space_automation_run_state') return makeQuery(null)
        return makeQuery(null)
      }),
    }
    const requiredSkillFile = {
      skillKey: 'launch-plan',
      kind: 'skill' as const,
      filePath: 'skills/launch-plan/SKILL.md',
    }
    const ensureRuntimeReady = vi.fn(async () => undefined)
    const resolveRuntimeSkillScope = vi.fn(async () => ({
      skills: [
        {
          id: 'skill-1',
          agent_key: 'zara',
          skill_key: 'launch-plan',
          name: 'Launch Plan',
          description: 'Plan launches',
          markdown_content: 'Use the launch checklist.',
          is_enabled: true,
          archetype_filter: null,
        },
      ],
      resources: [],
      requiredSkillFiles: [requiredSkillFile],
    }))
    const service = new TaskAgentService(
      new TaskAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:task:item-1'),
      } as any,
      { ensureRuntimeReady } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({
          hasAgentBrain: true,
          brainId: 'brain-zara',
        })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
      undefined,
      { resolveRuntimeSkillScope } as any,
    )

    await service.invoke({
      item_id: 'item-1',
      space_id: 'space-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      prompt: 'Please use /launch-plan for this',
      skill_keys: ['launch-plan'],
    })

    expect(resolveRuntimeSkillScope).toHaveBeenCalledWith({
      agentKey: 'zara',
      userId: 'user-1',
      orgId: null,
      skillKeys: ['launch-plan'],
    })
    expect(ensureRuntimeReady).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredSkillFiles: [requiredSkillFile],
      }),
    )
    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ content: string }>
    }
    const finalPrompt = call.input[call.input.length - 1]?.content ?? ''
    expect(finalPrompt).toContain('REFERENCED SKILL: Launch Plan')
    expect(finalPrompt).toContain('Use the launch checklist.')
    expect(finalPrompt).toContain('Please use for this')
    const cleanedUserPrompt = finalPrompt.slice(finalPrompt.lastIndexOf('---') + 3)
    expect(cleanedUserPrompt).not.toContain('/launch-plan')
  })

  it('disables agent-to-agent native actions when requested', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Task handled.',
      failed: undefined,
      toolSteps: [],
      usage: undefined,
    }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_items') {
          return makeQuery({ id: 'item-1', title: 'Task', status: 'todo' })
        }
        if (table === 'spaces') return makeQuery({ title: 'Launch', schema: {} })
        if (table === 'space_item_activity') return makeQuery({ id: 'activity-1' })
        if (table === 'space_automation_run_state') return makeQuery(null)
        return makeQuery(null)
      }),
    }
    const service = new TaskAgentService(
      new TaskAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:task:item-1'),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({ hasAgentBrain: false, brainId: null })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
    )

    await service.invoke({
      item_id: 'item-1',
      space_id: 'space-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      prompt: 'Handle this',
      agent_collaboration: 'disabled',
    })

    const call = (streamCompletion.mock.calls as unknown[][])[0]?.[0] as {
      disabledNativeActions: string[]
      strictDisabledNativeActions?: boolean
      instructions: string
    }
    expect(call.disabledNativeActions).toEqual(
      expect.arrayContaining(['ask_agent', 'delegate_to_agent', 'brainstorm_agents']),
    )
    expect(call.strictDisabledNativeActions).toBe(true)
    expect(call.instructions).toContain('Agent-to-agent collaboration is disabled')
  })

  it('persists streamed content blocks and tool steps on completion', async () => {
    const activityUpdates: Array<Record<string, unknown>> = []
    const streamCompletion = vi.fn(
      async ({
        send,
      }: {
        send: (type: string, data: Record<string, unknown>) => Promise<void>
      }) => {
        await send('content_delta', { content: 'Working on it.' })
        await send('tool_start', {
          name: 'update_task',
          label: 'Updating task',
          tool_call_id: 'tool-1',
        })
        await send('tool_update', {
          name: 'update_task',
          detail: 'Saved task fields',
          tool_call_id: 'tool-1',
        })
        await send('tool_end', {
          name: 'update_task',
          status: 'completed',
          tool_call_id: 'tool-1',
        })
        return {
          content: 'Working on it.',
          failed: undefined,
          toolSteps: [],
          usage: undefined,
        }
      },
    )
    const supabase = {
      from: vi.fn((table: string) => {
        const query: any = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          gte: vi.fn(() => query),
          is: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(async () => ({ data: [], error: null })),
          maybeSingle: vi.fn(async () => {
            if (table === 'space_items') {
              return { data: { id: 'item-1', title: 'Task', status: 'todo' }, error: null }
            }
            if (table === 'spaces') return { data: { title: 'Launch', schema: {} }, error: null }
            if (table === 'space_item_activity') {
              return { data: { payload: { status: 'running', agent_key: 'zara' } }, error: null }
            }
            return { data: null, error: null }
          }),
          single: vi.fn(async () => ({ data: { id: 'activity-1' }, error: null })),
          insert: vi.fn(() => query),
          update: vi.fn((payload: Record<string, unknown>) => {
            if (table === 'space_item_activity') activityUpdates.push(payload)
            return query
          }),
        }
        return query
      }),
    }
    const service = new TaskAgentService(
      new TaskAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:task:item-1'),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({ hasAgentBrain: false, brainId: null })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
    )

    await service.invoke({
      item_id: 'item-1',
      space_id: 'space-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      prompt: 'Handle this',
    })

    const finalUpdate = activityUpdates.at(-1)?.payload as Record<string, unknown>
    expect(finalUpdate).toEqual(
      expect.objectContaining({
        status: 'done',
        agent_key: 'zara',
        content: 'Working on it.',
        duration_ms: expect.any(Number),
      }),
    )
    expect(finalUpdate.duration_ms as number).toBeGreaterThanOrEqual(0)
    expect(finalUpdate.content_blocks_ordered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text', content: 'Working on it.' }),
        expect.objectContaining({
          type: 'tool',
          name: 'update_task',
          label: 'Updating task',
          state: 'complete',
        }),
      ]),
    )
    expect(finalUpdate.tool_steps).toEqual([
      { name: 'update_task', label: 'Updating task', status: 'completed' },
    ])
  })

  it('reconciles task-created space docs into document card blocks', async () => {
    const activityUpdates: Array<Record<string, unknown>> = []
    const streamCompletion = vi.fn(
      async ({
        send,
      }: {
        send: (type: string, data: Record<string, unknown>) => Promise<void>
      }) => {
        await send('content_delta', { content: 'Document saved.' })
        return {
          content: 'Document saved.',
          failed: undefined,
          toolSteps: [],
          usage: undefined,
        }
      },
    )
    const supabase = {
      from: vi.fn((table: string) => {
        const query: any = {
          selected: '',
          select: vi.fn((columns?: string) => {
            query.selected = columns ?? ''
            return query
          }),
          eq: vi.fn(() => query),
          gte: vi.fn(() => query),
          is: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(async () => {
            if (table === 'space_items' && query.selected.includes('doc_body')) {
              return {
                data: [
                  {
                    id: 'space-doc-1',
                    title: 'Generated Brief',
                    doc_body: '<p>Generated brief content.</p>',
                    custom_data: {
                      _view_type: 'doc',
                      _conversation_document_id: 'conversation-doc-1',
                    },
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }
            }
            return { data: [], error: null }
          }),
          maybeSingle: vi.fn(async () => {
            if (table === 'space_items') {
              return { data: { id: 'item-1', title: 'Task', status: 'todo' }, error: null }
            }
            if (table === 'spaces') return { data: { title: 'Launch', schema: {} }, error: null }
            if (table === 'space_item_activity') {
              return { data: { payload: { status: 'running', agent_key: 'zara' } }, error: null }
            }
            return { data: null, error: null }
          }),
          single: vi.fn(async () => ({ data: { id: 'activity-1' }, error: null })),
          insert: vi.fn(() => query),
          update: vi.fn((payload: Record<string, unknown>) => {
            if (table === 'space_item_activity') activityUpdates.push(payload)
            return query
          }),
        }
        return query
      }),
    }
    const service = new TaskAgentService(
      new TaskAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:task:item-1'),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({ hasAgentBrain: false, brainId: null })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
    )

    await service.invoke({
      item_id: 'item-1',
      space_id: 'space-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      prompt: 'Create the brief',
    })

    const finalUpdate = activityUpdates.at(-1)?.payload as Record<string, unknown>
    expect(finalUpdate.content_blocks_ordered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'document_card',
          documentId: 'conversation-doc-1',
          spaceItemId: 'space-doc-1',
          title: 'Generated Brief',
          snippet: 'Generated brief content.',
        }),
      ]),
    )
  })

  it('persists completion artifact output blocks when live ui_block events were missed', async () => {
    const activityUpdates: Array<Record<string, unknown>> = []
    const streamCompletion = vi.fn(
      async ({
        send,
      }: {
        send: (type: string, data: Record<string, unknown>) => Promise<void>
      }) => {
        await send('content_delta', { content: 'Image saved.' })
        return {
          content: 'Image saved.',
          failed: undefined,
          toolSteps: [],
          usage: undefined,
          artifactOutputBlocks: [
            {
              type: 'media_asset',
              id: 'media-media-1',
              mediaAssetId: 'media-1',
              url: 'https://cdn.vibey.ai/image.png',
              title: 'Generated image',
              kind: 'image',
            },
          ],
        }
      },
    )
    const supabase = {
      from: vi.fn((table: string) => {
        const query: any = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          gte: vi.fn(() => query),
          is: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(async () => ({ data: [], error: null })),
          maybeSingle: vi.fn(async () => {
            if (table === 'space_items') {
              return { data: { id: 'item-1', title: 'Task', status: 'todo' }, error: null }
            }
            if (table === 'spaces') return { data: { title: 'Launch', schema: {} }, error: null }
            if (table === 'space_item_activity') {
              return { data: { payload: { status: 'running', agent_key: 'zara' } }, error: null }
            }
            return { data: null, error: null }
          }),
          single: vi.fn(async () => ({ data: { id: 'activity-1' }, error: null })),
          insert: vi.fn(() => query),
          update: vi.fn((payload: Record<string, unknown>) => {
            if (table === 'space_item_activity') activityUpdates.push(payload)
            return query
          }),
        }
        return query
      }),
    }
    const service = new TaskAgentService(
      new TaskAgentRepository({ client: supabase } as any),
      { streamCompletion } as any,
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'employee',
          agentKey: 'zara',
        })),
        buildChatSessionKey: vi.fn(() => 'agent:zara:user-1:task:item-1'),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        startTrace: vi.fn(async () => 'trace-1'),
        completeTrace: vi.fn(async () => undefined),
        failTrace: vi.fn(async () => undefined),
      } as any,
      {
        resolveAgentBrainPresence: vi.fn(async () => ({ hasAgentBrain: false, brainId: null })),
        buildFullContext: vi.fn(async () => ''),
      } as any,
    )

    await service.invoke({
      item_id: 'item-1',
      space_id: 'space-1',
      agent_key: 'zara',
      user_id: 'user-1',
      org_id: null,
      prompt: 'Create an image',
    })

    const finalUpdate = activityUpdates.at(-1)?.payload as Record<string, unknown>
    expect(finalUpdate.content_blocks_ordered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'media_asset',
          mediaAssetId: 'media-1',
          url: 'https://cdn.vibey.ai/image.png',
          title: 'Generated image',
          kind: 'image',
        }),
      ]),
    )
  })
})

describe('TaskAgentProgressService', () => {
  it('persists terminal duration on completed task activity payloads', async () => {
    const updateActivityPayload = vi.fn(async () => undefined)
    const repository = {
      findActivityPayload: vi.fn(async () => ({
        data: { payload: { status: 'running', agent_key: 'zara' } },
      })),
      updateActivityPayload,
    }
    const service = new TaskAgentProgressService(repository as any)

    await service.completeActivity(
      'activity-1',
      'zara',
      'done',
      'Done',
      [],
      undefined,
      [{ name: 'read', label: 'Read task', status: 'completed' }],
      1234.6,
    )

    expect(updateActivityPayload).toHaveBeenCalledWith(
      'activity-1',
      expect.objectContaining({
        status: 'done',
        agent_key: 'zara',
        content: 'Done',
        content_blocks_ordered: [],
        duration_ms: 1235,
        tool_steps: [{ name: 'read', label: 'Read task', status: 'completed' }],
      }),
    )
  })

  it('keeps separate thinking transcripts across task stream groups', async () => {
    const repository = {
      findActivityPayload: vi.fn(async () => ({ data: { payload: {} } })),
      updateActivityPayload: vi.fn(async () => undefined),
    }
    const service = new TaskAgentProgressService(repository as any)
    const tracker = service.createTracker({
      activityId: 'activity-1',
      itemId: 'item-1',
      agentKey: 'zara',
      logger: { warn: vi.fn() } as never,
    }) as any

    await tracker.send('thinking_delta', { text: 'Thought one' })
    await tracker.send('status', { phase: 'executing' })
    await tracker.send('content_delta', { content: 'First update' })
    await tracker.send('thinking_delta', { text: 'Thought two' })
    await tracker.send('status', { phase: 'executing' })

    const blocks = tracker.finalBlocks()
    expect(blocks.map((block: Record<string, unknown>) => block.type)).toEqual([
      'thinking_transcript',
      'text',
      'thinking_transcript',
    ])
    expect(blocks[0]).toMatchObject({
      type: 'thinking_transcript',
      content: 'Thought one',
      state: 'complete',
    })
    expect(blocks[1]).toMatchObject({ type: 'text', content: 'First update' })
    expect(blocks[2]).toMatchObject({
      type: 'thinking_transcript',
      content: 'Thought two',
      state: 'complete',
    })
    expect(blocks[0]?.id).not.toBe(blocks[2]?.id)
  })

  it('waits for every agent in a batch before updating item execution status', async () => {
    const updateTaskExecutionStatus = vi.fn(async () => undefined)
    const repository = {
      findActivityPayload: vi.fn(async () => ({
        data: {
          payload: {
            execution_batch_id: 'batch-1',
            execution_batch_agent_keys: ['zara', 'milo'],
          },
        },
      })),
      updateActivityPayload: vi.fn(async () => undefined),
      listBatchActivityPayloads: vi.fn(async () => ({
        data: [
          {
            payload: {
              status: 'done',
              agent_key: 'zara',
              execution_batch_id: 'batch-1',
              execution_batch_agent_keys: ['zara', 'milo'],
            },
          },
          {
            payload: {
              status: 'running',
              agent_key: 'milo',
              execution_batch_id: 'batch-1',
              execution_batch_agent_keys: ['zara', 'milo'],
            },
          },
        ],
      })),
      updateTaskExecutionStatus,
      findPausedAutomationRun: vi.fn(async () => ({ data: null })),
    }
    const service = new TaskAgentProgressService(repository as any)

    await service.completeActivity('activity-1', 'zara', 'done', 'Done', [])
    await service.finalizeItemExecution(
      'item-1',
      'space-1',
      'done',
      { error: vi.fn() } as never,
      'batch-1',
    )

    expect(updateTaskExecutionStatus).not.toHaveBeenCalled()

    repository.listBatchActivityPayloads.mockResolvedValueOnce({
      data: [
        {
          payload: {
            status: 'done',
            agent_key: 'zara',
            execution_batch_id: 'batch-1',
            execution_batch_agent_keys: ['zara', 'milo'],
          },
        },
        {
          payload: {
            status: 'done',
            agent_key: 'milo',
            execution_batch_id: 'batch-1',
            execution_batch_agent_keys: ['zara', 'milo'],
          },
        },
      ],
    })

    await service.finalizeItemExecution(
      'item-1',
      'space-1',
      'done',
      { error: vi.fn() } as never,
      'batch-1',
    )

    expect(updateTaskExecutionStatus).toHaveBeenCalledWith('item-1', 'space-1', 'done')
  })
})

describe('TaskAgentRequestContextService', () => {
  it('sets artifact action scope with the task item id lookup key', () => {
    const requestContext = {
      set: vi.fn(),
      clear: vi.fn(),
    }
    const service = new TaskAgentRequestContextService(requestContext as any)

    service.setScope({
      itemId: 'item-1',
      userId: 'user-1',
      campaignId: 'campaign-1',
      spaceId: 'space-1',
      orgId: 'org-1',
    })
    service.clearScope('item-1')

    expect(requestContext.set).toHaveBeenCalledWith(
      'item-1',
      'user-1',
      'campaign-1',
      '',
      null,
      null,
      'org-1',
      'studio',
      null,
      'space-1',
      'campaign',
    )
    expect(requestContext.clear).toHaveBeenCalledWith('item-1')
  })
})
