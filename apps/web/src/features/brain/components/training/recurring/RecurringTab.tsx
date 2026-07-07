'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  listRecurringTrainingRules,
  type RecurringTrainingRule,
  type SlackTrainingDestination,
} from '../../../services/recurring-rules.service'
import {
  RECURRING_SECTION_KINDS,
  RecurringKindSection,
  type RecurringTabKind,
} from './RecurringKindSection'
import { RecurringRuleRow } from './RecurringRuleRow'
import { AddSlackMappingDialog } from './rule-cards/SlackRuleCard'
import { SlackWorkspaceCard } from './rule-cards/SlackWorkspaceCard'

function toggleExpandedKind(
  expanded: Set<RecurringTabKind>,
  kind: RecurringTabKind,
): Set<RecurringTabKind> {
  const next = new Set(expanded)
  if (next.has(kind)) next.delete(kind)
  else next.add(kind)
  return next
}

export function RecurringTab({
  open,
  onOpenIntegrations,
}: {
  open: boolean
  onOpenIntegrations: () => void
}) {
  const [rules, setRules] = useState<RecurringTrainingRule[]>([])
  const [destinations, setDestinations] = useState<SlackTrainingDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [slackConnected, setSlackConnected] = useState(false)
  const [slackAutoIngest, setSlackAutoIngestState] = useState(true)
  const [slackTeamName, setSlackTeamName] = useState<string | null>(null)
  const [showAddSlack, setShowAddSlack] = useState(false)
  const [expandedKinds, setExpandedKinds] = useState<Set<RecurringTabKind>>(
    () => new Set(['company_dream']),
  )

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    try {
      const res = await listRecurringTrainingRules()
      setRules(res.rules)
      setDestinations(res.destinations)
      setSlackConnected(res.slackConnected)
      setSlackAutoIngestState(res.slackAutoIngest)
      setSlackTeamName(res.slackTeamName)
    } catch {
      setRules([])
      setDestinations([])
      setSlackConnected(false)
      setSlackAutoIngestState(true)
      setSlackTeamName(null)
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const rulesByKind = useMemo(() => {
    const map = new Map<RecurringTabKind, RecurringTrainingRule[]>()
    for (const kind of RECURRING_SECTION_KINDS) {
      map.set(
        kind,
        rules.filter((rule) => rule.kind === kind),
      )
    }
    return map
  }, [rules])

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading recurring training..." state="processing" size="md" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-spacing-3 space-y-spacing-2">
          {RECURRING_SECTION_KINDS.map((kind) => {
            const kindRules = rulesByKind.get(kind) ?? []
            const isOpen = expandedKinds.has(kind)

            return (
              <RecurringKindSection
                key={kind}
                kind={kind}
                open={isOpen}
                onToggle={() => setExpandedKinds((prev) => toggleExpandedKind(prev, kind))}
              >
                {kind === 'slack' ? (
                  <div className="space-y-spacing-2">
                    <SlackWorkspaceCard
                      slackConnected={slackConnected}
                      slackTeamName={slackTeamName}
                      slackAutoIngest={slackAutoIngest}
                      onRefresh={load}
                      onOpenIntegrations={onOpenIntegrations}
                      onAddMapping={() => setShowAddSlack(true)}
                    />
                    {kindRules.map((rule) => (
                      <RecurringRuleRow key={rule.id} rule={rule} onRefresh={load} />
                    ))}
                  </div>
                ) : kindRules.length > 0 ? (
                  <div className="space-y-spacing-2">
                    {kindRules.map((rule) => (
                      <RecurringRuleRow key={rule.id} rule={rule} onRefresh={load} />
                    ))}
                  </div>
                ) : (
                  <p className="body-4 text-muted-foreground p-spacing-3">
                    No recurring training rules found.
                  </p>
                )}
              </RecurringKindSection>
            )
          })}
        </div>
      </div>

      {showAddSlack ? (
        <AddSlackMappingDialog
          destinations={destinations}
          onClose={() => setShowAddSlack(false)}
          onSaved={async () => {
            setShowAddSlack(false)
            await load()
          }}
        />
      ) : null}
    </div>
  )
}
