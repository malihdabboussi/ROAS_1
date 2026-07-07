'use client'

import { useCallback, useState } from 'react'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { buildComposioProxyCallbackUrl } from '@/lib/integrations/composio-oauth'

export type CampaignIntegrationConnectionRow = {
  id: string
  campaign_id: string
  user_id: string
  integration_id: string
  provider: string
  status: string
  composio_connected_account_id: string | null
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export function useCampaignIntegrations(campaignId: string | null) {
  const [connections, setConnections] = useState<CampaignIntegrationConnectionRow[]>([])
  const [loading, setLoading] = useState(false)

  const loadConnections = useCallback(async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const res = await backendGet<{
        success: boolean
        connections?: CampaignIntegrationConnectionRow[]
        error?: string
      }>(`/api/integrations/campaign/${encodeURIComponent(campaignId)}`)
      if (res.success) setConnections(res.connections ?? [])
      else setConnections([])
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  const connectComposioCampaign = useCallback(
    async (integrationId: string) => {
      if (!campaignId) throw new Error('campaign_id required')
      const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
      const callbackUrl =
        typeof window !== 'undefined'
          ? buildComposioProxyCallbackUrl(integrationId, redirectTo)
          : ''
      const res = await backendPost<{
        success: boolean
        redirect_url?: string
        error?: string
      }>('/api/integrations/composio/connect-campaign', {
        campaign_id: campaignId,
        integration_id: integrationId,
        callback_url: callbackUrl || redirectTo,
        long_redirect_url: true,
      })
      if (!res?.success) throw new Error(res?.error || 'Failed to initiate campaign connection')
      if (res.redirect_url) {
        window.location.href = res.redirect_url
        return
      }
      await loadConnections()
    },
    [campaignId, loadConnections],
  )

  const disconnectComposioCampaign = useCallback(
    async (integrationId: string, connectionId: string) => {
      if (!campaignId) throw new Error('campaign_id required')
      const res = await backendPost<{ success: boolean; error?: string }>(
        '/api/integrations/composio/disconnect-campaign',
        {
          campaign_id: campaignId,
          integration_id: integrationId,
          connection_id: connectionId,
        },
      )
      if (!res?.success) throw new Error(res?.error || 'Disconnect failed')
      await loadConnections()
    },
    [campaignId, loadConnections],
  )

  return {
    connections,
    loading,
    loadConnections,
    connectComposioCampaign,
    disconnectComposioCampaign,
  }
}
