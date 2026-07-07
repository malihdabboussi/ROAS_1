'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import * as Popover from '@radix-ui/react-popover'
import {
  Bookmark,
  BookmarkCheck,
  ClipboardCopy,
  ExternalLink,
  Eye,
  Loader2,
  ScanText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import {
  buildIgListFieldDefs,
  IG_LIST_PREVIEW_FIELD_ID,
  IG_RESEARCH_LIST_COLUMN_META,
} from '../../lib/ig-research-list-columns'
import {
  formatViewCount,
  resolveTranscriptHookFromCustomData,
} from '../../services/social-research.service'
import type { SpaceItem } from '../../types'
import type { SocialPlatform, SocialResearchListColumnId } from '../../types/space-schema'
import {
  DraggableColumnHeaders,
  getDefaultWidth,
  SpaceListHeaderCheckbox,
  type TitleColumnSelectAll,
} from '../DraggableColumnHeaders'
import { researchDragLabel, setResearchDragData } from '../social-research/research-drag'
import { resolveSocialThumbnailUrl } from '../social-research/social-image-proxy'
import { GroupedRowGripColumn, SPACE_LIST_ROW_SELECTED_TINT } from '../space-list-group-chrome'
import { formatReadableMultiline, formatTranscriptParagraphs } from './ig-display-text'
import { OutlierChip } from './OutlierChip'
import { SocialResearchEnrichmentBadges } from '../social-research/SocialResearchEnrichmentBadges'

/** Same right-edge mask as `DraggableColumnHeaders` name column / `SpaceItemRow`. */
const STICKY_FIRST_COL_BG =
  'linear-gradient(to right, var(--background) 0, var(--background) max(0px, calc(100% - 4rem)), transparent 100%)'

function igListGridTemplateColumns(
  fieldDefs: ReturnType<typeof buildIgListFieldDefs>,
  columnWidths: Record<string, number>,
): string {
  return (
    fieldDefs.map((f) => `${columnWidths[f.id] ?? getDefaultWidth(f.id)}px`).join(' ') +
    ' minmax(2rem, 1fr)'
  )
}

function normalizeIgListFieldOrder(ids: string[], previewId: string): string[] {
  return [previewId, ...ids.filter((id) => id !== previewId)]
}

export function resolveResearchPostUrl(item: SpaceItem, platform: SocialPlatform): string | null {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const postUrl = cd.post_url
  if (typeof postUrl === 'string' && postUrl.trim()) return postUrl.trim()

  const shortcode = cd.shortcode
  const handle = String(cd._handle ?? '').replace(/^@/, '')
  if (typeof shortcode !== 'string' || !shortcode.trim() || !handle) return null
  const code = shortcode.trim()
  const mediaType = cd.media_type as string | undefined

  if (platform === 'tiktok') {
    return `https://www.tiktok.com/@${handle}/${mediaType === 'slideshow' ? 'photo' : 'video'}/${code}`
  }
  if (platform === 'youtube') {
    return mediaType === 'youtube_short'
      ? `https://www.youtube.com/shorts/${code}`
      : `https://www.youtube.com/watch?v=${code}`
  }
  if (platform === 'twitter') {
    return `https://x.com/${handle}/status/${code}`
  }
  return `https://www.instagram.com/reel/${code}/`
}

export type IgResearchListRowActionsProps = {
  postUrl?: string | null
  saved?: boolean
  saving?: boolean
  analyzing?: boolean
  analyzed?: boolean
  onSave?: () => void
  onAnalyze?: () => void
}

function IgListRowActions({
  postUrl,
  saved,
  saving,
  analyzing,
  analyzed,
  onSave,
  onAnalyze,
}: IgResearchListRowActionsProps) {
  const iconBtnClass =
    'rounded p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:opacity-50'

  return (
    <div
      className="flex min-w-0 items-center justify-start gap-0.5 self-center px-1.5"
      data-ig-list-actions
    >
      {onAnalyze ? (
        <Tooltip label="Analyze post" side="bottom">
          <button
            type="button"
            disabled={analyzing}
            onClick={(e) => {
              e.stopPropagation()
              if (!analyzing) onAnalyze()
            }}
            className={iconBtnClass}
            aria-label={analyzing ? 'Analyzing' : analyzed ? 'Re-analyze' : 'Analyze'}
          >
            {analyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanText className="h-3.5 w-3.5" />
            )}
          </button>
        </Tooltip>
      ) : null}
      {onSave ? (
        <Tooltip label={saved ? 'Saved to research' : 'Save to research'} side="bottom">
          <button
            type="button"
            disabled={saved || saving}
            onClick={(e) => {
              e.stopPropagation()
              if (!saved && !saving) onSave()
            }}
            className="rounded p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:opacity-50"
            aria-label={saved ? 'Saved to research' : 'Save to research'}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-success" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </button>
        </Tooltip>
      ) : null}
      {postUrl ? (
        <Tooltip label="Open post" side="bottom">
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={iconBtnClass}
            aria-label="Open post"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Tooltip>
      ) : null}
    </div>
  )
}

function formatIgMediaType(
  mediaType: string | undefined,
  platform: SocialPlatform = 'instagram',
): string {
  if (mediaType === 'youtube_video') return 'Video'
  if (mediaType === 'youtube_short') return 'Short'
  if (mediaType === 'tweet') return 'Tweet'
  if (mediaType === 'tweet_video') return 'Video'
  if (mediaType === 'reel') return platform === 'tiktok' ? 'Video' : 'Reel'
  if (mediaType === 'slideshow') return 'Slideshow'
  if (mediaType === 'image') return 'Image'
  if (mediaType === 'carousel') return 'Carousel'
  if (mediaType === 'post') return 'Post'
  return mediaType ? String(mediaType) : '—'
}

function CellText({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-w-0 max-w-full truncate text-sm text-[var(--foreground)]"
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </div>
  )
}

function CellClamp({ children }: { children: ReactNode }) {
  return (
    <div className="line-clamp-2 min-h-[2.25rem] min-w-0 max-w-full whitespace-normal break-words text-sm leading-relaxed text-[var(--foreground)]">
      {children}
    </div>
  )
}

const IG_COL_LABEL = new Map(IG_RESEARCH_LIST_COLUMN_META.map((m) => [m.id, m.label]))

function IgListPopoverTextCell({
  columnLabel,
  rawText,
  children,
  formatDisplay = formatReadableMultiline,
}: {
  columnLabel: string
  rawText: string
  children: ReactNode
  formatDisplay?: (raw: string) => string
}) {
  const formatted = formatDisplay(rawText)
  return (
    <div className="min-h-0 w-full min-w-0 self-stretch">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            data-ig-cell-popover
            className="space-cell-hover h-full min-h-0 w-full min-w-0 cursor-pointer text-left"
            aria-label={`Open ${columnLabel}`}
            aria-haspopup="dialog"
          >
            {children}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={16}
            className="dropdown-menu-solid z-dropdown max-h-[min(70vh,28rem)] w-[min(calc(100vw-2rem),26rem)] overflow-hidden p-0 shadow-xl outline-none"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
              <span className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {columnLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    .writeText(rawText)
                    .then(() => toast.success(`${columnLabel} copied`))
                }}
                className="shrink-0 rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                title="Copy"
                aria-label={`Copy ${columnLabel}`}
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-[min(62vh,24rem)] overflow-y-auto p-3">
              <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">
                {formatted}
              </p>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

function IgListHeaderStrip({
  fieldDefs,
  columnWidths,
  stickyTop,
  onColumnResize,
  onColumnReorder,
  selectAllCheckbox,
}: {
  fieldDefs: ReturnType<typeof buildIgListFieldDefs>
  columnWidths: Record<string, number>
  stickyTop: boolean
  onColumnResize: (fieldId: string, width: number) => void
  onColumnReorder: (dataColumnIds: SocialResearchListColumnId[]) => Promise<void>
  selectAllCheckbox: TitleColumnSelectAll | null
}) {
  const selectAllOn =
    selectAllCheckbox != null && (selectAllCheckbox.checked || selectAllCheckbox.indeterminate)

  const head = (
    <div className="group/spacehead sticky left-0 z-30 flex w-full min-w-0 flex-col bg-[var(--background)]">
      <div className="flex w-full min-w-0 items-stretch">
        <div className="relative sticky left-0 z-30 flex w-10 shrink-0 items-center pb-1.5 pl-[21px] pt-1">
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[var(--background)]"
            aria-hidden
          />
          {selectAllCheckbox && (
            <div
              className={cn(
                'relative z-[1] shrink-0 transition-opacity duration-0',
                selectAllOn ? 'opacity-100' : 'opacity-0 group-hover/spacehead:opacity-100',
              )}
            >
              <SpaceListHeaderCheckbox
                checked={selectAllCheckbox.checked}
                indeterminate={selectAllCheckbox.indeterminate}
                onToggle={selectAllCheckbox.onToggle}
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <DraggableColumnHeaders
            visibleFields={fieldDefs}
            listLayout="grouped"
            compact
            indented
            selectAllInTitleColumn={null}
            columnWidths={columnWidths}
            onColumnResize={onColumnResize}
            nameColumnFieldId={IG_LIST_PREVIEW_FIELD_ID}
            nameColumnDraggable={false}
            trailingColumnLabel="Actions"
            onReorder={async (newIds) => {
              const normalized = normalizeIgListFieldOrder(newIds, IG_LIST_PREVIEW_FIELD_ID)
              const dataOnly = normalized.filter(
                (id) => id !== IG_LIST_PREVIEW_FIELD_ID,
              ) as SocialResearchListColumnId[]
              await onColumnReorder(dataOnly)
              toast.success('View saved')
            }}
            surface="list"
          />
        </div>
      </div>
      <div className="flex w-full min-w-0" aria-hidden>
        <div className="sticky left-0 z-[35] h-[0.5px] w-10 shrink-0 bg-[var(--background)]" />
        <div className="mr-4 h-[0.5px] min-h-[0.5px] min-w-0 flex-1 bg-[var(--border)]" />
      </div>
    </div>
  )

  if (stickyTop) {
    return (
      <div className="sticky top-0 z-20 flex shrink-0 flex-col bg-[var(--background)]">{head}</div>
    )
  }
  return head
}

function renderIgListDataCell(
  item: SpaceItem,
  id: SocialResearchListColumnId,
  platform: SocialPlatform,
): ReactNode {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const playCount = (cd.play_count as number) ?? 0
  const outlierScore = (cd.outlier_score as number) ?? 0
  const handle = String(cd._handle ?? '')
  const ownerFullName = String((cd.owner_full_name as string | undefined) ?? '').trim()
  const mediaType = cd.media_type as string | undefined
  const takenAt = cd.taken_at as string | null
  const likeCount = cd.like_count as number | null | undefined
  const commentCount = cd.comment_count as number | null | undefined
  const caption = (cd.caption as string) ?? null
  const { transcript, hook } = resolveTranscriptHookFromCustomData(cd)

  const posted =
    takenAt && !Number.isNaN(new Date(takenAt).getTime())
      ? new Date(takenAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—'

  const label = IG_COL_LABEL.get(id) ?? id
  const wrap = (inner: ReactNode) => (
    <div className="relative z-0 flex h-full min-h-0 w-full max-w-full items-center overflow-hidden">
      {inner}
    </div>
  )

  switch (id) {
    case 'format':
      return wrap(
        <span className="min-w-0 max-w-full self-center truncate px-1.5 py-0.5 text-sm font-medium text-[var(--foreground)]">
          {formatIgMediaType(mediaType, platform)}
        </span>,
      )
    case 'multiplier':
      return wrap(
        <div className="self-center px-1.5 py-0.5">
          <OutlierChip score={outlierScore} />
        </div>,
      )
    case 'views':
      return wrap(
        <span className="min-w-0 max-w-full self-center truncate px-1.5 py-0.5 text-xs tabular-nums text-[var(--foreground)]">
          {formatViewCount(playCount)}
        </span>,
      )
    case 'likes':
      return wrap(
        <span className="min-w-0 max-w-full self-center truncate px-1.5 py-0.5 text-xs tabular-nums text-[var(--foreground)]">
          {likeCount != null ? likeCount.toLocaleString() : '—'}
        </span>,
      )
    case 'comments':
      return wrap(
        <span className="min-w-0 max-w-full self-center truncate px-1.5 py-0.5 text-xs tabular-nums text-[var(--foreground)]">
          {commentCount != null ? commentCount.toLocaleString() : '—'}
        </span>,
      )
    case 'posted':
      return wrap(
        <span className="min-w-0 max-w-full self-center truncate px-1.5 py-0.5 text-sm text-[var(--foreground)]">
          {posted}
        </span>,
      )
    case 'account':
      return wrap(
        <div className="min-w-0 self-center px-1.5 py-0.5">
          <CellText>
            {ownerFullName && handle
              ? `${ownerFullName} (@${handle})`
              : handle
                ? `@${handle}`
                : ownerFullName || '—'}
          </CellText>
        </div>,
      )
    case 'caption':
      if (!caption) {
        return wrap(
          <span className="self-center px-1.5 py-0.5 text-sm text-[var(--color-muted-foreground)]">
            —
          </span>,
        )
      }
      return wrap(
        <IgListPopoverTextCell columnLabel={label} rawText={caption}>
          <CellClamp>{caption}</CellClamp>
        </IgListPopoverTextCell>,
      )
    case 'hook':
      if (!hook) {
        return wrap(
          <span className="self-center px-1.5 py-0.5 text-sm text-[var(--color-muted-foreground)]">
            —
          </span>,
        )
      }
      return wrap(
        <IgListPopoverTextCell columnLabel={label} rawText={hook}>
          <CellClamp>{hook}</CellClamp>
        </IgListPopoverTextCell>,
      )
    case 'transcript':
      if (!transcript) {
        return wrap(
          <span className="self-center px-1.5 py-0.5 text-sm text-[var(--color-muted-foreground)]">
            —
          </span>,
        )
      }
      return wrap(
        <IgListPopoverTextCell
          columnLabel={label}
          rawText={transcript}
          formatDisplay={formatTranscriptParagraphs}
        >
          <CellClamp>{transcript}</CellClamp>
        </IgListPopoverTextCell>,
      )
  }
}

export type IgResearchListRowClickHandler = (
  item: SpaceItem,
  opts?: { openVideoExpanded?: boolean },
) => void

function IgListRow({
  item,
  platform,
  visibleColumnIds,
  gridTemplateColumns,
  onRowClick,
  onToggleSelect,
  isSelected,
  resolveRowActions,
}: {
  item: SpaceItem
  platform: SocialPlatform
  visibleColumnIds: SocialResearchListColumnId[]
  gridTemplateColumns: string
  onRowClick: IgResearchListRowClickHandler
  onToggleSelect: (itemId: string) => void
  isSelected: boolean
  resolveRowActions?: (
    item: SpaceItem,
    platform: SocialPlatform,
    onRowClick: IgResearchListRowClickHandler,
  ) => IgResearchListRowActionsProps | null
}) {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const thumbnailUrl = resolveSocialThumbnailUrl(platform, cd)
  const mediaType = cd.media_type as string | undefined
  const rowActions =
    resolveRowActions?.(item, platform, onRowClick) ??
    ({
      postUrl: resolveResearchPostUrl(item, platform),
      onAnalyze: () => onRowClick(item),
    } satisfies IgResearchListRowActionsProps)

  return (
    <div
      className="group/row relative"
      draggable
      onDragStart={(e) =>
        setResearchDragData(e, {
          id: item.id,
          platform,
          label: researchDragLabel(
            platform,
            cd._handle as string | undefined,
            (cd.play_count as number) ?? 0,
          ),
        })
      }
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-none',
          isSelected
            ? SPACE_LIST_ROW_SELECTED_TINT
            : 'group-hover/row:bg-[var(--color-hover-subtle)]',
        )}
        aria-hidden
      />
      <div className="relative flex min-w-0 items-stretch">
        <GroupedRowGripColumn
          itemId={item.id}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          hideGrip
          surface="list"
          tableRowLabel={null}
        />
        <div className="min-w-0 flex-1 pr-4">
          <div
            className="relative z-[2] grid w-full min-w-0 cursor-pointer items-stretch gap-0 text-left"
            style={{ gridTemplateColumns }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('[data-ig-cell-popover]')) return
              if ((e.target as HTMLElement).closest('[data-ig-list-actions]')) return
              onRowClick(item)
            }}
          >
            <div
              className="relative sticky left-10 z-30 z-[2] flex h-full min-h-0 min-w-0 items-stretch"
              style={{ background: STICKY_FIRST_COL_BG }}
            >
              <div
                className="space-cell-hover flex h-full min-h-0 w-full min-w-0 cursor-pointer items-stretch text-left"
                onClick={(e) => {
                  e.stopPropagation()
                  onRowClick(item, { openVideoExpanded: true })
                }}
              >
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-black/10">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-foreground)]">
                      <Eye className="h-4 w-4 opacity-40" />
                    </div>
                  )}
                  {mediaType === 'reel' && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-medium text-white">
                      {platform === 'tiktok' ? 'V' : 'R'}
                    </span>
                  )}
                  {mediaType === 'youtube_video' && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-medium text-white">
                      V
                    </span>
                  )}
                  {mediaType === 'youtube_short' && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-medium text-white">
                      S
                    </span>
                  )}
                  {mediaType === 'tweet' && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-medium text-white">
                      T
                    </span>
                  )}
                  {mediaType === 'tweet_video' && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-medium text-white">
                      V
                    </span>
                  )}
                  {mediaType === 'slideshow' && (
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-medium text-white">
                      S
                    </span>
                  )}
                  <SocialResearchEnrichmentBadges
                    customData={cd}
                    variant="overlay"
                    className="absolute bottom-0.5 right-0.5"
                  />
                </div>
              </div>
            </div>
            {visibleColumnIds.map((id) => (
              <div key={`${item.id}:${id}`} className="relative z-0 flex h-full min-h-0 min-w-0">
                {renderIgListDataCell(item, id, platform)}
              </div>
            ))}
            <div className="relative z-0 flex h-full min-h-0 min-w-0 items-stretch">
              {rowActions ? <IgListRowActions {...rowActions} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InstagramResearchListBody({
  items,
  platform = 'instagram',
  resolveItemPlatform,
  visibleColumnIds,
  columnWidths,
  onColumnResize,
  onColumnReorder,
  onRowClick,
  selectedIds,
  onToggleSelect,
  onBulkSelectInScope,
  listSection = 'ungrouped',
  resolveRowActions,
}: {
  items: SpaceItem[]
  platform?: SocialPlatform
  resolveItemPlatform?: (item: SpaceItem) => SocialPlatform
  visibleColumnIds: SocialResearchListColumnId[]
  columnWidths: Record<string, number>
  onColumnResize: (fieldId: string, width: number) => void
  onColumnReorder: (dataColumnIds: SocialResearchListColumnId[]) => Promise<void>
  onRowClick: IgResearchListRowClickHandler
  selectedIds: Set<string>
  onToggleSelect: (itemId: string) => void
  onBulkSelectInScope: (itemIds: string[], select: boolean) => void
  listSection?: 'ungrouped' | 'grouped'
  resolveRowActions?: (
    item: SpaceItem,
    platform: SocialPlatform,
    onRowClick: IgResearchListRowClickHandler,
  ) => IgResearchListRowActionsProps | null
}) {
  const fieldDefs = buildIgListFieldDefs(visibleColumnIds)
  const gridTemplateColumns = igListGridTemplateColumns(fieldDefs, columnWidths)
  const isGrouped = listSection === 'grouped'

  const selectAllCheckbox = useMemo((): TitleColumnSelectAll | null => {
    const itemIds = items.map((i) => i.id)
    if (itemIds.length === 0) return null
    const n = itemIds.filter((id) => selectedIds.has(id)).length
    const all = n === itemIds.length
    const some = n > 0 && !all
    return {
      checked: all,
      indeterminate: some,
      onToggle: () => {
        if (all) onBulkSelectInScope(itemIds, false)
        else onBulkSelectInScope(itemIds, true)
      },
    }
  }, [items, selectedIds, onBulkSelectInScope])

  return (
    <div className="min-w-0">
      <IgListHeaderStrip
        fieldDefs={fieldDefs}
        columnWidths={columnWidths}
        stickyTop={!isGrouped}
        onColumnResize={onColumnResize}
        onColumnReorder={onColumnReorder}
        selectAllCheckbox={selectAllCheckbox}
      />
      <div className="flex flex-col divide-y divide-[var(--border)]">
        {items.map((item) => {
          const cd = item.custom_data as Record<string, unknown> | undefined
          const rowKey =
            typeof cd?.media_id === 'string' && cd.media_id.trim() ? cd.media_id : item.id
          return (
            <IgListRow
              key={rowKey}
              item={item}
              platform={resolveItemPlatform?.(item) ?? platform}
              visibleColumnIds={visibleColumnIds}
              gridTemplateColumns={gridTemplateColumns}
              onRowClick={onRowClick}
              onToggleSelect={onToggleSelect}
              isSelected={selectedIds.has(item.id)}
              resolveRowActions={resolveRowActions}
            />
          )
        })}
      </div>
    </div>
  )
}
