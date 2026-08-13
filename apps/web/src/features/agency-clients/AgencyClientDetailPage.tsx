'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchAgencyClient,
  updateAgencyWorkspaceEntity,
  type AgencyClientWorkspace,
} from '@/lib/agency-clients'
import { cn } from '@/lib/utils/cn'
import type { CampaignPatch } from './AgencyCampaignEditPanel'
import { AgencyClientCampaignsPanel } from './AgencyClientCampaignsPanel'
import { AgencyClientEditPanel } from './AgencyClientEditPanel'
import { AgencyClientWorkRows } from './AgencyClientWorkRows'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

type Tab = 'overview' | 'campaigns' | 'tasks' | 'requests'

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === 'string' ? row[key] : ''
}

function isClosed(status: string) {
  return [
    'done',
    'complete',
    'completed',
    'closed',
    'cancelled',
    'canceled',
    'shipped',
    'complete / live',
  ].includes(status.toLowerCase())
}

export function AgencyClientDetailPage({ clientId }: { clientId: string }) {
  const [workspace, setWorkspace] = useState<AgencyClientWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingClient, setEditingClient] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    void fetchAgencyClient(clientId)
      .then(setWorkspace)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.LOAD_CLIENT_ERROR,
        ),
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
      setError(
        reason instanceof Error
          ? reason.message
          : kind === 'task'
            ? AGENCY_CLIENT_MESSAGES.UPDATE_TASK_ERROR
            : AGENCY_CLIENT_MESSAGES.UPDATE_REQUEST_ERROR,
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const updateClient = async (patch: Record<string, unknown>) => {
    setUpdatingId(clientId)
    setError(null)
    setSavedMessage(null)
    try {
      await updateAgencyWorkspaceEntity(clientId, { kind: 'client', patch })
      const refreshed = await fetchAgencyClient(clientId)
      setWorkspace(refreshed)
      setEditingClient(false)
      setSavedMessage(AGENCY_CLIENT_MESSAGES.SAVED)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.UPDATE_CLIENT_ERROR,
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const updateCampaign = async (campaignId: string, patch: CampaignPatch) => {
    setUpdatingId(campaignId)
    setError(null)
    setSavedMessage(null)
    try {
      await updateAgencyWorkspaceEntity(clientId, {
        kind: 'campaign',
        entity_id: campaignId,
        patch,
      })
      const refreshed = await fetchAgencyClient(clientId)
      setWorkspace(refreshed)
      setEditingCampaignId(null)
      setSavedMessage(AGENCY_CLIENT_MESSAGES.SAVED)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.UPDATE_CAMPAIGN_ERROR,
      )
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
            <h1 className="title-h6 text-foreground">
              {(client.display_name || client.name).toUpperCase()}
            </h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {[client.industry, client.account_manager?.name].filter(Boolean).join(' · ') ||
                'Agency client'}
            </p>
          </div>
          <div className="gap-spacing-2 flex">
            <button
              aria-label="Edit client"
              type="button"
              onClick={() => setEditingClient((current) => !current)}
              className="button-compact button-glass-neutral"
            >
              <Pencil className="icon-sm" /> {AGENCY_CLIENT_MESSAGES.EDIT}
            </button>
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

      {error ? (
        <p className="surface-card body-2 text-destructive rounded-spacing-3 p-spacing-4">
          {error}
        </p>
      ) : null}
      {savedMessage ? (
        <p className="surface-card body-3 text-success rounded-spacing-3 p-spacing-4">
          {savedMessage}
        </p>
      ) : null}
      {editingClient ? (
        <AgencyClientEditPanel
          client={client}
          saving={updatingId === clientId}
          onCancel={() => setEditingClient(false)}
          onSave={updateClient}
        />
      ) : null}

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
        <AgencyClientCampaignsPanel
          campaigns={workspace.campaigns}
          spaceByCampaign={spaceByCampaign}
          editingCampaignId={editingCampaignId}
          updatingId={updatingId}
          onEdit={setEditingCampaignId}
          onCancel={() => setEditingCampaignId(null)}
          onSave={updateCampaign}
        />
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
