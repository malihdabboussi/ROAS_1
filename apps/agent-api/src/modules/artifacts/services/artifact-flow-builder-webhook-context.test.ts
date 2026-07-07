import { describe, expect, it, vi } from 'vitest'
import { ArtifactFlowBuilderService } from './artifact-flow-builder.service'

function makeQueryClient() {
  const client = {
    from: vi.fn((table: string) => {
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        or: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        maybeSingle: vi.fn(async () => {
          if (table === 'spaces') {
            return {
              data: {
                id: 'space-1',
                title: 'Launch Space',
                user_id: 'owner-1',
                org_id: 'org-1',
                schema: { views: [] },
              },
              error: null,
            }
          }
          return { data: null, error: null }
        }),
        then: (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
          reject?: (reason?: unknown) => unknown,
        ) => {
          if (table === 'space_automations') {
            return Promise.resolve({ data: [], error: null }).then(resolve, reject)
          }
          if (table === 'project_flow_action_blueprint') {
            return Promise.resolve({ data: [], error: null }).then(resolve, reject)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve, reject)
        },
      }
      return query
    }),
  }
  return client
}

describe('ArtifactFlowBuilderService webhook context', () => {
  it('exposes webhook trigger workflow capability from get_flow_build_context', async () => {
    const handlers = new ArtifactFlowBuilderService().getHandlers({
      resolveUserId: vi.fn(() => 'user-1'),
      getUserClient: vi.fn(async () => makeQueryClient()),
      requestContext: {
        getActiveFlowBuild: vi.fn(),
        setActiveFlowBuild: vi.fn(),
      },
    })

    const result = (await handlers.get_flow_build_context(
      { space_id: 'space-1', query: 'webhook' },
      'agent:11111111-1111-1111-1111-111111111111',
    )) as Record<string, any>

    expect(result.success).toBe(true)
    expect(
      result.context.workflow_capabilities.results.some(
        (capability: Record<string, unknown>) =>
          capability.id === 'trigger.webhook_received' &&
          capability.execution &&
          (capability.execution as Record<string, unknown>).executor === 'space_automation',
      ),
    ).toBe(true)
  })
})
