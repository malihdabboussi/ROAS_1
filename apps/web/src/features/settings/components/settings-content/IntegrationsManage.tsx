'use client'

import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { ConnectedIntegrationCard } from './ConnectedIntegrationCard'
import type { Integration, UserIntegration } from './integrations.types'

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
  canManageOrgShared: boolean
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
  canManageOrgShared,
  autoOpenSocialReportingPickerId = null,
  autoOpenSocialReportingPickerPlatform = null,
}: IntegrationsManageProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const groupedIntegrations = useMemo(() => {
    const grouped = new Map<string, UserIntegration[]>()
    for (const row of userIntegrations) {
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

  return (
    <div className="space-y-spacing-6">
      {userIntegrations.length > 0 ? (
        <div className="space-y-spacing-4">
          {groupedIntegrations.map(({ integration, rows }) => {
            const expanded = expandedGroups[integration.id] ?? true
            const logoPath = getIntegrationLogoPath(integration.provider)
            return (
              <div
                key={integration.id}
                className="surface-card rounded-spacing-3 border-border border"
              >
                <button
                  type="button"
                  className="gap-spacing-2 px-spacing-4 py-spacing-3 flex w-full items-center text-left"
                  onClick={() =>
                    setExpandedGroups((prev) => ({ ...prev, [integration.id]: !expanded }))
                  }
                >
                  <ChevronRight
                    className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${
                      expanded ? 'rotate-90' : 'rotate-0'
                    }`}
                  />
                  {logoPath ? (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <img
                        src={logoPath}
                        alt={integration.name}
                        className="block h-4 w-4 object-contain"
                      />
                    </div>
                  ) : null}
                  <span className="title-h6 font-medium">{integration.name}</span>
                  <span className="body-3 text-muted-foreground">{rows.length}</span>
                </button>
                {expanded ? (
                  <div className="px-spacing-4 pb-spacing-3 space-y-spacing-1">
                    {rows.map((userIntegration, index) => (
                      <ConnectedIntegrationCard
                        key={userIntegration.id || `${integration.id}-${index}`}
                        userIntegration={userIntegration}
                        integration={integration}
                        accountIndex={index + 1}
                        onRefresh={onRefresh}
                        onDisconnect={onDisconnect}
                        onReconnect={onReconnect}
                        onRemove={onRemove}
                        onSetDefault={onSetDefault}
                        onChangeScope={onChangeScope}
                        onRename={onRename}
                        canManageOrgShared={canManageOrgShared}
                        autoOpenCompanyPagePicker={
                          autoOpenSocialReportingPickerPlatform === 'linkedin' &&
                          autoOpenSocialReportingPickerId === userIntegration.id
                        }
                        autoOpenFacebookPagePicker={
                          autoOpenSocialReportingPickerPlatform === 'facebook' &&
                          autoOpenSocialReportingPickerId === userIntegration.id
                        }
                        autoOpenYoutubeChannelPicker={
                          autoOpenSocialReportingPickerPlatform === 'youtube' &&
                          autoOpenSocialReportingPickerId === userIntegration.id
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
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
