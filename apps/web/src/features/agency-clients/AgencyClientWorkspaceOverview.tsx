'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Check,
  ChevronRight,
  Circle,
  ExternalLink,
  FolderOpen,
  Hash,
  Link2,
  ListTodo,
  MessageSquare,
  Settings2,
} from 'lucide-react'
import type { AgencyClientWorkspace } from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'

type JourneyItem = {
  id: string
  label: string
  sublabel: string
  complete: boolean
  inProgress?: boolean
  href: string
}

export function AgencyClientWorkspaceOverview({
  campaignId,
  workspace,
  onOpenTasks,
}: {
  campaignId: string
  workspace: AgencyClientWorkspace
  onOpenTasks: () => void
}) {
  const client = workspace.client
  const journey = buildJourney(client, campaignId)
  const completedCount = journey.filter((item) => item.complete).length
  const complete = completedCount === journey.length
  const [journeyOpen, setJourneyOpen] = useState(!complete)
  const openTasks = workspace.tasks.filter(
    (row) => !isClosed(String(row.status || row.clickup_status)),
  )

  return (
    <div className="gap-spacing-5 flex flex-col pb-8">
      <section className="surface-card rounded-spacing-3 border-border overflow-hidden border">
        <button
          type="button"
          aria-expanded={journeyOpen}
          onClick={() => setJourneyOpen((current) => !current)}
          className="hover:bg-hover-subtle gap-spacing-3 px-spacing-4 py-spacing-3 flex w-full items-center text-left"
        >
          <ChevronRight
            className={cn(
              'icon-sm text-muted-foreground transition-transform',
              journeyOpen && 'rotate-90',
            )}
          />
          <span
            className={cn(
              'h-spacing-9 w-spacing-9 border-border body-4 flex shrink-0 items-center justify-center rounded-full border font-semibold',
              complete ? 'text-success' : 'text-primary',
            )}
          >
            {completedCount}/{journey.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="body-2 text-foreground block font-semibold">Onboarding journey</span>
            <span className="body-4 text-muted-foreground block truncate">
              {completedCount} of {journey.length} complete
              {!complete ? ` · ${journey.find((item) => !item.complete)?.label} next` : ''}
            </span>
          </span>
          <span
            className={cn(
              'body-4 px-spacing-2 py-spacing-1 rounded-full',
              complete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary',
            )}
          >
            {complete ? 'Complete' : 'In progress'}
          </span>
        </button>
        {journeyOpen ? (
          <div className="gap-spacing-2 px-spacing-4 pb-spacing-4 grid md:grid-cols-2">
            {journey.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'rounded-spacing-2 border-border hover:bg-hover-subtle gap-spacing-3 p-spacing-3 flex items-start border',
                  item.complete && 'bg-success/10 border-success/30',
                  item.inProgress && !item.complete && 'bg-warning/10 border-warning/30',
                )}
              >
                <span
                  className={cn(
                    'h-spacing-5 w-spacing-5 mt-spacing-1 border-border flex shrink-0 items-center justify-center rounded-full border',
                    item.complete && 'bg-success text-foreground border-success',
                    item.inProgress && !item.complete && 'border-warning',
                  )}
                >
                  {item.complete ? <Check className="icon-xs" /> : <Circle className="icon-xs" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="body-3 text-foreground block font-medium">{item.label}</span>
                  <span className="body-4 text-muted-foreground mt-spacing-1 block">
                    {item.sublabel}
                  </span>
                </span>
                <ExternalLink className="icon-xs text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <div className="gap-spacing-4 grid lg:grid-cols-3">
        <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border lg:col-span-2">
          <h2 className="body-2 text-foreground font-semibold">Client snapshot</h2>
          <p className="body-2 text-muted-foreground mt-spacing-3 whitespace-pre-wrap">
            {String(
              client.overview ||
                client.ai_summary ||
                client.describe_what_you_do ||
                'No client summary is available yet.',
            )}
          </p>
          <dl className="mt-spacing-5 gap-spacing-4 grid sm:grid-cols-2">
            <SnapshotItem label="What they sell" value={client.what_do_you_sell} />
            <SnapshotItem label="Ideal client" value={client.ideal_client} />
            <SnapshotItem label="Desired outcome" value={client.desired_outcome} />
            <SnapshotItem label="Success looks like" value={client.success_look} />
          </dl>
        </section>

        <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
          <div className="gap-spacing-2 flex items-center">
            <Settings2 className="icon-sm text-muted-foreground" />
            <h2 className="body-2 text-foreground font-semibold">Operations</h2>
          </div>
          <div className="mt-spacing-4 gap-spacing-2 flex flex-col">
            <OperationLink href={client.slack_channel_url} icon={Hash} label="Slack channel" />
            <OperationLink href={client.drive_link} icon={FolderOpen} label="Google Drive" />
            <OperationLink
              href={client.clickup_url}
              icon={ListTodo}
              label="ClickUp project tracker"
            />
            <OperationLink href={client.website_url} icon={Link2} label="Client website" />
            <Link
              href={portalHref(campaignId, client.id, `/clients/${client.id}`)}
              className="button-compact button-glass-neutral justify-start"
            >
              <Settings2 className="icon-sm" /> Access, credentials & resources
            </Link>
          </div>
        </section>
      </div>

      <div className="gap-spacing-4 grid lg:grid-cols-2">
        <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
          <div className="flex items-center justify-between">
            <h2 className="body-2 text-foreground font-semibold">Current work</h2>
            <button type="button" onClick={onOpenTasks} className="body-3 text-primary">
              View all
            </button>
          </div>
          <div className="mt-spacing-3 gap-spacing-2 flex flex-col">
            {openTasks.length ? (
              openTasks.slice(0, 5).map((task) => (
                <div
                  key={String(task.id)}
                  className="rounded-spacing-2 border-border px-spacing-3 py-spacing-2 flex items-center border"
                >
                  <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                    {String(task.title || task.task_description || 'Untitled task')}
                  </span>
                  <span className="body-4 text-muted-foreground capitalize">
                    {String(task.status || task.clickup_status || 'Open')}
                  </span>
                </div>
              ))
            ) : (
              <p className="body-3 text-muted-foreground">No open tasks.</p>
            )}
          </div>
        </section>

        <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
          <div className="gap-spacing-2 flex items-center">
            <MessageSquare className="icon-sm text-muted-foreground" />
            <h2 className="body-2 text-foreground font-semibold">Recent conversations</h2>
          </div>
          <p className="body-3 text-muted-foreground mt-spacing-3 line-clamp-3">
            {client.latest_slack_message ||
              'Client and Campaign Space conversations will appear here as they are linked.'}
          </p>
          <Link
            href={`/chat?campaign=${encodeURIComponent(campaignId)}`}
            className="button-compact button-glass-neutral mt-spacing-4"
          >
            Open client conversations
          </Link>
        </section>
      </div>
    </div>
  )
}

function buildJourney(client: AgencyClientWorkspace['client'], campaignId: string): JourneyItem[] {
  const portalClientPath = `/clients/${client.id}`
  const clientHref = portalHref(campaignId, client.id, portalClientPath)
  const formHref = portalHref(campaignId, client.id, `${portalClientPath}/info?view=form-responses`)
  const clickupHref = portalHref(campaignId, client.id, `${portalClientPath}/info?view=clickup`)
  const onboardingHref = portalHref(campaignId, client.id, `${portalClientPath}/onboarding`)
  const ghlComplete =
    client.ghl_not_needed === true ||
    (client.ghl_access_granted === true &&
      Boolean(client.ghl_account_status) &&
      client.ghl_a2p_status === 'verified')
  const formStarted = Boolean(client.form_submitted_at)
  const clickupStarted = Boolean(client.clickup_task_id)
  const slackStarted = Boolean(client.slack_channel_url)
  const ghlStarted = Boolean(client.ghl_access_granted || client.ghl_account_status)
  return [
    {
      id: 'form_and_ai',
      label: 'Client Data & AI',
      sublabel:
        client.form_submitted_at && client.has_ai_analysis
          ? 'Form submitted & AI analyzed'
          : formStarted
            ? 'Run AI analysis'
            : 'Pending form submission',
      complete: Boolean(client.form_submitted_at && client.has_ai_analysis),
      inProgress: formStarted && !client.has_ai_analysis,
      href: formHref,
    },
    {
      id: 'clickup',
      label: 'ClickUp',
      sublabel:
        client.clickup_task_id && client.project_tracker_list_id
          ? 'Open in ClickUp'
          : clickupStarted
            ? 'Link project tracker'
            : 'Connect to ClickUp',
      complete: Boolean(client.clickup_task_id && client.project_tracker_list_id),
      inProgress: clickupStarted && !client.project_tracker_list_id,
      href: clickupHref,
    },
    {
      id: 'drive',
      label: 'Google Drive',
      sublabel: client.drive_link ? 'Drive linked' : 'Link client Drive folder',
      complete: Boolean(client.drive_link),
      href: client.drive_link || clientHref,
    },
    {
      id: 'slack',
      label: 'Slack Channel',
      sublabel: client.slack_channel_url ? 'Open Slack channel' : 'Create or link Slack channel',
      complete: Boolean(
        client.slack_channel_url && client.slack_invite_status !== 'needs_guest_invite',
      ),
      inProgress: slackStarted && client.slack_invite_status === 'needs_guest_invite',
      href: clientHref,
    },
    {
      id: 'ghl',
      label: 'LeadConnector Setup',
      sublabel: ghlComplete
        ? 'Fully configured'
        : ghlStarted
          ? 'A2P verification pending'
          : 'Complete account, access and A2P setup',
      complete: ghlComplete,
      inProgress: ghlStarted && !ghlComplete,
      href: clientHref,
    },
    {
      id: 'onboarding_call',
      label: 'Onboarding Call',
      sublabel: client.onboarding_call_completed_at
        ? 'Onboarding call completed'
        : 'Schedule or complete onboarding call',
      complete: Boolean(client.onboarding_call_completed_at),
      href: onboardingHref,
    },
  ]
}

function SnapshotItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="body-4 text-muted-foreground">{label}</dt>
      <dd className="body-3 text-foreground mt-spacing-1">
        {typeof value === 'string' && value.trim() ? value : 'Not added yet'}
      </dd>
    </div>
  )
}

function OperationLink({
  href,
  icon: Icon,
  label,
}: {
  href: unknown
  icon: typeof FolderOpen
  label: string
}) {
  if (typeof href !== 'string' || !href) {
    return (
      <span className="button-compact button-glass-neutral text-muted-foreground justify-start opacity-50">
        <Icon className="icon-sm" /> {label} not linked
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="button-compact button-glass-neutral justify-start"
    >
      <Icon className="icon-sm" /> {label}
      <ExternalLink className="icon-xs ml-auto" />
    </a>
  )
}

function portalHref(campaignId: string, clientId: string, portalPath: string) {
  const params = new URLSearchParams({
    client: clientId,
    surface: 'portal',
    portal_path: portalPath,
  })
  return `/campaigns/${encodeURIComponent(campaignId)}?${params}`
}

function isClosed(status: string) {
  return ['done', 'complete', 'completed', 'closed', 'cancelled', 'canceled', 'shipped'].includes(
    status.toLowerCase(),
  )
}
