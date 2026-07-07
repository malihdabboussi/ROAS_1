'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useOrgStore } from '@/lib/org/org-context-store'
import type {
  Integration,
  UserIntegration,
} from '@/lib/integrations/integrations.types'
import { useCampaignIntegrations } from '@/lib/integrations/use-campaign-integrations'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

interface CampaignIntegrationsSettingsSectionProps {
  campaignId: string
  userIntegrations: UserIntegration[]
  providerModes: Record<string, string>
  availableIntegrations: Integration[]
  loadUserIntegrations: () => Promise<void>
}

export function CampaignIntegrationsSettingsSection({
  campaignId,
  userIntegrations,
  providerModes,
  availableIntegrations,
  loadUserIntegrations,
}: CampaignIntegrationsSettingsSectionProps) {
  const isOrg = useOrgStore((s) => s.isOrgContext())
  const {
    connections,
    loading,
    loadConnections,
    connectComposioCampaign,
    disconnectComposioCampaign,
  } = useCampaignIntegrations(campaignId)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (isOrg) void loadConnections()
  }, [isOrg, loadConnections])

  const eligible = useMemo(() => {
    if (!isOrg) return []
    return userIntegrations.filter((ui) => {
      const mode = String(providerModes[ui.integration_id] ?? '')
        .trim()
        .toLowerCase()
      return mode === 'composio' && (ui.status === 'connected' || ui.status === 'pending')
    })
  }, [isOrg, userIntegrations, providerModes])

  const connectionByIntegrationId = useMemo(() => {
    const m = new Map<string, (typeof connections)[0]>()
    for (const c of connections) {
      m.set(c.integration_id, c)
    }
    return m
  }, [connections])

  if (!isOrg) return null

  if (eligible.length === 0) {
    return (
      <div className="space-y-spacing-4 max-w-xl">
        <div>
          <h2 className="title-h5 emphasis-medium">Campaign integrations</h2>
          <p className="body-3 text-muted-foreground mt-spacing-2">
            No Composio integrations are connected yet. Connect one in Settings first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-spacing-6 max-w-xl">
      <div>
        <h2 className="title-h5 emphasis-medium">Campaign integrations</h2>
        <p className="body-3 text-muted-foreground mt-spacing-2">
          Connect a separate account for this campaign. If none is set, the org default is used.
        </p>
      </div>

      {loading && connections.length === 0 ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading connections..." />
        </div>
      ) : (
        <ul className="space-y-spacing-4">
          {eligible.map((ui) => {
            const catalog = availableIntegrations.find((i) => i.id === ui.integration_id)
            const name = catalog?.name ?? ui.integration_id
            const row = connectionByIntegrationId.get(ui.integration_id)
            const status = String(row?.status ?? '').toLowerCase()
            const connId = String(row?.composio_connected_account_id ?? '').trim()
            const isConnected = status === 'connected' && connId.length > 0
            const isPending = status === 'pending' && connId.length > 0

            return (
              <li
                key={ui.integration_id}
                className="card-glass rounded-spacing-2 border-border space-y-spacing-3 p-spacing-4 border"
              >
                <div className="gap-spacing-3 flex items-start justify-between">
                  <div className="min-w-0">
                    <span className="body-3 text-foreground font-medium">{name}</span>
                    <p className="body-3 text-muted-foreground mt-spacing-1">
                      {isConnected
                        ? 'Using a campaign-specific account for this integration.'
                        : isPending
                          ? 'Connection pending — complete OAuth if prompted.'
                          : 'Using org default until you connect here.'}
                    </p>
                  </div>
                </div>
                <div className="gap-spacing-2 flex flex-wrap items-center">
                  {!isConnected ? (
                    <button
                      type="button"
                      disabled={busyId === ui.integration_id}
                      onClick={() => {
                        setBusyId(ui.integration_id)
                        void connectComposioCampaign(ui.integration_id)
                          .then(() => {
                            void loadUserIntegrations()
                          })
                          .catch((e) => {
                            toast.error(sanitizeUserError(e, 'Connect failed'))
                          })
                          .finally(() => setBusyId(null))
                      }}
                      className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
                    >
                      {busyId === ui.integration_id ? 'Starting…' : 'Connect for this campaign'}
                    </button>
                  ) : null}
                  {isConnected || isPending ? (
                    <button
                      type="button"
                      disabled={!connId || busyId === ui.integration_id}
                      onClick={() => {
                        if (!connId) return
                        setBusyId(ui.integration_id)
                        void disconnectComposioCampaign(ui.integration_id, connId)
                          .then(() => {
                            void loadUserIntegrations()
                            toast.success('Campaign connection removed')
                          })
                          .catch((e) => {
                            toast.error(sanitizeUserError(e, 'Disconnect failed'))
                          })
                          .finally(() => setBusyId(null))
                      }}
                      className="button-glass-destructive rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
                    >
                      {busyId === ui.integration_id ? 'Working…' : 'Disconnect campaign account'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void loadConnections()}
                    className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
                  >
                    Refresh status
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
