import { Injectable } from '@nestjs/common'
import { ArtifactNorthStarRepository } from '../repositories/artifact-north-star.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { classifyArtifactContext } from './artifact-context-relevance.service'
import { buildContextResponse, type ContextResponseMode } from './artifact-context-response.service'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Injectable()
export class ArtifactNorthStarService {
  constructor(private readonly northStarRepository = new ArtifactNorthStarRepository()) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      update_campaign_context: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'updateCampaignContext',
          () => this.updateCampaignContext(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_awareness_point: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'createAwarenessPoint',
          () => this.createAwarenessPoint(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_awareness: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'updateAwareness',
          () => this.updateAwareness(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_campaign: (data, sessionKey) => this.createCampaign(target, data, sessionKey),
      update_campaign: (data, sessionKey) => this.updateCampaign(target, data, sessionKey),
      list_campaigns: (data, sessionKey) => this.listCampaigns(target, data, sessionKey),
      get_campaign: (data, sessionKey) => this.getCampaign(target, data, sessionKey),
    }
  }

  private callOrExtracted(
    target: Record<string, any>,
    methodName: string,
    extracted: () => Promise<unknown> | unknown,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> | unknown {
    if (
      Object.prototype.hasOwnProperty.call(target, methodName) &&
      typeof target[methodName] === 'function'
    ) {
      return target[methodName](data, sessionKey)
    }
    return extracted()
  }

  private async updateCampaignContext(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const campaignId = String(data.campaign_id ?? '').trim()
    if (!campaignId) throw new Error('campaign_id is required')
    if (!UUID_RE.test(campaignId)) throw new Error('campaign_id must be a valid UUID')

    const payload: Record<string, unknown> = {}
    if (data.result !== undefined) payload.result = data.result
    if (data.purpose !== undefined) payload.purpose = data.purpose
    if (data.strategy !== undefined) payload.strategy = data.strategy
    if (data.off_limits !== undefined) payload.off_limits = data.off_limits

    return target.mainApiCall('PATCH', `/api/campaigns/${campaignId}/context`, sessionKey, payload)
  }

  private async createAwarenessPoint(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const content = String(data.content ?? '').trim()
    if (!content) throw new Error('content is required')
    const pointType = String(data.point_type ?? '').trim()
    if (!pointType) throw new Error('point_type is required')

    const userId = target.resolveUserId(sessionKey)
    const agentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '')
    if (!agentKey) throw new Error('Failed to resolve agent key from session')

    const campaignId = data.campaign_id ? String(data.campaign_id) : null
    const apOrgId =
      typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    const { data: inserted, error } = await this.northStarRepository.createAwarenessPoint(
      target.serviceClient,
      {
        user_id: userId,
        agent_key: agentKey,
        campaign_id: campaignId,
        org_id: apOrgId ?? null,
        content,
        point_type: pointType,
      },
    )
    if (error) throw new Error(`Failed to create awareness point: ${error.message}`)
    return inserted
  }

  private async createCampaign(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const name = String(data.name ?? '').trim()
    if (!name) throw new Error('name is required')
    const payload: Record<string, unknown> = { name }
    if (data.campaign_type) payload.campaign_type = data.campaign_type
    if (data.config && typeof data.config === 'object') payload.config = data.config
    return target.mainApiCall('POST', '/api/campaigns', sessionKey, payload)
  }

  private async updateCampaign(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const campaignId = String(data.campaign_id ?? '').trim()
    if (!campaignId) throw new Error('campaign_id is required')
    if (!UUID_RE.test(campaignId)) throw new Error('campaign_id must be a valid UUID')
    const { campaign_id: _, ...payload } = data
    return target.mainApiCall('PATCH', `/api/campaigns/${campaignId}`, sessionKey, payload)
  }

  private async listCampaigns(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const campaigns = this.campaignRows(
      await target.mainApiCall('GET', '/api/campaigns', sessionKey),
    )
    const userId = target.resolveUserId?.(sessionKey) as string | undefined
    if (!userId) return buildContextResponse({ itemsKey: 'campaigns', items: [] })
    const mode = data.mode === 'accessible' ? 'accessible' : ('relevant' as ContextResponseMode)
    const classified = campaigns.map((campaign) => ({
      ...campaign,
      context_relevance: classifyArtifactContext({
        objectType: 'campaign',
        row: campaign,
        context: {
          userId,
          orgId: target.resolveOrgId?.(sessionKey) ?? null,
          agentKey: target.parseAgentIdFromSessionKey?.(sessionKey ?? '') ?? null,
          activeCampaignId: typeof data.campaign_id === 'string' ? data.campaign_id : null,
        },
      }),
    }))
    return buildContextResponse({ mode, itemsKey: 'campaigns', items: classified })
  }

  private campaignRows(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value)) return value.filter(this.isRecord)
    if (this.isRecord(value) && Array.isArray(value.campaigns)) {
      return value.campaigns.filter(this.isRecord)
    }
    return []
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
  }

  private async getCampaign(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const campaignId = String(data.campaign_id ?? '').trim()
    if (!campaignId) throw new Error('campaign_id is required')
    if (!UUID_RE.test(campaignId)) throw new Error('campaign_id must be a valid UUID')
    return target.mainApiCall('GET', `/api/campaigns/${campaignId}`, sessionKey)
  }

  private async updateAwareness(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const awareness = String(data.awareness ?? '')
    if (!awareness.trim()) throw new Error('awareness is required')

    const userId = target.resolveUserId(sessionKey)
    const agentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '')
    if (!agentKey) throw new Error('Failed to resolve agent key from session')

    const nsOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const { data: current, error: currentError } =
      await this.northStarRepository.findAgentConfig(target.serviceClient, {
        userId,
        agentKey,
        orgId: nsOrgId,
      })
    if (currentError) throw new Error(`Failed to load agent config: ${currentError.message}`)

    const nextConfig = {
      ...((current?.config as Record<string, unknown>) ?? {}),
      awareness,
    }

    const { data: updated, error } = await this.northStarRepository.updateAgentConfig(
      target.serviceClient,
      {
        userId,
        agentKey,
        orgId: nsOrgId,
        config: nextConfig,
      },
    )
    if (error) throw new Error(`Failed to update awareness: ${error.message}`)
    return updated
  }
}
