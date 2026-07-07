'use client'

import { useCallback, useEffect, useState } from 'react'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { backendGet } from '@/lib/api/backend-client'

export type ConnectedIntegrationRow = {
  id: string
  name: string
  logo: string | null
}

type IntegrationsOverviewResponse = {
  success: boolean
  integrations?: Array<{
    integration_id: string
    provider: string
    status: string
  }>
}

type SlackStatusResponse = {
  success: boolean
  connected: boolean
}

const NAME_OVERRIDES: Record<string, string> = {
  active_campaign: 'ActiveCampaign',
  hubspot: 'HubSpot',
  google_drive: 'Google Drive',
  google_calendar: 'Google Calendar',
  google_sheets: 'Google Sheets',
  google_docs: 'Google Docs',
  gmail: 'Gmail',
  outlook: 'Outlook',
  microsoft_teams: 'Microsoft Teams',
  github: 'GitHub',
  notion: 'Notion',
  airtable: 'Airtable',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
  slack: 'Slack',
  telegram: 'Telegram',
  discord: 'Discord',
}

function prettifyId(id: string): string {
  if (NAME_OVERRIDES[id]) return NAME_OVERRIDES[id]
  return id
    .split(/[_\-]+/)
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : ''))
    .join(' ')
}

export function useConnectedIntegrations() {
  const [items, setItems] = useState<ConnectedIntegrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overview, slack] = await Promise.all([
        backendGet<IntegrationsOverviewResponse>('/api/integrations/overview').catch(() => null),
        backendGet<SlackStatusResponse>('/api/slack/status').catch(() => null),
      ])
      const map = new Map<string, ConnectedIntegrationRow>()
      for (const row of overview?.integrations ?? []) {
        const status = String(row.status ?? '').toLowerCase()
        if (status !== 'connected' && status !== 'active') continue
        if (!row.integration_id) continue
        map.set(row.integration_id, {
          id: row.integration_id,
          name: prettifyId(row.integration_id),
          logo: getIntegrationLogoPath(row.integration_id) ?? getIntegrationLogoPath(row.provider),
        })
      }
      if (slack?.connected && !map.has('slack')) {
        map.set('slack', { id: 'slack', name: 'Slack', logo: getIntegrationLogoPath('slack') })
      }
      const list = [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
      setItems(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load integrations')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { items, loading, error, reload: load }
}
