import type { ConfigService } from '@nestjs/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isArtifactActionAllowed,
  resolveCapabilityPolicy,
  resolveManagedActionAllowlist,
  type ArtifactCapabilityPolicy,
} from './artifact-capability.policy'
import { ArtifactMissionsMediaService } from './artifact-missions-media.service'
import { ArtifactsService } from './artifacts.service'

const stubMissionsMedia = new ArtifactMissionsMediaService({
  loadCookiesForYtDlp: vi.fn(async () => null),
} as any)

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

function makeService(): any {
  const service = new ArtifactsService(
    makeConfigMock(),
    { logError: vi.fn() } as any,
    { get: vi.fn(), set: vi.fn() } as any,
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
  ) as any
  service.setPostActionVerifierForTests?.({
    verify: vi.fn(async () => ({ status: 'verified' as const, checks: [] })),
  })
  return service
}

function makeUserClientForAgent(agentRow: Record<string, unknown> | null) {
  const terminal = {
    maybeSingle: async () => ({ data: agentRow, error: null }),
    eq: () => terminal,
    is: () => terminal,
  }
  return {
    from: () => ({
      select: () => ({
        eq: () => terminal,
        is: () => terminal,
      }),
    }),
  }
}

function withAgent(service: any, agentKey: string, agentRow: Record<string, unknown> | null) {
  service.resolveUserId = vi.fn(() => 'user-1')
  service.parseAgentIdFromSessionKey = vi.fn(() => agentKey)
  service.getUserClient = vi.fn(async () => makeUserClientForAgent(agentRow))
}

describe('ArtifactsService RBAC', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('denies create_agent for vibey_ceo (HR-only)', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'system',
      role: 'CMO',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })

    const result = await service.executeAction('create_agent', {}, 'agent:vibey:stub')
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('not available')
  })

  it('allows HR team actions', async () => {
    const service = makeService()
    withAgent(service, 'hr', {
      agent_key: 'hr',
      level: 'system',
      role: 'Recruiter',
      config: { capability_profile: 'system_hr', capability_domain: 'management' },
    })
    service.hrListTeam = vi.fn(async () => ({ success: true, team: [] }))

    const result = await service.executeAction('list_team', {}, 'agent:hr:stub')
    expect(result.success).toBe(true)
    expect(service.hrListTeam).toHaveBeenCalledTimes(1)
  })

  it('denies create_agent for managed manager profile', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'manager',
      role: 'Operations Manager',
      config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
    })

    const result = await service.executeAction('create_agent', {}, 'agent:vibey:stub')
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('restricted to the HR agent')
  })

  it('fails closed for unknown agent', async () => {
    const service = makeService()
    withAgent(service, 'ghost', null)

    const result = await service.executeAction('list_offers', {}, 'agent:ghost:stub')
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('Unknown agent')
  })

  it('fails closed for invalid session key format', async () => {
    const service = makeService()
    service.resolveUserId = vi.fn(() => 'user-1')
    service.parseAgentIdFromSessionKey = vi.fn(() => null)

    const result = await service.executeAction('list_offers', {}, 'invalid-session')
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('agent key is required')
  })

  it('allows marketing employee action and use_integration', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })
    service.createOffer = vi.fn(async () => ({ success: true }))

    const allowResult = await service.executeAction('create_offer', {}, 'agent:copywriter:stub')
    expect(allowResult.success).toBe(true)
    expect(service.createOffer).toHaveBeenCalledTimes(1)

    service.useIntegration = vi.fn(async () => ({ success: true }))
    const integrationResult = await service.executeAction(
      'use_integration',
      { service: 'github', integration_action: 'create_pr', params: { repo: 'x' } },
      'agent:copywriter:stub',
    )
    expect(integrationResult.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(1)
  })

  it('denies personal brain tools when the access policy switch is off', async () => {
    const service = makeService()
    withAgent(service, 'zara', {
      agent_key: 'zara',
      level: 'employee',
      role: 'Customer Support Agent',
      config: { capability_profile: 'managed_domain', capability_domain: 'support' },
    })
    service.agentPolicyService = {
      canAgentUseCapability: vi.fn(async () => false),
    }
    service.searchMemory = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'search_user_brain',
      { query: 'tennis europe' },
      'agent:zara:stub',
    )

    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('Read personal brain')
    expect(service.searchMemory).not.toHaveBeenCalled()
  })

  it('denies campaign context tools when the access policy switch is off', async () => {
    const service = makeService()
    withAgent(service, 'zara', {
      agent_key: 'zara',
      level: 'employee',
      role: 'Customer Support Agent',
      config: { capability_profile: 'managed_domain', capability_domain: 'support' },
    })
    service.agentPolicyService = {
      canAgentUseCapability: vi.fn(async () => false),
    }
    service.getCampaign = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction('get_campaign', {}, 'agent:zara:stub')

    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('Read current campaign context')
    expect(service.getCampaign).not.toHaveBeenCalled()
  })

  it('allows protected brain tools when the access policy switch is on', async () => {
    const service = makeService()
    withAgent(service, 'zara', {
      agent_key: 'zara',
      level: 'employee',
      role: 'Customer Support Agent',
      config: { capability_profile: 'managed_domain', capability_domain: 'support' },
    })
    service.agentPolicyService = {
      canAgentUseCapability: vi.fn(async () => true),
    }
    service.searchMemory = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'search_user_brain',
      { query: 'tennis europe' },
      'agent:zara:stub',
    )

    expect(result.success).toBe(true)
    expect(service.searchMemory).toHaveBeenCalledTimes(1)
  })

  it('lets MCP personal brain reads use OAuth consent instead of the agent switch', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'system',
      role: 'CEO',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.agentPolicyService = {
      canAgentUseCapability: vi.fn(async () => false),
    }
    service.searchMemory = vi.fn(async () => ({ success: true }))
    service.getActionRegistryForTests().list_user_brain_memories = vi.fn(async () => ({
      success: true,
      memories: [],
    }))

    const searchResult = await service.executeAction(
      'search_user_brain',
      { query: 'MCP access' },
      'agent:vibey:user-1:11111111-1111-4111-8111-111111111111::mcp:test-client',
    )
    const listResult = await service.executeAction(
      'list_user_brain_memories',
      { limit: 3 },
      'agent:vibey:user-1:11111111-1111-4111-8111-111111111111::mcp:test-client',
    )

    expect(searchResult.success).toBe(true)
    expect(listResult.success).toBe(true)
    expect(service.agentPolicyService.canAgentUseCapability).not.toHaveBeenCalled()
    expect(service.searchMemory).toHaveBeenCalledTimes(1)
    expect(service.getActionRegistryForTests().list_user_brain_memories).toHaveBeenCalledTimes(1)
  })

  it('allows managed agents to save regular user memories', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })
    service.saveMemory = vi.fn(async () => ({ success: true, memory_id: 'memory-1' }))

    const result = await service.executeAction(
      'save_user_memory',
      { content: 'User likes concise launch plans.', memory_type: 'preference' },
      'agent:copywriter:stub',
    )

    expect(result.success).toBe(true)
    expect(service.saveMemory).toHaveBeenCalledTimes(1)
  })

  it('blocks direct Atlas-only brain actions for Vibey even if a stale enum exposes them', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'system',
      role: 'CEO',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.getActionRegistryForTests().create_brain_page = vi.fn(async () => ({
      success: true,
    }))
    service.getActionRegistryForTests().ingest_user_brain_document = vi.fn(async () => ({
      success: true,
    }))
    service.getActionRegistryForTests().create_strategy_node = vi.fn(async () => ({
      success: true,
    }))

    for (const action of [
      'create_brain_page',
      'ingest_user_brain_document',
      'create_strategy_node',
    ]) {
      const result = await service.executeAction(action, {}, 'agent:vibey:stub')
      expect(result.success).toBe(false)
      expect(String(result.error)).toMatch(/Atlas|brain|strategy|not available|restricted/i)
    }

    expect(service.getActionRegistryForTests().create_brain_page).not.toHaveBeenCalled()
    expect(service.getActionRegistryForTests().ingest_user_brain_document).not.toHaveBeenCalled()
    expect(service.getActionRegistryForTests().create_strategy_node).not.toHaveBeenCalled()
  })

  it('allows vibey to create_pdf', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'employee',
      role: 'Marketing Strategist',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.getActionRegistryForTests().create_pdf = vi.fn(async () => ({
      success: true,
      file_url: 'https://example.com/report.pdf',
    }))

    const result = await service.executeAction(
      'create_pdf',
      { title: 'IG Analysis', content: 'Report body' },
      'agent:vibey:stub',
    )
    expect(result.success).toBe(true)
    expect(service.getActionRegistryForTests().create_pdf).toHaveBeenCalledTimes(1)
  })

  it('allows vibey to create_docx', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'employee',
      role: 'Marketing Strategist',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.getActionRegistryForTests().create_docx = vi.fn(async () => ({
      success: true,
      file_url: 'https://example.com/report.docx',
    }))

    const result = await service.executeAction(
      'create_docx',
      { title: 'IG Analysis', content: 'Report body' },
      'agent:vibey:stub',
    )
    expect(result.success).toBe(true)
    expect(service.getActionRegistryForTests().create_docx).toHaveBeenCalledTimes(1)
  })

  it('allows Vibey and denies non-Vibey mission-manager actions', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'system',
      role: 'CEO',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.getActionRegistryForTests().answer_mission_question = vi.fn(async () => ({
      success: true,
      reply: 'The mission is blocked because the skill was not registered.',
    }))

    const vibeyResult = await service.executeAction(
      'answer_mission_question',
      { mission_id: '11111111-1111-1111-1111-111111111111', question: 'why blocked?' },
      'agent:vibey:stub',
    )
    expect(vibeyResult.success).toBe(true)

    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })
    service.getActionRegistryForTests().retry_mission_subtask = vi.fn(async () => ({
      success: true,
    }))

    const workerResult = await service.executeAction(
      'retry_mission_subtask',
      {
        mission_id: '11111111-1111-1111-1111-111111111111',
        subtask_id: '22222222-2222-2222-2222-222222222222',
      },
      'agent:copywriter:stub',
    )
    expect(workerResult.success).toBe(false)
    expect(String(workerResult.error)).toContain('Vibey')
    expect(service.getActionRegistryForTests().retry_mission_subtask).not.toHaveBeenCalled()
  })

  it('persists mission save_document to mission_deliverables', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'employee',
      role: 'Marketing Strategist',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.resolveMissionContext = vi.fn(async () => ({
      missionId: '11111111-1111-1111-1111-111111111111',
      campaignId: '22222222-2222-2222-2222-222222222222',
    }))
    service.persistMissionDeliverable = vi.fn(async () => ({
      success: true,
      id: 'd-1',
      deliverable_id: 'd-1',
      type: 'doc',
      title: 'Mission Doc',
      file_url: null,
      file_name: null,
      metadata: {},
    }))

    const result = await service.executeAction(
      'save_document',
      { title: 'Mission Doc', content: { blocks: [{ text: 'Hello' }] } },
      'agent:gateway:mission:vibey:user-1:11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(true)
    expect(service.persistMissionDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAction: 'save_document',
        type: 'doc',
        idempotencyKey: expect.stringContaining(
          'mission:11111111-1111-1111-1111-111111111111:subtask:none:agent:vibey:action:save_document',
        ),
      }),
    )
  })

  it('persists mission create_pdf to mission_deliverables', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'employee',
      role: 'Marketing Strategist',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.resolveMissionContext = vi.fn(async () => ({
      missionId: '11111111-1111-1111-1111-111111111111',
      campaignId: '22222222-2222-2222-2222-222222222222',
    }))
    service.generateStyledPdfBytes = vi.fn(async () => new Uint8Array([1, 2, 3]))
    service.uploadPdfBytes = vi.fn(async () => ({
      success: true,
      url: 'https://example.com/mission.pdf',
    }))
    service.persistMissionDeliverable = vi.fn(async () => ({
      success: true,
      id: 'd-2',
      deliverable_id: 'd-2',
      type: 'pdf',
      title: 'Mission PDF',
      file_url: 'https://example.com/mission.pdf',
      file_name: 'mission.pdf',
      metadata: {},
    }))

    const result = await service.executeAction(
      'create_pdf',
      { title: 'Mission PDF', content: 'Body' },
      'agent:gateway:mission:vibey:user-1:11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(true)
    expect(service.persistMissionDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAction: 'create_pdf',
        type: 'pdf',
        idempotencyKey: expect.stringContaining(
          'mission:11111111-1111-1111-1111-111111111111:subtask:none:agent:vibey:action:create_pdf',
        ),
      }),
    )
  })

  it('persists mission create_docx to mission_deliverables as file', async () => {
    const service = makeService()
    withAgent(service, 'vibey', {
      agent_key: 'vibey',
      level: 'employee',
      role: 'Marketing Strategist',
      config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
    })
    service.resolveMissionContext = vi.fn(async () => ({
      missionId: '11111111-1111-1111-1111-111111111111',
      campaignId: '22222222-2222-2222-2222-222222222222',
    }))
    service.generateDocxBytes = vi.fn(async () => new Uint8Array([1, 2, 3]))
    service.uploadDocxBytes = vi.fn(async () => ({
      success: true,
      url: 'https://example.com/mission.docx',
    }))
    service.persistMissionDeliverable = vi.fn(async () => ({
      success: true,
      id: 'd-3',
      deliverable_id: 'd-3',
      type: 'file',
      title: 'Mission DOCX',
      file_url: 'https://example.com/mission.docx',
      file_name: 'mission.docx',
      metadata: {},
    }))

    const result = await service.executeAction(
      'create_docx',
      { title: 'Mission DOCX', content: 'Body' },
      'agent:gateway:mission:vibey:user-1:11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(true)
    expect(service.persistMissionDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAction: 'create_docx',
        type: 'file',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        idempotencyKey: expect.stringContaining(
          'mission:11111111-1111-1111-1111-111111111111:subtask:none:agent:vibey:action:create_docx',
        ),
      }),
    )
  })

  it('allows developer employee use_integration for github', async () => {
    const service = makeService()
    withAgent(service, 'developer', {
      agent_key: 'developer',
      level: 'employee',
      role: 'Senior Full-Stack Web Engineer',
      config: { capability_profile: 'managed_domain', capability_domain: 'developer' },
    })
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'use_integration',
      { service: 'github', integration_action: 'read_file', params: { repo: 'x' } },
      'agent:developer:stub',
    )
    expect(result.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(1)
  })

  it('blocks analyst employee use_integration for scrapecreators', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })

    const result = await service.executeAction(
      'use_integration',
      {
        service: 'scrapecreators',
        integration_action: 'tiktok_video_transcript',
        params: { url: 'https://www.tiktok.com/@x/video/1' },
      },
      'agent:analyst:stub',
    )
    expect(result.success).toBe(false)
    expect(String((result as { error?: string }).error)).toContain('Social Analysis')
  })

  it('allows marketing employee use_integration for scrapecreators', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'use_integration',
      {
        service: 'scrapecreators',
        integration_action: 'tiktok_video_transcript',
        params: { url: 'https://www.tiktok.com/@x/video/1' },
      },
      'agent:copywriter:stub',
    )
    expect(result.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(1)
  })

  it('allows analyst employee use_integration for SEO Research', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'use_integration',
      {
        service: 'seo_research',
        integration_action: 'google_serp',
        params: { keyword: 'seo agency' },
      },
      'agent:analyst:stub',
    )
    expect(result.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(1)
  })

  it('blocks operations employee use_integration for SEO Research', async () => {
    const service = makeService()
    withAgent(service, 'pm_operations', {
      agent_key: 'pm_operations',
      level: 'employee',
      role: 'Operations Coordinator',
      config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
    })

    const result = await service.executeAction(
      'use_integration',
      {
        service: 'dataforseo',
        integration_action: 'google_serp',
        params: { keyword: 'seo agency' },
      },
      'agent:pm_operations:stub',
    )
    expect(result.success).toBe(false)
    expect(String((result as { error?: string }).error)).toContain('SEO Research')
  })

  it('allows developer manager use_integration for github write', async () => {
    const service = makeService()
    withAgent(service, 'eng_manager', {
      agent_key: 'eng_manager',
      level: 'manager',
      role: 'Engineering Manager',
      config: { capability_profile: 'managed_domain', capability_domain: 'developer' },
    })
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const result = await service.executeAction(
      'use_integration',
      { service: 'github', integration_action: 'commit_files', params: { repo: 'x' } },
      'agent:eng_manager:stub',
    )
    expect(result.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(1)
  })

  it('manager operations domain gets cross-domain reads, list_campaign_team, but not content creation', async () => {
    const service = makeService()
    withAgent(service, 'pm', {
      agent_key: 'pm',
      level: 'manager',
      role: 'Campaign Project Manager',
      config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
    })
    service.useIntegration = vi.fn(async () => ({ success: true }))
    service.listCampaignTeam = vi.fn(async () => ({ success: true, team: [] }))

    const denyCreateOffer = await service.executeAction('create_offer', {}, 'agent:pm:stub')
    expect(denyCreateOffer.success).toBe(false)

    const canUseIntegration = await service.executeAction(
      'use_integration',
      {
        service: 'github',
        integration_action: 'commit_files',
        params: { repo: 'x' },
      },
      'agent:pm:stub',
    )
    expect(canUseIntegration.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(1)

    const canListCampaignTeam = await service.executeAction(
      'list_campaign_team',
      {},
      'agent:pm:stub',
    )
    expect(canListCampaignTeam.success).toBe(true)
    expect(service.listCampaignTeam).toHaveBeenCalledTimes(1)
  })

  it('manager marketing domain can use_integration but cannot create_agent', async () => {
    const service = makeService()
    withAgent(service, 'marketing_manager', {
      agent_key: 'marketing_manager',
      level: 'manager',
      role: 'Marketing Manager',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })

    service.useIntegration = vi.fn(async () => ({ success: true }))
    const canUseIntegration = await service.executeAction(
      'use_integration',
      { service: 'github', integration_action: 'commit_files', params: { repo: 'x' } },
      'agent:marketing_manager:stub',
    )
    expect(canUseIntegration.success).toBe(true)

    const denyCreateAgent = await service.executeAction(
      'create_agent',
      {},
      'agent:marketing_manager:stub',
    )
    expect(denyCreateAgent.success).toBe(false)
    expect(String(denyCreateAgent.error)).toContain('restricted to the HR agent')
  })

  it('c_level operations can use_integration and read offers but cannot create_offer', async () => {
    const service = makeService()
    withAgent(service, 'z', {
      agent_key: 'z',
      level: 'c_level',
      role: 'COO',
      config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
    })
    service.listOffers = vi.fn(async () => [])
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const readOffers = await service.executeAction('list_offers', {}, 'agent:z:stub')
    expect(readOffers).toEqual([])
    expect(service.listOffers).toHaveBeenCalledTimes(1)

    const githubRead = await service.executeAction(
      'use_integration',
      {
        service: 'github',
        integration_action: 'read_file',
        params: { repo: 'x' },
      },
      'agent:z:stub',
    )
    expect(githubRead.success).toBe(true)

    const denyCreate = await service.executeAction('create_offer', {}, 'agent:z:stub')
    expect(denyCreate.success).toBe(false)
    expect(String(denyCreate.error)).toContain('not available')
  })

  it('c_level operations can list missions but cannot create missions (Vibey-only)', async () => {
    const service = makeService()
    withAgent(service, 'z', {
      agent_key: 'z',
      level: 'c_level',
      role: 'COO',
      config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
    })
    service.listMissions = vi.fn(async () => [{ id: 'm1' }])

    const listed = await service.executeAction('list_missions', {}, 'agent:z:stub')
    expect(Array.isArray(listed)).toBe(true)
    expect(service.listMissions).toHaveBeenCalledTimes(1)

    const denyCreate = await service.executeAction(
      'create_mission',
      { title: 'Launch sequence' },
      'agent:z:stub',
    )
    expect(denyCreate.success).toBe(false)
    expect(String(denyCreate.error)).toContain('not available')
  })

  it('manager operations domain can list missions but not create (Vibey-only)', async () => {
    const service = makeService()
    withAgent(service, 'pm', {
      agent_key: 'pm',
      level: 'manager',
      role: 'Campaign Project Manager',
      config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
    })
    service.listMissions = vi.fn(async () => [{ id: 'm2' }])

    const listed = await service.executeAction('list_missions', {}, 'agent:pm:stub')
    expect(Array.isArray(listed)).toBe(true)
    expect(service.listMissions).toHaveBeenCalledTimes(1)

    const denyCreate = await service.executeAction(
      'create_mission',
      { title: 'Build funnel' },
      'agent:pm:stub',
    )
    expect(denyCreate.success).toBe(false)
    expect(String(denyCreate.error)).toContain('not available')
  })

  it('employee can list/get mission but cannot create mission', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })
    service.listMissions = vi.fn(async () => [{ id: 'm3' }])
    service.getMission = vi.fn(async () => ({ id: 'm3' }))

    const canList = await service.executeAction('list_missions', {}, 'agent:copywriter:stub')
    expect(Array.isArray(canList)).toBe(true)

    const canGet = await service.executeAction(
      'get_mission',
      { mission_id: 'm3' },
      'agent:copywriter:stub',
    )
    expect(canGet.id).toBe('m3')

    const cannotCreate = await service.executeAction(
      'create_mission',
      { title: 'Should fail' },
      'agent:copywriter:stub',
    )
    expect(cannotCreate.success).toBe(false)
    expect(String(cannotCreate.error)).toContain('not available')
    expect(String(cannotCreate.error)).toContain('delegate_to_agent')
    expect(String(cannotCreate.error)).toContain('vibey')
  })

  it('c_level domain-scoped can use_integration in their domain', async () => {
    const service = makeService()
    withAgent(service, 'cto', {
      agent_key: 'cto',
      level: 'c_level',
      role: 'CTO',
      config: { capability_profile: 'managed_domain', capability_domain: 'developer' },
    })
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const readResult = await service.executeAction(
      'use_integration',
      { service: 'github', integration_action: 'read_file', params: { repo: 'x' } },
      'agent:cto:stub',
    )
    expect(readResult.success).toBe(true)

    const writeResult = await service.executeAction(
      'use_integration',
      { service: 'github', integration_action: 'commit_files', params: { repo: 'x' } },
      'agent:cto:stub',
    )
    expect(writeResult.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(2)
  })

  it('allows list_available_brain_scopes and resolve_agent_brain for atlas system_brain policy', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'atlas',
      level: 'employee',
      role: 'Brain Scholar',
    })
    expect(policy).not.toBeNull()
    expect(isArtifactActionAllowed(policy!, 'list_available_brain_scopes').allowed).toBe(true)
    expect(isArtifactActionAllowed(policy!, 'resolve_agent_brain').allowed).toBe(true)
  })

  it('blocks removed Campaign Brain actions for atlas system_brain policy', () => {
    const atlas: ArtifactCapabilityPolicy = {
      profile: 'system_brain',
      level: 'system',
      domain: 'management',
    }

    for (const action of [
      'search_campaign_knowledge',
      'ingest_campaign_file',
      'ingest_campaign_url',
    ]) {
      expect(isArtifactActionAllowed(atlas, action).allowed).toBe(false)
    }
  })

  it('allows transfer_brain_node for atlas system_brain', async () => {
    const service = makeService()
    service.config.get = vi.fn((key: string, fallback?: string) => {
      if (key === 'INTERNAL_API_TOKEN') return 'internal-test-token'
      if (key === 'MAIN_API_URL') return 'http://main-api.test'
      return fallback ?? ''
    })
    withAgent(service, 'atlas', {
      agent_key: 'atlas',
      level: 'employee',
      role: 'Brain Scholar & Knowledge Curator',
      config: { capability_profile: 'system_brain', capability_domain: 'management' },
    })
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, copied: 1, moved: 0 }),
    })

    const result = await service.executeAction(
      'transfer_brain_node',
      {
        operation: 'copy',
        node_type: 'memory',
        node_id: 'nid-1',
        source_scope: { type: 'user' },
        target_scope: { type: 'agent', agent_id: 'vibey' },
      },
      'agent:atlas:stub',
    )
    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('denies transfer_brain_node for copywriter', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })

    const result = await service.executeAction(
      'transfer_brain_node',
      {
        operation: 'copy',
        node_type: 'memory',
        node_id: 'nid-1',
        source_scope: { type: 'user' },
        target_scope: { type: 'user' },
      },
      'agent:copywriter:stub',
    )
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('not available')
  })

  it('allows delete_brain_node for atlas system_brain', async () => {
    const service = makeService()
    service.config.get = vi.fn((key: string, fallback?: string) => {
      if (key === 'INTERNAL_API_TOKEN') return 'internal-test-token'
      if (key === 'MAIN_API_URL') return 'http://main-api.test'
      return fallback ?? ''
    })
    withAgent(service, 'atlas', {
      agent_key: 'atlas',
      level: 'employee',
      role: 'Brain Scholar & Knowledge Curator',
      config: { capability_profile: 'system_brain', capability_domain: 'management' },
    })
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    })

    const result = await service.executeAction(
      'delete_brain_node',
      {
        brain_type: 'user_default',
        node_type: 'memory',
        node_id: '00000000-0000-4000-8000-000000000001',
      },
      'agent:atlas:stub',
    )
    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('denies delete_brain_node for copywriter', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })

    const result = await service.executeAction(
      'delete_brain_node',
      {
        brain_type: 'user_default',
        node_type: 'memory',
        node_id: '00000000-0000-4000-8000-000000000001',
      },
      'agent:copywriter:stub',
    )
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('not available')
  })
})

describe('RBAC CRUD consistency', () => {
  const marketingEmployee: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'employee',
    domain: 'marketing',
  }
  const analystEmployee: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'employee',
    domain: 'analyst',
  }
  const developerEmployee: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'employee',
    domain: 'developer',
  }
  const cLevelOperations: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'c_level',
    domain: 'operations',
  }
  const managerOperations: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'manager',
    domain: 'operations',
  }

  it('baseline agents can get_document and update_document', () => {
    for (const policy of [marketingEmployee, analystEmployee, developerEmployee]) {
      expect(isArtifactActionAllowed(policy, 'save_document').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'create_docx').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'list_documents').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'get_document').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'update_document').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'list_emails').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'save_email').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'get_email').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'update_email').allowed).toBe(true)
      expect(isArtifactActionAllowed(policy, 'delete_email').allowed).toBe(true)
    }
  })

  it('marketing employee can get individual entities they create', () => {
    const actions = [
      'get_presentation',
      'get_theme',
      'update_theme',
      'get_sequence',
      'get_sequence_email',
      'update_sequence',
      'update_sequence_email',
      'list_forms',
      'get_form',
      'create_form',
      'update_form',
      'attach_form_asset',
      'publish_form',
      'unpublish_form',
      'list_form_responses',
      'list_ads',
      'get_ad',
      'get_ad_campaign',
      'get_ad_set',
      'get_social_post',
      'publish_social_post',
    ]
    for (const action of actions) {
      expect(isArtifactActionAllowed(marketingEmployee, action).allowed).toBe(true)
    }
  })

  it('analyst employee can get presentations, sequences, themes', () => {
    expect(isArtifactActionAllowed(analystEmployee, 'get_presentation').allowed).toBe(true)
    expect(isArtifactActionAllowed(analystEmployee, 'get_sequence').allowed).toBe(true)
    expect(isArtifactActionAllowed(analystEmployee, 'get_sequence_email').allowed).toBe(true)
    expect(isArtifactActionAllowed(analystEmployee, 'get_theme').allowed).toBe(true)
    expect(isArtifactActionAllowed(analystEmployee, 'get_form').allowed).toBe(true)
    expect(isArtifactActionAllowed(analystEmployee, 'list_form_responses').allowed).toBe(true)
  })

  it('c_level operations domain has cross-domain read access', () => {
    const actions = [
      'get_document',
      'update_document',
      'get_presentation',
      'get_sequence',
      'get_sequence_email',
      'get_theme',
      'list_campaigns',
      'get_campaign',
      'list_campaign_media',
      'list_strategy_nodes',
    ]
    for (const action of actions) {
      expect(isArtifactActionAllowed(cLevelOperations, action).allowed).toBe(true)
    }
  })

  it('delete actions remain Vibey-only for managed agents', () => {
    const deleteActions = [
      'delete_document',
      'delete_funnel',
      'delete_website',
      'delete_presentation',
      'delete_sequence',
      'delete_avatar',
      'delete_theme',
    ]
    for (const action of deleteActions) {
      expect(isArtifactActionAllowed(marketingEmployee, action).allowed).toBe(false)
      expect(isArtifactActionAllowed(cLevelOperations, action).allowed).toBe(false)
    }
  })

  it('strategy model writes are Atlas-only for c_level operations', () => {
    expect(isArtifactActionAllowed(cLevelOperations, 'create_strategy_node').allowed).toBe(false)
    expect(isArtifactActionAllowed(cLevelOperations, 'list_strategy_nodes').allowed).toBe(true)
  })

  it('bulk_create_ads and generate_ad_copy are reachable by marketing employee', () => {
    expect(isArtifactActionAllowed(marketingEmployee, 'bulk_create_ads').allowed).toBe(true)
    expect(isArtifactActionAllowed(marketingEmployee, 'generate_ad_copy').allowed).toBe(true)
  })

  it('resolveManagedActionAllowlist includes document CRUD for all domains', () => {
    for (const domain of ['marketing', 'analyst', 'developer'] as const) {
      const allowlist = resolveManagedActionAllowlist(domain, 'employee')
      expect(allowlist.has('save_document')).toBe(true)
      expect(allowlist.has('create_docx')).toBe(true)
      expect(allowlist.has('list_documents')).toBe(true)
      expect(allowlist.has('get_document')).toBe(true)
      expect(allowlist.has('update_document')).toBe(true)
    }
  })

  it('managed employees can manage tasks as a baseline action family', () => {
    const taskActions = [
      'list_spaces',
      'get_space',
      'list_tasks',
      'get_task',
      'create_space_field',
      'update_space_field',
      'append_space_field_option',
      'create_space_status',
      'create_space_category',
      'create_space_tag',
      'create_space_view',
      'update_space_view',
      'create_task',
      'update_task',
      'delete_task',
      'add_task_comment',
    ]
    for (const policy of [marketingEmployee, analystEmployee, developerEmployee]) {
      for (const action of taskActions) {
        expect(isArtifactActionAllowed(policy, action).allowed).toBe(true)
      }
    }
  })

  it('managed employees can manage contacts as a dedicated baseline action family', () => {
    const contactActions = [
      'list_contacts',
      'get_contact',
      'get_contact_activity',
      'list_contact_communications',
      'create_contact',
      'update_contact',
      'add_contact_note',
      'update_contact_note',
    ]
    for (const policy of [marketingEmployee, analystEmployee, developerEmployee]) {
      for (const action of contactActions) {
        expect(isArtifactActionAllowed(policy, action).allowed).toBe(true)
      }
    }
  })

  it('allows Space context search for Vibey, Loop, and managed agents only', () => {
    const vibey: ArtifactCapabilityPolicy = {
      profile: 'vibey_ceo',
      level: 'system',
      domain: 'management',
    }
    const loop: ArtifactCapabilityPolicy = {
      profile: 'system_flows',
      level: 'system',
      domain: 'flows',
    }
    const hr: ArtifactCapabilityPolicy = {
      profile: 'system_hr',
      level: 'system',
      domain: 'management',
    }
    const atlas: ArtifactCapabilityPolicy = {
      profile: 'system_brain',
      level: 'system',
      domain: 'management',
    }

    expect(isArtifactActionAllowed(vibey, 'search_space_context').allowed).toBe(true)
    expect(isArtifactActionAllowed(loop, 'search_space_context').allowed).toBe(true)
    for (const policy of [marketingEmployee, analystEmployee, developerEmployee]) {
      expect(isArtifactActionAllowed(policy, 'search_space_context').allowed).toBe(true)
    }
    expect(isArtifactActionAllowed(atlas, 'search_space_context').allowed).toBe(false)
    expect(isArtifactActionAllowed(hr, 'search_space_context').allowed).toBe(false)
  })

  it('atlas can read tasks but cannot mutate them', () => {
    const atlas: ArtifactCapabilityPolicy = {
      profile: 'system_brain',
      level: 'system',
      domain: 'management',
    }
    for (const action of ['list_spaces', 'get_space', 'list_tasks', 'get_task']) {
      expect(isArtifactActionAllowed(atlas, action).allowed).toBe(true)
    }
    for (const action of [
      'create_space_field',
      'update_space_field',
      'append_space_field_option',
      'create_space_status',
      'create_space_category',
      'create_space_tag',
      'create_space_view',
      'update_space_view',
      'create_task',
      'update_task',
      'delete_task',
      'add_task_comment',
    ]) {
      expect(isArtifactActionAllowed(atlas, action).allowed).toBe(false)
    }
  })

  it('HR cannot use task actions', () => {
    const hr: ArtifactCapabilityPolicy = {
      profile: 'system_hr',
      level: 'system',
      domain: 'management',
    }
    for (const action of [
      'list_spaces',
      'get_space',
      'list_tasks',
      'get_task',
      'create_space_field',
      'update_space_field',
      'append_space_field_option',
      'create_space_status',
      'create_space_category',
      'create_space_tag',
      'create_space_view',
      'update_space_view',
      'create_task',
    ]) {
      expect(isArtifactActionAllowed(hr, action).allowed).toBe(false)
    }
  })

  it('vibey_ceo can access all previously-exclusive actions', () => {
    const vibey: ArtifactCapabilityPolicy = {
      profile: 'vibey_ceo',
      level: 'system',
      domain: 'management',
    }
    const actions = [
      'get_document',
      'update_document',
      'delete_document',
      'list_emails',
      'get_email',
      'update_email',
      'delete_email',
      'get_presentation',
      'delete_presentation',
      'get_sequence',
      'update_sequence',
      'get_theme',
      'update_theme',
      'delete_theme',
      'get_social_post',
      'delete_social_post',
      'publish_social_post',
      'list_ads',
      'get_ad',
      'get_ad_campaign',
      'get_ad_set',
      'list_strategy_nodes',
    ]
    for (const action of actions) {
      expect(isArtifactActionAllowed(vibey, action).allowed).toBe(true)
    }

    expect(isArtifactActionAllowed(vibey, 'create_strategy_node').allowed).toBe(false)
  })
})

describe('system_delegation (Delegator) RBAC', () => {
  const delegatorPolicy: ArtifactCapabilityPolicy = {
    profile: 'system_delegation',
    level: 'system',
    domain: 'operations',
  }

  it('resolves the protected delegation profile for the Delegator agent', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'delegator',
      level: 'system',
      role: 'Delegation Manager',
    })

    expect(policy).toEqual(delegatorPolicy)
  })

  it('allows the context, task, delegation, and receipt actions needed by the Desk', () => {
    for (const action of [
      'list_tasks',
      'get_task',
      'create_task',
      'update_task',
      'add_task_comment',
      'ask_agent',
      'delegate_to_agent',
      'list_campaigns',
      'get_campaign',
      'search_space_context',
      'search_customer_brain',
      'read_space_document',
      'get_integration',
      'use_mcp_tool',
    ]) {
      expect(isArtifactActionAllowed(delegatorPolicy, action).allowed, action).toBe(true)
    }
  })

  it('blocks destructive, publishing, identity, and Brain-write actions', () => {
    for (const action of [
      'delete_task',
      'create_campaign',
      'update_campaign',
      'save_user_memory',
      'create_agent_skill',
      'create_agent',
    ]) {
      expect(isArtifactActionAllowed(delegatorPolicy, action).allowed, action).toBe(false)
    }
  })
})

describe('system_flows (Loop) RBAC', () => {
  const flowActions = [
    'search_flow_capabilities',
    'get_flow_capability',
    'list_flows',
    'get_flow',
    'create_flow_draft',
    'update_flow_draft',
    'validate_flow_draft',
    'publish_flow',
    'get_flow_build_context',
    'create_flow_plan',
    'update_flow_plan',
    'answer_flow_clarification',
    'validate_flow_plan',
    'compile_flow_plan',
    'list_flow_blueprints',
    'get_flow_blueprint',
    'create_flow_blueprint_draft',
    'validate_flow_blueprint',
    'activate_flow_blueprint',
    'evaluate_flow_plan',
  ]

  const flowsPolicy: ArtifactCapabilityPolicy = {
    profile: 'system_flows',
    level: 'system',
    domain: 'flows',
  }

  it('resolves system_flows profile for loop agent_key', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'loop',
      level: 'system',
      role: 'Flows Builder',
    })
    expect(policy).not.toBeNull()
    expect(policy!.profile).toBe('system_flows')
    expect(policy!.domain).toBe('flows')
  })

  it('allows Loop to use flow actions', () => {
    for (const action of flowActions) {
      expect(isArtifactActionAllowed(flowsPolicy, action).allowed).toBe(true)
    }
  })

  it('allows Loop to align spaces without task delete permissions', () => {
    const spaceAlignmentActions = [
      'list_spaces',
      'get_space',
      'search_space_context',
      'list_tasks',
      'get_task',
      'create_space_field',
      'update_space_field',
      'create_task',
      'update_task',
    ]

    for (const action of spaceAlignmentActions) {
      expect(isArtifactActionAllowed(flowsPolicy, action).allowed).toBe(true)
    }
    for (const action of ['delete_task', 'add_task_comment']) {
      expect(isArtifactActionAllowed(flowsPolicy, action).allowed).toBe(false)
    }
  })

  it('keeps flow actions exclusive from Vibey, Atlas, HR, managed, and builder profiles', () => {
    const policies: ArtifactCapabilityPolicy[] = [
      { profile: 'vibey_ceo', level: 'system', domain: 'management' },
      { profile: 'system_brain', level: 'system', domain: 'management' },
      { profile: 'system_hr', level: 'system', domain: 'management' },
      { profile: 'system_builder', level: 'system', domain: 'developer' },
      { profile: 'managed_domain', level: 'employee', domain: 'operations' },
    ]

    for (const policy of policies) {
      for (const action of flowActions) {
        expect(isArtifactActionAllowed(policy, action).allowed).toBe(false)
      }
    }
  })
})

describe('system_builder (Viktor) RBAC', () => {
  it('resolves system_builder profile for viktor agent_key', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'viktor',
      level: 'employee',
      role: 'Widget Experience Engineer',
    })
    expect(policy).not.toBeNull()
    expect(policy!.profile).toBe('system_builder')
    expect(policy!.domain).toBe('developer')
  })

  it('resolves system_builder profile for widget_builder agent_key', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'widget_builder',
      level: 'employee',
      role: 'Widget Experience Engineer',
    })
    expect(policy).not.toBeNull()
    expect(policy!.profile).toBe('system_builder')
  })

  it('resolves system_builder profile for suffixed viktor_2 agent_key', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'viktor_2',
      level: 'employee',
      role: 'Widget Experience Engineer',
    })
    expect(policy).not.toBeNull()
    expect(policy!.profile).toBe('system_builder')
    expect(policy!.domain).toBe('developer')
  })

  it('resolves system_builder profile for suffixed widget_builder_3 agent_key', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'widget_builder_3',
      level: 'system',
      role: 'Application Builder',
    })
    expect(policy).not.toBeNull()
    expect(policy!.profile).toBe('system_builder')
  })

  it('resolves system_builder from explicit config', () => {
    const policy = resolveCapabilityPolicy({
      agent_key: 'viktor',
      level: 'system',
      role: 'Application Builder',
      config: { capability_profile: 'system_builder', capability_domain: 'developer' },
    })
    expect(policy).not.toBeNull()
    expect(policy!.profile).toBe('system_builder')
    expect(policy!.level).toBe('system')
    expect(policy!.domain).toBe('developer')
  })

  const builderPolicy: ArtifactCapabilityPolicy = {
    profile: 'system_builder',
    level: 'system',
    domain: 'developer',
  }

  it('rejects on-hold project and file actions', () => {
    const projectActions = [
      'create_project',
      'get_project',
      'list_projects',
      'create_file',
      'update_file',
      'read_file',
      'delete_file',
      'list_project_files',
      'update_project_deps',
      'import_github_repo',
      'get_project_logs',
      'restart_project',
      'fetch_project_url',
      'patch_file',
      'search_project_files',
      'list_project_directory',
      'get_project_errors',
      'validate_project',
    ]
    for (const action of projectActions) {
      expect(isArtifactActionAllowed(builderPolicy, action)).toMatchObject({
        allowed: false,
        reason: expect.stringContaining('on hold'),
      })
    }
  })

  it('allows read access to offers, themes, and avatars', () => {
    const readActions = [
      'list_offers',
      'get_offer',
      'list_themes',
      'get_theme',
      'list_avatars',
      'get_avatar',
    ]
    for (const action of readActions) {
      expect(isArtifactActionAllowed(builderPolicy, action).allowed).toBe(true)
    }
  })

  it('allows document, media, and integration actions', () => {
    const actions = [
      'save_document',
      'create_pdf',
      'create_docx',
      'list_documents',
      'get_document',
      'update_document',
      'generate_image',
      'get_media_generation_status',
      'process_media',
      'use_integration',
      'get_capabilities',
      'initiate_integration_connect',
    ]
    for (const action of actions) {
      expect(isArtifactActionAllowed(builderPolicy, action).allowed).toBe(true)
    }
  })

  it('allows campaign read and delegation', () => {
    expect(isArtifactActionAllowed(builderPolicy, 'list_campaigns').allowed).toBe(true)
    expect(isArtifactActionAllowed(builderPolicy, 'get_campaign').allowed).toBe(true)
    expect(isArtifactActionAllowed(builderPolicy, 'ask_agent').allowed).toBe(true)
    expect(isArtifactActionAllowed(builderPolicy, 'delegate_to_agent').allowed).toBe(true)
  })

  it('denies marketing content creation', () => {
    const denied = [
      'create_offer',
      'create_funnel',
      'create_form',
      'attach_form_asset',
      'create_ad',
      'create_sequence',
      'create_avatar',
      'create_theme',
      'create_social_post',
      'create_blog_post',
    ]
    for (const action of denied) {
      expect(isArtifactActionAllowed(builderPolicy, action).allowed).toBe(false)
    }
  })

  it('denies mission management (Vibey-only)', () => {
    const denied = [
      'create_mission',
      'update_mission',
      'add_mission_comment',
      'retry_mission',
      'trash_mission',
    ]
    for (const action of denied) {
      expect(isArtifactActionAllowed(builderPolicy, action).allowed).toBe(false)
    }
  })

  it('denies team management (HR-only)', () => {
    expect(isArtifactActionAllowed(builderPolicy, 'create_agent').allowed).toBe(false)
    expect(isArtifactActionAllowed(builderPolicy, 'update_agent').allowed).toBe(false)
    expect(isArtifactActionAllowed(builderPolicy, 'list_team').allowed).toBe(false)
  })

  it('allows mission read', () => {
    expect(isArtifactActionAllowed(builderPolicy, 'list_missions').allowed).toBe(true)
    expect(isArtifactActionAllowed(builderPolicy, 'get_mission').allowed).toBe(true)
    expect(isArtifactActionAllowed(builderPolicy, 'get_mission_deliverables').allowed).toBe(true)
  })
})
