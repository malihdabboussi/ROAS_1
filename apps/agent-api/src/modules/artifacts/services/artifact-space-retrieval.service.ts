import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { classifySpaceRetrievalResult } from '../../spaces-retrieval/services/space-retrieval-relevance.service'
import type {
  SpaceRetrievalMode,
  SpaceRetrievalSearchResult,
  SpaceSemanticSourceType,
} from '../../spaces-retrieval/types/space-retrieval.types'
import type { ArtifactActionHandler } from './artifact-action.registry'

@Injectable()
export class ArtifactSpaceRetrievalService {
  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      search_space_context: (data, sessionKey) => this.searchSpaceContext(target, data, sessionKey),
    }
  }

  private async searchSpaceContext(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const query = String(input.query ?? '').trim()
    if (!query) return { success: false, error: 'query is required' }
    if (!target.spaceRetrievalService || typeof target.getUserClient !== 'function') {
      return { success: false, error: 'Space retrieval service is unavailable' }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const userClient = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
    const limit = this.limit(input.limit)
    const mode = this.mode(input.mode)
    const requestedSpaceId = this.optionalString(input.space_id)
    const requestedCampaignId = this.optionalString(input.campaign_id)
    const searchSpaceId = mode === 'all_accessible' ? null : requestedSpaceId
    const searchCampaignId = mode === 'all_accessible' ? null : requestedCampaignId
    const agentKey = target.parseAgentIdFromSessionKey?.(sessionKey ?? '') ?? null

    const accessError = await this.validateContextAccess(target, agentKey, {
      userId,
      orgId,
      spaceId: requestedSpaceId,
      campaignId: requestedCampaignId,
      allAccessible: mode === 'all_accessible',
    })
    if (accessError) return accessError

    const result = (await target.spaceRetrievalService.search(userClient, {
      query,
      userId,
      orgId,
      spaceId: searchSpaceId,
      campaignId: searchCampaignId,
      mode,
      sourceTypes: this.sourceTypes(input.source_types),
      limit,
    })) as SpaceRetrievalSearchResult

    return classifySpaceRetrievalResult(result, {
      userId,
      orgId,
      activeSpaceId: requestedSpaceId,
      activeCampaignId: requestedCampaignId,
      agentKey,
    })
  }

  private async validateContextAccess(
    target: Record<string, any>,
    agentKey: string | null,
    scope: {
      userId: string
      orgId: string | null
      spaceId: string | null
      campaignId: string | null
      allAccessible: boolean
    },
  ): Promise<{ success: false; error: string } | null> {
    if (!agentKey || !target.agentPolicyService) return null
    const policyScope = { orgId: scope.orgId ?? null, userId: scope.orgId ? null : scope.userId }
    if (scope.allAccessible) {
      const allowed = await target.agentPolicyService.canAgentAccessContextResource(
        agentKey,
        'space_context',
        '*',
        policyScope,
      )
      if (!allowed) {
        return {
          success: false,
          error: 'Agent does not have access to all accessible Space Knowledge.',
        }
      }
      return null
    }
    if (scope.spaceId) {
      const allowed = await target.agentPolicyService.canAgentAccessContextResource(
        agentKey,
        'space_context',
        scope.spaceId,
        policyScope,
      )
      if (!allowed) {
        return {
          success: false,
          error: 'Agent does not have access to this Space Knowledge scope.',
        }
      }
    }
    if (scope.campaignId) {
      const allowed = await target.agentPolicyService.canAgentAccessContextResource(
        agentKey,
        'campaign_context',
        scope.campaignId,
        policyScope,
      )
      if (!allowed) {
        return {
          success: false,
          error: 'Agent does not have access to this Campaign Knowledge scope.',
        }
      }
    }
    return null
  }

  private optionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
  }

  private limit(value: unknown): number {
    const numeric = Number(value ?? 10)
    return Number.isFinite(numeric) ? Math.min(Math.max(Math.floor(numeric), 1), 50) : 10
  }

  private mode(value: unknown): SpaceRetrievalMode | undefined {
    if (value === 'current_space' || value === 'space_plus_related' || value === 'all_accessible') {
      return value
    }
    return undefined
  }

  private sourceTypes(value: unknown): SpaceSemanticSourceType[] | undefined {
    if (!Array.isArray(value)) return undefined
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item): item is SpaceSemanticSourceType => item.length > 0)
  }
}
