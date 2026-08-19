'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Layers3,
  LayoutGrid,
  List,
  Package,
  Presentation,
  Search,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { formatArtifactDate } from '@/lib/artifacts/artifact-date'
import {
  fetchGlobalArtifacts,
  type GlobalArtifactCategory,
  type GlobalArtifactItem,
} from '@/lib/artifacts/global-artifacts-api'
import { openArtifactInShell } from '@/lib/artifacts/shell-artifact-viewer'
import { cn } from '@/lib/utils/cn'
import { ARTIFACT_LIBRARY_ERRORS } from '../config/artifact-library-errors.config'
import {
  ARTIFACT_LIBRARY_FILTERS,
  ARTIFACT_LIBRARY_MESSAGES,
  ARTIFACT_LIBRARY_SOURCE_FILTERS,
} from '../config/artifact-library-messages.config'

type ArtifactFilter = 'all' | GlobalArtifactCategory
type SourceFilter = (typeof ARTIFACT_LIBRARY_SOURCE_FILTERS)[number]['id']
type ArtifactView = 'list' | 'cards'

function ArtifactIcon({ category }: { category: GlobalArtifactCategory }) {
  if (category === 'docs') return <FileText />
  if (category === 'images') return <FileImage />
  if (category === 'videos') return <Film />
  if (category === 'sheets') return <FileSpreadsheet />
  if (category === 'presentations') return <Presentation />
  if (category === 'funnels') return <Workflow />
  if (category === 'artifacts') return <Package />
  return <File />
}

function badgeClass(category: GlobalArtifactCategory): string {
  if (category === 'docs') return 'badge-glass-blue'
  if (category === 'images') return 'badge-glass-purple'
  if (category === 'videos') return 'badge-glass-purple'
  if (category === 'sheets') return 'badge-glass-green'
  if (category === 'presentations') return 'badge-glass-purple'
  if (category === 'funnels') return 'badge-glass-orange'
  if (category === 'artifacts') return 'badge-glass-cyan'
  return 'badge-glass-muted'
}

export function GlobalArtifactsPage({
  embedded = false,
  initialFilter = 'all',
}: {
  embedded?: boolean
  initialFilter?: ArtifactFilter
} = {}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filter, setFilter] = useState<ArtifactFilter>(initialFilter)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('created')
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false)
  const [view, setView] = useState<ArtifactView>('list')
  const [items, setItems] = useState<GlobalArtifactItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setFilter(initialFilter)
  }, [initialFilter])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    void fetchGlobalArtifacts(debouncedQuery, controller.signal)
      .then(setItems)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setItems([])
        setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [debouncedQuery, reloadKey])

  const visibleItems = useMemo(() => {
    const sourceItems =
      sourceFilter === 'all'
        ? items
        : sourceFilter === 'uploaded'
          ? items.filter((item) => item.sourceKind === 'uploaded')
          : items.filter((item) => item.sourceKind !== 'uploaded')
    const categoryItems =
      filter === 'all' ? sourceItems : sourceItems.filter((item) => item.category === filter)
    return categoryItems
  }, [filter, items, sourceFilter])

  const emptyMessage = debouncedQuery
    ? ARTIFACT_LIBRARY_MESSAGES.emptySearch
    : ARTIFACT_LIBRARY_MESSAGES.empty

  return (
    <main className="scrollbar-hide h-full min-h-0 overflow-y-auto overflow-x-hidden">
      <div
        className={cn(
          'w-full',
          embedded ? 'p-spacing-3' : 'p-spacing-4 md:p-spacing-6 mx-auto max-w-4xl',
        )}
      >
        {embedded ? null : (
          <div className="mb-spacing-4">
            <div className="gap-spacing-2 flex items-center">
              <Layers3 className="text-muted-foreground h-5 w-5" />
              <h1 className="title-h3 text-foreground">{ARTIFACT_LIBRARY_MESSAGES.title}</h1>
            </div>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {ARTIFACT_LIBRARY_MESSAGES.subtitle}
            </p>
          </div>
        )}

        <label className="relative block w-full">
          <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ARTIFACT_LIBRARY_MESSAGES.searchPlaceholder}
            className="input-leading h-spacing-9 pr-spacing-3 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-foreground w-full border outline-none"
          />
        </label>

        <div className="my-spacing-3 gap-spacing-3 flex items-center justify-between">
          <div className="gap-spacing-2 flex flex-wrap" aria-label="Artifact filters">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSourceMenuOpen((open) => !open)}
                aria-label="Source filters"
                aria-expanded={sourceMenuOpen}
                className="button-glass-secondary body-3 px-spacing-3 py-spacing-1-5 gap-spacing-1 flex items-center rounded-full font-medium"
              >
                <SlidersHorizontal className="icon-sm" />
                <span>
                  {ARTIFACT_LIBRARY_SOURCE_FILTERS.find((item) => item.id === sourceFilter)?.label}
                </span>
                <ChevronDown className="icon-xs" />
              </button>
              {sourceMenuOpen ? (
                <div className="mt-spacing-1 z-dropdown absolute left-0 top-full">
                  <div className="dropdown-menu-solid p-spacing-2 min-w-56">
                    <p className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 uppercase">
                      Source
                    </p>
                    {ARTIFACT_LIBRARY_SOURCE_FILTERS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSourceFilter(option.id)
                          setSourceMenuOpen(false)
                        }}
                        className="hover:bg-hover-subtle px-spacing-2 py-spacing-2 gap-spacing-2 rounded-spacing-1 flex w-full items-start text-left transition-colors"
                      >
                        <span className="h-spacing-5 w-spacing-5 flex shrink-0 items-center justify-center">
                          {sourceFilter === option.id ? (
                            <Check className="icon-sm text-foreground" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="body-3 text-foreground block font-medium">
                            {option.label}
                          </span>
                          <span className="body-4 text-muted-foreground block">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {ARTIFACT_LIBRARY_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                className={cn(
                  'body-3 px-spacing-3 py-spacing-1-5 rounded-full font-medium transition-colors',
                  filter === option.id
                    ? 'nav-glass-selected-purple'
                    : 'bg-secondary text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="gap-spacing-1 flex shrink-0 items-center" aria-label="Artifact view">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label="List view"
              aria-pressed={view === 'list'}
              className={cn(
                'h-spacing-7 rounded-spacing-2 flex aspect-square items-center justify-center transition-colors',
                view === 'list'
                  ? 'bg-hover-subtle text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
              )}
            >
              <List className="icon-sm" />
            </button>
            <button
              type="button"
              onClick={() => setView('cards')}
              aria-label="Card view"
              aria-pressed={view === 'cards'}
              className={cn(
                'h-spacing-7 rounded-spacing-2 flex aspect-square items-center justify-center transition-colors',
                view === 'cards'
                  ? 'bg-hover-subtle text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
              )}
            >
              <LayoutGrid className="icon-sm" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <VibeyLoadingOrb
              text={ARTIFACT_LIBRARY_MESSAGES.loading}
              state="processing"
              size="sm"
            />
          </div>
        ) : error ? (
          <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
            <p className="body-2 text-foreground font-medium">{ARTIFACT_LIBRARY_ERRORS.load}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="button-glass-secondary body-3 mt-spacing-3 rounded-lg px-3 py-2 font-medium"
            >
              Try again
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
            <Layers3 className="text-muted-foreground mb-spacing-2 mx-auto h-8 w-8" />
            <p className="body-2 text-foreground font-medium">{emptyMessage}</p>
          </div>
        ) : view === 'list' ? (
          <ul className="flex flex-col">
            {visibleItems.map((item) => (
              <li key={`${item.category}:${item.id}`} className="border-border border-b">
                <button
                  type="button"
                  onClick={() => openArtifactInShell(item.viewer)}
                  className="hover:bg-hover-subtle gap-spacing-3 p-spacing-2 rounded-spacing-2 flex w-full min-w-0 items-center text-left transition-colors"
                >
                  {item.category === 'images' && item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={`${item.title} preview`}
                      width={64}
                      height={48}
                      unoptimized
                      className="h-spacing-12 w-spacing-16 rounded-spacing-2 border-border shrink-0 border object-cover"
                    />
                  ) : item.category === 'videos' && item.viewer.fileUrl ? (
                    <video
                      src={item.viewer.fileUrl}
                      aria-label={`${item.title} preview`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-spacing-12 w-spacing-16 rounded-spacing-2 border-border shrink-0 border object-cover"
                    />
                  ) : (
                    <span className="surface-card border-border text-muted-foreground rounded-spacing-2 h-spacing-9 w-spacing-9 flex shrink-0 items-center justify-center border [&>svg]:h-4 [&>svg]:w-4">
                      <ArtifactIcon category={item.category} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="body-2 text-foreground block truncate font-medium">
                      {item.title}
                    </span>
                    <span className="body-4 text-muted-foreground block truncate">
                      {item.contextLabel}
                    </span>
                  </span>
                  <span
                    className={cn('badge-glass badge-glass-sm shrink-0', badgeClass(item.category))}
                  >
                    {item.badge}
                  </span>
                  <span className="body-4 text-muted-foreground hidden shrink-0 sm:block">
                    {formatArtifactDate(item.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div
            data-testid="artifact-card-grid"
            className="gap-spacing-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visibleItems.map((item) => (
              <button
                key={`${item.category}:${item.id}`}
                type="button"
                onClick={() => openArtifactInShell(item.viewer)}
                className="surface-card border-border rounded-spacing-3 hover:bg-hover-subtle flex min-w-0 flex-col overflow-hidden border text-left transition-colors"
              >
                <span className="bg-secondary flex aspect-video w-full items-center justify-center overflow-hidden">
                  {item.category === 'images' && item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={`${item.title} preview`}
                      width={640}
                      height={360}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : item.category === 'videos' && item.viewer.fileUrl ? (
                    <video
                      src={item.viewer.fileUrl}
                      aria-label={`${item.title} preview`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground [&>svg]:h-8 [&>svg]:w-8">
                      <ArtifactIcon category={item.category} />
                    </span>
                  )}
                </span>
                <span className="p-spacing-3 gap-spacing-2 flex w-full min-w-0 flex-col">
                  <span className="body-2 text-foreground truncate font-medium">{item.title}</span>
                  <span className="gap-spacing-2 flex items-center justify-between">
                    <span className="body-4 text-muted-foreground truncate">
                      {item.contextLabel}
                    </span>
                    <span className="body-4 text-muted-foreground shrink-0">
                      {formatArtifactDate(item.updatedAt)}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
