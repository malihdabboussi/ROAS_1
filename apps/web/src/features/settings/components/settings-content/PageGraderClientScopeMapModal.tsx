'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Brain, X } from 'lucide-react'
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
  const [importingClientId, setImportingClientId] = useState<string | null>(null)

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
      for (const client of clientRes.clients) {
        const mapped = clientRes.clientScopeMap[client.id]
        if (mapped?.campaign_id) {
          next[client.id] = {
            campaignId: mapped.campaign_id,
            spaceId: mapped.space_id ?? '',
          }
          continue
        }
        const suggested = suggestCampaignForClient(client.name, campaignRes)
        if (suggested) {
          next[client.id] = { campaignId: suggested.id, spaceId: '' }
        }
      }
      setDraft(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load client mappings')
      setClients([])
      setCampaigns([])
      setSpaces([])
      setDraft({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
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

  const handleImportBrain = async (client: PageGraderClient) => {
    const row = draft[client.id]
    const campaign = row?.campaignId ? campaigns.find((c) => c.id === row.campaignId) : null
    const space =
      row?.spaceId && row.campaignId
        ? spaces.find((s) => s.id === row.spaceId && s.campaign_id === row.campaignId)
        : null

    setImportingClientId(client.id)
    setError(null)
    try {
      const result = await importPageGraderClientBrainForSettings({
        clientId: client.id,
        campaignId: campaign?.id,
        campaignName: campaign?.name,
        campaignHint: campaign?.name ?? client.name,
        spaceId: space?.id ?? null,
        spaceTitle: space?.title ?? null,
      })
      const campaignName = result.campaign?.name ?? campaign?.name ?? client.name
      toast.success(`Imported ${client.name} into ${campaignName}`)
      onSaved()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not import Page Grader brain'
      setError(message)
      toast.error(message)
    } finally {
      setImportingClientId(null)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4">
      <button
        type="button"
        className="bg-modal-overlay absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="surface-card border-border relative z-[1] flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border shadow-lg">
        <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <h3 className="body-2 text-foreground font-semibold">Map Page Grader clients</h3>
            <p className="body-3 text-muted-foreground">
              Link portal clients to ROAS campaigns (and optional spaces). Suggested matches use
              names like Impact → Impact Elite Coaching.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <VibeyLoadingOrb size="sm" text="Loading clients…" />
            </div>
          ) : error && clients.length === 0 ? (
            <p className="body-3 text-destructive">{error}</p>
          ) : clients.length === 0 ? (
            <p className="body-3 text-muted-foreground">No Page Grader clients found.</p>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => {
                const row = draft[client.id] ?? { campaignId: '', spaceId: '' }
                const campaignSpaces = row.campaignId
                  ? (spacesByCampaign.get(row.campaignId) ?? [])
                  : []
                return (
                  <div
                    key={client.id}
                    className="border-border space-y-2 rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="body-3 text-foreground min-w-0 truncate font-medium">
                        {client.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleImportBrain(client)}
                        disabled={importingClientId === client.id}
                        className="button-glass-accent inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                        title="Import this Page Grader client's intelligence into the ROAS brain"
                      >
                        <Brain className="h-3 w-3" />
                        {importingClientId === client.id ? 'Importing' : 'Import brain'}
                      </button>
                    </div>
                    <label className="block">
                      <span className="typo-caption text-muted-foreground">Campaign</span>
                      <select
                        value={row.campaignId}
                        onChange={(e) => {
                          const campaignId = e.target.value
                          setDraft((prev) => ({
                            ...prev,
                            [client.id]: { campaignId, spaceId: '' },
                          }))
                        }}
                        className="border-border bg-background text-foreground mt-1 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                      >
                        <option value="">Not mapped</option>
                        {campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {row.campaignId ? (
                      <label className="block">
                        <span className="typo-caption text-muted-foreground">Space (optional)</span>
                        <select
                          value={row.spaceId}
                          onChange={(e) => {
                            const spaceId = e.target.value
                            setDraft((prev) => ({
                              ...prev,
                              [client.id]: { ...row, spaceId },
                            }))
                          }}
                          className="border-border bg-background text-foreground mt-1 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                        >
                          <option value="">Any space in campaign</option>
                          {campaignSpaces.map((space) => (
                            <option key={space.id} value={space.id}>
                              {space.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-border flex items-center justify-between gap-2 border-t px-4 py-3">
          <p className="typo-caption text-muted-foreground">{mappedCount} mapped</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:bg-hover-subtle rounded-md px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
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
          <p className="text-destructive px-4 pb-3 text-xs">{error}</p>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
