'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { fetchSpacesPage, type SpaceSummary } from '@/lib/spaces/spaces-api'
import {
  importPageGraderClientBrainForSettings,
  listPageGraderClientsForSettings,
  savePageGraderClientScopeMapForSettings,
  suggestCampaignForClient,
  type PageGraderClient,
} from '../../services/page-grader-scope-api'
import { filterPageGraderClientsByQuery } from './page-grader-client-scope-map'
import { PageGraderClientScopeMapRow } from './PageGraderClientScopeMapRow'

type DraftRow = {
  campaignId: string
  spaceId: string
}

export function PageGraderClientScopeMapModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<PageGraderClient[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [draft, setDraft] = useState<Record<string, DraftRow>>({})
  const [syncByClient, setSyncByClient] = useState<
    Record<string, { lastSyncedAt?: string | null; lastSyncStatus?: string | null }>
  >({})
  const [importingClientId, setImportingClientId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [clientRes, campaignRes, spacesRes] = await Promise.all([
        listPageGraderClientsForSettings(),
        fetchCampaigns(),
        fetchSpacesPage({ limit: 100 }),
      ])
      setClients(clientRes.clients)
      setCampaigns(campaignRes)
      setSpaces(spacesRes.items)

      const next: Record<string, DraftRow> = {}
      const syncNext: Record<
        string,
        { lastSyncedAt?: string | null; lastSyncStatus?: string | null }
      > = {}
      for (const client of clientRes.clients) {
        const mapped = clientRes.clientScopeMap[client.id]
        if (mapped?.campaign_id) {
          next[client.id] = {
            campaignId: mapped.campaign_id,
            spaceId: mapped.space_id ?? '',
          }
          syncNext[client.id] = {
            lastSyncedAt: mapped.last_synced_at ?? null,
            lastSyncStatus: mapped.last_sync_status ?? null,
          }
          continue
        }
        const suggested = suggestCampaignForClient(client.name, campaignRes)
        if (suggested) {
          next[client.id] = { campaignId: suggested.id, spaceId: '' }
        }
      }
      setDraft(next)
      setSyncByClient(syncNext)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load client mappings')
      setClients([])
      setCampaigns([])
      setSpaces([])
      setDraft({})
      setSyncByClient({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    void load()
  }, [open, load])

  const spacesByCampaign = useMemo(() => {
    const map = new Map<string, SpaceSummary[]>()
    for (const space of spaces) {
      if (!space.campaign_id) continue
      const list = map.get(space.campaign_id) ?? []
      list.push(space)
      map.set(space.campaign_id, list)
    }
    return map
  }, [spaces])

  const filteredClients = useMemo(
    () => filterPageGraderClientsByQuery(clients, query),
    [clients, query],
  )

  const mappedCount = Object.values(draft).filter((row) => row.campaignId).length

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const mappings = clients
        .map((client) => {
          const row = draft[client.id]
          if (!row?.campaignId) return null
          const campaign = campaigns.find((c) => c.id === row.campaignId)
          const space = row.spaceId
            ? spaces.find((s) => s.id === row.spaceId && s.campaign_id === row.campaignId)
            : null
          return {
            clientId: client.id,
            campaignId: row.campaignId,
            campaignName: campaign?.name,
            spaceId: space?.id ?? null,
            spaceTitle: space?.title ?? null,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row != null)

      await savePageGraderClientScopeMapForSettings(mappings)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save mappings')
    } finally {
      setSaving(false)
    }
  }

  const handleImportBrain = async (client: PageGraderClient, opts?: { force?: boolean }) => {
    const row = draft[client.id]
    const mapped = Boolean(row?.campaignId)
    const campaign = mapped ? campaigns.find((c) => c.id === row?.campaignId) : null
    const space =
      mapped && row?.spaceId && row.campaignId
        ? spaces.find((s) => s.id === row.spaceId && s.campaign_id === row.campaignId)
        : null

    setImportingClientId(client.id)
    setError(null)
    try {
      const result = await importPageGraderClientBrainForSettings(
        mapped
          ? {
              clientId: client.id,
              campaignId: campaign?.id,
              campaignName: campaign?.name,
              campaignHint: campaign?.name ?? client.name,
              spaceId: space?.id ?? null,
              spaceTitle: space?.title ?? null,
              force: opts?.force === true,
            }
          : {
              clientId: client.id,
              campaignName: client.name,
              spaceTitle: 'General',
              force: opts?.force === true,
            },
      )
      const campaignId = result.campaign?.id?.trim() ?? ''
      const campaignName = result.campaign?.name?.trim() || campaign?.name || client.name
      const spaceId = result.space?.id?.trim() ?? ''
      const spaceTitle = result.space?.title?.trim() || 'General'
      const createdCampaign = result.campaign?.action === 'create' || !mapped

      if (campaignId) {
        setDraft((prev) => ({
          ...prev,
          [client.id]: { campaignId, spaceId },
        }))
        setSyncByClient((prev) => ({
          ...prev,
          [client.id]: {
            lastSyncedAt: new Date().toISOString(),
            lastSyncStatus:
              typeof result.brainImport?.action === 'string'
                ? result.brainImport.action
                : (result.brainImport?.status ?? 'succeeded'),
          },
        }))
        setCampaigns((prev) => {
          if (prev.some((c) => c.id === campaignId)) return prev
          return [
            ...prev,
            {
              id: campaignId,
              user_id: '',
              name: campaignName,
              campaign_type: 'get-more-leads',
              status: 'active',
              config: {},
              metrics: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
        })
        if (spaceId) {
          setSpaces((prev) => {
            if (prev.some((s) => s.id === spaceId)) return prev
            return [
              ...prev,
              {
                id: spaceId,
                title: spaceTitle,
                campaign_id: campaignId,
                schema: { version: 1, fields: [], views: [] },
              },
            ]
          })
        }
      }

      toast.success(
        opts?.force
          ? `Re-synced ${client.name} into ${campaignName}`
          : createdCampaign
            ? `Created ${campaignName} and imported brain`
            : `Imported ${client.name} into ${campaignName}`,
      )
      onSaved()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not import Page Grader brain'
      setError(message)
      toast.error(message)
    } finally {
      setImportingClientId(null)
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <div className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
            <div className="modal-scroll-header-edge border-border shrink-0 space-y-3 border-b px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="body-2 text-foreground font-semibold">
                    Map Page Grader clients
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground">
                    Link portal clients to ROAS campaigns (and optional spaces). Suggested matches
                    use names like Impact → Impact Elite Coaching.
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogPrimitive.Close>
              </div>
              <label className="relative block">
                <span className="sr-only">Search clients</span>
                <Search
                  className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search clients…"
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground h-spacing-9 w-full rounded-md border py-1.5 pl-8 pr-2 text-xs outline-none"
                />
              </label>
            </div>

            <div className="modal-nested-scroll-body px-4 py-3">
              {loading ? (
                <div className="flex min-h-[160px] items-center justify-center">
                  <VibeyLoadingOrb size="sm" text="Loading clients…" />
                </div>
              ) : error && clients.length === 0 ? (
                <p className="body-3 text-destructive">{error}</p>
              ) : clients.length === 0 ? (
                <p className="body-3 text-muted-foreground">No Page Grader clients found.</p>
              ) : filteredClients.length === 0 ? (
                <p className="body-3 text-muted-foreground">No clients match “{query.trim()}”.</p>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map((client) => {
                    const row = draft[client.id] ?? { campaignId: '', spaceId: '' }
                    return (
                      <PageGraderClientScopeMapRow
                        key={client.id}
                        client={client}
                        row={row}
                        campaigns={campaigns}
                        campaignSpaces={
                          row.campaignId ? (spacesByCampaign.get(row.campaignId) ?? []) : []
                        }
                        isImporting={importingClientId === client.id}
                        syncStatus={syncByClient[client.id] ?? null}
                        onDraftChange={(clientId, next) => {
                          setDraft((prev) => ({ ...prev, [clientId]: next }))
                        }}
                        onImportBrain={(c) => void handleImportBrain(c)}
                        onResyncBrain={(c) => void handleImportBrain(c, { force: true })}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-border flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
              <p className="typo-caption text-muted-foreground">
                {mappedCount} mapped · {clients.length} clients
                {query.trim() ? ` · showing ${filteredClients.length}` : ''}
              </p>
              <div className="flex gap-2">
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:bg-hover-subtle rounded-md px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  disabled={loading || saving || clients.length === 0}
                  onClick={() => void handleSave()}
                  className="button-glass-accent rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save mappings'}
                </button>
              </div>
            </div>
            {error && clients.length > 0 ? (
              <p className="text-destructive shrink-0 px-4 pb-3 text-xs">{error}</p>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
