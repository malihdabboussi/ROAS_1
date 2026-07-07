'use client'

import { useState } from 'react'
import { Bookmark, Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  ADS_PLATFORM_LABELS,
  ADS_RESEARCH_PLATFORMS,
  type AdsResearchPlatform,
  type SavedAdSearchSummary,
} from '../../services/ads-research.service'
import { AccordionSection } from '../social-research/AccordionSection'

function lastRunLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface AdsResearchSidebarProps {
  savedSearches: SavedAdSearchSummary[]
  activeSearchId: string | null
  /** Platform whose "New search" draft is active, or null. */
  newSearchPlatform: AdsResearchPlatform | null
  searchLoadingId: string | null
  savedAdsActive: boolean
  savedAdsCount: number
  onNewSearch: (platform: AdsResearchPlatform) => void
  onSelectSearch: (search: SavedAdSearchSummary) => void
  onRenameSearch: (search: SavedAdSearchSummary, title: string) => void
  onDeleteSearch: (search: SavedAdSearchSummary) => void | Promise<void>
  onSelectSavedAds: () => void
}

/**
 * Ads Research sidebar: one accordion per ad platform (Meta / TikTok /
 * Google) with that platform's saved searches underneath, plus a "Saved ads"
 * entry for ads bookmarked into the space.
 */
export function AdsResearchSidebar({
  savedSearches,
  activeSearchId,
  newSearchPlatform,
  searchLoadingId,
  savedAdsActive,
  savedAdsCount,
  onNewSearch,
  onSelectSearch,
  onRenameSearch,
  onDeleteSearch,
  onSelectSavedAds,
}: AdsResearchSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<AdsResearchPlatform, boolean>>({
    meta: true,
    tiktok: true,
    google: true,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const commitRename = (search: SavedAdSearchSummary) => {
    const title = editTitle.trim()
    setEditingId(null)
    if (title && title !== search.title) onRenameSearch(search, title)
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      <div className="px-spacing-3 pt-spacing-3 pb-spacing-2 shrink-0">
        <h2 className="body-2 text-foreground font-semibold">Ads Research:</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {ADS_RESEARCH_PLATFORMS.map((platform, index) => {
          const sectionSearches = savedSearches.filter((s) => s.platform === platform)
          const newActive = newSearchPlatform === platform
          return (
            <div key={platform} className={index > 0 ? 'mt-spacing-2' : undefined}>
              <AccordionSection
                title={ADS_PLATFORM_LABELS[platform]}
                open={openSections[platform]}
                onToggle={() =>
                  setOpenSections((prev) => ({ ...prev, [platform]: !prev[platform] }))
                }
                action={
                  <button
                    type="button"
                    onClick={() => onNewSearch(platform)}
                    className={cn(
                      'px-spacing-2 py-spacing-1 flex w-full items-center gap-1.5 rounded-xl text-left text-xs font-medium transition-colors',
                      newActive
                        ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                    )}
                  >
                    <Plus className="h-3 w-3 shrink-0" />
                    New search
                  </button>
                }
              >
                {sectionSearches.map((search) => {
                  const isActive = activeSearchId === search.id && !newSearchPlatform
                  const isEditing = search.id === editingId
                  return (
                    <div
                      key={search.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!isEditing) onSelectSearch(search)
                      }}
                      onKeyDown={(e) => {
                        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          onSelectSearch(search)
                        }
                      }}
                      className={cn(
                        'group/saved px-spacing-2 py-spacing-1 flex cursor-pointer items-center gap-1.5 rounded-xl text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                      )}
                    >
                      {isEditing ? (
                        <>
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') commitRename(search)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--color-secondary)] px-1.5 py-0.5 text-xs text-[var(--foreground)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              commitRename(search)
                            }}
                            className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(null)
                            }}
                            className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          {search.kind === 'brand' && search.advertiser?.image_url ? (
                            <img
                              src={search.advertiser.image_url}
                              alt=""
                              className="h-4 w-4 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <Search className="h-3 w-3 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1 truncate text-xs font-medium">
                            {search.title}
                          </span>
                          <div className="relative flex h-4 shrink-0 items-center">
                            <span
                              className={cn(
                                'shrink-0 text-[11px] text-[var(--color-muted-foreground)] transition-all duration-200 ease-out',
                                'group-hover/saved:pointer-events-none group-hover/saved:translate-x-1 group-hover/saved:opacity-0',
                              )}
                            >
                              {searchLoadingId === search.id
                                ? 'loading…'
                                : lastRunLabel(search.last_run_at)}
                            </span>
                            <div className="absolute right-0 flex translate-x-2 items-center gap-0.5 opacity-0 transition-all duration-200 ease-out group-hover/saved:translate-x-0 group-hover/saved:opacity-100">
                              <button
                                type="button"
                                title="Rename"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingId(search.id)
                                  setEditTitle(search.title)
                                }}
                                className="flex h-4 w-4 items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                title="Delete saved search"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void onDeleteSearch(search)
                                }}
                                className="flex h-4 w-4 items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </AccordionSection>
            </div>
          )
        })}

        <div className="mt-spacing-2 p-spacing-2 pb-0">
          <button
            type="button"
            onClick={onSelectSavedAds}
            className={cn(
              'px-spacing-2 py-spacing-1 flex w-full items-center gap-1.5 rounded-xl text-left text-xs font-medium transition-colors',
              savedAdsActive
                ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
            )}
          >
            <Bookmark className="h-3 w-3 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Saved ads</span>
            {savedAdsCount > 0 ? (
              <span className="badge-glass badge-glass-muted shrink-0 rounded px-1 py-px text-[9px] font-semibold">
                {savedAdsCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  )
}
