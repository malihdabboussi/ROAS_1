'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { resolveMeetingWebhookUrl } from '@/lib/integrations/meeting-webhook-url'
import { ConnectedIntegrationCard } from './ConnectedIntegrationCard'
import { getIntegrationGroupIdentitySummary } from './integration-connection-label'
import type { Integration, UserIntegration } from './integrations.types'

export interface IntegrationAccountsGroupProps {
  integration: Integration
  rows: UserIntegration[]
  onRefresh: (userIntegration: UserIntegration) => void
  onDisconnect: (userIntegration: UserIntegration) => Promise<void> | void
  onReconnect: (integration: Integration) => void
  onRemove: (userIntegration: UserIntegration) => void
  onSetDefault: (userIntegration: UserIntegration) => void
  onChangeScope: (userIntegration: UserIntegration, newScope: 'personal' | 'org_shared') => void
  onRename: (userIntegration: UserIntegration, connectionLabel: string) => Promise<void> | void
  onAddAccount: (integration: Integration) => void
  canManageOrgShared: boolean
  defaultExpanded?: boolean
  autoOpenSocialReportingPickerId?: string | null
  autoOpenSocialReportingPickerPlatform?: 'linkedin' | 'facebook' | 'youtube' | null
  /** Compact library row: always expanded, no collapse chevron. */
  variant?: 'manage' | 'library'
  connecting?: boolean
}

export function IntegrationAccountsGroup({
  integration,
  rows,
  onRefresh,
  onDisconnect,
  onReconnect,
  onRemove,
  onSetDefault,
  onChangeScope,
  onRename,
  onAddAccount,
  canManageOrgShared,
  defaultExpanded = true,
  autoOpenSocialReportingPickerId = null,
  autoOpenSocialReportingPickerPlatform = null,
  variant = 'manage',
  connecting = false,
}: IntegrationAccountsGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const logoPath = getIntegrationLogoPath(integration.provider)
  const showBody = variant === 'library' || expanded
  const identitySummary = getIntegrationGroupIdentitySummary(rows, integration)

  return (
    <div className="surface-card rounded-spacing-3 border-border border">
      {variant === 'manage' ? (
        <button
          type="button"
          className="gap-spacing-2 px-spacing-4 py-spacing-3 flex w-full items-center text-left"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronRight
            className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${
              expanded ? 'rotate-90' : 'rotate-0'
            }`}
          />
          {logoPath ? (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <img src={logoPath} alt={integration.name} className="block h-4 w-4 object-contain" />
            </div>
          ) : null}
          <span className="title-h6 font-medium">{integration.name}</span>
          {identitySummary ? (
            <span className="body-3 text-muted-foreground min-w-0 flex-1 truncate">
              {identitySummary}
            </span>
          ) : (
            <span className="flex-1" />
          )}
          <span className="body-3 text-muted-foreground shrink-0">{rows.length}</span>
        </button>
      ) : (
        <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex w-full items-center">
          {logoPath ? (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <img src={logoPath} alt={integration.name} className="block h-4 w-4 object-contain" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="gap-spacing-2 flex flex-wrap items-center">
              <span className="title-h6 font-medium">{integration.name}</span>
              <span className="badge-glass badge-glass-green badge-glass-sm">Connected</span>
            </div>
            {integration.description ? (
              <p className="body-3 text-muted-foreground mt-spacing-1">{integration.description}</p>
            ) : null}
            {identitySummary ? (
              <p className="body-3 text-muted-foreground mt-spacing-1 truncate">
                {identitySummary}
              </p>
            ) : null}
          </div>
          <span className="body-3 text-muted-foreground shrink-0">{rows.length}</span>
        </div>
      )}
      {showBody ? (
        <div className="px-spacing-4 pb-spacing-3 space-y-spacing-1">
          {rows.map((userIntegration) => {
            const webhookUrl = resolveMeetingWebhookUrl(integration, userIntegration)
            return webhookUrl ? (
              <p
                key={`${userIntegration.id}-webhook`}
                className="body-3 text-muted-foreground px-spacing-2 break-all"
              >
                Webhook address to paste into {integration.name}:{' '}
                <code className="text-foreground">{webhookUrl}</code>
              </p>
            ) : null
          })}
          {rows.map((userIntegration, index) => (
            <ConnectedIntegrationCard
              key={userIntegration.id || `${integration.id}-${index}`}
              userIntegration={userIntegration}
              integration={integration}
              accountIndex={index + 1}
              accountCount={rows.length}
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
          <button
            type="button"
            onClick={() => onAddAccount(integration)}
            disabled={connecting}
            className="body-3 text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-2 mt-spacing-1 w-full text-left transition-colors disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : '+ Add another account'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
