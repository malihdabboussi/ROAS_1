'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/forms/switch'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  getAgentPolicy,
  setAgentOverrides,
  setAgentTeam,
  useTeams,
  type AgentCapabilityKind,
  type ResolvedAgentPolicyJson,
} from '@/lib/agents'
import { isProtectedSystemAgent } from '@/lib/agents/system-agent-contracts'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { USER_BRAIN_SHARE_EXTENDED_AGENT_KEYS } from '../../../constants/team.constants'
import { AccessIntegrationLogo, AccessRowHoverCard } from './access-row-ui'
import {
  applyOverrideChange,
  isLockedSystemAccessKind,
  protectedAgentDescription,
  type AccessSectionKey,
} from './agent-info-access.logic'
import {
  ACCESS_POLICY_SECTIONS,
  buildPolicyOverridesPayload,
  policyRowState,
  type RowState,
} from './agent-access-policy.logic'
import type { AgentInfoAccessTabProps } from './agent-info-access.types'
import { AccessSectionHeader } from './AgentInfoAccessSectionHeader'
import { AgentInfoAccessTeamSelect } from './AgentInfoAccessTeamSelect'
import { IntegrationsAccessSection } from './AgentInfoIntegrationsAccessSection'
import { useConnectedIntegrations } from './use-connected-integrations'

export function AgentInfoAccessTab(props: AgentInfoAccessTabProps) {
  const {
    selected,
    selectedAgentKey,
    hasBrain,
    brainLoading,
    brainError,
    handleAddBrain,
    setShowUpgradeModal,
    isEnterprise,
    disabled,
    canAllowExtra,
    canSetTeam,
  } = props

  const { teams } = useTeams()
  const { items: integrationItems, loading: integrationsLoading } = useConnectedIntegrations()
  const [policy, setPolicy] = useState<ResolvedAgentPolicyJson | null>(null)
  const [policyLoading, setPolicyLoading] = useState(true)
  const [savingCount, setSavingCount] = useState(0)
  const [collapsed, setCollapsed] = useState<Partial<Record<AccessSectionKey, boolean>>>({})

  const initialLoading = policyLoading || integrationsLoading

  useEffect(() => {
    setPolicy(null)
    setCollapsed({})
    setPolicyLoading(true)
    if (!selectedAgentKey) return
    let cancelled = false
    void (async () => {
      try {
        const p = await getAgentPolicy(selectedAgentKey)
        if (!cancelled) setPolicy(p)
      } catch (err) {
        if (!cancelled) toast.error(sanitizeUserError(err, 'Failed to load policy'))
      } finally {
        if (!cancelled) setPolicyLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedAgentKey])

  const overrideCount = useMemo(() => {
    if (!policy) return 0
    return policy.overrides.allow_extra.length + policy.overrides.deny.length
  }, [policy])

  const onChangeTeam = useCallback(
    async (teamId: string | null) => {
      if (!selectedAgentKey) return
      setSavingCount((c) => c + 1)
      try {
        await setAgentTeam(selectedAgentKey, teamId)
        const p = await getAgentPolicy(selectedAgentKey)
        setPolicy(p)
        toast.success('Team updated')
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Failed to set team'))
      } finally {
        setSavingCount((c) => c - 1)
      }
    },
    [selectedAgentKey],
  )

  const onSwitchToggle = useCallback(
    async (kind: AgentCapabilityKind, id: string, nextOn: boolean) => {
      if (!policy || !selectedAgentKey) return
      if (disabled) return
      if (isProtectedSystemAgent(selectedAgentKey)) return
      const cur = policyRowState(policy, kind, id)
      let target: RowState | null = null
      if (nextOn) {
        if (cur === 'default' || cur === 'inherited' || cur === 'allow_extra') return
        if (cur === 'deny') target = id === 'write_user_memory' ? 'default' : 'inherited'
        else if (cur === 'unset') {
          if (canAllowExtra === false) return
          target = 'allow_extra'
        }
      } else {
        if (cur === 'unset' || cur === 'deny') return
        if (cur === 'allow_extra') target = 'unset'
        else if (cur === 'inherited') target = 'deny'
        else if (cur === 'default') target = 'deny'
      }
      if (target === null) return

      const prevPolicy = policy
      const optimistic = applyOverrideChange(policy, kind, id, target)
      setPolicy(optimistic)

      const change = new Map<string, RowState>([[`${kind}:${id}`, target]])
      const payload = buildPolicyOverridesPayload(prevPolicy, change)

      setSavingCount((c) => c + 1)
      try {
        await setAgentOverrides(selectedAgentKey, payload)
      } catch (err) {
        setPolicy(prevPolicy)
        toast.error(sanitizeUserError(err, 'Failed to save override'))
      } finally {
        setSavingCount((c) => c - 1)
      }
    },
    [policy, selectedAgentKey, disabled, canAllowExtra],
  )

  if (!selected) return null

  if (initialLoading || !policy) {
    return (
      <div className="px-spacing-1 py-spacing-6 flex min-h-[240px] flex-1 items-center justify-center">
        <VibeyLoadingOrb size="md" />
      </div>
    )
  }

  const upgradeShareBrainOnly =
    selected.agent_key !== 'vibey' && USER_BRAIN_SHARE_EXTENDED_AGENT_KEYS.has(selected.agent_key)
  const isSystemAgent = isProtectedSystemAgent(selected.agent_key)
  const teamName = policy.team_name
  const isSaving = savingCount > 0
  const integrationsLockedBySystem = isSystemAgent

  const toggleSection = (key: AccessSectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="px-spacing-1 flex flex-col">
      <AccessSectionHeader
        title="Team"
        collapsed={collapsed.team === true}
        onToggle={() => toggleSection('team')}
        first
        trailing={
          isSaving ? (
            <span className="body-4 text-muted-foreground">saving…</span>
          ) : overrideCount > 0 ? (
            <span className="body-4 text-muted-foreground">
              {overrideCount} override{overrideCount === 1 ? '' : 's'}
            </span>
          ) : null
        }
      />
      {collapsed.team !== true ? (
        <div className="px-spacing-2 pb-spacing-1 space-y-spacing-2">
          <div className="gap-spacing-2 flex items-center justify-between">
            <div className="min-w-0">
              <p className="body-3 text-foreground">Inherits from</p>
              <p className="body-4 text-muted-foreground/60 mt-0.5">
                {policy.team_name ? (
                  <Link
                    href={`/team/teams/${policy.team_id}`}
                    className="text-foreground font-medium hover:underline"
                  >
                    {policy.team_name}
                  </Link>
                ) : (
                  'No team'
                )}
              </p>
            </div>
            {canSetTeam === false || disabled || isSystemAgent ? (
              <span className="body-4 text-muted-foreground">Read-only</span>
            ) : (
              <AgentInfoAccessTeamSelect
                teams={teams}
                value={policy.team_id}
                disabled={disabled}
                saving={isSaving}
                onChange={onChangeTeam}
              />
            )}
          </div>
        </div>
      ) : null}

      {isSystemAgent ? (
        <>
          <AccessSectionHeader
            title="Platform managed"
            collapsed={collapsed['policy:brain_access'] === true}
            onToggle={() => toggleSection('policy:brain_access')}
            first={false}
          />
          {collapsed['policy:brain_access'] !== true ? (
            <div className="px-spacing-2 pb-spacing-2">
              <div className="surface-card border-border rounded-spacing-3 border p-3">
                <p className="body-3 text-foreground font-medium">Protected by ROAS</p>
                <p className="body-4 text-muted-foreground mt-1">
                  {protectedAgentDescription(selected.agent_key)}
                </p>
                <p className="body-4 text-muted-foreground mt-1">
                  Access changes are read-only here.
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {ACCESS_POLICY_SECTIONS.map((section) => {
        if (isSystemAgent && section.kind === 'action_domain') return null
        const key: AccessSectionKey = `policy:${section.kind}`
        const isCollapsed = collapsed[key] === true
        const lockedBySystemKind = isSystemAgent && isLockedSystemAccessKind(section.kind)
        return (
          <div key={section.kind} className="contents">
            <AccessSectionHeader
              title={section.title}
              collapsed={isCollapsed}
              onToggle={() => toggleSection(key)}
              first={false}
            />
            {!isCollapsed ? (
              <div className="px-spacing-2 pb-spacing-1">
                <div className="flex flex-col">
                  {section.options.map((opt) => {
                    const state = policyRowState(policy, opt.kind, opt.id)
                    const switchOn =
                      state === 'default' || state === 'inherited' || state === 'allow_extra'
                    const cannotEnable = !switchOn && state === 'unset' && canAllowExtra === false
                    const switchDisabled =
                      disabled || isSystemAgent || lockedBySystemKind || cannotEnable
                    let status: string | null = null
                    if (state === 'default') {
                      status = 'Default for all agents'
                    } else if (state === 'inherited') {
                      status = teamName ? `Inherited from team: ${teamName}` : 'Inherited from team'
                    } else if (state === 'allow_extra') {
                      status = 'Custom override for this agent'
                    } else if (state === 'deny') {
                      if (opt.kind === 'action_domain' && opt.id === 'write_user_memory') {
                        status = 'Blocked for this agent'
                      } else {
                        status = teamName
                          ? `Blocked (team: ${teamName} grants it by default)`
                          : 'Blocked (team grants it by default)'
                      }
                    } else if (cannotEnable) {
                      status = 'Not granted by your team'
                    } else {
                      status = 'Not enabled'
                    }
                    const channelLogo =
                      opt.kind === 'channel' ? getIntegrationLogoPath(opt.id) : null
                    return (
                      <AccessRowHoverCard
                        key={`${opt.kind}:${opt.id}`}
                        title={opt.label}
                        description={opt.description}
                        status={status}
                      >
                        <div className="gap-spacing-3 flex items-center justify-between">
                          <div className="gap-spacing-2 flex min-w-0 items-center">
                            {opt.kind === 'channel' ? (
                              <AccessIntegrationLogo src={channelLogo} name={opt.label} />
                            ) : null}
                            <p className="body-3 text-foreground min-w-0 truncate">{opt.label}</p>
                          </div>
                          <Switch
                            checked={switchOn}
                            disabled={switchDisabled}
                            onCheckedChange={(val) => void onSwitchToggle(opt.kind, opt.id, val)}
                          />
                        </div>
                      </AccessRowHoverCard>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}

      <IntegrationsAccessSection
        collapsed={collapsed.integrations === true}
        onToggle={() => toggleSection('integrations')}
        policy={policy}
        canAllowExtra={canAllowExtra}
        disabled={disabled || integrationsLockedBySystem}
        teamName={teamName}
        onSwitchToggle={onSwitchToggle}
        items={integrationItems}
      />

      {!upgradeShareBrainOnly && !isSystemAgent ? (
        <>
          <AccessSectionHeader
            title="Agent brain"
            collapsed={collapsed.agentBrain === true}
            onToggle={() => toggleSection('agentBrain')}
            first={false}
            trailing={
              hasBrain ? (
                <span className="badge-glass badge-glass-green badge-glass-sm">Active</span>
              ) : null
            }
          />
          {collapsed.agentBrain !== true ? (
            <div className="px-spacing-2 pb-spacing-1">
              <div className="flex flex-col">
                {(() => {
                  const brainStatus = brainLoading
                    ? 'Checking…'
                    : hasBrain
                      ? 'Active'
                      : isEnterprise
                        ? 'Not enabled'
                        : 'Available on Enterprise'
                  const brainSwitchDisabled = disabled || brainLoading || hasBrain
                  return (
                    <AccessRowHoverCard
                      title="Agent brain"
                      description={`Give ${selected.name} a dedicated knowledge brain to store and recall context across conversations.`}
                      status={brainStatus}
                    >
                      <div className="gap-spacing-3 flex items-center justify-between">
                        <p className="body-3 text-foreground min-w-0 truncate">Agent brain</p>
                        <Switch
                          checked={hasBrain}
                          disabled={brainSwitchDisabled}
                          onCheckedChange={(val) => {
                            if (!val || hasBrain) return
                            if (isEnterprise) void handleAddBrain()
                            else setShowUpgradeModal(true)
                          }}
                        />
                      </div>
                    </AccessRowHoverCard>
                  )
                })()}
                {brainError ? (
                  <p className="body-4 mt-spacing-1 text-destructive">{brainError}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
