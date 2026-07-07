'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Gift,
  LayoutTemplate,
  Loader2,
  Mail,
  Megaphone,
  User,
  X,
} from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import {
  fetchCampaignAssetSummary,
  moveArtifactToCampaign,
  type CampaignAssetSummary,
} from '@/features/studio/services/campaign.service'

interface Campaign {
  id: string
  name: string
  icon: string
}

interface DeleteCampaignDialogProps {
  campaign: { id: string; name: string } | null
  campaigns: Campaign[]
  onClose: () => void
  onConfirm: (campaignId: string) => Promise<void>
}

type AssetCategory = 'offers' | 'funnels' | 'ads' | 'sequences' | 'presentations' | 'avatars'

const TABLE_MAP: Record<AssetCategory, string> = {
  offers: 'offers',
  funnels: 'funnels',
  ads: 'ads',
  sequences: 'sequences',
  presentations: 'presentations',
  avatars: 'avatars',
}

const CATEGORY_META: Record<AssetCategory, { label: string; icon: React.ReactNode }> = {
  offers: { label: 'Offers', icon: <Briefcase className="h-4 w-4" /> },
  funnels: { label: 'Funnels', icon: <LayoutTemplate className="h-4 w-4" /> },
  ads: { label: 'Ads', icon: <Megaphone className="h-4 w-4" /> },
  sequences: { label: 'Sequences', icon: <Mail className="h-4 w-4" /> },
  presentations: { label: 'Presentations', icon: <Gift className="h-4 w-4" /> },
  avatars: { label: 'Avatars', icon: <User className="h-4 w-4" /> },
}

const CATEGORIES: AssetCategory[] = [
  'offers',
  'funnels',
  'ads',
  'sequences',
  'presentations',
  'avatars',
]

export function DeleteCampaignDialog({
  campaign,
  campaigns,
  onClose,
  onConfirm,
}: DeleteCampaignDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [assets, setAssets] = useState<CampaignAssetSummary | null>(null)
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [targetCampaignId, setTargetCampaignId] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
  const campaignDropdownTriggerRef = useRef<HTMLButtonElement>(null)
  const [campaignDropdownPos, setCampaignDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [movingAssets, setMovingAssets] = useState(false)

  useLayoutEffect(() => {
    if (!campaignDropdownOpen || !campaignDropdownTriggerRef.current) return
    const rect = campaignDropdownTriggerRef.current.getBoundingClientRect()
    setCampaignDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [campaignDropdownOpen])

  useEffect(() => {
    if (!campaign) {
      setConfirmText('')
      setAssets(null)
      setSelectedIds(new Set())
      setTargetCampaignId(null)
      setExpandedCategories(new Set())
      return
    }
    setAssetsLoading(true)
    fetchCampaignAssetSummary(campaign.id)
      .then((data) => {
        setAssets(data)
        const expanded = new Set<string>()
        for (const cat of CATEGORIES) {
          if (data[cat].length > 0) expanded.add(cat)
        }
        setExpandedCategories(expanded)
      })
      .catch(() => setAssets(null))
      .finally(() => setAssetsLoading(false))
  }, [campaign])

  const otherCampaigns = campaigns.filter((c) => c.id !== campaign?.id)
  const targetCampaign = otherCampaigns.find((c) => c.id === targetCampaignId)

  const totalAssets = assets ? CATEGORIES.reduce((sum, cat) => sum + assets[cat].length, 0) : 0

  const hasAssets = totalAssets > 0
  const hasSelection = selectedIds.size > 0
  const canDelete = confirmText === campaign?.name

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const toggleItem = useCallback((key: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleAllInCategory = useCallback(
    (cat: AssetCategory) => {
      if (!assets) return
      const items = assets[cat]
      const keys = items.map((item) => `${cat}:${item.id}`)
      const allSelected = keys.every((k) => selectedIds.has(k))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const k of keys) {
          if (allSelected) next.delete(k)
          else next.add(k)
        }
        return next
      })
    },
    [assets, selectedIds],
  )

  const handleMoveSelected = useCallback(async () => {
    if (!targetCampaignId || selectedIds.size === 0) return
    setMovingAssets(true)
    try {
      const promises: Promise<void>[] = []
      for (const key of selectedIds) {
        const [cat, id] = key.split(':') as [AssetCategory, string]
        const table = TABLE_MAP[cat]
        if (table && id) {
          promises.push(moveArtifactToCampaign(table, id, targetCampaignId))
        }
      }
      await Promise.all(promises)
      // Refresh asset list
      if (campaign) {
        const data = await fetchCampaignAssetSummary(campaign.id)
        setAssets(data)
      }
      setSelectedIds(new Set())
    } catch {
      /* error logged by backend client */
    } finally {
      setMovingAssets(false)
    }
  }, [targetCampaignId, selectedIds, campaign])

  const handleDelete = async () => {
    if (!canDelete || !campaign) return
    setIsDeleting(true)
    try {
      await onConfirm(campaign.id)
      setConfirmText('')
      onClose()
    } catch {
      /* parent handles error */
    } finally {
      setIsDeleting(false)
    }
  }

  if (!campaign) return null

  return (
    <DialogPrimitive.Root
      open={!!campaign}
      onOpenChange={(open) => {
        if (!open && !isDeleting && !movingAssets) {
          setConfirmText('')
          onClose()
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Delete Campaign</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <div className="gap-spacing-2 flex items-center">
                    <AlertTriangle className="icon-sm text-destructive" />
                    <h2 className="title-h6">Delete Campaign</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="btn-icon-bare"
                    disabled={isDeleting || movingAssets}
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <p className="body-2 text-foreground">
                  Are you sure you want to delete <strong>{campaign.name}</strong>?
                </p>
                <p className="body-3 text-muted-foreground">
                  This campaign is soft-deleted now and can be restored for 30 days. After 30 days,
                  it is permanently deleted.
                </p>

                {assetsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="icon-sm text-muted-foreground animate-spin" />
                  </div>
                ) : hasAssets ? (
                  <>
                    <p className="body-3 text-muted-foreground">
                      This campaign has <strong>{totalAssets}</strong> item
                      {totalAssets !== 1 ? 's' : ''}. Select items to move to another campaign, or
                      they will be permanently deleted with the campaign after 30 days.
                    </p>

                    {/* Asset list */}
                    <div className="surface-bg border-border rounded-spacing-2 overflow-hidden border">
                      {CATEGORIES.map((cat) => {
                        if (!assets || assets[cat].length === 0) return null
                        const items = assets[cat]
                        const meta = CATEGORY_META[cat]
                        const isExpanded = expandedCategories.has(cat)
                        const catKeys = items.map((i) => `${cat}:${i.id}`)
                        const selectedInCat = catKeys.filter((k) => selectedIds.has(k)).length

                        return (
                          <div key={cat} className="border-border border-b last:border-b-0">
                            <div className="flex items-center gap-2 px-3 py-2">
                              <button
                                type="button"
                                onClick={() => toggleCategory(cat)}
                                className="flex flex-1 items-center gap-2 text-left"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
                                )}
                                {meta.icon}
                                <span className="body-3 text-foreground font-medium">
                                  {meta.label}
                                </span>
                                <span className="body-4 text-muted-foreground">
                                  ({items.length})
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleAllInCategory(cat)}
                                className="body-4 text-primary hover:underline"
                              >
                                {selectedInCat === items.length ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="pb-1">
                                {items.map((item) => {
                                  const key = `${cat}:${item.id}`
                                  const checked = selectedIds.has(key)
                                  return (
                                    <label
                                      key={item.id}
                                      className="hover:bg-hover-subtle flex cursor-pointer items-center gap-2 px-3 py-1.5 pl-10"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleItem(key)}
                                        className="checkbox-glass-primary"
                                      />
                                      <span className="body-3 text-foreground truncate">
                                        {item.name}
                                      </span>
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Move section */}
                    {hasSelection && otherCampaigns.length > 0 && (
                      <div className="space-y-spacing-2">
                        <p className="body-3 text-foreground font-medium">
                          Move {selectedIds.size} selected item{selectedIds.size !== 1 ? 's' : ''}{' '}
                          to:
                        </p>
                        <div className="relative">
                          <button
                            ref={campaignDropdownTriggerRef}
                            type="button"
                            onClick={() => setCampaignDropdownOpen(!campaignDropdownOpen)}
                            className="input-glass flex w-full items-center justify-between px-3 py-2"
                          >
                            <span className="body-3 truncate">
                              {targetCampaign ? (
                                <span className="flex items-center gap-2">
                                  <LucideIcon name={targetCampaign.icon} className="h-4 w-4" />
                                  {targetCampaign.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Choose a campaign...</span>
                              )}
                            </span>
                            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
                          </button>
                          {campaignDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-[80]"
                                onClick={() => setCampaignDropdownOpen(false)}
                              />
                              <div
                                className="border-border surface-card fixed z-[90] max-h-48 overflow-y-auto rounded-lg border shadow-lg"
                                style={{
                                  top: campaignDropdownPos.top,
                                  left: campaignDropdownPos.left,
                                  width: campaignDropdownPos.width,
                                }}
                              >
                                {otherCampaigns.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setTargetCampaignId(c.id)
                                      setCampaignDropdownOpen(false)
                                    }}
                                    className="body-3 text-foreground flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-secondary)]"
                                  >
                                    <LucideIcon name={c.icon} className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{c.name}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        {targetCampaignId && (
                          <button
                            type="button"
                            onClick={handleMoveSelected}
                            disabled={movingAssets}
                            className="button-glass-neutral gap-spacing-2 flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all hover:bg-[var(--color-secondary)]"
                          >
                            {movingAssets ? (
                              <Loader2 className="icon-sm animate-spin" />
                            ) : (
                              <ArrowRight className="icon-sm" />
                            )}
                            {movingAssets
                              ? 'Moving...'
                              : `Move ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}`}
                          </button>
                        )}
                      </div>
                    )}

                    {hasSelection && otherCampaigns.length === 0 && (
                      <p className="body-4 text-muted-foreground">
                        No other campaigns to move items to. Selected items will be permanently
                        deleted with the campaign after 30 days.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="body-3 text-muted-foreground">
                    This campaign has no artifacts. It will be soft-deleted now and permanently
                    deleted after 30 days.
                  </p>
                )}

                <div className="space-y-spacing-2">
                  <label className="body-3 text-foreground">
                    Type <strong>{campaign.name}</strong> to confirm
                  </label>
                  <input
                    type="text"
                    className="input-glass w-full"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={campaign.name}
                    disabled={isDeleting}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting || movingAssets}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canDelete || isDeleting || movingAssets}
                  className="button-glass-destructive rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span className="gap-spacing-2 flex items-center">
                      <Loader2 className="icon-sm animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    'Delete Campaign'
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
