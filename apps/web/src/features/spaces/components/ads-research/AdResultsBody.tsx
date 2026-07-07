'use client'

import { useCallback, useMemo, useState } from 'react'
import { Bookmark, BookmarkCheck, ChevronRight, Loader2, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { groupAdItems, sortAdItems } from '../../lib/ads-research-group-by'
import { spaceGroupBadgeChipProps } from '../../lib/space-group-badge-glass'
import { ADS_PLATFORM_SHORT, type AdSearchResultItem } from '../../services/ads-research.service'
import type { AdsResearchConfig } from '../../types/space-schema'
import { AdResultCard } from './AdResultCard'

interface AdResultsBodyProps {
  ads: AdSearchResultItem[]
  config: AdsResearchConfig
  savedIds: Set<string>
  savingIds: Set<string>
  /** Hidden when undefined (e.g. the Saved ads surface). */
  onSave?: (ad: AdSearchResultItem) => void
  onAdClick: (ad: AdSearchResultItem) => void
}

function shownDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const LIST_COLUMNS = [
  'Preview',
  'Advertiser',
  'Format',
  'Days',
  'Copies',
  'Reach',
  'Last shown',
  'Platform',
] as const

function AdListRows({
  ads,
  savedIds,
  savingIds,
  onSave,
  onAdClick,
  showHeader,
}: {
  ads: AdSearchResultItem[]
  savedIds: Set<string>
  savingIds: Set<string>
  onSave?: (ad: AdSearchResultItem) => void
  onAdClick: (ad: AdSearchResultItem) => void
  showHeader: boolean
}) {
  return (
    <table className="w-full border-collapse">
      {showHeader ? (
        <thead>
          <tr className="border-b border-[var(--border)]">
            {LIST_COLUMNS.map((column) => (
              <th
                key={column}
                className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]"
              >
                {column}
              </th>
            ))}
            {onSave ? <th aria-label="Save" className="w-8" /> : null}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {ads.map((ad) => (
          <tr
            key={ad.ad_id}
            onClick={() => onAdClick(ad)}
            className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--color-hover-subtle)]"
          >
            <td className="px-3 py-2">
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-black/20">
                {ad.image_url ? (
                  <img
                    src={ad.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-foreground)]">
                    <Megaphone className="h-3.5 w-3.5 opacity-40" />
                  </div>
                )}
              </div>
            </td>
            <td className="max-w-[180px] truncate px-3 py-2 text-xs font-medium text-[var(--foreground)]">
              {ad.advertiser_name ?? '-'}
            </td>
            <td className="px-3 py-2 text-xs capitalize text-[var(--color-muted-foreground)]">
              {ad.format}
            </td>
            <td className="px-3 py-2 text-xs text-[var(--foreground)]">
              {ad.days_running != null ? `${ad.days_running}d` : '-'}
            </td>
            <td className="px-3 py-2 text-xs text-[var(--foreground)]">
              {ad.variant_count != null && ad.variant_count > 1 ? `×${ad.variant_count}` : '-'}
            </td>
            <td className="px-3 py-2 text-xs text-[var(--foreground)]">
              {ad.reach_estimate ?? '-'}
            </td>
            <td className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
              {shownDate(ad.last_shown ?? ad.first_shown)}
            </td>
            <td className="px-3 py-2">
              <span className="badge-glass badge-glass-muted rounded px-1 py-px text-[9px] font-semibold">
                {ADS_PLATFORM_SHORT[ad.platform]}
              </span>
            </td>
            {onSave ? (
              <td className="px-2 py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!savedIds.has(ad.ad_id) && !savingIds.has(ad.ad_id)) onSave(ad)
                  }}
                  title={savedIds.has(ad.ad_id) ? 'Saved to space' : 'Save ad to space'}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                >
                  {savingIds.has(ad.ad_id) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : savedIds.has(ad.ad_id) ? (
                    <BookmarkCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Bookmark className="h-3.5 w-3.5" />
                  )}
                </button>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Shared Ads Research results surface: sorted, optionally grouped, rendered
 * as card grid or list per `ads_research_config` — same toolbar-driven
 * behavior as the social research feeds.
 */
export function AdResultsBody({
  ads,
  config,
  savedIds,
  savingIds,
  onSave,
  onAdClick,
}: AdResultsBodyProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const isListMode = (config.display_mode ?? 'grid') === 'list'

  const sorted = useMemo(() => sortAdItems(ads, config), [ads, config])
  const groups = useMemo(() => {
    if (!config.group_by) return null
    return groupAdItems(sorted, config.group_by, config.group_sort ?? 'asc')
  }, [config.group_by, config.group_sort, sorted])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const renderGrid = (subset: AdSearchResultItem[]) => (
    <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {subset.map((ad) => (
        <AdResultCard
          key={ad.ad_id}
          ad={ad}
          saved={savedIds.has(ad.ad_id)}
          saving={savingIds.has(ad.ad_id)}
          onSave={onSave ? () => onSave(ad) : undefined}
          onClick={() => onAdClick(ad)}
        />
      ))}
    </div>
  )

  if (!groups) {
    return isListMode ? (
      <AdListRows
        ads={sorted}
        savedIds={savedIds}
        savingIds={savingIds}
        onSave={onSave}
        onAdClick={onAdClick}
        showHeader
      />
    ) : (
      renderGrid(sorted)
    )
  }

  return (
    <div className="gap-spacing-6 flex flex-col">
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key)
        const groupChip = group.color ? spaceGroupBadgeChipProps(group.color) : null
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className="group/header flex w-full min-w-0 cursor-pointer appearance-none items-center gap-2 border-0 bg-transparent px-1 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
            >
              <span className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)]">
                <ChevronRight
                  className={`h-3 w-3 transition-transform duration-150 ${!isCollapsed ? 'rotate-90' : ''}`}
                />
              </span>
              <span
                className={cn(
                  'rounded-spacing-2 inline-flex shrink-0 items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider',
                  groupChip ? groupChip.chipClassName : 'badge-glass text-[var(--foreground)]',
                )}
                style={groupChip?.style}
              >
                {group.label}
              </span>
              <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                {group.items.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className={isListMode ? 'min-w-0' : 'pt-1'}>
                {isListMode ? (
                  <AdListRows
                    ads={group.items}
                    savedIds={savedIds}
                    savingIds={savingIds}
                    onSave={onSave}
                    onAdClick={onAdClick}
                    showHeader={false}
                  />
                ) : (
                  renderGrid(group.items)
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
