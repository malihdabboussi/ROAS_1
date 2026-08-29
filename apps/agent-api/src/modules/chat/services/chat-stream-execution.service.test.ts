import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  makeChatStreamExecutionInput as makeRunInput,
  makeChatStreamExecutionService as makeService,
} from './chat-stream-execution.service.test-helpers'

describe('ChatStreamExecutionService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a no-answer failure when the empty response retry is still empty', async () => {
    vi.useFakeTimers()
    const streamCompletion = vi.fn(async () => ({
      content: '',
      toolSteps: [],
    }))
    const service = makeService({ streamCompletion })

    const resultPromise = service.run(makeRunInput())
    await vi.advanceTimersByTimeAsync(1500)
    const result = await resultPromise

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.failed).toBe('empty_agent_response')
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'empty_response_retry',
        status: 'failed',
      }),
    ])
  })

  it('keeps a successful retry when the second attempt returns content', async () => {
    vi.useFakeTimers()
    const streamCompletion = vi
      .fn()
      .mockResolvedValueOnce({ content: '', toolSteps: [] })
      .mockResolvedValueOnce({ content: 'Hello. How can I help?', toolSteps: [] })
    const service = makeService({ streamCompletion })

    const resultPromise = service.run(makeRunInput())
    await vi.advanceTimersByTimeAsync(1500)
    const result = await resultPromise

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.failed).toBeUndefined()
    expect(result.content).toBe('Hello. How can I help?')
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'empty_response_retry',
        status: 'recovered',
      }),
    ])
  })

  it('does not synthesize a compact prompt after context overflow', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: '',
      toolSteps: [],
      failed: 'context_window_exceeded: input is too long',
      truncated: true,
      lastCallInputTokens: 128000,
      contextWindowTokens: 128000,
    }))
    const service = makeService({ streamCompletion })

    const result = await service.run(makeRunInput())

    expect(streamCompletion).toHaveBeenCalledTimes(1)
    expect(result.failed).toBe('context_window_exceeded: input is too long')
  })

  it('waits and retries the selected model after a provider rate limit', async () => {
    vi.useFakeTimers()
    const streamCompletion = vi
      .fn()
      .mockResolvedValueOnce({
        content: '',
        toolSteps: [],
        failed: 'API rate limit reached. Please try again later.',
      })
      .mockResolvedValueOnce({
        content: 'Recovered after the provider throttle cleared.',
        toolSteps: [],
      })
    const service = makeService({ streamCompletion })

    const resultPromise = service.run(makeRunInput())
    await vi.advanceTimersByTimeAsync(5000)
    const result = await resultPromise

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.failed).toBeUndefined()
    expect(result.content).toBe('Recovered after the provider throttle cleared.')
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'provider_busy_retry',
        status: 'recovered',
      }),
    ])
  })

  it('keeps Auto retrieval on Terra and writes the tool-free answer on Sonnet 4.6', async () => {
    const streamCompletion = vi
      .fn()
      .mockImplementationOnce(async ({ send }) => {
        await send('content_delta', { delta: 'internal research text' })
        await send('tool_update', { tool: 'search_brain', status: 'completed' })
        return {
          content: `Research evidence ${'x'.repeat(30_000)}`,
          toolSteps: [{ name: 'search_brain', label: 'Search Brain', status: 'completed' }],
          completedGenerations: [{ generationId: 'gen-research', model: 'openai/gpt-5.6-terra' }],
        }
      })
      .mockResolvedValueOnce({
        content: 'Polished answer.',
        toolSteps: [],
        completedGenerations: [{ generationId: 'gen-write', model: 'anthropic/claude-sonnet-4.6' }],
      })
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ streamCompletion })

    const result = await service.run(
      makeRunInput({
        progressiveSend,
        selectedModelInput: 'auto',
      }),
    )

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(streamCompletion.mock.calls[0]?.[0]).toMatchObject({
      model: 'openai/gpt-5.6-terra',
      generationStage: 'research',
    })
    expect(streamCompletion.mock.calls[1]?.[0]).toMatchObject({
      model: 'anthropic/claude-sonnet-4.6',
      generationStage: 'write',
      toolChoice: 'none',
    })
    expect(streamCompletion.mock.calls[1]?.[0].sessionKey).toContain(':writer:')
    expect(JSON.stringify(streamCompletion.mock.calls[1]?.[0].input).length).toBeLessThan(25_000)
    expect(progressiveSend).not.toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ delta: 'internal research text' }),
    )
    expect(result.content).toBe('Polished answer.')
    expect(result.completedGenerations).toEqual([
      expect.objectContaining({ generationId: 'gen-research', stage: 'research' }),
      expect.objectContaining({ generationId: 'gen-write', stage: 'write' }),
    ])
  })

  it('uses the fast bounded research route for a canonical operational agenda request', async () => {
    const streamCompletion = vi.fn().mockResolvedValueOnce({
      content: "Here are your nine open tasks and today's meeting.",
      toolSteps: [],
    })
    const validateModelSettings = vi.fn(async (modelId, settings) => ({
      requestedModelId: modelId,
      resolvedModelId: modelId,
      request: settings ?? {},
      openClaw: { reasoningEffort: settings?.reasoning_effort },
    }))
    const executeAction = vi.fn(async (action: string) =>
      action === 'list_tasks'
        ? { tasks: [{ id: 'task-1', title: 'Assigned task' }], total_count: 1 }
        : { events: [{ id: 'event-1', title: 'Today meeting' }] },
    )
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ streamCompletion, validateModelSettings, executeAction })

    await service.run(
      makeRunInput({
        selectedModelInput: 'auto',
        progressiveSend,
        userContent: "What should I focus on today? Show my open tasks and today's meetings.",
      }),
    )

    expect(validateModelSettings).not.toHaveBeenCalled()
    expect(streamCompletion).not.toHaveBeenCalled()
    expect(executeAction).toHaveBeenCalledWith(
      'list_tasks',
      { assigned_to_me: true, include_closed: false, include_count: true },
      'session-1',
    )
    expect(executeAction).toHaveBeenCalledWith(
      'list_calendar_events',
      expect.objectContaining({ start: expect.any(String), end: expect.any(String) }),
      'session-1',
    )
    expect(progressiveSend).toHaveBeenCalledWith(
      'tool_start',
      expect.objectContaining({ name: 'list_tasks' }),
    )
    expect(progressiveSend).toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ content: expect.stringContaining('## Open tasks (1)') }),
    )
  })

  it('uses bounded operational data and a writer to choose the first action', async () => {
    const streamCompletion = vi.fn(async () => ({
      content: 'Start with Assigned task before Today meeting.',
      toolSteps: [],
    }))
    const validateModelSettings = vi.fn(async (modelId, settings) => ({
      requestedModelId: modelId,
      resolvedModelId: modelId,
      request: settings ?? {},
      openClaw: { reasoningEffort: settings?.reasoning_effort },
    }))
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ streamCompletion, validateModelSettings })

    const result = await service.run(
      makeRunInput({
        selectedModelInput: 'auto',
        progressiveSend,
        userContent:
          'Given that schedule and task list, what should I do first before my next meeting?',
      }),
    )

    expect(validateModelSettings).toHaveBeenCalledTimes(1)
    expect(validateModelSettings).toHaveBeenCalledWith(
      'anthropic/claude-sonnet-4.6',
      expect.objectContaining({ reasoning_effort: 'low' }),
    )
    expect(streamCompletion).toHaveBeenCalledTimes(1)
    expect(streamCompletion.mock.calls[0]?.[0]).toMatchObject({
      model: 'anthropic/claude-sonnet-4.6',
      generationStage: 'write',
      toolChoice: 'none',
    })
    expect(JSON.stringify(streamCompletion.mock.calls[0]?.[0].input)).toContain('Assigned task')
    expect(JSON.stringify(streamCompletion.mock.calls[0]?.[0].input)).toContain('Today meeting')
    expect(progressiveSend).not.toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ content: expect.stringContaining('## Open tasks') }),
    )
    expect(result.content).toBe('Start with Assigned task before Today meeting.')
  })

  it('preserves full Auto reasoning for contextual agenda questions', async () => {
    const streamCompletion = vi
      .fn()
      .mockResolvedValueOnce({ content: 'Call evidence.', toolSteps: [] })
      .mockResolvedValueOnce({ content: 'Contextual answer.', toolSteps: [] })
    const validateModelSettings = vi.fn(async (modelId, settings) => ({
      requestedModelId: modelId,
      resolvedModelId: modelId,
      request: settings ?? {},
      openClaw: { reasoningEffort: settings?.reasoning_effort },
    }))
    const service = makeService({ streamCompletion, validateModelSettings })

    await service.run(
      makeRunInput({
        selectedModelInput: 'auto',
        userContent: 'Which tasks came from recent calls or Slack, and why?',
      }),
    )

    expect(validateModelSettings).toHaveBeenNthCalledWith(
      1,
      'openai/gpt-5.6-terra',
      expect.objectContaining({ reasoning_effort: 'low' }),
    )
    expect(validateModelSettings).toHaveBeenNthCalledWith(
      2,
      'anthropic/claude-sonnet-4.6',
      expect.objectContaining({ reasoning_effort: 'medium' }),
    )
    expect(streamCompletion.mock.calls[0]?.[0].instructions).toBe('Answer the user.')
  })

  it('answers an exact quoted task provenance follow-up from one canonical task read', async () => {
    const executeAction = vi.fn(async () => ({
      tasks: [
        {
          id: 'task-source-1',
          title: 'Introduce Shannon to Adley for the Sphere Rockets golf event',
          status: 'logged',
          source: 'fathom',
          space_title: 'Meetings',
          custom_data: {
            provider: 'fathom',
            source_call: 'Dylan and Shannon collaboration planning',
            provider_source_key: 'fathom:174458566:action:0',
            provider_evidence: {
              recording_timestamp: '00:24:47',
              recording_playback_url: 'https://fathom.video/calls/789735438?timestamp=1487.9999',
            },
          },
        },
      ],
      total_count: 1,
    }))
    const streamCompletion = vi.fn()
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ executeAction, streamCompletion })

    const result = await service.run(
      makeRunInput({
        progressiveSend,
        selectedModelInput: 'auto',
        userContent:
          'What about “Introduce Shannon to Adley for the Sphere Rockets golf event” — is that actually assigned to me, and what meeting or Slack message did it come from? Show the source.',
      }),
    )

    expect(executeAction).toHaveBeenCalledTimes(1)
    expect(executeAction).toHaveBeenCalledWith(
      'list_tasks',
      {
        assigned_to_me: true,
        fields: 'summary',
        include_closed: true,
        include_count: true,
        limit: 20,
        search: 'Introduce Shannon to Adley for the Sphere Rockets golf event',
      },
      'session-1',
    )
    expect(streamCompletion).not.toHaveBeenCalled()
    expect(result.content).toContain('is assigned to you')
    expect(result.content).toContain('Dylan and Shannon collaboration planning')
    expect(result.content).toContain('00:24:47')
    expect(result.content).toContain('https://fathom.video/calls/789735438?timestamp=1487.9999')
    expect(progressiveSend).toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ content: result.content }),
    )
  })

  it('deterministically combines live reporting, Brain context, and campaign tasks', async () => {
    const progressiveSend = vi.fn(async () => undefined)
    const executeAction = vi.fn(async (action: string) => {
      if (action === 'get_campaign_main_dashboard') {
        return {
          fetched_at: '2026-08-29T12:00:00.000Z',
          canonical_source: {
            system: 'campaign_reporting',
            owner: 'main_dashboard',
          },
          as_of: '2026-08-29T12:00:00.000Z',
          kpis: { roas: 2.4, leads: 18 },
        }
      }
      if (action === 'search_campaign_brain') {
        return {
          results: [{ content: 'Approved budget is $30k.' }],
          context_sufficient: true,
        }
      }
      return { tasks: [{ id: 'task-1', title: 'Refresh creative' }], total_count: 1 }
    })
    const streamCompletion = vi.fn(async ({ input }) => ({
      content: 'Live ROAS is 2.4 as of Aug 29; the approved budget is $30k.',
      toolSteps: [],
      llmInput: input,
    }))
    const service = makeService({ executeAction, streamCompletion })

    const result = await service.run(
      makeRunInput({
        campaignId: 'campaign-1',
        progressiveSend,
        selectedModelInput: 'auto',
        userContent: 'What is the current status of this live campaign?',
      }),
    )

    expect(executeAction).toHaveBeenCalledTimes(3)
    expect(executeAction).toHaveBeenCalledWith(
      'get_campaign_main_dashboard',
      { campaign_id: 'campaign-1', refresh: true },
      'session-1',
    )
    expect(executeAction).toHaveBeenCalledWith(
      'search_campaign_brain',
      expect.objectContaining({ campaign_id: 'campaign-1' }),
      'session-1',
    )
    expect(executeAction).toHaveBeenCalledWith(
      'list_tasks',
      { campaign_id: 'campaign-1', include_closed: false, include_count: true },
      'session-1',
    )
    expect(streamCompletion).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(streamCompletion.mock.calls[0]?.[0].input)).toContain(
      'campaign_reporting',
    )
    expect(JSON.stringify(streamCompletion.mock.calls[0]?.[0].input)).toContain(
      'Approved budget is $30k.',
    )
    expect(result.content).toContain('Live ROAS is 2.4')
    expect(result.content).toContain('campaign_reporting / main_dashboard')
    expect(result.content).toContain('Reporting as of: 2026-08-29T12:00:00.000Z')
    expect(result.content).toContain('Campaign Brain: 1 relevant context')
    expect(result.content).toContain('Open campaign tasks: 1 open tasks')
    expect(progressiveSend).toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ delta: expect.stringContaining('**Evidence**') }),
    )
  })

  it('keeps the campaign evidence receipt when the writer fails', async () => {
    const executeAction = vi.fn(async (action: string) =>
      action === 'get_campaign_main_dashboard'
        ? {
            canonical_source: { system: 'campaign_reporting', owner: 'main_dashboard' },
            as_of: '2026-08-29T12:00:00.000Z',
          }
        : action === 'search_campaign_brain'
          ? { results: [] }
          : { tasks: [], total_count: 0 },
    )
    const streamCompletion = vi.fn(async () => ({
      content: '',
      toolSteps: [],
      failed: 'stream_stalled',
    }))
    const service = makeService({ executeAction, streamCompletion })

    const result = await service.run(
      makeRunInput({
        campaignId: 'campaign-1',
        selectedModelInput: 'auto',
        userContent: 'What is the current status of this live campaign?',
      }),
    )

    expect(result.failed).toBeUndefined()
    expect(result.content).toContain('could not safely complete the narrative summary')
    expect(result.content).toContain('campaign_reporting / main_dashboard')
    expect(result.content).toContain('Reporting as of: 2026-08-29T12:00:00.000Z')
  })

  it('fails closed when a campaign status question has no resolved client campaign', async () => {
    const executeAction = vi.fn()
    const streamCompletion = vi.fn()
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ executeAction, streamCompletion })

    const result = await service.run(
      makeRunInput({
        selectedModelInput: 'auto',
        progressiveSend,
        userContent: 'What is the current campaign status?',
      }),
    )

    expect(result.failed).toBeUndefined()
    expect(result.content).toContain('specific client campaign')
    expect(executeAction).not.toHaveBeenCalled()
    expect(streamCompletion).not.toHaveBeenCalled()
    expect(progressiveSend).toHaveBeenCalledWith(
      'content_delta',
      expect.objectContaining({ content: expect.stringContaining('specific client campaign') }),
    )
  })

  it('retrieves only the seven-day calendar window for an ongoing meeting follow-up', async () => {
    const executeAction = vi.fn(async () => ({ events: [] }))
    const streamCompletion = vi.fn(async () => ({
      content: 'No upcoming meetings.',
      toolSteps: [],
    }))
    const service = makeService({ executeAction, streamCompletion })

    await service.run(
      makeRunInput({
        selectedModelInput: 'auto',
        userContent: 'What meetings do I have over the next few days?',
      }),
    )

    expect(executeAction).toHaveBeenCalledTimes(1)
    expect(executeAction.mock.calls[0]?.[0]).toBe('list_calendar_events')
    const data = executeAction.mock.calls[0]?.[1] as { start: string; end: string }
    expect(new Date(data.end).getTime() - new Date(data.start).getTime()).toBe(7 * 86_400_000)
  })

  it('starts after today when an ongoing meeting follow-up excludes today', async () => {
    const executeAction = vi.fn(async () => ({ events: [] }))
    const service = makeService({ executeAction })
    const before = new Date()
    before.setUTCHours(0, 0, 0, 0)
    before.setUTCDate(before.getUTCDate() + 1)

    await service.run(
      makeRunInput({
        selectedModelInput: 'auto',
        userContent: 'What meetings do I have coming up after today?',
      }),
    )

    const data = executeAction.mock.calls[0]?.[1] as { start: string; end: string }
    expect(data.start).toBe(before.toISOString())
    expect(new Date(data.end).getTime() - new Date(data.start).getTime()).toBe(7 * 86_400_000)
  })

  it('retrieves and labels tomorrow as a one-day future window', async () => {
    const executeAction = vi.fn(async () => ({ events: [] }))
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ executeAction })
    const tomorrow = new Date()
    tomorrow.setUTCHours(0, 0, 0, 0)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    const result = await service.run(
      makeRunInput({
        progressiveSend,
        selectedModelInput: 'auto',
        userContent: 'What meetings do I have tomorrow?',
      }),
    )

    const data = executeAction.mock.calls[0]?.[1] as { start: string; end: string }
    expect(data.start).toBe(tomorrow.toISOString())
    expect(new Date(data.end).getTime() - new Date(data.start).getTime()).toBe(86_400_000)
    expect(progressiveSend).toHaveBeenCalledWith('status', {
      phase: 'executing',
      message: "Retrieving tomorrow's meetings",
    })
    expect(result.content).toBe(
      "## Tomorrow's meetings\n\nNo meetings are scheduled in this window.",
    )
  })

  it('shows the research answer when the Sonnet writing pass fails', async () => {
    const streamCompletion = vi
      .fn()
      .mockResolvedValueOnce({
        content: 'Useful researched answer.',
        toolSteps: [],
        completedGenerations: [{ generationId: 'gen-research' }],
      })
      .mockResolvedValueOnce({
        content: '',
        toolSteps: [],
        failed: 'provider_busy',
        completedGenerations: [{ generationId: 'gen-write' }],
      })
    const progressiveSend = vi.fn(async () => undefined)
    const service = makeService({ streamCompletion })

    const result = await service.run(
      makeRunInput({
        progressiveSend,
        selectedModelInput: 'auto',
      }),
    )

    expect(streamCompletion).toHaveBeenCalledTimes(2)
    expect(result.content).toBe('Useful researched answer.')
    expect(progressiveSend).toHaveBeenCalledWith('content_delta', {
      delta: 'Useful researched answer.',
    })
    expect(result.recoveryEvents).toEqual([
      expect.objectContaining({
        type: 'writer_fallback_to_research',
        status: 'recovered',
      }),
    ])
  })
})
