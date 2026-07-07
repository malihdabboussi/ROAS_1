'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import type {
  TeamOverviewAgent,
  TeamOverviewAgentWindow,
  TeamOverviewPayload,
} from '../../services/team-overview.service'
import { AgentAvatar, CardHeader, CardShell, EmptyHint, Legend } from './TeamOverviewShared'
import { pct, ROLE } from './team-overview-utils'

export function WorkloadByAgentCard({
  agents,
  perAgent,
}: {
  agents: TeamOverviewAgent[]
  perAgent: TeamOverviewAgentWindow[]
}) {
  const byKey = new Map(perAgent.map((p) => [p.agent_key, p]))
  const rows = agents
    .map((a) => {
      const w = byKey.get(a.agent_key) ?? {
        agent_key: a.agent_key,
        completed: 0,
        failed: 0,
        live_active: 0,
        live_blocked: 0,
      }
      return { agent: a, ...w }
    })
    .sort((a, b) => b.completed + b.live_active - (a.completed + a.live_active))
  const max = Math.max(1, ...rows.map((r) => r.completed + r.live_active + r.failed))

  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="Workload by agent"
        info="Per agent in the selected window: Done = missions completed, Live = missions currently in flight, Failed = missions that errored. Bar widths are proportional to the busiest agent. Click a row to jump into that agent."
      />
      {rows.length === 0 ? (
        <EmptyHint>No agents in this team yet.</EmptyHint>
      ) : (
        <div className="gap-spacing-2 flex flex-col">
          {rows.map((r) => (
            <Link
              key={r.agent_key}
              href={`/team?agent=${encodeURIComponent(r.agent_key)}`}
              className="hover:bg-hover-subtle gap-spacing-3 rounded-spacing-2 px-spacing-2 py-spacing-1 grid grid-cols-[180px_minmax(0,1fr)_160px] items-center transition-colors"
            >
              <span className="gap-spacing-2 flex min-w-0 items-center">
                <AgentAvatar agent={r.agent} size="md" />
                <span className="flex min-w-0 flex-col">
                  <span className="body-3 text-foreground truncate font-medium">
                    {r.agent.name}
                  </span>
                  <span className="body-4 text-muted-foreground capitalize">{r.agent.status}</span>
                </span>
              </span>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-hover-subtle)]">
                {r.completed > 0 ? (
                  <span
                    className={cn('h-full', 'bar-glass-green')}
                    style={{
                      width: `${pct(r.completed, max)}%`,
                    }}
                  />
                ) : null}
                {r.live_active > 0 ? (
                  <span
                    className={cn('h-full', 'bar-glass-blue')}
                    style={{
                      width: `${pct(r.live_active, max)}%`,
                    }}
                  />
                ) : null}
                {r.failed > 0 ? (
                  <span
                    className={cn('h-full', 'bar-glass-red')}
                    style={{
                      width: `${pct(r.failed, max)}%`,
                    }}
                  />
                ) : null}
              </div>
              <div className="grid shrink-0 grid-cols-3 items-center justify-items-end">
                <Stat label="done" value={r.completed} color={ROLE.done} />
                <Stat label="live" value={r.live_active} color={ROLE.active} />
                <Stat
                  label="fail"
                  value={r.failed}
                  color={r.failed > 0 ? ROLE.failed : ROLE.muted}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="gap-spacing-3 flex items-center justify-end">
        <Legend indicatorClass="indicator-dot-glass-green" label="Done" />
        <Legend indicatorClass="indicator-dot-glass-blue" label="Live" />
        <Legend indicatorClass="indicator-dot-glass-red" label="Failed" />
      </div>
    </CardShell>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="gap-spacing-1 flex items-baseline justify-end">
      <span className="body-3 w-4 text-right font-medium tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="body-4 text-muted-foreground">{label}</span>
    </span>
  )
}

export function CoverageByCampaignCard({
  rows,
}: {
  rows: TeamOverviewPayload['coverage']['by_campaign']
}) {
  const max = Math.max(1, ...rows.map((r) => r.completed))
  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="By campaign"
        info="Missions completed in the selected window, grouped by the campaign they belong to. Top 8 campaigns shown."
      />
      {rows.length === 0 ? (
        <EmptyHint>No campaign-tagged work in this window.</EmptyHint>
      ) : (
        <div className="gap-spacing-2 flex flex-col">
          {rows.map((r) => (
            <div key={r.id} className="gap-spacing-3 flex items-center">
              <span className="body-3 text-foreground min-w-0 flex-1 truncate">{r.name}</span>
              <div className="flex h-2 w-32 overflow-hidden rounded-full bg-[var(--color-hover-subtle)]">
                <span
                  className={cn('h-full', 'bar-glass-blue')}
                  style={{
                    width: `${pct(r.completed, max)}%`,
                  }}
                />
              </div>
              <span className="body-3 text-foreground w-8 text-right tabular-nums">
                {r.completed}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  )
}

export function CoverageByChannelCard({ rows }: { rows: TeamOverviewPayload['coverage']['by_channel'] }) {
  const max = Math.max(1, ...rows.map((r) => r.posts))
  return (
    <CardShell className="gap-spacing-3">
      <CardHeader
        label="By channel"
        info="Messages posted by team agents in the selected window, grouped by channel. Top 8 channels shown."
      />
      {rows.length === 0 ? (
        <EmptyHint>No channel posts in this window.</EmptyHint>
      ) : (
        <div className="gap-spacing-2 flex flex-col">
          {rows.map((r) => (
            <div key={r.id} className="gap-spacing-3 flex items-center">
              <span className="body-3 text-foreground min-w-0 flex-1 truncate">#{r.name}</span>
              <div className="flex h-2 w-32 overflow-hidden rounded-full bg-[var(--color-hover-subtle)]">
                <span
                  className={cn('h-full', 'bar-glass-purple')}
                  style={{
                    width: `${pct(r.posts, max)}%`,
                  }}
                />
              </div>
              <span className="body-3 text-foreground w-8 text-right tabular-nums">{r.posts}</span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  )
}
