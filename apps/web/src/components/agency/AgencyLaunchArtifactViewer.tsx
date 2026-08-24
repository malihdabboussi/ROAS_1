'use client'

import Link from 'next/link'
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Flag,
  FolderKanban,
  Rocket,
  UserRound,
} from 'lucide-react'
import { ShellArtifactViewerPanel } from '@/components/shell/ShellArtifactViewerPanel'
import type { AgencyLaunch } from '@/lib/agency-clients'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'

export function AgencyLaunchArtifactViewer({ target }: { target: ShellArtifactViewerTarget }) {
  const launch = parseLaunch(target.content)
  if (!launch) return null

  const spaceHref = launch.roas_space_id
    ? `/spaces?space=${encodeURIComponent(launch.roas_space_id)}`
    : null

  return (
    <ShellArtifactViewerPanel target={target} titleVariant="plain" showOpenTargets={false}>
      <div className="gap-spacing-5 p-spacing-5 flex flex-col">
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <span className="body-4 bg-primary/10 text-primary px-spacing-2 py-spacing-1 inline-flex rounded-full capitalize">
            {readable(launch.kind)}
          </span>
          {launch.campaign_status ? (
            <span className="body-4 bg-secondary text-muted-foreground px-spacing-2 py-spacing-1 inline-flex rounded-full capitalize">
              {readable(launch.campaign_status)}
            </span>
          ) : null}
        </div>

        <section className="surface-card rounded-spacing-3 border-border overflow-hidden border">
          <DetailRow icon={CalendarDays} label="Date" value={formatDate(launch.day_key)} />
          <DetailRow icon={Clock3} label="Time" value={formatLaunchTime(launch)} />
          <DetailRow icon={UserRound} label="Client" value={launch.client_name || 'Client'} />
          <DetailRow
            icon={FolderKanban}
            label="Campaign"
            value={launch.campaign_name || 'Not linked'}
          />
          <DetailRow icon={Flag} label="Owner" value={launch.assignee_name || 'Unassigned'} />
          <DetailRow
            icon={CircleDollarSign}
            label="Type"
            value={launch.campaign_type ? readable(launch.campaign_type) : 'Campaign'}
          />
        </section>

        {spaceHref ? (
          <Link href={spaceHref} className="button-primary gap-spacing-2 justify-center">
            <Rocket className="icon-sm" /> Open campaign workspace
          </Link>
        ) : null}

        <p className="body-4 text-muted-foreground">
          This calendar item is sourced live from Page Grader. Campaign dates and status changes
          stay connected to the same Page Grader campaign.
        </p>
      </div>
    </ShellArtifactViewerPanel>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
}) {
  return (
    <div className="border-border gap-spacing-3 px-spacing-4 py-spacing-3 flex items-start border-b last:border-b-0">
      <Icon className="icon-sm text-primary mt-spacing-1 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="body-4 text-muted-foreground">{label}</p>
        <p className="body-3 text-foreground break-words font-medium">{value}</p>
      </div>
    </div>
  )
}

function parseLaunch(content?: string | null): AgencyLaunch | null {
  if (!content) return null
  try {
    const value = JSON.parse(content) as AgencyLaunch
    return value && typeof value.id === 'string' && typeof value.day_key === 'string' ? value : null
  } catch {
    return null
  }
}

function readable(value: string) {
  return value.replace(/[_-]/g, ' ').toLowerCase()
}

function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatLaunchTime(item: AgencyLaunch): string {
  if (typeof item.event_time === 'string' && item.event_time.trim()) return item.event_time
  if (typeof item.starts_at === 'string' && item.starts_at) {
    const date = new Date(item.starts_at)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
  }
  return 'Not set'
}
