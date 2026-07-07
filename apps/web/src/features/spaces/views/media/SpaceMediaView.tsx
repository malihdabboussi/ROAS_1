'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { ChevronRight, Fullscreen, MoreVertical } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ConfirmDialog } from '@/features/settings/components/settings-content/ConfirmDialog'
import { deleteAsset, type MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'
import { MediaMenuDropdown } from '../../components/media-menu/MediaMenuDropdown'
import { useMediaDetailQuery } from '../../components/media/use-media-detail-query'
import { useSpaceMedia } from '../../hooks/use-space-media'
import { normalizeMediaGroupBy } from '../../lib/media-group-by-options'
import { spaceGroupBadgeChipProps } from '../../lib/space-group-badge-glass'
import type {
  MediaGroupBy,
  MediaLayoutMode,
  MediaPreviewCardSize,
  ViewDef,
} from '../../types/space-schema'
import { DEFAULT_MEDIA_VIEW_CONFIG, resolveMediaTypeFilters } from '../../types/space-schema'
import { MediaDeepView } from './MediaDeepView'
import { resolveMediaEmptyState } from './MediaEmptyMockups'

function mediaCardGridClass(layout: MediaLayoutMode, cardSize: MediaPreviewCardSize): string {
  if (layout === 'list') return 'flex flex-col gap-spacing-2'
  if (layout === 'grid') {
    switch (cardSize) {
      case 'small':
        return 'grid grid-cols-3 gap-spacing-2 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
      case 'compact':
        return 'grid grid-cols-3 gap-spacing-2 md:grid-cols-4 lg:grid-cols-5'
      case 'preview':
      default:
        return 'grid grid-cols-2 gap-spacing-3 md:grid-cols-3 lg:grid-cols-4'
    }
  }
  switch (cardSize) {
    case 'small':
      return 'grid grid-cols-2 gap-spacing-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    case 'compact':
      return 'grid grid-cols-2 gap-spacing-3 sm:grid-cols-3 lg:grid-cols-4'
    case 'preview':
    default:
      return 'grid grid-cols-1 gap-spacing-4 sm:grid-cols-2 lg:grid-cols-3'
  }
}

function mediaListThumbBoxClass(cardSize: MediaPreviewCardSize): string {
  switch (cardSize) {
    case 'small':
      return 'h-12 w-12 shrink-0 rounded-spacing-2'
    case 'compact':
      return 'h-14 w-14 shrink-0 rounded-spacing-2'
    case 'preview':
    default:
      return 'h-16 w-16 shrink-0 rounded-spacing-2'
  }
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

type MediaGroupBucket = { key: string; displayLabel: string; items: MediaAsset[] }

function formatMediaGroupDisplayLabel(gb: MediaGroupBy, rawKey: string): string {
  if (gb === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(rawKey)) {
    const d = new Date(`${rawKey}T12:00:00`)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }
  if (rawKey === 'unknown') return 'Unknown'
  return rawKey
}

export function SpaceMediaView({
  spaceId,
  campaignId: _campaignId,
  view,
  previewSelection,
  onPreviewSelectionChange,
  onMediaDeepMetaChange,
}: {
  spaceId: string
  campaignId: string | null
  view: ViewDef
  previewSelection: MediaAsset | null
  onPreviewSelectionChange: (next: MediaAsset | null) => void
  onMediaDeepMetaChange: (meta: { id: string; title: string } | null) => void
}) {
  const mc = useMemo(
    () => ({ ...DEFAULT_MEDIA_VIEW_CONFIG, ...(view.media_config ?? {}) }),
    [view.media_config],
  )
  const typeFilters = useMemo(() => resolveMediaTypeFilters(mc), [mc])
  const { mediaId, setMediaQuery } = useMediaDetailQuery()
  const { assets, loading, error, reload } = useSpaceMedia(spaceId, {
    typeFilters,
    sourceFilter: mc.source_filter ?? 'all',
    search: mc.search_query,
  })

  const [collapsedMediaGroups, setCollapsedMediaGroups] = useState<Record<string, boolean>>({})

  const emptyState = useMemo(() => resolveMediaEmptyState(typeFilters), [typeFilters])

  const groupByMode = normalizeMediaGroupBy(mc.group_by)

  useEffect(() => {
    setCollapsedMediaGroups({})
  }, [groupByMode])

  const grouped = useMemo((): MediaGroupBucket[] => {
    const gb = groupByMode
    if (gb === 'none') return [{ key: '__all__', displayLabel: '', items: assets }]
    const map = new Map<string, MediaAsset[]>()
    for (const a of assets) {
      let key = ''
      if (gb === 'date') key = dayKey(a.created_at)
      else if (gb === 'source') key = a.source ?? 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    const dir = mc.group_sort ?? 'desc'
    const cmp = (a: string, b: string) => {
      if (dir === 'asc') return a < b ? -1 : a > b ? 1 : 0
      return a < b ? 1 : a > b ? -1 : 0
    }
    return [...map.entries()]
      .sort(([a], [b]) => cmp(a, b))
      .map(([rawKey, items]) => ({
        key: rawKey,
        displayLabel: formatMediaGroupDisplayLabel(gb, rawKey),
        items,
      }))
  }, [assets, groupByMode, mc.group_sort])

  const openRow = (row: MediaAsset) => {
    onPreviewSelectionChange(row)
  }

  const openRowFull = (row: MediaAsset, e: MouseEvent) => {
    e.stopPropagation()
    setMediaQuery(row.id)
    onMediaDeepMetaChange({ id: row.id, title: row.name })
    onPreviewSelectionChange(null)
  }

  const [menuState, setMenuState] = useState<{
    asset: MediaAsset
    position: { x: number; y: number }
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openMenuForRow = useCallback((row: MediaAsset, position: { x: number; y: number }) => {
    setMenuState({ asset: row, position })
  }, [])

  const handleAssetUpdated = useCallback(
    (updated: MediaAsset) => {
      if (previewSelection?.id === updated.id) onPreviewSelectionChange(updated)
      void reload()
    },
    [previewSelection?.id, onPreviewSelectionChange, reload],
  )

  const handleAssetDeleted = useCallback(
    (deletedId: string) => {
      if (previewSelection?.id === deletedId) onPreviewSelectionChange(null)
      void reload()
    },
    [previewSelection?.id, onPreviewSelectionChange, reload],
  )

  const previewCardSize = mc.preview_card_size ?? 'preview'

  const gridClass = mediaCardGridClass(mc.layout ?? 'gallery', previewCardSize)
  const listThumbClass = mediaListThumbBoxClass(previewCardSize)

  const groupChip = spaceGroupBadgeChipProps(undefined)

  if (mediaId) {
    return <MediaDeepView onDeepMetaChange={onMediaDeepMetaChange} />
  }

  if (loading) {
    return (
      <div className="py-spacing-12 flex flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading media…" state="processing" size="lg" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center">
        {error}
      </div>
    )
  }

  const isEmpty = grouped.every((g) => g.items.length === 0)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {isEmpty ? (
        <div className="gap-spacing-6 px-spacing-4 py-spacing-6 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          {emptyState.mockup}
          <div className="space-y-spacing-1 max-w-artifact-wide mx-auto">
            <p className="title-h6 text-foreground">{emptyState.copy.title}</p>
            <p className="body-3 text-muted-foreground">{emptyState.copy.description}</p>
          </div>
        </div>
      ) : (
        <div className="p-spacing-4 min-h-0 flex-1 overflow-y-auto">
          <div className="gap-spacing-10 flex flex-col">
            {grouped.map((g) => {
              const showHeader = groupByMode !== 'none' && g.displayLabel !== ''
              const collapsed = collapsedMediaGroups[g.key] ?? false

              return (
                <div key={g.key}>
                  {showHeader ? (
                    <div className="group/header mb-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedMediaGroups((m) => ({ ...m, [g.key]: !m[g.key] }))
                        }
                        className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                        aria-expanded={!collapsed}
                      >
                        <ChevronRight
                          className={cn(
                            'h-3 w-3 transition-transform duration-150',
                            collapsed ? '' : 'rotate-90',
                          )}
                        />
                      </button>
                      <span
                        className={cn(
                          'rounded-spacing-2 inline-flex items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider',
                          groupChip.chipClassName,
                        )}
                        style={groupChip.style}
                      >
                        {g.displayLabel}
                      </span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {g.items.length}
                      </span>
                    </div>
                  ) : null}
                  {!collapsed ? (
                    <div className={gridClass}>
                      {g.items.map((row) => {
                        const selected = previewSelection?.id === row.id
                        return (
                          <div
                            key={row.id}
                            role="button"
                            tabIndex={0}
                            data-media-card
                            onClick={() => openRow(row)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                openRow(row)
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openMenuForRow(row, { x: e.clientX, y: e.clientY })
                            }}
                            className={`surface-card border-border group text-left transition-colors ${
                              selected
                                ? 'border-primary ring-primary/30 ring-2'
                                : 'hover:border-muted-foreground/40'
                            } ${mc.layout === 'list' ? 'gap-spacing-3 p-spacing-3 flex flex-row' : 'rounded-spacing-3 flex flex-col overflow-hidden border p-0'}`}
                          >
                            <div
                              className={`bg-muted/20 relative overflow-hidden ${mc.layout === 'list' ? listThumbClass : 'aspect-video w-full'}`}
                            >
                              {row.asset_type === 'video' && row.public_url ? (
                                <video
                                  src={row.public_url}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : row.public_url ? (
                                <img
                                  src={row.public_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="body-4 text-muted-foreground flex h-full items-center justify-center p-2">
                                  No preview
                                </div>
                              )}
                              <div
                                className="absolute right-1 top-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="surface-card rounded-spacing-1 inline-flex p-1"
                                  aria-label="Asset options"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    openMenuForRow(row, { x: rect.right, y: rect.bottom })
                                  }}
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="surface-card rounded-spacing-1 inline-flex p-1"
                                  aria-label="Open full view"
                                  onClick={(e) => openRowFull(row, e)}
                                >
                                  <Fullscreen className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div
                              className={
                                mc.layout === 'list' ? 'min-w-0 flex-1 py-1' : 'p-spacing-3'
                              }
                            >
                              <p className="body-3 truncate font-medium">{row.name}</p>
                              <p className="body-4 text-muted-foreground">{row.asset_type}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {menuState ? (
        <MediaMenuDropdown
          asset={menuState.asset}
          pointerPosition={menuState.position}
          onClose={() => setMenuState(null)}
          onChanged={(updated) => handleAssetUpdated(updated)}
          onOpenFull={() => {
            setMediaQuery(menuState.asset.id)
            onMediaDeepMetaChange({ id: menuState.asset.id, title: menuState.asset.name })
            onPreviewSelectionChange(null)
            setMenuState(null)
          }}
          onDeleted={() => {
            setDeleteTarget(menuState.asset)
            setMenuState(null)
          }}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
        title="Delete asset?"
        description={`Are you sure you want to delete "${deleteTarget?.name || 'Untitled'}"? This cannot be undone.`}
        confirmText="Delete"
        confirmDisabled={deleting}
        confirmingText="Deleting..."
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            await deleteAsset(deleteTarget.id)
            handleAssetDeleted(deleteTarget.id)
          } finally {
            setDeleting(false)
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}
