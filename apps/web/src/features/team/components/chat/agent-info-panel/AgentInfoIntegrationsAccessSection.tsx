import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import type { AgentCapabilityKind, ResolvedAgentPolicyJson } from '@/lib/agents'
import { AccessIntegrationLogo, AccessRowHoverCard } from './access-row-ui'
import { policyRowState } from './agent-access-policy.logic'
import { AccessSectionHeader } from './AgentInfoAccessSectionHeader'
import type { ConnectedIntegrationRow } from './use-connected-integrations'

export function IntegrationsAccessSection({
  collapsed,
  onToggle,
  policy,
  canAllowExtra,
  disabled,
  teamName,
  onSwitchToggle,
  items,
}: {
  collapsed: boolean
  onToggle: () => void
  policy: ResolvedAgentPolicyJson
  canAllowExtra: boolean | undefined
  disabled: boolean | undefined
  teamName: string | null
  onSwitchToggle: (kind: AgentCapabilityKind, id: string, nextOn: boolean) => Promise<void>
  items: ConnectedIntegrationRow[]
}) {
  return (
    <>
      <AccessSectionHeader
        title="Integrations"
        collapsed={collapsed}
        onToggle={onToggle}
        first={false}
        trailing={
          items.length > 0 ? (
            <span className="body-4 text-muted-foreground">{items.length}</span>
          ) : null
        }
      />
      {!collapsed ? (
        <div className="px-spacing-2 pb-spacing-1">
          <div className="flex flex-col">
            {items.length === 0 ? (
              <p className="body-4 text-muted-foreground py-spacing-1">
                No integrations connected yet.
              </p>
            ) : (
              items.map((it) => {
                const state = policyRowState(policy, 'integration', it.id)
                const switchOn = state === 'inherited' || state === 'allow_extra'
                const cannotEnable = !switchOn && state === 'unset' && canAllowExtra === false
                const switchDisabled = disabled || cannotEnable
                let status: string
                if (state === 'inherited') {
                  status = teamName ? `Inherited from team: ${teamName}` : 'Inherited from team'
                } else if (state === 'allow_extra') {
                  status = 'Custom override for this agent'
                } else if (state === 'deny') {
                  status = teamName
                    ? `Blocked (team: ${teamName} grants it by default)`
                    : 'Blocked (team grants it by default)'
                } else if (cannotEnable) {
                  status = 'Not granted by your team'
                } else {
                  status = 'Not enabled'
                }
                return (
                  <AccessRowHoverCard
                    key={`integration:${it.id}`}
                    title={it.name}
                    description={`Lets ${it.name} actions be available to this agent.`}
                    status={status}
                  >
                    <div className="gap-spacing-3 flex items-center justify-between">
                      <div className="gap-spacing-2 flex min-w-0 items-center">
                        <AccessIntegrationLogo src={it.logo} name={it.name} />
                        <p className="body-3 text-foreground min-w-0 truncate">{it.name}</p>
                      </div>
                      <Switch
                        checked={switchOn}
                        disabled={switchDisabled}
                        onCheckedChange={(val) => void onSwitchToggle('integration', it.id, val)}
                      />
                    </div>
                  </AccessRowHoverCard>
                )
              })
            )}
            <Link
              href="/settings?tab=integrations"
              className="gap-spacing-2 mt-spacing-1 rounded-spacing-2 px-spacing-2 py-spacing-1 body-3 text-primary hover:bg-hover-subtle flex w-full items-center transition-colors"
            >
              <PlusCircle className="icon-sm shrink-0" />
              <span>Add connection</span>
            </Link>
          </div>
        </div>
      ) : null}
    </>
  )
}
