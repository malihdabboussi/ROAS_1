import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CampaignsRepository } from '../../repositories/campaigns.repository'
import { CampaignsService } from '../campaigns.service'

/** Supabase chain for `ensureCoreCampaignAgents` + `ensureCampaignBrain` (no vibey/atlas in registry). */
function supabaseWithEmptyAgentRegistry() {
  const result = { data: null, error: null }
  const chain: Record<string, any> = {}
  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'is',
    'in',
    'not',
    'gte',
    'lte',
    'lt',
    'gt',
    'like',
    'ilike',
    'order',
    'limit',
    'range',
    'filter',
    'contains',
    'throwOnError',
    'returns',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.single = vi.fn().mockResolvedValue(result)
  const p = Promise.resolve(result)
  chain.then = p.then.bind(p)
  chain.catch = p.catch.bind(p)
  return { from: vi.fn(() => chain) } as any
}

function supabaseForCampaignAgentAssignment(input: {
  agent?: { agent_key: string; name: string; team_id?: string | null } | null
  membership?: { team_id: string } | null
}) {
  return {
    from: vi.fn((table: string) => {
      const result =
        table === 'agents_registry'
          ? { data: input.agent ?? null, error: null }
          : table === 'agent_team_members'
            ? { data: input.membership ?? null, error: null }
            : { data: null, error: null }
      const chain: Record<string, any> = {}
      for (const method of ['select', 'eq', 'is']) {
        chain[method] = vi.fn().mockReturnValue(chain)
      }
      chain.maybeSingle = vi.fn().mockResolvedValue(result)
      return chain
    }),
  } as any
}

describe('CampaignsService', () => {
  let service: CampaignsService
  let mockRepo: Record<string, ReturnType<typeof vi.fn>>
  const mockEmbedding = { getEmbedding: vi.fn(), callGemini: vi.fn() } as any
  const mockSupabase = supabaseWithEmptyAgentRegistry()

  beforeEach(() => {
    mockRepo = {
      findByUserId: vi.fn(),
      findGeneralByUserId: vi.fn(),
      findPersonalByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      restore: vi.fn(),
      countNonArchivedByUserId: vi.fn(),
      listKnowledgeNodes: vi.fn(),
      matchKnowledgeNodes: vi.fn(),
      traverseKnowledgeEdges: vi.fn(),
      getKnowledgeNodeByIds: vi.fn(),
      upsertCampaignAgent: vi.fn(),
      listCampaignAgents: vi.fn(),
      deleteCampaignAgent: vi.fn(),
    }
    service = new CampaignsService(
      mockRepo as unknown as CampaignsRepository,
      mockEmbedding,
      {} as any,
      {} as any,
    )
  })

  describe('listCampaigns', () => {
    it('should delegate to repository', async () => {
      const campaigns = [{ id: '1', name: 'Test', user_id: 'user-1' }]
      mockRepo.findGeneralByUserId.mockResolvedValue({
        id: 'general',
        config: { system_kind: 'general', isPinned: true },
      })
      mockRepo.findPersonalByUserId.mockResolvedValue({
        id: 'personal',
        user_id: 'user-1',
        config: { system_kind: 'personal', isPinned: true },
      })
      mockRepo.findByUserId.mockResolvedValue(campaigns)

      const result = await service.listCampaigns(mockSupabase, 'user-1')
      expect(result).toEqual([
        { id: '1', name: 'Test', user_id: 'user-1', permission: 'owner', owner: null },
      ])
      expect(mockRepo.findGeneralByUserId).toHaveBeenCalledWith(mockSupabase, 'user-1', undefined)
      expect(mockRepo.findPersonalByUserId).toHaveBeenCalledWith(mockSupabase, 'user-1')
      expect(mockRepo.findByUserId).toHaveBeenCalledWith(mockSupabase, 'user-1', undefined)
    })
  })

  describe('user state access', () => {
    it('rejects user-state writes when campaign is not accessible', async () => {
      mockRepo.findById.mockResolvedValue(null)

      await expect(
        (service.upsertUserState as any)(mockSupabase, 'user-1', 'campaign-1', {
          is_favorite: true,
        }),
      ).rejects.toThrow('Campaign not found')
    })

    it('persists user-state writes when campaign is accessible', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'campaign-1' })
      const supabase = {
        from: vi.fn(() => {
          const chain: Record<string, any> = {}
          for (const method of ['upsert', 'select']) chain[method] = vi.fn().mockReturnValue(chain)
          chain.single = vi.fn().mockResolvedValue({
            data: {
              campaign_id: 'campaign-1',
              is_favorite: true,
              is_hidden: false,
              updated_at: '2026-05-21T00:00:00Z',
            },
            error: null,
          })
          return chain
        }),
      } as any

      await expect(
        (service.upsertUserState as any)(supabase, 'user-1', 'campaign-1', {
          is_favorite: true,
        }),
      ).resolves.toEqual({
        campaign_id: 'campaign-1',
        is_favorite: true,
        is_hidden: false,
        updated_at: '2026-05-21T00:00:00Z',
      })
      expect(mockRepo.findById).toHaveBeenCalledWith(supabase, 'campaign-1', { orgId: undefined })
    })

    it('persists personal campaign user state while an organization is active', async () => {
      mockRepo.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'personal-1', org_id: null })
      const supabase = {
        from: vi.fn(() => {
          const chain: Record<string, any> = {}
          for (const method of ['upsert', 'select']) chain[method] = vi.fn().mockReturnValue(chain)
          chain.single = vi.fn().mockResolvedValue({
            data: {
              campaign_id: 'personal-1',
              is_favorite: true,
              is_hidden: false,
              updated_at: '2026-07-23T00:00:00Z',
            },
            error: null,
          })
          return chain
        }),
      } as any

      await expect(
        (service.upsertUserState as any)(
          supabase,
          'user-1',
          'personal-1',
          { is_favorite: true },
          'org-1',
        ),
      ).resolves.toMatchObject({ campaign_id: 'personal-1', is_favorite: true })
      expect(mockRepo.findById).toHaveBeenNthCalledWith(1, supabase, 'personal-1', {
        orgId: 'org-1',
      })
      expect(mockRepo.findById).toHaveBeenNthCalledWith(2, supabase, 'personal-1', {
        orgId: null,
      })
    })
  })

  describe('getCampaign', () => {
    it('should return campaign if found', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'Test' })
      const result = await service.getCampaign(mockSupabase, '1')
      expect(result.name).toBe('Test')
    })

    it('should throw if campaign not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.getCampaign(mockSupabase, '999')).rejects.toThrow('Campaign not found')
    })

    it('should fall back to personal campaign when org-scoped lookup misses', async () => {
      mockRepo.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'personal-1', name: 'Personal', org_id: null })
      const result = await service.getCampaign(mockSupabase, 'personal-1', 'org-1')
      expect(result).toEqual({ id: 'personal-1', name: 'Personal', org_id: null })
      expect(mockRepo.findById).toHaveBeenNthCalledWith(1, mockSupabase, 'personal-1', {
        orgId: 'org-1',
      })
      expect(mockRepo.findById).toHaveBeenNthCalledWith(2, mockSupabase, 'personal-1', {
        orgId: null,
      })
    })

    it('should not fall back when org-scoped campaign exists', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'org-c1', name: 'Org', org_id: 'org-1' })
      const result = await service.getCampaign(mockSupabase, 'org-c1', 'org-1')
      expect(result.name).toBe('Org')
      expect(mockRepo.findById).toHaveBeenCalledTimes(1)
    })
  })

  describe('createCampaign', () => {
    it('should create with defaults', async () => {
      mockRepo.create.mockResolvedValue({ id: '1', name: 'New' })
      const mockSubabase = supabaseWithEmptyAgentRegistry()

      await service.createCampaign(mockSubabase, 'user-1', { name: 'New' })
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockSubabase,
        expect.objectContaining({
          user_id: 'user-1',
          name: 'New',
          campaign_type: 'get-more-leads',
        }),
      )
    })

    it('attaches client-referenced campaigns to the org Clients program', async () => {
      mockRepo.create.mockResolvedValue({ id: '1' })
      const mockSubabase = supabaseWithEmptyAgentRegistry()
      // First maybeSingle resolves the clients program lookup.
      const chain = mockSubabase.from()
      chain.maybeSingle.mockResolvedValueOnce({ data: { id: 'clients-prog' }, error: null })

      await service.createCampaign(
        mockSubabase,
        'user-1',
        { name: 'Claude Club Webinar', config: { client: 'Claude Club' } },
        'org-1',
      )
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockSubabase,
        expect.objectContaining({ program_id: 'clients-prog' }),
      )
    })

    it('leaves standalone campaigns program-less (grouped under General)', async () => {
      mockRepo.create.mockResolvedValue({ id: '1' })
      const mockSubabase = supabaseWithEmptyAgentRegistry()

      await service.createCampaign(mockSubabase, 'user-1', { name: 'Solo' }, 'org-1')
      const record = mockRepo.create.mock.calls.at(-1)?.[1] as Record<string, unknown>
      expect(record).not.toHaveProperty('program_id')
    })

    it('should use provided campaign_type', async () => {
      mockRepo.create.mockResolvedValue({ id: '1' })
      const mockSubabase = supabaseWithEmptyAgentRegistry()

      await service.createCampaign(mockSubabase, 'user-1', { name: 'X', campaign_type: 'custom' })
      expect(mockRepo.create).toHaveBeenCalledWith(
        mockSubabase,
        expect.objectContaining({
          campaign_type: 'custom',
        }),
      )
    })

    it('should return existing general campaign when requested', async () => {
      mockRepo.findGeneralByUserId.mockResolvedValue({
        id: 'general',
        name: 'General',
        config: { system_kind: 'general', isPinned: true },
      })
      const result = await service.createCampaign(mockSupabase, 'user-1', {
        name: 'General',
        config: { system_kind: 'general' },
      })
      expect(result).toEqual(expect.objectContaining({ id: 'general', name: 'General' }))
      expect(mockRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('knowledge search', () => {
    it('passes domain filters to knowledge match rpc call', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'campaign-1' })
      mockEmbedding.getEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
      mockRepo.matchKnowledgeNodes.mockResolvedValue([{ id: 'n1', similarity: 0.8 }])
      mockRepo.traverseKnowledgeEdges.mockResolvedValue([])
      mockRepo.getKnowledgeNodeByIds.mockResolvedValue([{ id: 'n1' }])

      await service.searchKnowledge(mockSupabase, 'campaign-1', 'audience pain points', {
        domains: ['marketing', 'general'],
      })

      expect(mockRepo.matchKnowledgeNodes).toHaveBeenCalledWith(
        mockSupabase,
        'campaign-1',
        expect.any(String),
        8,
        0.58,
        ['marketing', 'general'],
      )
    })

    it('passes source type through listKnowledgeNodes', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'campaign-1' })
      mockRepo.listKnowledgeNodes.mockResolvedValue([])

      await service.listKnowledgeNodes(mockSupabase, 'campaign-1', {
        source_type: 'mission',
      })

      expect(mockRepo.listKnowledgeNodes).toHaveBeenCalledWith(
        mockSupabase,
        'campaign-1',
        expect.objectContaining({
          sourceType: 'mission',
        }),
      )
    })
  })

  describe('updateCampaign', () => {
    it('should update if campaign exists', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' })
      mockRepo.update.mockResolvedValue({ id: '1', name: 'Updated' })

      await service.updateCampaign(mockSupabase, '1', { name: 'Updated' })
      expect(mockRepo.update).toHaveBeenCalledWith(mockSupabase, '1', { name: 'Updated' })
    })

    it('should throw if campaign not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.updateCampaign(mockSupabase, '999', {})).rejects.toThrow(
        'Campaign not found',
      )
    })

    it('should block general campaign rename', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'general',
        config: { system_kind: 'general' },
      })
      await expect(
        service.updateCampaign(mockSupabase, 'general', { name: 'Renamed' }),
      ).rejects.toThrow('General campaign name cannot be changed')
    })
  })

  describe('deleteCampaign', () => {
    it('should delete if exists', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' })
      mockRepo.delete.mockResolvedValue(undefined)

      await service.deleteCampaign(mockSupabase, '1')
      expect(mockRepo.delete).toHaveBeenCalledWith(mockSupabase, '1')
    })

    it('should throw if not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.deleteCampaign(mockSupabase, '999')).rejects.toThrow(
        'Campaign not found',
      )
    })

    it('should block deleting general campaign', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'general',
        config: { system_kind: 'general' },
      })
      await expect(service.deleteCampaign(mockSupabase, 'general')).rejects.toThrow(
        'General campaign cannot be deleted',
      )
    })
  })

  describe('unassignAgentFromCampaign', () => {
    it('should forbid removing vibey', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'c1', user_id: 'user-1' })
      await expect(
        service.unassignAgentFromCampaign(mockSupabase, 'user-1', 'c1', 'vibey'),
      ).rejects.toThrow('Core agents')
      expect(mockRepo.deleteCampaignAgent).not.toHaveBeenCalled()
    })
  })

  describe('assignAgentToCampaign permissions', () => {
    it('rejects org viewers', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'c1', user_id: 'owner-1', org_id: 'org-1' })
      const supabase = supabaseForCampaignAgentAssignment({
        agent: { agent_key: 'copywriter', name: 'Copywriter', team_id: 'team-1' },
      })

      await expect(
        (service.assignAgentToCampaign as any)(supabase, 'viewer-1', 'c1', 'copywriter', {
          orgRole: 'viewer',
        }),
      ).rejects.toThrow('Only admins and creators can assign agents to campaigns')
      expect(mockRepo.upsertCampaignAgent).not.toHaveBeenCalled()
    })

    it('allows org admins', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'c1', user_id: 'owner-1', org_id: 'org-1' })
      mockRepo.upsertCampaignAgent.mockResolvedValue({ campaign_id: 'c1', agent_key: 'copywriter' })
      const supabase = supabaseForCampaignAgentAssignment({
        agent: { agent_key: 'copywriter', name: 'Copywriter', team_id: 'team-1' },
      })

      await expect(
        (service.assignAgentToCampaign as any)(supabase, 'admin-1', 'c1', 'copywriter', {
          orgRole: 'admin',
        }),
      ).resolves.toEqual({ campaign_id: 'c1', agent_key: 'copywriter' })
      expect(mockRepo.upsertCampaignAgent).toHaveBeenCalled()
    })

    it('allows creators only for agents on their teams', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'c1', user_id: 'owner-1', org_id: 'org-1' })
      mockRepo.upsertCampaignAgent.mockResolvedValue({ campaign_id: 'c1', agent_key: 'copywriter' })
      const supabase = supabaseForCampaignAgentAssignment({
        agent: { agent_key: 'copywriter', name: 'Copywriter', team_id: 'team-1' },
        membership: { team_id: 'team-1' },
      })

      await expect(
        (service.assignAgentToCampaign as any)(supabase, 'creator-1', 'c1', 'copywriter', {
          orgRole: 'creator',
        }),
      ).resolves.toEqual({ campaign_id: 'c1', agent_key: 'copywriter' })
      expect(mockRepo.upsertCampaignAgent).toHaveBeenCalled()
    })

    it('rejects creators for agents outside their teams', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'c1', user_id: 'owner-1', org_id: 'org-1' })
      const supabase = supabaseForCampaignAgentAssignment({
        agent: { agent_key: 'copywriter', name: 'Copywriter', team_id: 'team-1' },
        membership: null,
      })

      await expect(
        (service.assignAgentToCampaign as any)(supabase, 'creator-1', 'c1', 'copywriter', {
          orgRole: 'creator',
        }),
      ).rejects.toThrow('You can only assign agents from your teams')
      expect(mockRepo.upsertCampaignAgent).not.toHaveBeenCalled()
    })
  })

  describe('restoreCampaign', () => {
    it('should restore soft-deleted campaign', async () => {
      mockRepo.findById.mockResolvedValue({
        id: '1',
        user_id: 'user-1',
        deleted_at: '2026-03-01T00:00:00.000Z',
      })
      mockRepo.restore.mockResolvedValue({ id: '1', user_id: 'user-1', deleted_at: null })

      const result = await service.restoreCampaign(mockSupabase, '1')

      expect(result).toEqual(expect.objectContaining({ id: '1', deleted_at: null }))
      expect(mockRepo.findById).toHaveBeenCalledWith(mockSupabase, '1', { includeDeleted: true })
      expect(mockRepo.restore).toHaveBeenCalledWith(mockSupabase, '1')
    })

    it('should return campaign when it is not soft-deleted', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', deleted_at: null })

      const result = await service.restoreCampaign(mockSupabase, '1')

      expect(result).toEqual(expect.objectContaining({ id: '1', deleted_at: null }))
      expect(mockRepo.restore).not.toHaveBeenCalled()
    })

    it('should throw if campaign not found', async () => {
      mockRepo.findById.mockResolvedValue(null)
      await expect(service.restoreCampaign(mockSupabase, '999')).rejects.toThrow(
        'Campaign not found',
      )
    })

    it('should block restoring general campaign', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'general',
        deleted_at: '2026-03-01T00:00:00.000Z',
        config: { system_kind: 'general' },
      })
      await expect(service.restoreCampaign(mockSupabase, 'general')).rejects.toThrow(
        'General campaign cannot be restored',
      )
    })
  })
})
