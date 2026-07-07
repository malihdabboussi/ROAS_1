import { Injectable } from '@nestjs/common'
import {
  canonicalizeIntegrationId,
  toAgentFacingIntegrationId,
} from '../../shared/utils/integration-id.util'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

@Injectable()
export class ArtifactLegacyMetaApiService {
  async metaApiCall(
    target: Record<string, any>,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    sessionKey?: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const userId = target.resolveUserId(sessionKey)
    const accessToken = await target.getAccessTokenFromSessionKey(sessionKey as string, userId)

    const mainApiUrl =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'
    const url = `${mainApiUrl}/api/integrations/meta${path}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }

    if (body) headers['Content-Type'] = 'application/json'

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const raw = await response.text()

    if (!response.ok) {
      let msg = `Meta API call failed (${response.status})`
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string }
        msg = parsed.message || parsed.error || msg
      } catch {}
      throw new Error(msg)
    }

    return JSON.parse(raw) as unknown
  }

  async checkIntegrationConnection(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const integrationId = canonicalizeIntegrationId(
      String(data.integration_id ?? data.service ?? ''),
    )
    if (!integrationId) return { success: false, error: 'integration_id is required' }
    const agentFacingIntegrationId = toAgentFacingIntegrationId(integrationId)
    if (integrationId === 'scrapecreators' || integrationId === 'dataforseo') {
      return {
        success: true,
        integration_id: agentFacingIntegrationId,
        connected: true,
        status: 'connected',
      }
    }

    const agentResolved = await this.resolveAgentIntegrationConnection(
      target,
      integrationId,
      agentFacingIntegrationId,
      sessionKey,
    )
    if (agentResolved) return agentResolved

    const userId = target.resolveUserId(sessionKey)
    const accessToken = await target.getAccessTokenFromSessionKey(sessionKey as string, userId)
    const mainApiUrl =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    const url = `${mainApiUrl}/api/integrations/status/${encodeURIComponent(integrationId)}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }
    if (orgId) headers['x-org-id'] = orgId

    const response = await fetch(url, { method: 'GET', headers })
    const raw = await response.text()

    if (!response.ok) {
      let msg = `Integration status failed (${response.status})`
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string }
        msg = parsed.message || parsed.error || msg
      } catch {}
      throw new Error(msg)
    }

    const payload = JSON.parse(raw) as {
      success?: boolean
      connected?: boolean
      status?: string | null
      error?: string
    }

    if (payload.success === false) {
      return {
        success: false,
        integration_id: agentFacingIntegrationId,
        connected: false,
        error: typeof payload.error === 'string' ? payload.error : 'integration status unavailable',
      }
    }

    const connected = Boolean(payload.connected)

    return {
      success: true,
      integration_id: agentFacingIntegrationId,
      connected,
      status: payload.status ?? null,
    }
  }

  private async resolveAgentIntegrationConnection(
    target: Record<string, any>,
    integrationId: string,
    agentFacingIntegrationId: string,
    sessionKey?: string,
  ): Promise<Record<string, unknown> | null> {
    if (typeof target.getIntegration !== 'function') return null

    try {
      const resolved = await target.getIntegration({ service: integrationId }, sessionKey)
      if (!isRecord(resolved) || resolved.success === false) return null

      const repair = isRecord(resolved.repair) ? resolved.repair : null
      const connectionResolution = isRecord(resolved.connection_resolution)
        ? resolved.connection_resolution
        : null
      const connected = Boolean(resolved.connected)
      if (!connected && !repair && !connectionResolution) return null

      return {
        success: true,
        integration_id: agentFacingIntegrationId,
        connected,
        status:
          typeof resolved.status === 'string'
            ? resolved.status
            : connected
              ? 'connected'
              : 'disconnected',
        ...(repair ? { repair } : {}),
        ...(connectionResolution ? { connection_resolution: connectionResolution } : {}),
        ...(typeof resolved.selected_connection_id === 'string'
          ? { selected_connection_id: resolved.selected_connection_id }
          : {}),
        ...(typeof resolved.selected_scope === 'string'
          ? { selected_scope: resolved.selected_scope }
          : {}),
      }
    } catch {
      return null
    }
  }

  async checkMetaConnection(target: Record<string, any>, sessionKey?: string) {
    return this.metaApiCall(target, 'GET', '/status', sessionKey)
  }

  async listMetaAdAccounts(target: Record<string, any>, sessionKey?: string) {
    return this.metaApiCall(target, 'GET', '/ad-accounts', sessionKey)
  }

  async listMetaPages(target: Record<string, any>, sessionKey?: string) {
    return this.metaApiCall(target, 'GET', '/pages', sessionKey)
  }

  async listMetaAudiences(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adAccountId = String(data.ad_account_id ?? '').trim()
    if (!adAccountId) return { success: false, error: 'ad_account_id is required' }
    const path = `/ad-accounts/${encodeURIComponent(adAccountId)}/customaudiences`
    return this.metaApiCall(target, 'GET', path, sessionKey)
  }

  async createMetaCustomAudience(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adAccountId = String(data.ad_account_id ?? '').trim()
    if (!adAccountId) return { success: false, error: 'ad_account_id is required' }
    const path = `/ad-accounts/${encodeURIComponent(adAccountId)}/customaudiences`
    return this.metaApiCall(target, 'POST', path, sessionKey, {
      name: data.name,
      rule: data.rule,
      retention_days: data.retention_days,
    })
  }

  async createMetaLookalikeAudience(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adAccountId = String(data.ad_account_id ?? '').trim()
    if (!adAccountId) return { success: false, error: 'ad_account_id is required' }
    const path = `/ad-accounts/${encodeURIComponent(adAccountId)}/customaudiences/lookalike`
    return this.metaApiCall(target, 'POST', path, sessionKey, {
      name: data.name,
      origin_audience_id: data.origin_audience_id,
      country: data.country,
      ratio: data.ratio,
    })
  }

  async listMetaPixelEvents(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adAccountId = String(data.ad_account_id ?? '').trim()
    if (!adAccountId) return { success: false, error: 'ad_account_id is required' }
    const path = `/ad-accounts/${encodeURIComponent(adAccountId)}/customconversions`
    return this.metaApiCall(target, 'GET', path, sessionKey)
  }

  async createMetaPixelEvent(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adAccountId = String(data.ad_account_id ?? '').trim()
    if (!adAccountId) return { success: false, error: 'ad_account_id is required' }
    const path = `/ad-accounts/${encodeURIComponent(adAccountId)}/customconversions`
    return this.metaApiCall(target, 'POST', path, sessionKey, {
      name: data.name,
      event_source_id: data.event_source_id,
      custom_event_type: data.custom_event_type,
      rule: data.rule,
    })
  }

  async resolveMetaInstagramUserId(
    target: Record<string, any>,
    pageId: string,
    sessionKey?: string,
  ): Promise<string | undefined> {
    try {
      const encodedPageId = encodeURIComponent(pageId)
      const response = (await this.metaApiCall(
        target,
        'GET',
        `/pages/${encodedPageId}/instagram-accounts`,
        sessionKey,
      )) as {
        data?: Array<{ id?: string }>
      }
      const accounts = Array.isArray(response.data) ? response.data : []
      const firstId = accounts
        .map((row) => (typeof row.id === 'string' ? row.id.trim() : ''))
        .find((value) => value.length > 0)
      return firstId || undefined
    } catch (error) {
      target.logger.warn(
        `Failed to auto-resolve instagram_user_id for page ${pageId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return undefined
    }
  }

  async updateAdCampaignOnMeta(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adCampaignId = String(data.ad_campaign_id ?? '').trim()
    if (!adCampaignId) return { success: false, error: 'ad_campaign_id is required' }

    const allowedFields = [
      'name',
      'status',
      'daily_budget',
      'lifetime_budget',
      'bid_strategy',
      'special_ad_categories',
    ] as const
    const updatePayload: Record<string, unknown> = { adCampaignId }
    for (const key of allowedFields) {
      if (data[key] !== undefined) updatePayload[key] = data[key]
    }
    if (Object.keys(updatePayload).length <= 1) {
      return { success: false, error: 'At least one field to update is required' }
    }

    return this.metaApiCall(target, 'PATCH', '/campaign', sessionKey, updatePayload)
  }

  async updateAdSetOnMeta(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adSetId = String(data.ad_set_id ?? '').trim()
    if (!adSetId) return { success: false, error: 'ad_set_id is required' }

    const allowedFields = [
      'name',
      'status',
      'daily_budget',
      'lifetime_budget',
      'targeting',
      'optimization_goal',
      'billing_event',
      'start_time',
      'end_time',
      'bid_strategy',
      'promoted_object',
    ] as const
    const updatePayload: Record<string, unknown> = { adSetId }
    for (const key of allowedFields) {
      if (data[key] !== undefined) updatePayload[key] = data[key]
    }
    if (Object.keys(updatePayload).length <= 1) {
      return { success: false, error: 'At least one field to update is required' }
    }

    return this.metaApiCall(target, 'PATCH', '/adset', sessionKey, updatePayload)
  }

  async getMetaAdsInsights(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const campaignId = String(data.campaign_id ?? data.campaignId ?? '').trim()
    if (!campaignId) return { success: false, error: 'campaign_id is required' }

    const levelRaw = String(data.level ?? 'campaign')
      .trim()
      .toLowerCase()
    if (levelRaw !== 'campaign' && levelRaw !== 'adset' && levelRaw !== 'ad') {
      return { success: false, error: 'level must be campaign, adset, or ad' }
    }

    const adCampaignId = String(data.ad_campaign_id ?? data.adCampaignId ?? '').trim()
    const adSetId = String(data.ad_set_id ?? data.adSetId ?? '').trim()
    if (levelRaw === 'adset' && !adCampaignId) {
      return { success: false, error: 'ad_campaign_id is required for adset level' }
    }
    if (levelRaw === 'ad' && !adSetId) {
      return { success: false, error: 'ad_set_id is required for ad level' }
    }

    const startDate = String(data.start_date ?? data.startDate ?? '').trim()
    const endDate = String(data.end_date ?? data.endDate ?? '').trim()

    const query = new URLSearchParams()
    query.set('campaignId', campaignId)
    query.set('level', levelRaw)
    if (adCampaignId) query.set('adCampaignId', adCampaignId)
    if (adSetId) query.set('adSetId', adSetId)
    if (startDate) query.set('start_date', startDate)
    if (endDate) query.set('end_date', endDate)

    return this.metaApiCall(target, 'GET', `/insights?${query.toString()}`, sessionKey)
  }
}
