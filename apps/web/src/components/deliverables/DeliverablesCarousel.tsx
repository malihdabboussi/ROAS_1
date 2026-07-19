'use client'

import Image from 'next/image'
import { useCallback, useMemo, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, ChevronLeft, ChevronRight, FileText, Grid3x3, List } from 'lucide-react'
import { toast } from 'sonner'
import { DELIVERABLE_PREVIEW_MESSAGES } from '@/components/deliverables/deliverable-preview-messages.config'
import {
  CoreDeliverableCard,
  TaskSectionDeliverablesEmptyMockup,
} from '@/components/deliverables/DeliverablesCarouselCard'
import { DeliverablesListView } from '@/components/deliverables/DeliverablesCarouselListView'
import { isSpaceItemDocDeliverable } from '@/components/deliverables/space-doc-deliverable'
import {
  CORE_DELIVERABLE_TYPES,
  DELIVERABLE_ICONS,
  DELIVERABLE_TYPE_LABEL,
  DeliverableTypeIconBadge,
  exportMissionDeliverablesGoogleDoc,
  type DeliverableType,
  type MissionDeliverable,
} from '@/lib/missions'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export interface DeliverablesCarouselProps {
  deliverables: MissionDeliverable[]
  onSelect: (deliverable: MissionDeliverable) => void
  /** Override default "Deliverables" heading (e.g. task modal: "Files & media"). */
  headingLabel?: string
  /** When the parent already adds top spacing (e.g. task modal footer), use py-0 pt-0 pb-only. */
  compactTop?: boolean
  /** Shown when `deliverables` is empty (default: "No deliverables yet"). */
  emptyStateLabel?: string
  /** Show these extra deliverable types as individual carousel cards (not the aggregate bucket). */
  inlineExtraTypes?: ReadonlySet<DeliverableType>
  /** Replace type label chips with a colored glass icon left of the title. */
  iconBesideTitle?: boolean
  /** Task modal: match Subtasks section (chevron collapse, foreground title, count beside label). */
  taskSectionChrome?: boolean
  /** Start the collapsible task-section presentation closed. */
  defaultCollapsed?: boolean
  /** Mission detail: export space-doc deliverables into one Google Doc (native tabs). */
  missionId?: string | null
}

export function DeliverablesCarousel({
  deliverables,
  onSelect,
  headingLabel = 'Deliverables',
  compactTop = false,
  emptyStateLabel = 'No deliverables yet',
  inlineExtraTypes,
  iconBesideTitle = false,
  taskSectionChrome = false,
  defaultCollapsed = false,
  missionId = null,
}: DeliverablesCarouselProps) {
  const deliverablesCarouselRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [exportingGoogleDoc, setExportingGoogleDoc] = useState(false)

  const { core, extra } = useMemo(() => {
    const c: MissionDeliverable[] = []
    const e: MissionDeliverable[] = []
    for (const d of deliverables) {
      if (CORE_DELIVERABLE_TYPES.has(d.type)) c.push(d)
      else if (inlineExtraTypes?.has(d.type)) c.push(d)
      else e.push(d)
    }
    return { core: c, extra: e }
  }, [deliverables, inlineExtraTypes])

  const scrollDeliverablesBy = useCallback((delta: number) => {
    const el = deliverablesCarouselRef.current
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  const totalCount = deliverables.length
  const hasItems = core.length > 0 || extra.length > 0
  const countLabel = totalCount === 1 ? '1 item' : totalCount > 0 ? `${totalCount} items` : null
  const spaceDocCount = useMemo(
    () => deliverables.filter(isSpaceItemDocDeliverable).length,
    [deliverables],
  )
  const canExportAllToGoogleDocs = Boolean(missionId) && spaceDocCount > 0

  const exportAllToGoogleDocs = useCallback(async () => {
    if (!missionId || exportingGoogleDoc) return
    if (spaceDocCount === 0) {
      toast.error(DELIVERABLE_PREVIEW_MESSAGES.GOOGLE_DOC_TABS_NONE)
      return
    }
    const pendingTab = window.open('about:blank', '_blank')
    if (pendingTab) pendingTab.opener = null
    setExportingGoogleDoc(true)
    try {
      const result = await exportMissionDeliverablesGoogleDoc(missionId)
      const href =
        result.file.webViewLink || `https://docs.google.com/document/d/${result.file.id}/edit`
      if (pendingTab) pendingTab.location.replace(href)
      else window.open(href, '_blank', 'noopener,noreferrer')
      toast.success(DELIVERABLE_PREVIEW_MESSAGES.GOOGLE_DOC_TABS_CREATED(result.tabCount))
    } catch (cause) {
      pendingTab?.close()
      toast.error(
        sanitizeUserError(cause, DELIVERABLE_PREVIEW_MESSAGES.GOOGLE_DOC_TABS_CREATE_FAILED),
      )
    } finally {
      setExportingGoogleDoc(false)
    }
  }, [exportingGoogleDoc, missionId, spaceDocCount])

  const scrollControls = hasItems ? (
    <div className="gap-spacing-2 flex items-center">
      {canExportAllToGoogleDocs ? (
        <button
          type="button"
          onClick={() => void exportAllToGoogleDocs()}
          disabled={exportingGoogleDoc}
          className="button-glass-neutral body-3 gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex shrink-0 items-center whitespace-nowrap"
          aria-label="Export to Google Docs"
        >
          <Image
            src="/Integrations/GoogleDocs.png"
            alt=""
            width={16}
            height={16}
            unoptimized
            className="icon-sm shrink-0 object-contain"
          />
          <span>{exportingGoogleDoc ? 'Exporting…' : 'Export to Google Docs'}</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setViewMode('grid')}
        aria-pressed={viewMode === 'grid'}
        aria-label="Grid view"
        className={`h-spacing-7 rounded-spacing-2 inline-flex aspect-square shrink-0 items-center justify-center transition-colors ${
          viewMode === 'grid'
            ? 'bg-hover-subtle text-foreground'
            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
        }`}
      >
        <Grid3x3 className="icon-sm" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode('list')}
        aria-pressed={viewMode === 'list'}
        aria-label="List view"
        className={`h-spacing-7 rounded-spacing-2 inline-flex aspect-square shrink-0 items-center justify-center transition-colors ${
          viewMode === 'list'
            ? 'bg-hover-subtle text-foreground'
            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
        }`}
      >
        <List className="icon-sm" />
      </button>
      {viewMode === 'grid' ? (
        <>
          <button
            type="button"
            onClick={() => scrollDeliverablesBy(-160)}
            className="btn-icon-glass btn-icon-glass-sm"
            aria-label="Scroll deliverables left"
          >
            <ChevronLeft className="icon-sm" />
          </button>
          <button
            type="button"
            onClick={() => scrollDeliverablesBy(160)}
            className="btn-icon-glass btn-icon-glass-sm"
            aria-label="Scroll deliverables right"
          >
            <ChevronRight className="icon-sm" />
          </button>
        </>
      ) : null}
    </div>
  ) : null

  return (
    <div
      className={`w-full flex-shrink-0 ${
        taskSectionChrome
          ? 'mt-spacing-4 w-full min-w-0'
          : compactTop
            ? 'pb-spacing-4 pt-0'
            : 'py-spacing-4'
      }`}
    >
      <div className="w-full">
        {taskSectionChrome ? (
          <div className="mb-spacing-2 gap-spacing-3 flex items-center">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="gap-spacing-1 flex items-center"
            >
              {collapsed ? (
                <ChevronRight className="icon-sm text-muted-foreground" />
              ) : (
                <ChevronDown className="icon-sm text-muted-foreground" />
              )}
              <span className="body-2 text-foreground font-semibold">{headingLabel}</span>
            </button>
            {countLabel ? <span className="body-3 text-muted-foreground">{countLabel}</span> : null}
            {!collapsed ? <div className="ml-auto">{scrollControls}</div> : null}
          </div>
        ) : (
          <div className="mb-spacing-2 flex items-center justify-between">
            <h3 className="body-2 text-muted-foreground font-semibold">
              {headingLabel} ({totalCount})
            </h3>
            {scrollControls}
          </div>
        )}
        {(!taskSectionChrome || !collapsed) && hasItems && viewMode === 'list' ? (
          <DeliverablesListView deliverables={deliverables} onSelect={onSelect} />
        ) : null}
        {(!taskSectionChrome || !collapsed) &&
          (viewMode === 'grid' || !hasItems) &&
          (hasItems ? (
            <div
              ref={deliverablesCarouselRef}
              className="scrollbar-hide gap-spacing-4 flex flex-nowrap overflow-x-auto"
            >
              {core.map((deliverable) => (
                <CoreDeliverableCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  onSelect={onSelect}
                  iconBesideTitle={iconBesideTitle}
                />
              ))}
              {extra.length > 0 && (
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      type="button"
                      className="card-glass h-spacing-60 w-spacing-60 rounded-spacing-2 hover:bg-secondary gap-spacing-2 flex shrink-0 flex-col items-center justify-center transition-colors"
                      aria-label={`Documents and media, ${extra.length} items — open list`}
                      aria-haspopup="dialog"
                    >
                      <div className="bg-muted-20 h-spacing-10 w-spacing-10 flex items-center justify-center rounded-full">
                        <FileText className="icon-md text-muted-foreground" />
                      </div>
                      <span className="body-3 text-foreground font-medium">
                        Documents & Media ({extra.length})
                      </span>
                      <span className="typo-caption text-muted-foreground">Click to open</span>
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      side="bottom"
                      align="start"
                      sideOffset={8}
                      collisionPadding={16}
                      className="dropdown-menu-solid z-dropdown max-h-[min(60vh,20rem)] w-[min(calc(100vw-2rem),20rem)] overflow-hidden p-0 shadow-xl outline-none"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <p className="px-spacing-3 py-spacing-2 border-border m-0 border-b">
                        <span className="body-3 text-muted-foreground font-semibold">
                          Documents & Media ({extra.length})
                        </span>
                      </p>
                      <div className="gap-spacing-0 p-spacing-1 flex max-h-[min(50vh,17rem)] flex-col overflow-y-auto">
                        {extra.map((d) => {
                          const Icon = DELIVERABLE_ICONS[d.type] || FileText
                          return (
                            <Popover.Close key={d.id} asChild>
                              <button
                                type="button"
                                onClick={() => onSelect(d)}
                                className="hover:bg-secondary rounded-spacing-1 gap-spacing-2 px-spacing-2 py-spacing-2 flex w-full min-w-0 items-center text-left transition-colors"
                              >
                                {iconBesideTitle ? (
                                  <DeliverableTypeIconBadge type={d.type} />
                                ) : (
                                  <Icon className="icon-sm text-muted-foreground shrink-0" />
                                )}
                                <span className="body-3 text-foreground min-w-0 flex-1 truncate font-medium">
                                  {d.title || 'Untitled'}
                                </span>
                                {!iconBesideTitle ? (
                                  <span className="body-4 text-muted-foreground shrink-0">
                                    {DELIVERABLE_TYPE_LABEL[d.type] || d.type}
                                  </span>
                                ) : null}
                              </button>
                            </Popover.Close>
                          )
                        })}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              )}
            </div>
          ) : taskSectionChrome ? (
            <div className="gap-spacing-4 py-spacing-2 flex flex-col items-center text-center">
              <TaskSectionDeliverablesEmptyMockup />
              <p className="body-3 text-muted-foreground max-w-xs">{emptyStateLabel}</p>
            </div>
          ) : (
            <p className="body-3 bg-muted-20 rounded-spacing-2 border-border px-spacing-4 py-spacing-6 text-muted-foreground border border-dashed text-center">
              {emptyStateLabel}
            </p>
          ))}
      </div>
    </div>
  )
}
