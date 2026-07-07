'use client'

import { useMemo, useState } from 'react'
import { IntegrationCard } from './IntegrationCard'
import type { Integration, UserIntegration } from './integrations.types'
import type { ConnectIntegrationOptions } from './useIntegrations'

const CATEGORY_ORDER: Integration['category'][] = [
  'admin',
  'social',
  'ads_analytics',
  'email_marketing',
  'payments',
  'crm',
  'productivity',
  'developer',
]

const CATEGORY_LABELS: Record<string, string> = {
  admin: 'Admin Integrations',
  social: 'Social Media',
  ads_analytics: 'Advertising & Analytics',
  email_marketing: 'Email & Marketing',
  payments: 'Payments',
  crm: 'CRM',
  productivity: 'Productivity',
  developer: 'Developer',
}

interface IntegrationsLibraryProps {
  availableIntegrations: Integration[]
  userIntegrations: UserIntegration[]
  providerModes: Record<string, string>
  metaEligible?: boolean
  onConnect: (
    integration: Integration,
    apiKeyOrData?: string | Record<string, string>,
    options?: ConnectIntegrationOptions,
  ) => void
  onDisconnect: (userIntegration: UserIntegration) => Promise<void> | void
  connectingProvider?: string | null
}

export function IntegrationsLibrary({
  availableIntegrations,
  userIntegrations,
  providerModes,
  metaEligible = false,
  onConnect,
  onDisconnect,
  connectingProvider,
}: IntegrationsLibraryProps) {
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null)

  const getUserIntegration = (integrationId: string): UserIntegration | undefined => {
    const rows = userIntegrations.filter((ui) => ui.integration_id === integrationId)
    return (
      rows.find((ui) => ui.status === 'connected') ??
      rows.find((ui) => ui.status === 'needs_reconnect') ??
      rows[0]
    )
  }

  const handleDisconnect = async (integration: Integration) => {
    const ui = getUserIntegration(integration.id)
    if (!ui || ui.status !== 'connected') return
    setDisconnectingProvider(integration.provider.toLowerCase())
    try {
      await onDisconnect(ui)
    } finally {
      setDisconnectingProvider(null)
    }
  }

  const comingSoonProviders: string[] = ['twitter', 'tiktok']
  const isComingSoon = (provider: string): boolean => {
    const p = provider.toLowerCase()
    if (comingSoonProviders.includes(p)) return true
    if (p === 'meta' && !metaEligible) return true
    return false
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Integration[]>()
    for (const integration of availableIntegrations) {
      const cat = integration.category ?? 'productivity'
      const list = map.get(cat) ?? []
      list.push(integration)
      map.set(cat, list)
    }
    return CATEGORY_ORDER.filter((cat) => map.has(cat!)).map((cat) => ({
      category: cat!,
      label: CATEGORY_LABELS[cat!] ?? cat!,
      integrations: map.get(cat!)!,
    }))
  }, [availableIntegrations])

  return (
    <div className="space-y-spacing-8">
      {grouped.map(({ category, label, integrations }) => (
        <section key={category}>
          <p className="body-4 text-muted-foreground mb-spacing-3 uppercase tracking-wider">
            {label}
          </p>
          <div className="gap-spacing-3 flex flex-col" data-tour="integrations-grid">
            {integrations.map((integration) => {
              const userIntegration = getUserIntegration(integration.id)
              const connected = userIntegration?.status === 'connected'
              const provider = integration.provider.toLowerCase()
              const isComposioMode =
                provider !== 'slack' &&
                String(providerModes[provider] ?? '')
                  .trim()
                  .toLowerCase() === 'composio'
              return (
                <IntegrationCard
                  key={integration.id}
                  variant="list"
                  integration={integration}
                  isConnected={connected}
                  connectionStatus={userIntegration?.status}
                  comingSoon={isComingSoon(integration.provider)}
                  isComposioMode={isComposioMode}
                  onConnect={onConnect}
                  onDisconnect={connected ? handleDisconnect : undefined}
                  connecting={connectingProvider === integration.provider.toLowerCase()}
                  disconnecting={disconnectingProvider === integration.provider.toLowerCase()}
                />
              )
            })}
          </div>
        </section>
      ))}

      {availableIntegrations.length === 0 ? (
        <div className="surface-card rounded-spacing-3 p-spacing-8 text-center">
          <p className="body-2 text-muted-foreground">No integrations available at the moment.</p>
        </div>
      ) : null}
    </div>
  )
}
