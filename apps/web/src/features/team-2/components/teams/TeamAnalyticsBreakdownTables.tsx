'use client'

import type { AgentTeamMember, MissionAgent } from '@/lib/agents'
import type { AgentSpendingRow } from '@/lib/billing/billing.types'
import type { TeamAgentMetricsRow } from '../../lib/agent-team-metrics'
import { SpendLoadError } from './TeamAnalyticsSpendSummary'
import { fmtNumber, fmtUsd, relativeTime } from './team-analytics-formatting'

export interface TeamAnalyticsHumanUsageRow {
  hm: AgentTeamMember
  credits: number
  costUsd: number
  lastActiveAt: string | null
}

interface TeamAnalyticsBreakdownTablesProps {
  rows: TeamAgentMetricsRow[]
  spendingByAgentKey: Map<string, AgentSpendingRow>
  usageLoading: boolean
  usageError: boolean
  humanRows: TeamAnalyticsHumanUsageRow[]
  humanMembersCount: number
  humanUsageLoading: boolean
  humanUsageError: boolean
  onRetry: () => void
}

function AgentAvatar({ agent }: { agent: MissionAgent }) {
  if (agent.image_url) {
    return (
      <img
        src={agent.image_url}
        alt=""
        className="h-spacing-7 w-spacing-7 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="bg-muted text-muted-foreground h-spacing-7 w-spacing-7 body-4 flex shrink-0 items-center justify-center rounded-full font-semibold">
      {(agent.name?.[0] ?? '?').toUpperCase()}
    </span>
  )
}

function TeamUsageColgroup() {
  return (
    <colgroup>
      <col />
      <col className="w-spacing-48" />
      <col className="w-28" />
      <col className="w-32" />
      <col className="w-36" />
    </colgroup>
  )
}

export function TeamAnalyticsBreakdownTables({
  rows,
  spendingByAgentKey,
  usageLoading,
  usageError,
  humanRows,
  humanMembersCount,
  humanUsageLoading,
  humanUsageError,
  onRetry,
}: TeamAnalyticsBreakdownTablesProps) {
  return (
    <>
      <section className="surface-card border-subtle rounded-spacing-3 overflow-hidden border">
        <header className="border-border px-spacing-4 py-spacing-2 flex items-center justify-between border-b">
          <h2 className="body-2 text-foreground font-semibold">Per-agent breakdown</h2>
          <div className="gap-spacing-3 flex items-center">
            {usageError && !usageLoading ? <SpendLoadError onRetry={onRetry} /> : null}
            <p className="body-4 text-muted-foreground">{rows.length} agents</p>
          </div>
        </header>
        <div className="px-spacing-4 pb-spacing-3 overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left">
            <TeamUsageColgroup />
            <thead>
              <tr>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 pr-spacing-2 border-b text-left align-middle font-semibold"
                >
                  Agent
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-3 py-spacing-3 border-b text-left align-middle font-semibold"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle font-semibold tabular-nums"
                >
                  Credits
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle font-semibold tabular-nums"
                >
                  Cost
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 pl-spacing-3 whitespace-nowrap border-b text-right align-middle font-semibold"
                >
                  Last active
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="body-4 text-muted-foreground/70 px-spacing-4 py-spacing-6 text-center align-middle"
                  >
                    No agents in this team.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const spend = spendingByAgentKey.get(row.agent.agent_key)
                  const credits = spend?.credits ?? 0
                  const costUsd = spend?.costUsd ?? 0
                  return (
                    <tr
                      key={row.agent.agent_key}
                      className="hover:bg-hover-subtle transition-colors"
                    >
                      <td className="border-border px-spacing-4 py-spacing-3 pr-spacing-2 border-b align-middle">
                        <div className="gap-spacing-3 flex min-w-0 items-center">
                          <AgentAvatar agent={row.agent} />
                          <p className="body-3 text-foreground min-w-0 truncate font-medium">
                            {row.agent.name}
                          </p>
                        </div>
                      </td>
                      <td className="body-3 text-foreground border-border px-spacing-3 py-spacing-3 max-w-0 border-b align-middle">
                        <span className="block truncate" title={row.agent.role ?? undefined}>
                          {row.agent.role?.trim() ? row.agent.role : '—'}
                        </span>
                      </td>
                      <td className="body-3 text-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle tabular-nums">
                        {usageLoading ? '…' : usageError ? '—' : fmtNumber(credits)}
                      </td>
                      <td className="body-3 text-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle tabular-nums">
                        {usageLoading ? '…' : usageError ? '—' : fmtUsd(costUsd)}
                      </td>
                      <td className="body-3 text-muted-foreground border-border px-spacing-4 py-spacing-3 pl-spacing-3 whitespace-nowrap border-b text-right align-middle">
                        {relativeTime(row.lastActiveAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card border-subtle rounded-spacing-3 overflow-hidden border">
        <header className="border-border px-spacing-4 py-spacing-2 flex items-center justify-between border-b">
          <h2 className="body-2 text-foreground font-semibold">Per-human breakdown</h2>
          <div className="gap-spacing-3 flex items-center">
            {humanUsageError && !humanUsageLoading ? <SpendLoadError onRetry={onRetry} /> : null}
            <p className="body-4 text-muted-foreground">{humanMembersCount} people</p>
          </div>
        </header>
        <div className="px-spacing-4 pb-spacing-3 overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-left">
            <TeamUsageColgroup />
            <thead>
              <tr>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 pr-spacing-2 border-b text-left align-middle font-semibold"
                >
                  Person
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-3 py-spacing-3 border-b text-left align-middle font-semibold"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle font-semibold tabular-nums"
                >
                  Credits
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle font-semibold tabular-nums"
                >
                  Cost
                </th>
                <th
                  scope="col"
                  className="body-4 text-muted-foreground border-border px-spacing-4 py-spacing-3 pl-spacing-3 whitespace-nowrap border-b text-right align-middle font-semibold"
                >
                  Last active
                </th>
              </tr>
            </thead>
            <tbody>
              {humanRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="body-4 text-muted-foreground/70 px-spacing-4 py-spacing-6 text-center align-middle"
                  >
                    No people on this team.
                  </td>
                </tr>
              ) : (
                humanRows.map(({ hm, credits, costUsd, lastActiveAt }) => {
                  const displayName =
                    (hm.full_name?.trim() ? hm.full_name : null) ??
                    (hm.email?.trim() ? hm.email : null) ??
                    'Teammate'
                  return (
                    <tr key={hm.user_id} className="hover:bg-hover-subtle transition-colors">
                      <td className="border-border px-spacing-4 py-spacing-3 pr-spacing-2 border-b align-middle">
                        <div className="gap-spacing-3 flex min-w-0 items-center">
                          {hm.avatar_url ? (
                            <img
                              src={hm.avatar_url}
                              alt=""
                              className="h-spacing-7 w-spacing-7 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="bg-muted text-muted-foreground h-spacing-7 w-spacing-7 body-4 flex shrink-0 items-center justify-center rounded-full font-semibold">
                              {(displayName[0] ?? '?').toUpperCase()}
                            </span>
                          )}
                          <p className="body-3 text-foreground min-w-0 truncate font-medium">
                            {displayName}
                          </p>
                        </div>
                      </td>
                      <td className="body-3 text-foreground border-border px-spacing-3 py-spacing-3 max-w-0 border-b align-middle">
                        <span className="block truncate" title={hm.role ?? undefined}>
                          {hm.role?.trim() ? hm.role : '—'}
                        </span>
                      </td>
                      <td className="body-3 text-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle tabular-nums">
                        {humanUsageLoading ? '…' : humanUsageError ? '—' : fmtNumber(credits)}
                      </td>
                      <td className="body-3 text-foreground border-border px-spacing-4 py-spacing-3 border-b text-right align-middle tabular-nums">
                        {humanUsageLoading ? '…' : humanUsageError ? '—' : fmtUsd(costUsd)}
                      </td>
                      <td className="body-3 text-muted-foreground border-border px-spacing-4 py-spacing-3 pl-spacing-3 whitespace-nowrap border-b text-right align-middle">
                        {humanUsageLoading
                          ? '…'
                          : humanUsageError
                            ? '—'
                            : relativeTime(lastActiveAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
