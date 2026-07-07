'use client'

import { useEffect, useMemo } from 'react'
import {
  AccessIntegrationLogo,
  AccessRowHoverCard,
} from '@/components/agents/AgentAccessRowUi'
import { Switch } from '@/components/ui/forms/switch'
import { type AgentCapabilityKind } from '@/lib/agents/agent-teams.types'
import { ACTION_DOMAIN_ROWS } from '@/lib/agents/agent-access-policy.logic'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { useIntegrationOverview } from '@/lib/integrations/use-integration-overview'

export interface TeamAccessGrants {
  integration: Set<string>
  brain_domain: Set<string>
  brain_access: Set<string>
  campaign_context: Set<string>
  channel: Set<string>
  action_domain: Set<string>
}

interface TeamAccessViewProps {
  grants: TeamAccessGrants
  savingKind: AgentCapabilityKind | null
  toggle: (kind: keyof TeamAccessGrants, id: string) => void
  canEditTeam: boolean
}

export function TeamAccessView({ grants, savingKind, toggle, canEditTeam }: TeamAccessViewProps) {
  const {
    userIntegrations,
    availableIntegrations,
    isLoading: integrationsLoading,
    loadData: loadIntegrations,
  } = useIntegrationOverview()

  useEffect(() => {
    void loadIntegrations()
  }, [loadIntegrations])

  const integrationOptions = useMemo(() => {
    const nameById = new Map(availableIntegrations.map((a) => [a.id, a.name]))
    const seen = new Set<string>()
    const rows: Array<{ id: string; label: string; icon: string | null }> = []
    for (const ui of userIntegrations) {
      if (ui.status !== 'connected') continue
      const id = ui.integration_id
      if (!id || seen.has(id)) continue
      seen.add(id)
      rows.push({
        id,
        label: nameById.get(id) ?? id,
        icon: getIntegrationLogoPath(id),
      })
    }
    for (const id of grants.integration) {
      if (seen.has(id)) continue
      seen.add(id)
      rows.push({
        id,
        label: nameById.get(id) ?? id,
        icon: getIntegrationLogoPath(id),
      })
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label))
  }, [userIntegrations, availableIntegrations, grants.integration])

  const integrationsEmptyHint =
    integrationsLoading && integrationOptions.length === 0
      ? 'Loading…'
      : 'No integrations connected yet. Connect them in Settings → Integrations to enable here.'

  const sections = useMemo<GrantSectionProps[]>(
    () => [
      {
        title: 'Action domains',
        description: 'Baseline action groups every agent in this team can execute.',
        options: ACTION_DOMAIN_ROWS,
        selected: grants.action_domain,
        onToggle: (id) => toggle('action_domain', id),
        saving: savingKind === 'action_domain',
        readOnly: !canEditTeam,
      },
      {
        title: 'Integrations',
        description: 'Connected integrations agents in this team can call.',
        options: integrationOptions,
        selected: grants.integration,
        onToggle: (id) => toggle('integration', id),
        saving: savingKind === 'integration',
        readOnly: !canEditTeam,
        emptyHint: integrationsEmptyHint,
      },
    ],
    [canEditTeam, grants, savingKind, toggle, integrationOptions, integrationsEmptyHint],
  )

  return (
    <div className="gap-spacing-4 flex flex-col">
      <div className="gap-spacing-4 grid grid-cols-1 xl:grid-cols-2">
        {sections.map((section) => (
          <GrantSection key={section.title} {...section} />
        ))}
      </div>
    </div>
  )
}

interface GrantSectionProps {
  title: string
  description: string
  options: Array<{ id: string; label: string; description?: string; icon?: string | null }>
  selected: Set<string>
  onToggle: (id: string) => void
  saving: boolean
  readOnly?: boolean
  emptyHint?: string
}

function GrantSection({
  title,
  description,
  options,
  selected,
  onToggle,
  saving,
  readOnly,
  emptyHint,
}: GrantSectionProps) {
  const switchDisabled = readOnly || saving

  const rowStatus = (isOn: boolean): string | null => {
    if (saving) return 'Saving…'
    if (readOnly) return 'Read-only'
    return isOn ? 'Enabled for agents in this team' : 'Disabled'
  }

  return (
    <section className="surface-card border-subtle rounded-spacing-3 p-spacing-4 border">
      <header className="mb-spacing-3 gap-spacing-2 flex items-baseline justify-between">
        <h2 className="body-2 text-foreground font-semibold">{title}</h2>
        {saving && <span className="body-4 text-muted-foreground">Saving…</span>}
      </header>
      <p className="body-4 text-muted-foreground mb-spacing-3">{description}</p>
      {options.length === 0 && (
        <p className="body-4 text-muted-foreground">{emptyHint ?? 'No options.'}</p>
      )}
      <div className="flex flex-col">
        {options.map((opt) => {
          const isOn = selected.has(opt.id)
          return (
            <AccessRowHoverCard
              key={opt.id}
              title={opt.label}
              description={opt.description ?? description}
              status={rowStatus(isOn)}
            >
              <div className="gap-spacing-3 flex items-center justify-between">
                <div className="gap-spacing-2 flex min-w-0 items-center">
                  {opt.icon ? <AccessIntegrationLogo src={opt.icon} name={opt.label} /> : null}
                  <p className="body-3 text-foreground min-w-0 truncate">{opt.label}</p>
                </div>
                <Switch
                  checked={isOn}
                  disabled={switchDisabled}
                  onCheckedChange={(next) => {
                    if (next !== isOn) onToggle(opt.id)
                  }}
                />
              </div>
            </AccessRowHoverCard>
          )
        })}
      </div>
    </section>
  )
}
