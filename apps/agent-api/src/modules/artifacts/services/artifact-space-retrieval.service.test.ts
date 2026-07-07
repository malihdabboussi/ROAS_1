import { describe, expect, it, vi } from 'vitest'
import { ArtifactSpaceRetrievalService } from './artifact-space-retrieval.service'

describe('ArtifactSpaceRetrievalService', () => {
  it('classifies search_space_context results before returning them to the agent', async () => {
    const service = new ArtifactSpaceRetrievalService()
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => ({ from: vi.fn() })),
      spaceRetrievalService: {
        search: vi.fn(async () => ({
          success: true,
          query: 'launch guardrails',
          count: 2,
          context_sufficient: false,
          sufficiency: {
            sufficient: false,
            confidence: 0.4,
            reason: 'Needs more evidence.',
            missing: ['approval owner'],
            suggested_next_queries: ['launch approval owner'],
          },
          missing: ['approval owner'],
          suggested_next_queries: ['launch approval owner'],
          results: [
            {
              id: 'chunk-active',
              space_object_id: 'object-active',
              source_type: 'space_doc',
              source_id: 'doc-active',
              source_title: 'Active Doc',
              title: 'Active Doc',
              content: 'Active Space evidence.',
              snippet: 'Active Space evidence.',
              user_id: 'user-2',
              org_id: 'org-1',
              space_id: 'space-active',
              campaign_id: 'campaign-active',
              metadata: {},
              retrieve_via: { action: 'read_space_document', data: { document_id: 'doc-active' } },
              lane: 'space_doc',
              scores: { semantic: 0.8, final: 0.8 },
              match_reasons: ['Matched Space retrieval evidence'],
            },
            {
              id: 'chunk-shared',
              space_object_id: 'object-shared',
              source_type: 'space_doc',
              source_id: 'doc-shared',
              source_title: 'Shared Doc',
              title: 'Shared Doc',
              content: 'Shared evidence.',
              snippet: 'Shared evidence.',
              user_id: 'user-2',
              org_id: 'org-1',
              space_id: 'space-other',
              campaign_id: 'campaign-other',
              metadata: {},
              retrieve_via: { action: 'read_space_document', data: { document_id: 'doc-shared' } },
              lane: 'space_doc',
              scores: { semantic: 0.7, final: 0.7 },
              match_reasons: ['Matched Space retrieval evidence'],
            },
          ],
        })),
      },
    }

    const result = (await service.getHandlers(target).search_space_context(
      {
        query: 'launch guardrails',
        space_id: 'space-active',
        campaign_id: 'campaign-active',
      },
      'agent:vibey:stub',
    )) as Record<string, any>

    expect(result.results[0]).toMatchObject({
      id: 'chunk-active',
      relationship: 'active_session',
      confidence: 'strong',
      use_policy: 'answer_directly',
      retrieve_via: { action: 'read_space_document' },
    })
    expect(result.results[1]).toMatchObject({
      id: 'chunk-shared',
      relationship: 'broad_access',
      confidence: 'weak',
      use_policy: 'ask_first',
    })
  })

  it('denies active Space searches when the agent lacks a Space Knowledge grant', async () => {
    const service = new ArtifactSpaceRetrievalService()
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => ({ from: vi.fn() })),
      parseAgentIdFromSessionKey: vi.fn(() => 'worker'),
      agentPolicyService: {
        canAgentAccessContextResource: vi.fn(async () => false),
      },
      spaceRetrievalService: {
        search: vi.fn(),
      },
    }

    const result = (await service.getHandlers(target).search_space_context(
      {
        query: 'launch guardrails',
        space_id: 'space-active',
      },
      'agent:worker:stub',
    )) as Record<string, any>

    expect(result).toEqual({
      success: false,
      error: 'Agent does not have access to this Space Knowledge scope.',
    })
    expect(target.spaceRetrievalService.search).not.toHaveBeenCalled()
    expect(target.agentPolicyService.canAgentAccessContextResource).toHaveBeenCalledWith(
      'worker',
      'space_context',
      'space-active',
      { orgId: 'org-1', userId: null },
    )
  })

  it('runs all-accessible search without active Space or Campaign filters after broad access passes', async () => {
    const service = new ArtifactSpaceRetrievalService()
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => ({ from: vi.fn() })),
      parseAgentIdFromSessionKey: vi.fn(() => 'worker'),
      agentPolicyService: {
        canAgentAccessContextResource: vi.fn(async () => true),
      },
      spaceRetrievalService: {
        search: vi.fn(async () => ({
          success: true,
          query: 'launch guardrails',
          count: 0,
          context_sufficient: false,
          sufficiency: {
            sufficient: false,
            confidence: 0,
            reason: 'No evidence.',
            missing: [],
            suggested_next_queries: [],
          },
          missing: [],
          suggested_next_queries: [],
          results: [],
        })),
      },
    }

    const result = (await service.getHandlers(target).search_space_context(
      {
        query: 'launch guardrails',
        mode: 'all_accessible',
        space_id: 'space-active',
        campaign_id: 'campaign-active',
        scope_override: true,
      },
      'agent:worker:stub',
    )) as Record<string, any>

    expect(result).toMatchObject({ success: true, results: [] })
    expect(target.agentPolicyService.canAgentAccessContextResource).toHaveBeenCalledWith(
      'worker',
      'space_context',
      '*',
      { orgId: 'org-1', userId: null },
    )
    expect(target.spaceRetrievalService.search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: 'all_accessible',
        spaceId: null,
        campaignId: null,
      }),
    )
  })

  it('denies all-accessible search when the agent lacks broad Space Knowledge access', async () => {
    const service = new ArtifactSpaceRetrievalService()
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => ({ from: vi.fn() })),
      parseAgentIdFromSessionKey: vi.fn(() => 'worker'),
      agentPolicyService: {
        canAgentAccessContextResource: vi.fn(async () => false),
      },
      spaceRetrievalService: {
        search: vi.fn(),
      },
    }

    const result = (await service.getHandlers(target).search_space_context(
      {
        query: 'launch guardrails',
        mode: 'all_accessible',
        space_id: 'space-active',
        scope_override: true,
      },
      'agent:worker:stub',
    )) as Record<string, any>

    expect(result).toEqual({
      success: false,
      error: 'Agent does not have access to all accessible Space Knowledge.',
    })
    expect(target.spaceRetrievalService.search).not.toHaveBeenCalled()
    expect(target.agentPolicyService.canAgentAccessContextResource).toHaveBeenCalledWith(
      'worker',
      'space_context',
      '*',
      { orgId: 'org-1', userId: null },
    )
  })

  it('allows active Space searches when the agent has a Space Knowledge grant', async () => {
    const service = new ArtifactSpaceRetrievalService()
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => null),
      getUserClient: vi.fn(async () => ({ from: vi.fn() })),
      parseAgentIdFromSessionKey: vi.fn(() => 'worker'),
      agentPolicyService: {
        canAgentAccessContextResource: vi.fn(async () => true),
      },
      spaceRetrievalService: {
        search: vi.fn(async () => ({
          success: true,
          query: 'launch guardrails',
          count: 0,
          context_sufficient: false,
          sufficiency: {
            sufficient: false,
            confidence: 0,
            reason: 'No evidence.',
            missing: [],
            suggested_next_queries: [],
          },
          missing: [],
          suggested_next_queries: [],
          results: [],
        })),
      },
    }

    const result = (await service.getHandlers(target).search_space_context(
      {
        query: 'launch guardrails',
        space_id: 'space-active',
      },
      'agent:worker:stub',
    )) as Record<string, any>

    expect(result).toMatchObject({ success: true, results: [] })
    expect(target.spaceRetrievalService.search).toHaveBeenCalled()
    expect(target.agentPolicyService.canAgentAccessContextResource).toHaveBeenCalledWith(
      'worker',
      'space_context',
      'space-active',
      { orgId: null, userId: 'user-1' },
    )
  })
})
