'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { FolderKanban, MoreHorizontal, PanelRightOpen, Plus, Search } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import {
  deleteAgencyClientCampaign,
  fetchAgencyClientCampaigns,
  fetchAgencyClients,
  updateAgencyWorkspaceEntity,
  visiblePipelineCampaigns,
  type AgencyClientCampaign,
  type PipelineClientLike,
} from '@/lib/agency-clients'
import { useChatStore } from '@/lib/chat/studio-chat-runtime-adapter'
import { useClientScope } from '@/lib/client-scope'
import { cn } from '@/lib/utils/cn'
import { formatAgencyDate } from './agency-client-format'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

type ViewMode = 'all' | 'client'

export function ClientCampaignsPage() {
  const router = useRouter()
  const { selectedClientId } = useClientScope()
  const [campaigns, setCampaigns] = useState<AgencyClientCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [clientCatalog, setClientCatalog] = useState<PipelineClientLike[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setCampaigns([])
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const [response, clients] = await Promise.all([
          fetchAgencyClientCampaigns(selectedClientId ?? undefined, false),
          fetchAgencyClients('', false).catch(() => ({ clients: [] as PipelineClientLike[] })),
        ])
        if (cancelled) return
        setCampaigns(response?.campaigns ?? [])
        setClientCatalog(clients?.clients ?? [])
        setLoading(false)

        // Show the Page Grader campaign inventory first, then refresh Space links as
        // the two-way ROAS mapping pass finishes.
        void fetchAgencyClientCampaigns(selectedClientId ?? undefined, true)
          .then((synced) => {
            if (!cancelled && synced?.campaigns) setCampaigns(synced.campaigns)
          })
          .catch(() => undefined)
      } catch (reason) {
        if (cancelled) return
        setError(
          reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.LOAD_CAMPAIGNS_ERROR,
        )
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [selectedClientId])

  const catalogById = useMemo(() => {
    const map = new Map<string, PipelineClientLike>()
    for (const client of clientCatalog) {
      if (client.id) map.set(client.id, client)
    }
    return map
  }, [clientCatalog])

  const filtered = useMemo(
    () =>
      visiblePipelineCampaigns(campaigns, {
        query,
        includeHidden: showInactive,
        catalogById,
      }),
    [campaigns, catalogById, query, showInactive],
  )
  const groups = useMemo(() => {
    if (view === 'all') return [['All campaigns', filtered] as const]
    const map = new Map<string, AgencyClientCampaign[]>()
    for (const campaign of filtered) {
      const name = campaign.clients?.friendly_name || campaign.clients?.name || 'Unknown client'
      map.set(name, [...(map.get(name) ?? []), campaign])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, view])

  const campaignHref = (campaign: AgencyClientCampaign) =>
    campaign.roas_space_id
      ? `/spaces?space=${encodeURIComponent(campaign.roas_space_id)}`
      : `/client-campaigns?surface=portal&portal_path=${encodeURIComponent(`/campaigns/${campaign.id}`)}`

  const patchCampaign = async (campaign: AgencyClientCampaign, patch: Record<string, unknown>) => {
    await updateAgencyWorkspaceEntity(campaign.client_id, {
      kind: 'campaign',
      entity_id: campaign.id,
      patch,
    })
    setCampaigns((rows) => rows.map((row) => (row.id === campaign.id ? { ...row, ...patch } : row)))
  }

  const openCampaignCreationChat = () => {
    const chat = useChatStore.getState()
    chat.setPendingComposerText(
      'Help me create a new client campaign. Start by asking me which client this is for, then work through the campaign details and required tasks with me.',
    )
    chat.setWantsNewConversation(true)
    router.push('/home')
  }

  return (
    <main className="gap-spacing-6 p-spacing-8 mx-auto flex w-full max-w-7xl flex-col">
      <h1 className="sr-only">CLIENT CAMPAIGNS</h1>
      <AgencyWorkspaceBreadcrumb
        items={[{ href: '/clients', label: 'Clients' }, { label: 'Client Campaigns' }]}
        action={
          <Link
            href="/client-campaigns?surface=portal&portal_path=/campaigns"
            className="button-compact button-glass-purple"
          >
            <PanelRightOpen className="icon-sm" /> Portal
          </Link>
        }
      />
      <div
        role="group"
        aria-label="Campaign controls"
        className="surface-card gap-spacing-2 rounded-spacing-3 border-border p-spacing-3 flex flex-wrap items-center border"
      >
        <label className="relative min-w-64 flex-1">
          <Search className="icon-sm text-muted-foreground left-spacing-3 absolute top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search campaigns or clients"
            className="h-spacing-9 body-3 bg-secondary text-foreground rounded-spacing-2 border-border pl-spacing-8 pr-spacing-3 focus:ring-primary w-full border outline-none focus:ring-1"
          />
        </label>
        <div className="rounded-spacing-2 border-border p-spacing-1 flex border">
          {(['all', 'client'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'button-compact rounded-spacing-1 px-spacing-3',
                view === mode ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
              )}
            >
              {mode === 'all' ? 'All Campaigns' : 'Campaigns by Client'}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={showInactive}
          onClick={() => setShowInactive((current) => !current)}
          className={cn(
            'button-compact rounded-spacing-2 border-border px-spacing-3 border',
            showInactive ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
          )}
        >
          {AGENCY_CLIENT_MESSAGES.SHOW_INACTIVE}
        </button>
        <button
          type="button"
          onClick={openCampaignCreationChat}
          className="button-primary gap-spacing-2"
        >
          <Plus className="icon-sm" /> New campaign
        </button>
      </div>
      {loading ? <ListSkeleton rows={8} label={AGENCY_CLIENT_MESSAGES.LOADING_CAMPAIGNS} /> : null}
      {error ? <p className="body-2 text-destructive">{error}</p> : null}
      {!loading && !error && filtered.length === 0 ? (
        <p className="body-2 text-muted-foreground surface-card rounded-spacing-3 p-spacing-4">
          {AGENCY_CLIENT_MESSAGES.NO_VISIBLE_CAMPAIGNS}
        </p>
      ) : null}
      {!loading && !error && filtered.length > 0
        ? groups.map(([label, rows]) => (
            <section key={label} className="gap-spacing-3 flex flex-col">
              <div className="gap-spacing-2 flex items-center">
                <FolderKanban className="icon-sm text-muted-foreground" />
                <h2 className="body-2 text-foreground font-semibold">{label}</h2>
                <span className="body-4 text-muted-foreground">{rows.length}</span>
              </div>
              <div className="surface-card rounded-spacing-3 border-border overflow-hidden border">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="body-4 text-muted-foreground border-border bg-secondary whitespace-nowrap border-b text-left">
                        <th className="px-spacing-4 py-spacing-3 font-medium">Stage</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Date Created</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Client Name</th>
                        <th className="px-spacing-4 py-spacing-3 w-full min-w-64 font-medium">
                          Campaign Name
                        </th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Type</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Owner</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Launch Day</th>
                        <th className="px-spacing-4 py-spacing-3 font-medium">Created By</th>
                        <th className="px-spacing-4 py-spacing-3 text-right font-medium">
                          Options
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((campaign) => {
                        const clientName =
                          campaign.clients?.friendly_name || campaign.clients?.name || 'Client'
                        return (
                          <tr
                            key={campaign.id}
                            onClick={() => router.push(campaignHref(campaign))}
                            className="hover:bg-hover-subtle border-border cursor-pointer border-b last:border-b-0"
                          >
                            <td className="px-spacing-4 py-spacing-3 align-top">
                              <select
                                value={campaign.status || campaign.platform_status || 'planning'}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  void patchCampaign(campaign, { status: event.target.value })
                                }
                                className="body-4 bg-secondary text-muted-foreground rounded-spacing-4 border-border px-spacing-2 py-spacing-1 max-w-40 border capitalize"
                                aria-label={`Update status for ${campaign.name}`}
                              >
                                {campaignStatusOptions(campaign).map((status) => (
                                  <option key={status} value={status}>
                                    {readable(status)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {formatAgencyDate(String(campaign.created_at || ''))}
                            </td>
                            <td className="px-spacing-4 py-spacing-3 align-top">
                              <span className="gap-spacing-2 flex min-w-40 items-center">
                                <span className="bg-secondary h-spacing-7 w-spacing-7 rounded-spacing-2 flex shrink-0 items-center justify-center overflow-hidden">
                                  {campaign.clients?.logo_url ||
                                  campaign.clients?.brand_logo_url ? (
                                    <Image
                                      src={
                                        campaign.clients.logo_url ||
                                        campaign.clients.brand_logo_url ||
                                        ''
                                      }
                                      alt=""
                                      width={28}
                                      height={28}
                                      unoptimized
                                      className="h-spacing-7 w-spacing-7 object-cover"
                                    />
                                  ) : (
                                    <span className="body-4 font-semibold">
                                      {clientName.slice(0, 1)}
                                    </span>
                                  )}
                                </span>
                                <span className="body-3 text-muted-foreground whitespace-nowrap">
                                  {clientName}
                                </span>
                              </span>
                            </td>
                            <td className="px-spacing-4 py-spacing-3 align-top">
                              <span className="body-3 text-foreground font-medium">
                                {campaign.name}
                              </span>
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top capitalize">
                              {readable(String(campaign.campaign_type || 'Not set'))}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {campaign.clients?.assignee_name ||
                                campaign.clients?.assignee_email ||
                                'Unassigned'}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {formatAgencyDate(campaign.start_date)}
                            </td>
                            <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                              {String(campaign.created_by_name || 'Portal')}
                            </td>
                            <td className="px-spacing-4 py-spacing-3 align-top">
                              <div
                                className="relative flex justify-end"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="btn-icon-bare"
                                  aria-label={`Options for ${campaign.name}`}
                                  onClick={() =>
                                    setOpenMenuId((current) =>
                                      current === campaign.id ? null : campaign.id,
                                    )
                                  }
                                >
                                  <MoreHorizontal className="icon-sm" />
                                </button>
                                {openMenuId === campaign.id ? (
                                  <div className="dropdown-menu-solid p-spacing-1 z-dropdown absolute right-0 top-8 flex min-w-40 flex-col">
                                    <button
                                      type="button"
                                      className="hub-dock-flyout-row"
                                      onClick={() => {
                                        const name = window
                                          .prompt('Rename campaign', campaign.name)
                                          ?.trim()
                                        setOpenMenuId(null)
                                        if (name) void patchCampaign(campaign, { name })
                                      }}
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      className="hub-dock-flyout-row"
                                      onClick={() => {
                                        const status = window
                                          .prompt(
                                            'Update campaign status',
                                            campaign.status ||
                                              campaign.platform_status ||
                                              'planning',
                                          )
                                          ?.trim()
                                        setOpenMenuId(null)
                                        if (status) void patchCampaign(campaign, { status })
                                      }}
                                    >
                                      Update status
                                    </button>
                                    <button
                                      type="button"
                                      className="hub-dock-flyout-row text-destructive"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        if (!window.confirm(`Delete ${campaign.name}?`)) return
                                        void deleteAgencyClientCampaign(
                                          campaign.client_id,
                                          campaign.id,
                                        ).then(() =>
                                          setCampaigns((current) =>
                                            current.filter((row) => row.id !== campaign.id),
                                          ),
                                        )
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))
        : null}
    </main>
  )
}
const readable = (value: string) => value.replace(/[_-]/g, ' ').toLowerCase()

function campaignStatusOptions(campaign: AgencyClientCampaign) {
  return Array.from(
    new Set([
      campaign.status || campaign.platform_status || 'planning',
      'draft',
      'planning',
      'pending strategy review',
      'building',
      'live',
      'paused',
      'complete',
    ]),
  )
}
