import { describe, expect, it, vi } from 'vitest'
import { SkillRecommendationEventRecorderService } from './skill-recommendation-event-recorder.service'

describe('SkillRecommendationEventRecorderService', () => {
  it('records completion events only when org skill recommendations are enabled', async () => {
    const insert = vi.fn(async () => ({ error: null }))
    const maybeSingle = vi.fn(async () => ({
      data: { settings: { skill_recommendations: { enabled: true } } },
      error: null,
    }))
    const from = vi.fn((table: string) => {
      if (table === 'organizations') {
        const query: any = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          maybeSingle,
        }
        return query
      }
      return { insert }
    })
    const service = new SkillRecommendationEventRecorderService({ client: { from } } as any)

    await service.recordCompletion({
      userId: 'user-1',
      orgId: 'org-1',
      agentKey: 'zara',
      conversationId: 'conversation-1',
      traceId: 'trace-1',
      channel: 'studio',
      prompt: 'Please use /research for brian@example.com',
      response: 'Done',
      toolSteps: [
        { name: 'web_search', status: 'completed' },
        { label: 'Failed Tool', status: 'failed' },
      ],
      resolvedCommands: [
        { key: 'research', type: 'skill' },
        { key: 'handoff', type: 'workflow' },
      ],
    })

    expect(from).toHaveBeenCalledWith('organizations')
    expect(from).toHaveBeenCalledWith('skill_recommendation_events')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        agent_key: 'zara',
        conversation_id: 'conversation-1',
        trace_id: 'trace-1',
        channel: 'studio',
        tool_names: ['web_search'],
        skill_keys_used: ['research'],
        workflow_keys_used: ['handoff'],
        status: 'completed',
      }),
    )
  })
})
