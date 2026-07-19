'use client'

import { useMemo } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { IntegrationAccountsGroup } from './IntegrationAccountsGroup'
import type { Integration, UserIntegration } from './integrations.types'

const ACTIVE_STATUSES = new Set(['connected', 'pending', 'needs_reconnect'])

interface IntegrationsManageProps {
  userIntegrations: UserIntegration[]
  availableIntegrations: Integration[]
  isLoading: boolean
  onRefresh: (userIntegration: UserIntegration) => void
  onDisconnect: (userIntegration: UserIntegration) => Promise<void> | void
  onReconnect: (integration: Integration) => void
  onRemove: (userIntegration: UserIntegration) => void
  onSetDefault: (userIntegration: UserIntegration) => void
  onChangeScope: (userIntegration: UserIntegration, newScope: 'personal' | 'org_shared') => void
  onRename: (userIntegration: UserIntegration, connectionLabel: string) => Promise<void> | void
  onAddAccount: (integration: Integration) => void
  canManageOrgShared: boolean
  connectingProvider?: string | null
  autoOpenSocialReportingPickerId?: string | null
  autoOpenSocialReportingPickerPlatform?: 'linkedin' | 'facebook' | 'youtube' | null
}

export function IntegrationsManage({
  userIntegrations,
  availableIntegrations,
  isLoading,
  onRefresh,
  onDisconnect,
  onReconnect,
  onRemove,
  onSetDefault,
  onChangeScope,
  onRename,
  onAddAccount,
  canManageOrgShared,
  connectingProvider = null,
  autoOpenSocialReportingPickerId = null,
  autoOpenSocialReportingPickerPlatform = null,
}: IntegrationsManageProps) {
  const groupedIntegrations = useMemo(() => {
    const grouped = new Map<string, UserIntegration[]>()
    for (const row of userIntegrations) {
      if (!ACTIVE_STATUSES.has(row.status)) continue
      const key = row.integration_id
      const bucket = grouped.get(key) ?? []
      bucket.push(row)
      grouped.set(key, bucket)
    }
    return Array.from(grouped.entries())
      .map(([integrationId, rows]) => {
        const integration = availableIntegrations.find((item) => item.id === integrationId)
        if (!integration) return null
        return {
          integration,
          rows: rows.sort((a, b) => {
            const aDefault = a.is_default ? 1 : 0
            const bDefault = b.is_default ? 1 : 0
            if (aDefault !== bDefault) return bDefault - aDefault
            return String(b.connection_label ?? '').localeCompare(String(a.connection_label ?? ''))
          }),
        }
      })
      .filter(
        (item): item is { integration: Integration; rows: UserIntegration[] } => item !== null,
      )
  }, [availableIntegrations, userIntegrations])

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  const hasActiveConnections = groupedIntegrations.length > 0

  return (
    <div className="space-y-spacing-6">
      {hasActiveConnections ? (
        <div className="space-y-spacing-4">
          {groupedIntegrations.map(({ integration, rows }) => (
            <IntegrationAccountsGroup
              key={integration.id}
              integration={integration}
              rows={rows}
              onRefresh={onRefresh}
              onDisconnect={onDisconnect}
              onReconnect={onReconnect}
              onRemove={onRemove}
              onSetDefault={onSetDefault}
              onChangeScope={onChangeScope}
              onRename={onRename}
              onAddAccount={onAddAccount}
              canManageOrgShared={canManageOrgShared}
              connecting={connectingProvider === integration.provider.toLowerCase()}
              autoOpenSocialReportingPickerId={autoOpenSocialReportingPickerId}
              autoOpenSocialReportingPickerPlatform={autoOpenSocialReportingPickerPlatform}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card rounded-spacing-3 p-spacing-8 text-center">
          <div className="space-y-spacing-4">
            <div>
              <h3 className="title-h6 emphasis-medium">No Connected Integrations</h3>
              <p className="body-2 text-muted-foreground mt-spacing-2">
                You haven't connected any integrations yet. Visit the Library tab to get started.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
