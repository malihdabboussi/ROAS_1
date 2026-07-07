'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getTeamSpending,
  type AgentTeamMember,
  type MissionAgent,
  type TeamSpendingResponse,
} from '@/lib/agents'
import { getAgentSpending } from '@/lib/billing/billing-api'
import type { AgentSpendingRow } from '@/lib/billing/billing.types'
import type { Mission } from '@/lib/missions'
import { getOrgHumanSpending } from '@/lib/org'
import {
  resolveReportingDates,
  type ReportingDateRangeInput,
} from '@/lib/reporting'
import { computePerAgentMetrics } from '../../lib/agent-team-metrics'
import {
  TeamAnalyticsBreakdownTables,
  type TeamAnalyticsHumanUsageRow,
} from './TeamAnalyticsBreakdownTables'
import { DailySpendChartCard, TeamSpendKpiCard } from './TeamAnalyticsSpendSummary'

interface TeamAnalyticsViewProps {
  teamId: string
  rangeConfig: ReportingDateRangeInput
  campaignFilterIds: string[]
  members: MissionAgent[]
  missions: Mission[]
  humanMembers: AgentTeamMember[]
  orgId: string | null
}

type HumanSpendingRow = Omit<TeamAnalyticsHumanUsageRow, 'hm'>

function startOfTodayIso(): string {
  return new Date().toISOString()
}

function toIsoStart(d: string | undefined): string | undefined {
  if (!d) return undefined
  return new Date(`${d}T00:00:00.000Z`).toISOString()
}

function toIsoEnd(d: string | undefined): string | undefined {
  if (!d) return undefined
  return new Date(`${d}T23:59:59.999Z`).toISOString()
}

export function TeamAnalyticsView({
  teamId,
  rangeConfig,
  campaignFilterIds,
  members,
  missions,
  humanMembers,
  orgId,
}: TeamAnalyticsViewProps) {
  const campaignKey = useMemo(() => [...campaignFilterIds].sort().join(','), [campaignFilterIds])
  const rows = useMemo(() => computePerAgentMetrics(members, missions), [members, missions])

  const { startDate, endDate } = useMemo(
    () => resolveReportingDates(rangeConfig),
    [rangeConfig.time_range, rangeConfig.custom_start, rangeConfig.custom_end],
  )

  const rangeIso = useMemo(
    () => ({
      startDate: toIsoStart(startDate) ?? new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: toIsoEnd(endDate) ?? startOfTodayIso(),
    }),
    [startDate, endDate],
  )

  const [teamSpending, setTeamSpending] = useState<TeamSpendingResponse | null>(null)
  const [teamSpendingLoading, setTeamSpendingLoading] = useState(true)
  const [teamSpendingError, setTeamSpendingError] = useState(false)

  const [spending, setSpending] = useState<AgentSpendingRow[]>([])
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageError, setUsageError] = useState(false)

  const [humanSpendByUserId, setHumanSpendByUserId] = useState<Map<string, HumanSpendingRow>>(
    new Map(),
  )
  const [humanUsageLoading, setHumanUsageLoading] = useState(true)
  const [humanUsageError, setHumanUsageError] = useState(false)

  // A failed fetch must render as a failure, never as $0 — zero is a data
  // claim the user will act on. Each fetch keeps its own error flag; retry
  // re-runs all of them.
  const [retryNonce, setRetryNonce] = useState(0)
  const retrySpendData = () => setRetryNonce((n) => n + 1)

  useEffect(() => {
    let cancelled = false
    setTeamSpendingLoading(true)
    setTeamSpendingError(false)
    void getTeamSpending(teamId, rangeIso.startDate, rangeIso.endDate, campaignFilterIds)
      .then((res) => {
        if (cancelled) return
        setTeamSpending(res)
      })
      .catch(() => {
        if (cancelled) return
        setTeamSpending(null)
        setTeamSpendingError(true)
      })
      .finally(() => {
        if (!cancelled) setTeamSpendingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamId, rangeIso.startDate, rangeIso.endDate, campaignKey, retryNonce])

  useEffect(() => {
    let cancelled = false
    setUsageLoading(true)
    setUsageError(false)
    void getAgentSpending({ ...rangeIso, campaignIds: campaignFilterIds })
      .then((res) => {
        if (cancelled) return
        const allowed = new Set(members.map((a) => a.agent_key))
        setSpending((res.agents ?? []).filter((r) => allowed.has(r.agentKey)))
      })
      .catch(() => {
        if (cancelled) return
        setSpending([])
        setUsageError(true)
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [members, rangeIso.startDate, rangeIso.endDate, campaignKey, retryNonce])

  useEffect(() => {
    let cancelled = false
    if (!orgId || humanMembers.length === 0) {
      setHumanSpendByUserId(new Map())
      setHumanUsageLoading(false)
      setHumanUsageError(false)
      return () => {
        cancelled = true
      }
    }
    setHumanUsageLoading(true)
    setHumanUsageError(false)
    const allowed = new Set(humanMembers.map((h) => h.user_id))
    void getOrgHumanSpending(orgId, rangeIso.startDate, rangeIso.endDate, campaignFilterIds)
      .then((res) => {
        if (cancelled) return
        const next = new Map<string, HumanSpendingRow>()
        for (const row of res.humans ?? []) {
          if (!row.userId || !allowed.has(row.userId)) continue
          next.set(row.userId, {
            credits: Number(row.credits ?? 0),
            costUsd: Number(row.costUsd ?? 0),
            lastActiveAt: row.lastActiveAt ?? null,
          })
        }
        setHumanSpendByUserId(next)
      })
      .catch(() => {
        if (cancelled) return
        setHumanSpendByUserId(new Map())
        setHumanUsageError(true)
      })
      .finally(() => {
        if (!cancelled) setHumanUsageLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [orgId, humanMembers, rangeIso.startDate, rangeIso.endDate, campaignKey, retryNonce])

  const humanRows = useMemo(() => {
    return humanMembers
      .map((hm) => {
        const spend = humanSpendByUserId.get(hm.user_id)
        return {
          hm,
          credits: spend?.credits ?? 0,
          costUsd: spend?.costUsd ?? 0,
          lastActiveAt: spend?.lastActiveAt ?? null,
        }
      })
      .sort((a, b) => b.credits - a.credits || a.hm.user_id.localeCompare(b.hm.user_id))
  }, [humanMembers, humanSpendByUserId])

  const spendingByAgentKey = useMemo(() => {
    const m = new Map<string, AgentSpendingRow>()
    for (const r of spending) m.set(r.agentKey, r)
    return m
  }, [spending])

  return (
    <div className="gap-spacing-4 flex flex-col">
      <div className="gap-spacing-3 grid grid-cols-1 lg:grid-cols-3">
        <TeamSpendKpiCard
          loading={teamSpendingLoading}
          error={teamSpendingError}
          onRetry={retrySpendData}
          totals={teamSpending?.totals ?? null}
          previousTotals={teamSpending?.previousTotals ?? null}
        />
        <DailySpendChartCard
          loading={teamSpendingLoading}
          error={teamSpendingError}
          onRetry={retrySpendData}
          daily={teamSpending?.daily ?? []}
          totalCostUsd={teamSpending?.totals.costUsd ?? 0}
        />
      </div>

      <TeamAnalyticsBreakdownTables
        rows={rows}
        spendingByAgentKey={spendingByAgentKey}
        usageLoading={usageLoading}
        usageError={usageError}
        humanRows={humanRows}
        humanMembersCount={humanMembers.length}
        humanUsageLoading={humanUsageLoading}
        humanUsageError={humanUsageError}
        onRetry={retrySpendData}
      />
    </div>
  )
}
