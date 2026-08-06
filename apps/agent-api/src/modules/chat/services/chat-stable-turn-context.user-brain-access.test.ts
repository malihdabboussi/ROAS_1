import { describe, expect, it, vi } from 'vitest'
import { ChatStableTurnContextService } from './chat-stable-turn-context.service'

describe('ChatStableTurnContextService personal brain access', () => {
  it('enables userBrainAccess from role defaults via canAgentUseCapability', async () => {
    const agentPolicy = {
      resolveAgentPolicy: vi.fn(async () => ({
        // Org team grants omit personal brain, but vibey role defaults still allow it.
        effective: new Set(['campaign_context:*']),
        grants: [],
        overrides: { allow_extra: [], deny: [] },
        teamId: 'team-1',
      })),
      canAgentUseCapability: vi.fn(async (_agentKey: string, kind: string, id: string) => {
        return kind === 'brain_access' && id === 'personal'
      }),
    }
    const service = new ChatStableTurnContextService(
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'org-1-vibey',
          agentKey: 'vibey',
        })),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        findAgentRegistration: vi.fn(async () => ({
          data: { config: {}, is_active: true },
          error: null,
        })),
      } as any,
      {
        normalizeModelValue: vi.fn(() => null),
        resolveAgentConfiguredModel: vi.fn(async () => null),
        validateModelSettings: vi.fn(async (modelId: string) => ({
          resolvedModelId: modelId,
        })),
        mergeResolvedModelSettings: vi.fn((_selection: unknown, settings: unknown) => settings),
      } as any,
      agentPolicy as any,
    )

    const result = await service.resolve({
      prewarmedStableContext: null,
      conversation: { agent_id: 'vibey' },
      dbSupabase: {} as any,
      dbOp: async (op) => op({} as any),
      requestCampaignId: null,
      hasMessageCampaignScope: false,
      conversationId: 'conversation-1',
      userId: 'user-1',
      orgId: 'org-1',
      source: 'studio',
      sendSetupStatus: vi.fn(async () => undefined),
      logger: { warn: vi.fn() },
    })

    expect(agentPolicy.canAgentUseCapability).toHaveBeenCalledWith(
      'vibey',
      'brain_access',
      'personal',
      { orgId: 'org-1', userId: null },
    )
    expect(result.userBrainAccess).toBe(true)
  })

  it('keeps userBrainAccess false when canAgentUseCapability denies personal brain', async () => {
    const agentPolicy = {
      resolveAgentPolicy: vi.fn(async () => ({
        effective: new Set(),
        grants: [],
        overrides: { allow_extra: [], deny: [] },
        teamId: null,
      })),
      canAgentUseCapability: vi.fn(async () => false),
    }
    const service = new ChatStableTurnContextService(
      {
        resolveConversationRuntime: vi.fn(async () => ({
          gatewayAgentId: 'org-1-zara',
          agentKey: 'zara',
        })),
      } as any,
      { ensureRuntimeReady: vi.fn(async () => undefined) } as any,
      {
        findAgentRegistration: vi.fn(async () => ({
          data: { config: {}, is_active: true },
          error: null,
        })),
      } as any,
      {
        normalizeModelValue: vi.fn(() => null),
        resolveAgentConfiguredModel: vi.fn(async () => null),
        validateModelSettings: vi.fn(async (modelId: string) => ({
          resolvedModelId: modelId,
        })),
        mergeResolvedModelSettings: vi.fn((_selection: unknown, settings: unknown) => settings),
      } as any,
      agentPolicy as any,
    )

    const result = await service.resolve({
      prewarmedStableContext: null,
      conversation: { agent_id: 'zara' },
      dbSupabase: {} as any,
      dbOp: async (op) => op({} as any),
      requestCampaignId: null,
      hasMessageCampaignScope: false,
      conversationId: 'conversation-2',
      userId: 'user-1',
      orgId: 'org-1',
      source: 'studio',
      sendSetupStatus: vi.fn(async () => undefined),
      logger: { warn: vi.fn() },
    })

    expect(result.userBrainAccess).toBe(false)
  })
})
