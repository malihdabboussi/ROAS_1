import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { IntegrationsCoreService } from './integrations-core.service'

@Injectable()
export class IntegrationsComposioCampaignService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly core: IntegrationsCoreService,
  ) {}

  async getCampaignConnections(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    campaignId: string,
  ): Promise<Record<string, unknown>> {
    if (!campaignId) return { success: false, error: 'campaign_id required', connections: [] }

    let query = this.repository
      .table(supabase, 'campaign_integration_connections')
      .select('*')
      .eq('campaign_id', campaignId)

    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.eq('user_id', user.id).is('org_id', null)
    }

    const { data, error } = await query
    if (error) return { success: false, error: error.message, connections: [] }
    return { success: true, connections: data ?? [] }
  }

  async connectComposioCampaign(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: {
      campaign_id: string
      integration_id: string
      callback_url?: string
      long_redirect_url?: boolean
    },
  ): Promise<Record<string, unknown>> {
    const campaignId = body.campaign_id?.trim()
    const integrationId = body.integration_id?.trim().toLowerCase()
    if (!campaignId || !integrationId) {
      return { success: false, error: 'campaign_id and integration_id are required' }
    }

    const config = await this.core.resolveIntegrationConfig(supabase, integrationId)
    if (!config?.enabled || !config.auth_config_id) {
      return {
        success: false,
        error: `Cannot connect ${integrationId} for campaign - config missing or disabled`,
      }
    }

    const initiated = await this.composio.initiateConnectedAccount(user.id, config.auth_config_id, {
      callbackUrl: body.callback_url,
      longRedirectUrl: body.long_redirect_url,
      allowMultiple: true,
    })

    const now = new Date().toISOString()
    const { error } = await this.repository
      .table(supabase, 'campaign_integration_connections')
      .upsert(
        {
          campaign_id: campaignId,
          user_id: user.id,
          org_id: scope.orgId ?? null,
          integration_id: integrationId,
          provider: integrationId,
          status: 'pending',
          composio_connected_account_id: initiated.id,
          metadata: { composio_toolkit_slug: config.toolkit_slug },
          updated_at: now,
        },
        { onConflict: 'campaign_id,integration_id' },
      )

    if (error) return { success: false, error: error.message }

    return {
      success: true,
      integration_id: integrationId,
      connection_id: initiated.id,
      redirect_url: initiated.redirectUrl,
      status: initiated.status,
    }
  }

  async disconnectComposioCampaign(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: { campaign_id: string; integration_id: string; connection_id: string },
  ): Promise<Record<string, unknown>> {
    const campaignId = body.campaign_id?.trim()
    const integrationId = body.integration_id?.trim().toLowerCase()
    const connectionId = body.connection_id?.trim()

    if (!campaignId || !integrationId || !connectionId) {
      return {
        success: false,
        error: 'campaign_id, integration_id, and connection_id are required',
      }
    }

    try {
      await this.composio.disconnectConnectedAccount(connectionId)
    } catch {
      // Composio account may already be gone; still clean up the local row.
    }

    let deleteQuery = this.repository
      .table(supabase, 'campaign_integration_connections')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('integration_id', integrationId)

    if (scope.orgId) {
      deleteQuery = deleteQuery.eq('org_id', scope.orgId)
    } else {
      deleteQuery = deleteQuery.eq('user_id', user.id).is('org_id', null)
    }

    const { error } = await deleteQuery
    if (error) return { success: false, error: error.message }
    return { success: true, campaign_id: campaignId, integration_id: integrationId }
  }
}
