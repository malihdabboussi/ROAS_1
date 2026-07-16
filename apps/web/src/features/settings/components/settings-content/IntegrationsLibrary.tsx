'use client'

import { useMemo } from 'react'
import { IntegrationAccountsGroup } from './IntegrationAccountsGroup'
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

const ACTIVE_STATUSES = new Set(['connected', 'pending', 'needs_reconnect'])

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
  onRefresh: (userIntegration: UserIntegration) => void
  onDisconnect: (userIntegration: UserIntegration) => Promise<void> | void
  onReconnect: (integration: Integration) => void
  onRemove: (userIntegration: UserIntegration) => void
  onSetDefault: (userIntegration: UserIntegration) => void
  onChangeScope: (userIntegration: UserIntegration, newScope: 'personal' | 'org_shared') => void
  onRename: (userIntegration: UserIntegration, connectionLabel: string) => Promise<void> | void
  canManageOrgShared: boolean
  connectingProvider?: string | null
}

function sortConnectionRows(rows: UserIntegration[]): UserIntegration[] {
  return [...rows].sort((a, b) => {
    const aDefault = a.is_default ? 1 : 0
    const bDefault = b.is_default ? 1 : 0
    if (aDefault !== bDefault) return bDefault - aDefault
    return String(b.connection_label ?? '').localeCompare(String(a.connection_label ?? ''))
  })
}

export function IntegrationsLibrary({
  availableIntegrations,
  userIntegrations,
  providerModes,
  metaEligible = false,
  onConnect,
  onRefresh,
  onDisconnect,
  onReconnect,
  onRemove,
  onSetDefault,
  onChangeScope,
  onRename,
  canManageOrgShared,
  connectingProvider,
}: IntegrationsLibraryProps) {
  const rowsByIntegrationId = useMemo(() => {
    const map = new Map<string, UserIntegration[]>()
    for (const row of userIntegrations) {
      if (!ACTIVE_STATUSES.has(row.status)) continue
      const bucket = map.get(row.integration_id) ?? []
      bucket.push(row)
      map.set(row.integration_id, bucket)
    }
    for (const [key, rows] of map) {
      map.set(key, sortConnectionRows(rows))
    }
    return map
  }, [userIntegrations])

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
              const connectedRows = rowsByIntegrationId.get(integration.id) ?? []
              if (connectedRows.length > 0) {
                return (
                  <IntegrationAccountsGroup
                    key={integration.id}
                    variant="library"
                    integration={integration}
                    rows={connectedRows}
                    onRefresh={onRefresh}
                    onDisconnect={onDisconnect}
                    onReconnect={onReconnect}
                    onRemove={onRemove}
                    onSetDefault={onSetDefault}
                    onChangeScope={onChangeScope}
                    onRename={onRename}
                    onAddAccount={(item) => onConnect(item, undefined, { forceNew: true })}
                    canManageOrgShared={canManageOrgShared}
                    connecting={connectingProvider === integration.provider.toLowerCase()}
                  />
                )
              }

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
                  isConnected={false}
                  comingSoon={isComingSoon(integration.provider)}
                  isComposioMode={isComposioMode}
                  onConnect={onConnect}
                  connecting={connectingProvider === integration.provider.toLowerCase()}
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
