'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, LayoutGrid, MessageSquare, Zap } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  HomeFeedScopeHoverReveal,
  HomeFeedScopePicker,
  usePersistedHomeFeedScope,
} from '@/features/home/components/HomeFeedScopePicker'
import {
  backendOptionsForHomeFeed,
  homeFeedCacheScopeKey,
} from '@/features/home/types/home-feed-scope'
import { orgService } from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { fetchSpacesForHomeScope } from '@/features/spaces/hooks/use-cached-spaces'
import { fetchYourTurnForScope } from '@/features/spaces/hooks/use-your-turn-feed'
import { fetchRecentCompletedAutomationRuns } from '@/features/spaces/services/automations.service'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchConversations } from '@/lib/conversations/conversations-api'

interface PulseMetric {
  id: string
  label: string
  value: string
  icon: typeof Activity
}

export function OrgPulseCard() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const { scope, updateScope } = usePersistedHomeFeedScope('org_pulse')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PulseMetric[]>([])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      // Effective org for org-scoped requests (falls back to the active org).
      const scopeOrgId = scope.feedScope === 'org' ? (scope.orgId ?? activeOrgId) : scope.orgId
      const feedOrgId = scope.feedScope === 'org' ? (scopeOrgId ?? undefined) : undefined
      const backend = backendOptionsForHomeFeed(scope.feedScope, scopeOrgId)
      const scopeCacheKey = homeFeedCacheScopeKey(scope.feedScope, scopeOrgId)
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [spaces, waiting, automations, conversations, members] = await Promise.all([
        fetchSpacesForHomeScope({
          feedScope: scope.feedScope,
          orgId: scopeOrgId,
          campaignId: scope.campaignId,
        }).catch(() => []),
        fetchYourTurnForScope({
          feedScope: scope.feedScope,
          orgId: scopeOrgId,
          campaignId: scope.campaignId,
        }).catch(() => []),
        fetchRecentCompletedAutomationRuns({
          limit: 100,
          feedScope: scope.feedScope,
          feedOrgId: feedOrgId ?? null,
          campaignId: scope.campaignId,
          mineOnly: false,
          backend,
        }).catch(() => []),
        cachedFetch(`home:conversations:${scopeCacheKey}:${scope.campaignId ?? ''}`, () =>
          fetchConversations(
            scope.campaignId,
            null,
            null,
            { feedScope: scope.feedScope, feedOrgId: feedOrgId ?? null },
            backend,
          ),
        ).catch(() => []),
        activeOrgId
          ? orgService
              .listMembers(activeOrgId)
              .then((res) => res.members ?? [])
              .catch(() => [])
          : Promise.resolve([]),
      ])

      const recentAutomations = automations.filter((r) => r.created_at >= since24h)
      const activeConversations = conversations.filter((c) => c.status === 'active')

      setMetrics([
        { id: 'spaces', label: 'Spaces', value: String(spaces.length), icon: LayoutGrid },
        { id: 'waiting', label: 'Waiting on you', value: String(waiting.length), icon: Activity },
        {
          id: 'automations',
          label: 'Automations (24h)',
          value: String(recentAutomations.length),
          icon: Zap,
        },
        {
          id: 'conversations',
          label: 'Active conversations',
          value: String(activeConversations.length),
          icon: MessageSquare,
        },
        ...(activeOrgId
          ? [
              {
                id: 'members',
                label: 'Team members',
                value: String(members.length),
                icon: Activity,
              },
            ]
          : []),
      ])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, scope.campaignId, scope.feedScope, scope.orgId])

  useEffect(() => {
    void reload()
  }, [reload])

  const gridMetrics = useMemo(() => metrics, [metrics])

  return (
    <div className="group/home-feed-head section-card card-elevated flex h-[420px] min-w-0 flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Activity className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
          <span className="body-2 text-foreground font-medium">Org pulse</span>
        </div>
        <HomeFeedScopeHoverReveal>
          <HomeFeedScopePicker variant="org_pulse" scope={scope} onChange={updateScope} />
        </HomeFeedScopeHoverReveal>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb state="processing" size="sm" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {gridMetrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div
                  key={metric.id}
                  className="card-glass flex flex-col gap-1 rounded-xl border px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="typo-caption text-muted-foreground">{metric.label}</span>
                  </div>
                  <span className="title-h3 text-foreground font-semibold tabular-nums">
                    {metric.value}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
