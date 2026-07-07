import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacySessionCampaignService } from './artifact-legacy-session-campaign.service'

describe('ArtifactLegacySessionCampaignService.parseAgentIdFromSessionKey', () => {
  const service = new ArtifactLegacySessionCampaignService()
  const userId = '92ae97d0-447e-497c-8ecf-bbab8382defc'
  const convId = '84439d84-194f-4d10-af21-b19a9547dba5'
  const orgId = 'f1343da8-3796-4278-91f6-b08b8f9140f8'
  const campaignId = '7d561b6b-809d-42a7-b4ac-e6b0c7e13255'
  const missionId = 'bcd4a706-f636-4800-b839-3dfc462b8cd5'

  it('returns plain agent key from non-org chat session key', () => {
    const key = `agent:vibey:vibey-${userId}-${convId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('vibey')
  })

  it('strips org-<uuid>- prefix from chat session key (RBAC regression)', () => {
    const gatewayId = `org-${orgId}-vibey`
    const key = `agent:${gatewayId}:${gatewayId}-${userId}-${convId}::campaign:${campaignId}::org:${orgId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('vibey')
  })

  it('strips org-<uuid>- prefix for non-vibey agents', () => {
    const gatewayId = `org-${orgId}-copywriter`
    const key = `agent:${gatewayId}:${gatewayId}-${userId}-${convId}::org:${orgId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('copywriter')
  })

  it('preserves suffixed agent keys inside org prefix (e.g. viktor_2)', () => {
    const gatewayId = `org-${orgId}-viktor_2`
    const key = `agent:${gatewayId}:${gatewayId}-${userId}-${convId}::org:${orgId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('viktor_2')
  })

  it('normalizes default/main to vibey', () => {
    expect(service.parseAgentIdFromSessionKey(`agent:main:main-${userId}-${convId}`)).toBe('vibey')
    expect(service.parseAgentIdFromSessionKey(`agent:default:default-${userId}-${convId}`)).toBe(
      'vibey',
    )
  })

  it('resolves hosted MCP personal session keys', () => {
    const key = `agent:vibey:vibey-${userId}-${convId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('vibey')
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: convId })
  })

  it('resolves hosted MCP org session keys', () => {
    const key = `agent:org-${orgId}-vibey:org-${orgId}-vibey-${userId}-${convId}::org:${orgId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('vibey')
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: convId })
    expect(service.parseOrgIdFromSessionKey(key)).toBe(orgId)
  })

  it('resolves mission-mode agent key from the mission marker', () => {
    const key = `agent:gateway:mission:atlas:${userId}:${missionId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('atlas')
  })

  it('resolves mission-mode agent key even when gateway id carries org prefix', () => {
    const gatewayId = `org-${orgId}-manager`
    const key = `agent:${gatewayId}:mission:atlas:${userId}:${missionId}::org:${orgId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('atlas')
  })

  it('resolves state-mode agent key from the state marker', () => {
    const key = `agent:vibey:state:vibey:${userId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('vibey')
  })

  it('does not misinterpret UUID-looking strings inside non-org prefixes', () => {
    const key = `agent:wren:wren-${userId}-${convId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('wren')
  })

  it('returns null for malformed session keys with no parts[1]', () => {
    expect(service.parseAgentIdFromSessionKey('agent:')).toBeNull()
  })
})

describe('ArtifactLegacySessionCampaignService.parseSessionIds', () => {
  const service = new ArtifactLegacySessionCampaignService()
  const userId = '92ae97d0-447e-497c-8ecf-bbab8382defc'
  const convId = '84439d84-194f-4d10-af21-b19a9547dba5'
  const orgId = 'f1343da8-3796-4278-91f6-b08b8f9140f8'
  const campaignId = '7d561b6b-809d-42a7-b4ac-e6b0c7e13255'
  const missionId = 'bcd4a706-f636-4800-b839-3dfc462b8cd5'
  const subtaskId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

  it('extracts userId and conversationId from non-org chat session key', () => {
    const key = `agent:vibey:vibey-${userId}-${convId}`
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: convId })
  })

  it('extracts correct userId and conversationId from org-prefixed chat session key (FK regression)', () => {
    const gatewayId = `org-${orgId}-vibey`
    const key = `agent:${gatewayId}:${gatewayId}-${userId}-${convId}::campaign:${campaignId}::org:${orgId}`
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: convId })
  })

  it('extracts userId/conversationId for non-vibey org-prefixed agent', () => {
    const gatewayId = `org-${orgId}-copywriter`
    const key = `agent:${gatewayId}:${gatewayId}-${userId}-${convId}::org:${orgId}`
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: convId })
  })

  it('extracts userId/missionId from mission session key unchanged', () => {
    const key = `agent:vibey:mission:atlas:${userId}:${missionId}::org:${orgId}`
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: missionId })
  })

  it('extracts userId/missionId from org-gateway mission session key', () => {
    const gatewayId = `org-${orgId}-manager`
    const key = `agent:${gatewayId}:mission:atlas:${userId}:${missionId}::org:${orgId}`
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: missionId })
  })

  it('extracts userId/subtaskId from subtask session key', () => {
    const key = `agent:vibey:subtask:atlas:${userId}:${subtaskId}::org:${orgId}`
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: subtaskId })
  })

  it('extracts userId/outboxId from brain ops session key without treating it as a mission', () => {
    const outboxId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
    const key = `agent:org:${orgId}:atlas:brain_ops:atlas:${userId}:${outboxId}::org:${orgId}`
    expect(service.parseAgentIdFromSessionKey(key)).toBe('atlas')
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: outboxId })
    expect(service.isMissionSessionKey(key)).toBe(false)
  })

  it('extracts userId from brain-job-style session key (no conversationId)', () => {
    const ts = 1712345678901
    const key = `agent:atlas:atlas-brain-job-${userId}:${ts}::campaign:${campaignId}`
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: null })
  })

  it('extracts userId/conversationId from delegation session key', () => {
    const delegationId = '11111111-2222-3333-4444-555555555555'
    const key = `agent:atlas:delegation:vibey:${userId}:${convId}:${delegationId}::campaign:${campaignId}::depth:1::chain:vibey`
    const parsed = service.parseSessionIds(key)
    expect(parsed?.userId).toBe(userId)
    expect(parsed?.conversationId).toBe(convId)
  })

  it('returns null when no UUIDs are present in the suffix', () => {
    expect(service.parseSessionIds('agent:vibey:main')).toBeNull()
  })
})

describe('ArtifactLegacySessionCampaignService.parseSpaceIdFromSessionKey', () => {
  const service = new ArtifactLegacySessionCampaignService()

  it('extracts space id from a scoped chat session key', () => {
    const spaceId = '00000000-0000-0000-0000-000000000004'
    const key =
      'agent:vibey:vibey-00000000-0000-0000-0000-000000000001-00000000-0000-0000-0000-000000000002::campaign:00000000-0000-0000-0000-000000000003::space:00000000-0000-0000-0000-000000000004'
    expect(service.parseSpaceIdFromSessionKey(key)).toBe(spaceId)
  })

  it('returns null when no space id suffix exists', () => {
    expect(service.parseSpaceIdFromSessionKey('agent:vibey:vibey-user-conversation')).toBeNull()
  })
})

describe('ArtifactLegacySessionCampaignService channel-thread compatibility', () => {
  const service = new ArtifactLegacySessionCampaignService()
  const userId = '92ae97d0-447e-497c-8ecf-bbab8382defc'
  const orgId = 'f1343da8-3796-4278-91f6-b08b8f9140f8'
  const threadId = '9df77261-2482-43ee-8a5f-3dc1a561506d'

  it('parses team-chat canonical key format for channel threads', () => {
    const gatewayId = `org-${orgId}-lux`
    const key = `agent:${gatewayId}:${gatewayId}-${userId}-${threadId}::org:${orgId}`

    expect(service.parseAgentIdFromSessionKey(key)).toBe('lux')
    expect(service.parseSessionIds(key)).toEqual({ userId, conversationId: threadId })
    expect(service.parseOrgIdFromSessionKey(key)).toBe(orgId)
  })

  it('keeps org scope when retry suffix uses ::', () => {
    const gatewayId = `org-${orgId}-vibey`
    const key = `agent:${gatewayId}:${gatewayId}-${userId}-${threadId}::org:${orgId}::retry`
    expect(service.parseOrgIdFromSessionKey(key)).toBe(orgId)
  })
})

describe('ArtifactLegacySessionCampaignService.parseOrgIdFromGatewayPrefix', () => {
  const service = new ArtifactLegacySessionCampaignService()
  const orgId = 'f1343da8-3796-4278-91f6-b08b8f9140f8'

  it('extracts org id from canonical agent:org:<uuid>:<agent> gateway keys', () => {
    const key = `agent:org:${orgId}:atlas:mission:atlas:92ae97d0-447e-497c-8ecf-bbab8382defc:bcd4a706-f636-4800-b839-3dfc462b8cd5`
    expect(service.parseOrgIdFromGatewayPrefix(key)).toBe(orgId)
  })

  it('keeps support for legacy org-<uuid>-<agent> gateway keys', () => {
    const key = `agent:org-${orgId}-atlas:mission:atlas:92ae97d0-447e-497c-8ecf-bbab8382defc:bcd4a706-f636-4800-b839-3dfc462b8cd5`
    expect(service.parseOrgIdFromGatewayPrefix(key)).toBe(orgId)
  })
})

describe('ArtifactLegacySessionCampaignService read-only active context helpers', () => {
  const service = new ArtifactLegacySessionCampaignService()
  const userId = '92ae97d0-447e-497c-8ecf-bbab8382defc'
  const convId = '84439d84-194f-4d10-af21-b19a9547dba5'
  const campaignId = '7d561b6b-809d-42a7-b4ac-e6b0c7e13255'
  const spaceId = '82b24f9b-22f0-4b74-9a77-9c6098589e28'

  it('resolves active campaign and space from session suffixes without database mutation', async () => {
    const key = `agent:vibey:vibey-${userId}-${convId}::campaign:${campaignId}::space:${spaceId}`
    const target = {
      requestContext: { get: () => null },
    }

    await expect(
      service.resolveActiveCampaignIdForContext(target, {} as any, userId, key),
    ).resolves.toBe(campaignId)
    expect(service.resolveActiveSpaceIdForContext(target, key)).toBe(spaceId)
    expect(service.resolveActiveConversationIdForContext(key)).toBe(convId)
  })

  it('returns null for personal or space-scoped context instead of attaching General', async () => {
    const key = `agent:vibey:vibey-${userId}-${convId}`
    const target = {
      requestContext: {
        get: () => ({ userId, spaceId, campaignId: null, scopeKind: 'personal' }),
      },
    }
    const supabase = {
      from: () => {
        throw new Error('database should not be queried for personal scope')
      },
    }

    await expect(
      service.resolveActiveCampaignIdForContext(target, supabase as any, userId, key),
    ).resolves.toBeNull()
    expect(service.resolveActiveSpaceIdForContext(target, key)).toBe(spaceId)
  })

  it('falls back to conversation campaign_id only as a read', async () => {
    const key = `agent:vibey:vibey-${userId}-${convId}`
    const supabase = {
      from: (table: string) => {
        expect(table).toBe('conversations')
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { campaign_id: campaignId }, error: null }),
              }),
            }),
          }),
        }
      },
    }

    await expect(
      service.resolveActiveCampaignIdForContext(
        { requestContext: { get: () => null } },
        supabase as any,
        userId,
        key,
      ),
    ).resolves.toBe(campaignId)
  })

  it('resolves missing mission campaign suffix from mission context instead of General', async () => {
    const missionId = 'bcd4a706-f636-4800-b839-3dfc462b8cd5'
    const key = `agent:vibey:mission:atlas:${userId}:${missionId}`
    const target = {
      resolveMissionContext: async () => ({ missionId, campaignId, orgId: null }),
      requestContext: { get: () => null },
      logger: { warn: () => undefined, debug: () => undefined },
    }
    const supabase = {
      from: () => {
        throw new Error('General campaign should not be queried for mission sessions')
      },
    }

    await expect(service.resolveCampaignId(target, supabase as any, {}, userId, key)).resolves.toBe(
      campaignId,
    )
  })

  it('refuses General fallback when a mission session has no campaign scope', async () => {
    const missionId = 'bcd4a706-f636-4800-b839-3dfc462b8cd5'
    const key = `agent:vibey:mission:atlas:${userId}:${missionId}`
    const target = {
      resolveMissionContext: async () => ({ missionId, campaignId: null, orgId: null }),
      requestContext: { get: () => null },
      logger: { warn: () => undefined, debug: () => undefined },
    }
    const supabase = {
      from: () => {
        throw new Error('General campaign should not be queried for mission sessions')
      },
    }

    await expect(
      service.resolveCampaignId(target, supabase as any, {}, userId, key),
    ).resolves.toBeNull()
  })
})

describe('ArtifactLegacySessionCampaignService campaign and theme data access', () => {
  const service = new ArtifactLegacySessionCampaignService()
  const userId = '92ae97d0-447e-497c-8ecf-bbab8382defc'
  const convId = '84439d84-194f-4d10-af21-b19a9547dba5'
  const campaignId = '7d561b6b-809d-42a7-b4ac-e6b0c7e13255'
  const themeId = '11111111-1111-4111-8111-111111111111'

  function makeSupabase(options: { conversationCampaignId?: string | null } = {}) {
    const conversationUpdates: Array<Record<string, unknown>> = []
    const supabase = {
      from: vi.fn((table: string) => {
        const filters = new Map<string, unknown>()
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn((column: string, value: unknown) => {
            filters.set(column, value)
            return chain
          }),
          is: vi.fn((column: string, value: unknown) => {
            filters.set(column, value)
            return chain
          }),
          neq: vi.fn(() => chain),
          contains: vi.fn(() => chain),
          ilike: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn((payload: Record<string, unknown>) => {
            if (table === 'conversations') conversationUpdates.push(payload)
            return chain
          }),
          single: vi.fn(async () => ({ data: { id: campaignId }, error: null })),
          maybeSingle: vi.fn(async () => {
            if (table === 'campaigns') {
              const id = filters.get('id')
              return {
                data:
                  id === campaignId
                    ? {
                        id: campaignId,
                        config: {
                          agent_settings: {
                            media_generation_enabled: false,
                            theme_id: themeId,
                          },
                        },
                      }
                    : null,
                error: null,
              }
            }
            if (table === 'conversations') {
              return {
                data: { campaign_id: options.conversationCampaignId ?? null },
                error: null,
              }
            }
            if (table === 'branding_themes') {
              return { data: { id: themeId, user_id: userId }, error: null }
            }
            return { data: null, error: null }
          }),
        }
        return chain
      }),
    }
    return { conversationUpdates, supabase }
  }

  function makeTarget() {
    return {
      logger: { debug: vi.fn(), warn: vi.fn() },
      requestContext: { get: vi.fn(() => null) },
      resolveOrgId: vi.fn(() => null),
      serviceClient: {
        from: vi.fn((table: string) => ({
          select: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: table === 'branding_themes' ? [{ id: themeId }] : null,
              error: table === 'branding_themes' ? null : { message: 'missing' },
            })),
          })),
        })),
      },
      themeTableNamePromise: null as Promise<'branding_themes' | 'themes'> | null,
    }
  }

  it('resolves an explicit campaign id and attaches the conversation', async () => {
    const { conversationUpdates, supabase } = makeSupabase()
    const target = makeTarget()
    const key = `agent:vibey:vibey-${userId}-${convId}`

    await expect(
      service.resolveCampaignId(target, supabase as any, { campaign_id: campaignId }, userId, key),
    ).resolves.toBe(campaignId)
    expect(conversationUpdates[0]).toEqual({ campaign_id: campaignId })
  })

  it('falls back to the conversation campaign for active context reads', async () => {
    const { supabase } = makeSupabase({ conversationCampaignId: campaignId })
    const target = makeTarget()
    const key = `agent:vibey:vibey-${userId}-${convId}`

    await expect(
      service.resolveActiveCampaignIdForContext(target, supabase as any, userId, key),
    ).resolves.toBe(campaignId)
  })

  it('resolves a campaign theme id and validates theme ownership', async () => {
    const { supabase } = makeSupabase()
    const target = makeTarget()

    await expect(
      service.resolveThemeId(target, supabase as any, {}, userId, campaignId),
    ).resolves.toBe(themeId)
    await expect(
      service.validateThemeOwnership(target, supabase as any, userId, themeId),
    ).resolves.toBeUndefined()
  })

  it('reads campaign media-generation status from campaign config', async () => {
    const { supabase } = makeSupabase()

    await expect(service.isMediaGenerationEnabled(supabase as any, campaignId)).resolves.toBe(false)
  })
})
