'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, FolderKanban } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchAgencyClient,
  updateAgencyWorkspaceEntity,
  type AgencyClientWorkspace,
} from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import { AgencyClientWorkRows } from './AgencyClientWorkRows'

type Tab = 'overview' | 'campaigns' | 'tasks' | 'requests'

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === 'string' ? row[key] : ''
}

function isClosed(status: string) {
  return ['done', 'complete', 'completed', 'closed', 'cancelled', 'canceled', 'shipped'].includes(
    status.toLowerCase(),
  )
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return 'No date'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AgencyClientDetailPage({ clientId }: { clientId: string }) {
  const [workspace, setWorkspace] = useState<AgencyClientWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchAgencyClient(clientId)
      .then(setWorkspace)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Could not load client'),
      )
      .finally(() => setLoading(false))
  }, [clientId])

  const openTasks = useMemo(
    () =>
      workspace?.tasks.filter(
        (row) => !isClosed(text(row, 'status') || text(row, 'clickup_status')),
      ) ?? [],
    [workspace],
  )
  const openRequests = useMemo(
    () => workspace?.requests.filter((row) => !isClosed(text(row, 'status'))) ?? [],
    [workspace],
  )
  const spaceByCampaign = useMemo(
    () =>
      new Map(
        workspace?.campaign_spaces.map((row) => [row.page_grader_campaign_id, row.space_id]) ?? [],
      ),
    [workspace],
  )

  const updateStatus = async (kind: 'task' | 'request', entityId: string, status: string) => {
    if (!workspace) return
    setUpdatingId(entityId)
    try {
      await updateAgencyWorkspaceEntity(clientId, {
        kind,
        entity_id: entityId,
        patch: { status },
      })
      setWorkspace((current) => {
        if (!current) return current
        const key = kind === 'task' ? 'tasks' : 'requests'
        return {
          ...current,
          [key]: current[key].map((row) =>
            String(row.id) === entityId ? { ...row, status } : row,
          ),
        }
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not update ${kind}`)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading)
    return (
      <main className="flex min-h-full items-center justify-center">
        <VibeyLoadingOrb />
      </main>
    )
  if (error || !workspace)
    return (
      <main className="p-spacing-8">
        <p className="surface-card body-2 text-destructive rounded-spacing-3 p-spacing-4">
          {error || 'Client not found'}
        </p>
      </main>
    )

  const client = workspace.client
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'campaigns', label: 'Campaigns', count: workspace.campaigns.length },
    { id: 'tasks', label: 'Tasks', count: openTasks.length },
    { id: 'requests', label: 'Requests', count: openRequests.length },
  ]

  return (
    <main className="gap-spacing-6 p-spacing-8 mx-auto flex w-full max-w-7xl flex-col">
      <header>
        <Link
          href="/clients"
          className="body-3 text-muted-foreground hover:text-foreground mb-spacing-4 gap-spacing-1 inline-flex items-center"
        >
          <ArrowLeft className="icon-sm" /> Clients
        </Link>
        <div className="gap-spacing-4 flex flex-wrap items-start justify-between">
          <div>
            <p className="typo-section-label text-muted-foreground">Client workspace</p>
            <h1 className="title-h6 text-foreground">{client.display_name || client.name}</h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {[client.industry, client.account_manager?.name].filter(Boolean).join(' · ') ||
                'Agency client'}
            </p>
          </div>
          <div className="gap-spacing-2 flex">
            {typeof client.drive_link === 'string' && client.drive_link ? (
              <a
                href={client.drive_link}
                target="_blank"
                rel="noreferrer"
                className="button-compact button-glass-neutral"
              >
                Drive <ExternalLink className="icon-sm" />
              </a>
            ) : null}
            {typeof client.website_url === 'string' && client.website_url ? (
              <a
                href={client.website_url}
                target="_blank"
                rel="noreferrer"
                className="button-compact button-glass-neutral"
              >
                Website <ExternalLink className="icon-sm" />
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="gap-spacing-1 border-border flex border-b" aria-label="Client sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'body-3 gap-spacing-2 px-spacing-3 py-spacing-3 flex items-center border-b-2',
              tab === item.id
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {item.label}
            {item.count != null ? (
              <span className="body-4 bg-secondary rounded-spacing-4 px-spacing-2">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <div className="gap-spacing-4 grid lg:grid-cols-3">
          <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border lg:col-span-2">
            <h2 className="body-2 text-foreground font-semibold">Account overview</h2>
            <p className="body-2 text-muted-foreground mt-spacing-3 whitespace-pre-wrap">
              {String(
                client.overview ||
                  client.ai_summary ||
                  client.describe_what_you_do ||
                  'No overview has been added yet.',
              )}
            </p>
            <div className="mt-spacing-5 gap-spacing-3 grid sm:grid-cols-3">
              <Metric
                label="Active campaigns"
                value={String(
                  workspace.campaigns.filter((row) => !isClosed(row.status || row.platform_status))
                    .length,
                )}
              />
              <Metric label="Open tasks" value={String(openTasks.length)} />
              <Metric label="Open requests" value={String(openRequests.length)} />
            </div>
          </section>
          <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
            <h2 className="body-2 text-foreground font-semibold">Client information</h2>
            <dl className="body-3 mt-spacing-3 space-y-spacing-3">
              <Info label="Pipeline stage" value={client.pipeline_stage || client.status} />
              <Info label="Account manager" value={client.account_manager?.name || 'Unassigned'} />
              <Info
                label="Contact"
                value={String(client.contact_name || client.email || 'Not provided')}
              />
              <Info label="Package" value={String(client.package_name || 'Not provided')} />
              <Info
                label="Onboarding"
                value={client.onboarding_completed ? 'Complete' : 'In progress'}
              />
            </dl>
          </section>
          <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="body-2 text-foreground font-semibold">Current priorities</h2>
              <button type="button" onClick={() => setTab('tasks')} className="body-3 text-primary">
                View all tasks
              </button>
            </div>
            <AgencyClientWorkRows
              rows={openTasks.slice(0, 5)}
              kind="task"
              updatingId={updatingId}
              onStatusChange={updateStatus}
            />
          </section>
        </div>
      ) : null}

      {tab === 'campaigns' ? (
        <div className="gap-spacing-3 grid md:grid-cols-2">
          {workspace.campaigns.map((campaign) => {
            const spaceId = spaceByCampaign.get(campaign.id)
            const body = (
              <>
                <div className="gap-spacing-3 flex items-start justify-between">
                  <div>
                    <h2 className="body-2 text-foreground font-semibold">{campaign.name}</h2>
                    <p className="body-4 text-muted-foreground capitalize">
                      {campaign.status || campaign.platform_status}
                    </p>
                  </div>
                  <FolderKanban className="icon-md text-muted-foreground" />
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-3 line-clamp-2">
                  {campaign.campaign_overview ||
                    campaign.description ||
                    campaign.next_action ||
                    'Campaign workspace'}
                </p>
                <div className="body-4 text-muted-foreground mt-spacing-4 gap-spacing-4 border-border pt-spacing-3 flex flex-wrap border-t">
                  <span>Event: {formatDate(campaign.event_date)}</span>
                  <span>
                    Budget:{' '}
                    {campaign.budget_amount != null
                      ? `${campaign.currency || '$'}${campaign.budget_amount.toLocaleString()}`
                      : 'Not set'}
                  </span>
                </div>
              </>
            )
            return spaceId ? (
              <Link
                key={campaign.id}
                href={`/spaces?space=${spaceId}`}
                className="surface-card hover:bg-hover-subtle rounded-spacing-3 border-border p-spacing-4 border"
              >
                {body}
              </Link>
            ) : (
              <article
                key={campaign.id}
                className="surface-card rounded-spacing-3 border-border p-spacing-4 border"
              >
                {body}
              </article>
            )
          })}
        </div>
      ) : null}

      {tab === 'tasks' ? (
        <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
          <AgencyClientWorkRows
            rows={workspace.tasks}
            kind="task"
            updatingId={updatingId}
            onStatusChange={updateStatus}
          />
        </section>
      ) : null}
      {tab === 'requests' ? (
        <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
          <AgencyClientWorkRows
            rows={workspace.requests}
            kind="request"
            updatingId={updatingId}
            onStatusChange={updateStatus}
          />
        </section>
      ) : null}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-spacing-2 p-spacing-3">
      <p className="title-h6 text-foreground">{value}</p>
      <p className="body-4 text-muted-foreground">{label}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="body-4 text-muted-foreground">{label}</dt>
      <dd className="text-foreground capitalize">{value}</dd>
    </div>
  )
}
