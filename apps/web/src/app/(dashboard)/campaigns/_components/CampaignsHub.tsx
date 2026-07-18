'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, FolderKanban, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { ShareModal } from '@/components/org'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { createSpace, fetchSpaces } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import { useCampaignMode } from '@/features/studio/contexts/CampaignModeContext'
import { createCampaign, deleteCampaign, fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { useOrgStore } from '@/lib/org'
import { cn } from '@/lib/utils/cn'
import {
  CampaignsHubCampaignCard,
  isGeneralCampaign,
  spaceIconName,
} from './CampaignsHubCampaignCard'

function campaignIconName(campaign: Campaign): string {
  return ((campaign.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban'
}

export function CampaignsHub() {
  const router = useRouter()
  const { setActiveCampaign } = useCampaignMode()
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const { isOrgContext } = useOrgStore()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [creatingSpaceFor, setCreatingSpaceFor] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [shareCampaign, setShareCampaign] = useState<{ id: string; name: string } | null>(null)
  const newNameRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [campaignRows, spaceRows] = await Promise.all([
        fetchCampaigns(),
        fetchSpaces({ limit: 200 }),
      ])
      setCampaigns(campaignRows)
      setSpaces(spaceRows)
      setExpandedIds(new Set(campaignRows.map((c) => c.id)))
    } catch {
      toast.error('Could not load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const spacesByCampaignId = useMemo(() => {
    const map = new Map<string, Space[]>()
    for (const space of spaces) {
      if (!space.campaign_id) continue
      const list = map.get(space.campaign_id) ?? []
      list.push(space)
      map.set(space.campaign_id, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }
    return map
  }, [spaces])

  const personalSpaces = useMemo(
    () =>
      spaces.filter((space) => !space.campaign_id).sort((a, b) => a.title.localeCompare(b.title)),
    [spaces],
  )

  const filteredCampaigns = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...campaigns].sort((a, b) => {
      if (isGeneralCampaign(a) && !isGeneralCampaign(b)) return -1
      if (!isGeneralCampaign(a) && isGeneralCampaign(b)) return 1
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
    if (!q) return sorted
    return sorted.filter((campaign) => {
      const name = (campaign.name ?? '').toLowerCase()
      if (name.includes(q)) return true
      const campaignSpaces = spacesByCampaignId.get(campaign.id) ?? []
      return campaignSpaces.some((space) => space.title.toLowerCase().includes(q))
    })
  }, [campaigns, query, spacesByCampaignId])

  const toggleExpanded = useCallback((campaignId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(campaignId)) next.delete(campaignId)
      else next.add(campaignId)
      return next
    })
  }, [])

  const openCampaign = useCallback(
    (campaign: Campaign, tab?: 'overview' | 'dashboard') => {
      const icon = campaignIconName(campaign)
      setActiveCampaign(campaign.id, campaign.name ?? 'Campaign', icon)
      router.push(
        tab === 'dashboard'
          ? `/campaigns/${campaign.id}?tab=dashboard`
          : `/campaigns/${campaign.id}`,
      )
    },
    [router, setActiveCampaign],
  )

  const openSpace = useCallback(
    (spaceId: string) => {
      setActiveSpace(spaceId)
      router.push(`/spaces?space=${spaceId}`)
    },
    [router, setActiveSpace],
  )

  const handleCreateCampaign = useCallback(async () => {
    const name = newCampaignName.trim()
    if (!name) return
    setCreatingCampaign(true)
    try {
      const created = await createCampaign(name)
      setCampaigns((prev) => [created, ...prev])
      setExpandedIds((prev) => new Set(prev).add(created.id))
      setNewCampaignName('')
      toast.success('Campaign created')
      openCampaign(created)
    } catch {
      toast.error('Could not create campaign')
    } finally {
      setCreatingCampaign(false)
    }
  }, [newCampaignName, openCampaign])

  const handleCreateSpace = useCallback(
    async (campaignId: string) => {
      setCreatingSpaceFor(campaignId)
      try {
        const space = await createSpace({ title: 'New space', campaign_id: campaignId })
        setSpaces((prev) => [...prev, space])
        setExpandedIds((prev) => new Set(prev).add(campaignId))
        openSpace(space.id)
      } catch {
        toast.error('Could not create space')
      } finally {
        setCreatingSpaceFor(null)
      }
    },
    [openSpace],
  )

  const handleDeleteCampaign = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCampaign(deleteTarget.id)
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setSpaces((prev) => prev.filter((s) => s.campaign_id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Campaign deleted')
    } catch {
      toast.error('Could not delete campaign')
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget])

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <VibeyLoadingOrb text="Loading campaigns..." state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="p-spacing-4 md:p-spacing-6 mx-auto w-full max-w-3xl">
        <div className="mb-spacing-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="title-h3 text-foreground">CAMPAIGNS</h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Open a campaign, jump into its spaces, or start a new one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewCampaignName('')
              newNameRef.current?.focus()
            }}
            className="button-glass-primary body-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            New campaign
          </button>
        </div>

        <div className="mb-spacing-4 gap-spacing-2 flex flex-col sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search campaigns or spaces…"
              className="input-glass body-3 text-foreground placeholder:text-muted-foreground w-full rounded-lg py-2 pl-9 pr-3 outline-none"
            />
          </label>
          <div className="gap-spacing-2 flex min-w-0 flex-1 sm:max-w-xs">
            <input
              ref={newNameRef}
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateCampaign()
              }}
              placeholder="Campaign name"
              className="input-glass body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 rounded-lg px-3 py-2 outline-none"
            />
            <button
              type="button"
              disabled={creatingCampaign || !newCampaignName.trim()}
              onClick={() => void handleCreateCampaign()}
              className="button-glass-accent body-3 shrink-0 rounded-lg px-3 py-2 font-medium disabled:opacity-50"
            >
              {creatingCampaign ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>

        {filteredCampaigns.length === 0 && personalSpaces.length === 0 ? (
          <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
            <FolderKanban className="text-muted-foreground mb-spacing-2 mx-auto h-8 w-8" />
            <p className="body-2 text-foreground font-medium">No campaigns yet</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Create a campaign to organize client spaces and work.
            </p>
          </div>
        ) : (
          <ul className="gap-spacing-3 pb-spacing-6 flex flex-col">
            {filteredCampaigns.map((campaign) => (
              <CampaignsHubCampaignCard
                key={campaign.id}
                campaign={campaign}
                spaces={spacesByCampaignId.get(campaign.id) ?? []}
                expanded={expandedIds.has(campaign.id)}
                menuOpen={menuOpenId === campaign.id}
                creatingSpace={creatingSpaceFor === campaign.id}
                showShare={isOrgContext()}
                onToggleExpanded={() => toggleExpanded(campaign.id)}
                onOpenOverview={() => openCampaign(campaign)}
                onOpenWork={() => openCampaign(campaign, 'dashboard')}
                onCreateSpace={() => void handleCreateSpace(campaign.id)}
                onOpenSpace={openSpace}
                onMenuOpenChange={(open) => setMenuOpenId(open ? campaign.id : null)}
                onShare={() =>
                  setShareCampaign({
                    id: campaign.id,
                    name: campaign.name ?? 'Untitled campaign',
                  })
                }
                onDelete={() => setDeleteTarget(campaign)}
              />
            ))}

            {personalSpaces.length > 0 ? (
              <li className="surface-card border-border rounded-spacing-3 overflow-hidden border">
                <div className="px-spacing-4 py-spacing-3">
                  <p className="body-2 text-foreground font-medium">Personal spaces</p>
                  <p className="body-4 text-muted-foreground">Not tied to a campaign</p>
                </div>
                <ul className="border-border px-spacing-3 py-spacing-2 space-y-0.5 border-t">
                  {personalSpaces.map((space) => (
                    <li key={space.id}>
                      <button
                        type="button"
                        onClick={() => openSpace(space.id)}
                        className="hover:bg-hover-subtle body-3 text-foreground flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left"
                      >
                        <LucideIcon
                          name={spaceIconName(space)}
                          className={cn(
                            'h-4 w-4 shrink-0',
                            getIconColor(space.schema?.icon_color).textColor,
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{space.title}</span>
                        <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
        )}

        <ConfirmDialog
          open={deleteTarget != null}
          title="Delete campaign?"
          description={
            deleteTarget
              ? `Delete “${deleteTarget.name ?? 'Untitled'}”? Spaces under it may be affected.`
              : undefined
          }
          confirmText="Delete"
          confirmingText="Deleting…"
          confirmDisabled={deleting}
          onConfirm={() => void handleDeleteCampaign()}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
        />

        {shareCampaign ? (
          <ShareModal
            open
            onClose={() => setShareCampaign(null)}
            resourceType="campaign"
            resourceId={shareCampaign.id}
            resourceName={shareCampaign.name}
          />
        ) : null}
      </div>
    </div>
  )
}
