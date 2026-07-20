'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Plus, Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { isIntegrationsLibraryComingSoon } from '@/lib/integrations/is-integrations-library-coming-soon'
import type { Integration, IntegrationsTab, UserIntegration } from './integrations.types'
import { IntegrationsLibrary } from './IntegrationsLibrary'
import { IntegrationsManage } from './IntegrationsManage'
import { OrgConnectedAccountsPanel } from './OrgConnectedAccountsPanel'
import type { ConnectIntegrationOptions } from './useIntegrations'
import { WordpressConnectDialog } from './WordpressConnectDialog'

interface IntegrationsViewProps {
  activeTab: IntegrationsTab
  availableIntegrations: Integration[]
  metaLibraryEligible: boolean
  userIntegrations: UserIntegration[]
  providerModes: Record<string, string>
  isLoading: boolean
  error: string | null
  connectingProvider: string | null
  searchQuery: string
  canManageOrgShared: boolean
  onSearchChange: (value: string) => void
  onTabChange: (tab: IntegrationsTab) => void
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
  autoOpenSocialReportingPickerId?: string | null
  autoOpenSocialReportingPickerPlatform?: 'linkedin' | 'facebook' | 'youtube' | null
}

function matchesSearch(integration: Integration, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase().trim()
  const name = integration.name.toLowerCase()
  const provider = integration.provider.toLowerCase()
  const desc = (integration.description ?? '').toLowerCase()
  return name.includes(q) || provider.includes(q) || desc.includes(q)
}

function IntegrationsSearchInput({
  value,
  onChange,
  className = '',
  autoFocus = false,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  autoFocus?: boolean
}) {
  return (
    <div
      className={`input-glass gap-spacing-2 rounded-spacing-2 px-spacing-3 flex h-9 items-center ${className}`}
    >
      <Search className="icon-xs text-muted-foreground shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search integrations..."
        className="body-3 text-foreground placeholder:text-muted-foreground w-full min-w-0 bg-transparent focus:outline-none"
        autoFocus={autoFocus}
      />
    </div>
  )
}

export function IntegrationsView({
  activeTab,
  availableIntegrations,
  metaLibraryEligible,
  userIntegrations,
  providerModes,
  isLoading,
  error,
  connectingProvider,
  searchQuery,
  canManageOrgShared,
  onSearchChange,
  onTabChange,
  onConnect,
  onRefresh,
  onDisconnect,
  onReconnect,
  onRemove,
  onSetDefault,
  onChangeScope,
  onRename,
  autoOpenSocialReportingPickerId = null,
  autoOpenSocialReportingPickerPlatform = null,
}: IntegrationsViewProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [addMenuSearch, setAddMenuSearch] = useState('')
  const [wordpressDialogIntegration, setWordpressDialogIntegration] = useState<Integration | null>(
    null,
  )

  const filteredAvailable = availableIntegrations.filter((i) => matchesSearch(i, searchQuery))
  const filteredUser = userIntegrations.filter((ui) => {
    const integration = availableIntegrations.find((i) => i.id === ui.integration_id)
    return integration && matchesSearch(integration, searchQuery)
  })

  const addMenuIntegrations = useMemo(() => {
    return availableIntegrations
      .filter((integration) => integration.is_active)
      .filter(
        (integration) =>
          !['openai_codex', 'anthropic_claude'].includes(integration.provider.toLowerCase()),
      )
      .filter((integration) => matchesSearch(integration, addMenuSearch))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [availableIntegrations, addMenuSearch])

  const closeAddMenu = () => {
    setAddMenuOpen(false)
    setAddMenuSearch('')
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as IntegrationsTab)}
      className="space-y-spacing-6"
    >
      <div className="gap-spacing-4 flex h-9 items-center justify-between">
        <TabsList data-tour="integrations-tabs">
          <TabsTrigger value="manage" data-tour="integrations-tab-manage">
            Manage
          </TabsTrigger>
          <TabsTrigger value="library" data-tour="integrations-tab-library">
            Library
          </TabsTrigger>
          {canManageOrgShared ? (
            <TabsTrigger value="org" data-tour="integrations-tab-org">
              Org
            </TabsTrigger>
          ) : null}
        </TabsList>
        <div className="gap-spacing-2 flex items-center">
          {availableIntegrations.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAddMenuOpen((o) => !o)}
                className="button-glass-neutral gap-spacing-2 rounded-spacing-2 px-spacing-3 flex h-9 items-center"
                aria-expanded={addMenuOpen}
              >
                <Plus className="icon-xs" />
                <span className="body-3">Add connection</span>
                <ChevronDown className="icon-xs text-muted-foreground" />
              </button>
              {addMenuOpen ? (
                <>
                  <div className="fixed inset-0 z-[50]" onClick={closeAddMenu} />
                  <div className="dropdown-glass absolute right-0 top-full z-[60] mt-1 flex max-h-[360px] min-w-[280px] flex-col overflow-hidden">
                    <div className="p-spacing-2 shrink-0">
                      <IntegrationsSearchInput
                        value={addMenuSearch}
                        onChange={setAddMenuSearch}
                        className="w-full"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto py-1">
                      {addMenuIntegrations.length > 0 ? (
                        addMenuIntegrations.map((integration) => {
                          const logo = getIntegrationLogoPath(integration.provider)
                          const comingSoon = isIntegrationsLibraryComingSoon(integration, {
                            metaEligible: metaLibraryEligible,
                          })
                          const isConnecting =
                            connectingProvider === integration.provider.toLowerCase()
                          const alreadyConnected = userIntegrations.some(
                            (ui) =>
                              ui.integration_id === integration.id &&
                              ['connected', 'pending', 'needs_reconnect'].includes(ui.status),
                          )
                          return (
                            <button
                              key={integration.id}
                              type="button"
                              disabled={comingSoon || isConnecting}
                              onClick={() => {
                                closeAddMenu()
                                if (integration.provider.toLowerCase() === 'wordpress') {
                                  setWordpressDialogIntegration(integration)
                                } else {
                                  onConnect(
                                    integration,
                                    undefined,
                                    alreadyConnected ? { forceNew: true } : undefined,
                                  )
                                }
                              }}
                              className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {logo ? (
                                <img
                                  src={logo}
                                  alt={integration.name}
                                  className="h-5 w-5 shrink-0 object-contain"
                                />
                              ) : (
                                <span className="text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-semibold">
                                  {integration.name.charAt(0)}
                                </span>
                              )}
                              <span className="min-w-0 flex-1 truncate">{integration.name}</span>
                              {comingSoon ? (
                                <span className="badge-glass badge-glass-sm badge-glass-muted shrink-0">
                                  Soon
                                </span>
                              ) : null}
                              {isConnecting ? (
                                <span className="body-4 text-muted-foreground shrink-0">
                                  Connecting…
                                </span>
                              ) : null}
                            </button>
                          )
                        })
                      ) : (
                        <p className="body-3 text-muted-foreground px-spacing-3 py-spacing-2">
                          No integrations match your search.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <IntegrationsSearchInput
            value={searchQuery}
            onChange={onSearchChange}
            className="min-w-[180px] max-w-[240px]"
          />
        </div>
      </div>

      {error ? (
        <div className="surface-card rounded-spacing-3 p-spacing-6 border-destructive/20 bg-destructive/5">
          <p className="body-2 text-destructive">{error}</p>
        </div>
      ) : null}

      <TabsContent value="manage">
        <IntegrationsManage
          userIntegrations={filteredUser}
          availableIntegrations={filteredAvailable}
          isLoading={isLoading}
          onRefresh={onRefresh}
          onDisconnect={onDisconnect}
          onReconnect={onReconnect}
          onRemove={onRemove}
          onSetDefault={onSetDefault}
          canManageOrgShared={canManageOrgShared}
          onChangeScope={onChangeScope}
          onRename={onRename}
          onAddAccount={(integration) => onConnect(integration, undefined, { forceNew: true })}
          connectingProvider={connectingProvider}
          autoOpenSocialReportingPickerId={autoOpenSocialReportingPickerId}
          autoOpenSocialReportingPickerPlatform={autoOpenSocialReportingPickerPlatform}
        />
      </TabsContent>

      <TabsContent value="library">
        <IntegrationsLibrary
          availableIntegrations={filteredAvailable}
          userIntegrations={userIntegrations}
          providerModes={providerModes}
          metaEligible={metaLibraryEligible}
          onConnect={onConnect}
          onRefresh={onRefresh}
          onDisconnect={onDisconnect}
          onReconnect={onReconnect}
          onRemove={onRemove}
          onSetDefault={onSetDefault}
          onChangeScope={onChangeScope}
          onRename={onRename}
          canManageOrgShared={canManageOrgShared}
          connectingProvider={connectingProvider}
        />
      </TabsContent>

      {canManageOrgShared ? (
        <TabsContent value="org">
          <OrgConnectedAccountsPanel />
        </TabsContent>
      ) : null}

      <WordpressConnectDialog
        integration={wordpressDialogIntegration}
        open={wordpressDialogIntegration !== null}
        onOpenChange={(open) => {
          if (!open) setWordpressDialogIntegration(null)
        }}
        onConnect={onConnect}
      />
    </Tabs>
  )
}
