'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { HomeChatHeroToggle } from '@/components/home-dashboard-v4/HomeDashboardV4Shell'
import { MediaGenerateComposer } from '@/components/media'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { deleteAsset, type MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'
import { MediaMenuDropdown } from '../../components/media-menu/MediaMenuDropdown'
import { useMediaDetailQuery } from '../../components/media/use-media-detail-query'
import { useSpaceMedia } from '../../hooks/use-space-media'
import { useSpaceMediaComposerCollapsed } from '../../hooks/use-space-media-composer-collapsed'
import { normalizeMediaGroupBy } from '../../lib/media-group-by-options'
import { spaceGroupBadgeChipProps } from '../../lib/space-group-badge-glass'
import type {
  MediaGroupBy,
  MediaLayoutMode,
  MediaPreviewCardSize,
  ViewDef,
} from '../../types/space-schema'
import { DEFAULT_MEDIA_VIEW_CONFIG, resolveMediaTypeFilters } from '../../types/space-schema'
import { resolveMediaViewPresentation } from './media-view-presentation'
import { MediaAssetCard } from './MediaAssetCard'
import { resolveMediaEmptyState } from './MediaEmptyMockups'

function mediaCardGridClass(layout: MediaLayoutMode, cardSize: MediaPreviewCardSize): string {
  if (layout === 'list') return 'flex flex-col gap-spacing-2'
  if (layout === 'grid') {
    switch (cardSize) {
      case 'small':
        return 'grid grid-cols-2 gap-spacing-2 md:grid-cols-4 lg:grid-cols-5'
      case 'compact':
        return 'grid grid-cols-2 gap-spacing-2 md:grid-cols-3 lg:grid-cols-4'
      case 'preview':
      default:
        return 'grid grid-cols-1 gap-spacing-3 sm:grid-cols-2 lg:grid-cols-3'
    }
  }
  switch (cardSize) {
    case 'small':
      return 'grid grid-cols-2 gap-spacing-2 sm:grid-cols-3 lg:grid-cols-4'
    case 'compact':
      return 'grid grid-cols-1 gap-spacing-3 sm:grid-cols-2 lg:grid-cols-3'
    case 'preview':
    default:
      return 'grid grid-cols-1 gap-spacing-4 sm:grid-cols-2'
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
  campaignId,
  view,
  onMediaDeepMetaChange,
  taskModalOpen = false,
}: {
  spaceId: string
  campaignId: string | null
  view: ViewDef
  onMediaDeepMetaChange: (meta: { id: string; title: string } | null) => void
  /** When a task modal is open over Media, keep the composer under the modal. */
  taskModalOpen?: boolean
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
  const { collapsed: composerCollapsed, toggle: toggleComposer } = useSpaceMediaComposerCollapsed()

  const [collapsedMediaGroups, setCollapsedMediaGroups] = useState<Record<string, boolean>>({})

  const emptyState = useMemo(() => resolveMediaEmptyState(typeFilters), [typeFilters])
  const presentation = useMemo(() => resolveMediaViewPresentation(typeFilters), [typeFilters])

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
    // Opens the right slide-out editor via `?media=` (hosted by SpaceItemsContainer).
    setMediaQuery(row.id)
    onMediaDeepMetaChange({ id: row.id, title: row.name })
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

  const handleAssetUpdated = useCallback(() => {
    void reload()
  }, [reload])

  const handleAssetDeleted = useCallback(() => {
    void reload()
  }, [reload])

  const previewCardSize = mc.preview_card_size ?? 'preview'

  const gridClass = mediaCardGridClass(mc.layout ?? 'gallery', previewCardSize)
  const listThumbClass = mediaListThumbBoxClass(previewCardSize)

  const groupChip = spaceGroupBadgeChipProps(undefined)

  const isEmpty = !loading && !error && grouped.every((g) => g.items.length === 0)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Keep composer outside overflow-hidden so Aspect/Model menus are not clipped.
          Drop below modal stacking while the slide-out editor or task modal is open. */}
      <div
        className={cn(
          'home-dashboard-v4 relative min-w-0 shrink-0 overflow-visible',
          mediaId || taskModalOpen ? 'z-0' : 'z-10',
        )}
      >
        <div className="home-dashboard-v4-hero-glow" aria-hidden />
        <div className="home-dashboard-v4-hero-grid" aria-hidden />
        <div className="home-dashboard-v4-column home-dashboard-v4-column-media-composer min-w-0">
          {composerCollapsed ? (
            <HomeChatHeroToggle
              collapsed
              onToggle={toggleComposer}
              expandLabel={presentation.composerMode === 'video' ? 'New video' : 'New image'}
              expandAriaLabel={
                presentation.composerMode === 'video'
                  ? 'Expand new video composer'
                  : 'Expand new image composer'
              }
            />
          ) : (
            <>
              <MediaGenerateComposer
                mode={presentation.composerMode}
                spaceId={spaceId}
                campaignId={campaignId}
                onGenerated={() => {
                  void reload()
                }}
              />
              <HomeChatHeroToggle
                collapsed={false}
                onToggle={toggleComposer}
                expandLabel={presentation.composerMode === 'video' ? 'New video' : 'New image'}
                collapseLabel="Minimize"
                collapseAriaLabel={
                  presentation.composerMode === 'video'
                    ? 'Minimize new video composer'
                    : 'Minimize new image composer'
                }
              />
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="py-spacing-12 flex flex-1 items-center justify-center">
            <VibeyLoadingOrb text="Loading media…" state="processing" size="lg" />
          </div>
        ) : error ? (
          <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center">
            {error}
          </div>
        ) : isEmpty ? (
          <div className="gap-spacing-6 px-spacing-4 py-spacing-6 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            {emptyState.mockup}
            <div className="space-y-spacing-1 max-w-artifact-wide mx-auto">
              <p className="title-h6 text-foreground">{emptyState.copy.title}</p>
              <p className="body-3 text-muted-foreground">{emptyState.copy.description}</p>
            </div>
          </div>
        ) : (
          <div className="p-spacing-4 min-h-0 flex-1 overflow-y-auto">
            <div className="mb-spacing-4">
              <p className="title-h6 text-foreground">{presentation.collectionTitle}</p>
            </div>
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
                          className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 transition-colors"
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
                        <span className="body-4 text-muted-foreground">{g.items.length}</span>
                      </div>
                    ) : null}
                    {!collapsed ? (
                      <div className={gridClass}>
                        {g.items.map((row) => (
                          <MediaAssetCard
                            key={row.id}
                            asset={row}
                            layout={mc.layout ?? 'gallery'}
                            listThumbClass={listThumbClass}
                            selected={mediaId === row.id}
                            onOpen={() => openRow(row)}
                            onOpenMenu={(position) => openMenuForRow(row, position)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {menuState ? (
        <MediaMenuDropdown
          asset={menuState.asset}
          pointerPosition={menuState.position}
          onClose={() => setMenuState(null)}
          onChanged={() => handleAssetUpdated()}
          onOpenFull={() => {
            openRow(menuState.asset)
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
            handleAssetDeleted()
          } finally {
            setDeleting(false)
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}
