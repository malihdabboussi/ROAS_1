'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Album,
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  FileText,
  GitBranch,
  Hash,
  Image,
  Layers,
  LayoutGrid,
  Library,
  MessageSquare,
  Search,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'
import {
  MEDIA_GROUP_BY_OPTIONS,
  normalizeMediaGroupBy,
} from '../../../../lib/media-group-by-options'
import {
  DEFAULT_MEDIA_VIEW_CONFIG,
  DOC_SOURCE_LABELS,
  DOCS_VIEW_SOURCE_KEYS,
  resolveMediaTypeFilters,
  resolveSubtasksDisplay,
  type FieldDef,
  type FieldType,
  type MediaAssetTypePick,
  type MediaViewConfig,
  type SpaceSchema,
  type ViewDef,
} from '../../../../types/space-schema'
import { CustomizeViewManagementSection } from '../../../customize-view-management-section'
import { SUBTASKS_TOOLBAR_OPTIONS } from '../../../subtasks-toolbar-menu'
import { ViewFieldsVisibilityContent } from '../../shared/ViewFieldsVisibilityContent'
import { CreateNewFieldList } from './CreateNewFieldList'
import { FieldEditor } from './FieldEditor'

const DOC_SOURCE_ICON_BY_KEY = {
  studio: MessageSquare,
  channel: Hash,
  dm: UserRound,
  space: FileText,
  mission: Bot,
  campaign: Library,
}

const MEDIA_TYPE_PICK_ORDER: MediaAssetTypePick[] = ['image', 'video']

function mediaTypeCustomizeSummary(filters: MediaAssetTypePick[]): string {
  if (filters.length === 0) return 'All types'
  const parts: string[] = []
  if (filters.includes('image')) parts.push('Image')
  if (filters.includes('video')) parts.push('Video')
  return parts.join(' · ')
}

export function DefaultMainView({
  activeView,
  viewIconName,
  viewIconColor,
  nameDraft,
  setNameDraft,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  onClose,
  shownFields,
  hideFieldsSection = false,
  onOpenFields,
  groupByField,
  groupableFields,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onOpenSharingPermissions,
  onOpenStatusEditor,
}: {
  activeView: ViewDef
  viewIconName: string
  viewIconColor: { textColor: string }
  nameDraft: string
  setNameDraft: (v: string) => void
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  onClose: () => void
  shownFields: FieldDef[]
  hideFieldsSection?: boolean
  onOpenFields: () => void
  groupByField: FieldDef | undefined
  groupableFields: FieldDef[]
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
  onOpenStatusEditor?: () => void
}) {
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const [subtasksMenuOpen, setSubtasksMenuOpen] = useState(false)
  const [mediaTypeMenuOpen, setMediaTypeMenuOpen] = useState(false)

  useEffect(() => {
    setGroupMenuOpen(false)
    setSubtasksMenuOpen(false)
    setMediaTypeMenuOpen(false)
  }, [activeView.id])

  const showSubtasksCustomize =
    activeView.type === 'list' || activeView.type === 'table' || activeView.type === 'kanban'

  const mergedMc = useMemo(
    () => ({ ...DEFAULT_MEDIA_VIEW_CONFIG, ...(activeView.media_config ?? {}) }),
    [activeView.media_config],
  )

  const mediaTypeFilters = useMemo(() => resolveMediaTypeFilters(mergedMc), [mergedMc])

  const mediaGbNormalized = normalizeMediaGroupBy(mergedMc.group_by)
  const mediaGroupRowSummary =
    activeView.type === 'media'
      ? mediaGbNormalized === 'none'
        ? 'None'
        : (MEDIA_GROUP_BY_OPTIONS.find((o) => o.id === mediaGbNormalized)?.label ??
          mediaGbNormalized)
      : ''

  const spaceGroupSummaryLabel = groupByField?.name ?? 'None'

  const patchMediaMc = (patch: Partial<MediaViewConfig>) => {
    void onViewPatch({
      media_config: {
        ...DEFAULT_MEDIA_VIEW_CONFIG,
        ...(activeView.media_config ?? {}),
        ...patch,
      },
    })
  }

  const toggleMediaTypePick = (pick: MediaAssetTypePick) => {
    const has = mediaTypeFilters.includes(pick)
    const next = has ? mediaTypeFilters.filter((x) => x !== pick) : [...mediaTypeFilters, pick]
    patchMediaMc({ type_filters: next, type_filter: undefined })
  }

  const clearMediaTypeFiltersCustomize = () => {
    patchMediaMc({ type_filters: [], type_filter: undefined })
  }

  const subtasksMode = resolveSubtasksDisplay(activeView)
  const subtasksSummary =
    subtasksMode === 'collapsed'
      ? 'Collapsed'
      : subtasksMode === 'expanded'
        ? 'Expanded'
        : 'Separate'

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconPicker
            className="z-10 shrink-0"
            value={viewIconName}
            color={activeView.icon_color}
            size="sm"
            onChange={(name) => void onViewPatch({ icon: name })}
            onColorChange={(colorId: IconColorId) => void onViewPatch({ icon_color: colorId })}
            customTrigger={
              <LucideIcon name={viewIconName} className={`h-4 w-4 ${viewIconColor.textColor}`} />
            }
          />
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim()
              if (!trimmed) {
                setNameDraft(activeView.name)
                return
              }
              if (trimmed !== activeView.name) void onViewPatch({ name: trimmed })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1 font-semibold text-[var(--foreground)] outline-none focus:border-[var(--border)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Section 1 — view toggles (docs cover + list/kanban/etc.) */}
        <div className="space-y-3 px-4 py-3">
          {activeView.type === 'docs' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="body-3 text-[var(--foreground)]">Show cover images</span>
                <Switch
                  checked={activeView.docs_config?.show_cover_images ?? false}
                  onCheckedChange={(v) =>
                    void onViewPatch({
                      docs_config: { ...(activeView.docs_config ?? {}), show_cover_images: v },
                    })
                  }
                />
              </div>
              <div className="space-y-2 pt-2">
                <div className="body-3 font-semibold text-[var(--foreground)]">Source</div>
                <p className="text-[10px] leading-snug text-[var(--color-muted-foreground)]">
                  Limit this view to docs from Studio, Channels, DMs, Space, Missions, or Campaign
                  docs. Clear selections here to include every origin (including Drive).
                </p>
                <div className="flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] p-1">
                  {DOCS_VIEW_SOURCE_KEYS.map((key) => {
                    const Icon = DOC_SOURCE_ICON_BY_KEY[key]
                    const label = DOC_SOURCE_LABELS[key]
                    const filters = activeView.docs_config?.doc_source_filters ?? []
                    const sel = filters.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const dc = activeView.docs_config ?? {}
                          const cur = dc.doc_source_filters ?? []
                          const next = sel ? cur.filter((x) => x !== key) : [...cur, key]
                          void onViewPatch({
                            docs_config: { ...dc, doc_source_filters: next },
                          })
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                          {label}
                        </span>
                        {sel ? (
                          <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
                {(() => {
                  const cur = activeView.docs_config?.doc_source_filters ?? []
                  const mainSel = cur.filter((k) =>
                    (DOCS_VIEW_SOURCE_KEYS as readonly string[]).includes(k),
                  )
                  if (mainSel.length === 0) return null
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const dc = activeView.docs_config ?? {}
                        const rest = cur.filter(
                          (k) => !(DOCS_VIEW_SOURCE_KEYS as readonly string[]).includes(k),
                        )
                        void onViewPatch({
                          docs_config: {
                            ...dc,
                            doc_source_filters: rest.length === 0 ? [] : rest,
                          },
                        })
                      }}
                      className="text-[10px] text-[var(--color-muted-foreground)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
                    >
                      Clear source filters
                    </button>
                  )
                })()}
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="body-3 text-[var(--foreground)]">Show empty statuses</span>
            <Switch
              checked={activeView.show_empty_statuses ?? false}
              onCheckedChange={(v) => void onViewPatch({ show_empty_statuses: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="body-3 text-[var(--foreground)]">Show closed tasks</span>
            <Switch
              checked={activeView.show_closed_tasks ?? false}
              onCheckedChange={(v) => void onViewPatch({ show_closed_tasks: v })}
            />
          </div>
        </div>

        {/* Section 2 — Fields / Group / Subtasks */}
        <div className="space-y-2.5 border-t border-[var(--border)] px-4 py-3">
          {!hideFieldsSection ? (
            <button
              type="button"
              onClick={onOpenFields}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex items-center gap-1.5">
                <Album className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">Fields</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {shownFields.length} shown
                </span>
                <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </div>
            </button>
          ) : null}

          {activeView.type === 'media' ? (
            <div className={cn('relative', mediaTypeMenuOpen && 'z-[21]')}>
              <button
                type="button"
                onClick={() => {
                  setMediaTypeMenuOpen((o) => !o)
                  setGroupMenuOpen(false)
                }}
                className="flex w-full items-center justify-between transition-colors hover:opacity-80"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 font-semibold text-[var(--foreground)]">Types</span>
                </div>
                <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
                  <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                    {mediaTypeCustomizeSummary(mediaTypeFilters)}
                  </span>
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                      mediaTypeMenuOpen && 'rotate-90',
                    )}
                  />
                </div>
              </button>
              {mediaTypeMenuOpen ? (
                <div className="dropdown-menu-solid z-dropdown absolute bottom-full left-0 right-0 mb-1 max-h-[min(70vh,280px)] overflow-y-auto py-1 shadow-lg">
                  <div className="flex flex-col px-1">
                    <button
                      type="button"
                      onClick={() => clearMediaTypeFiltersCustomize()}
                      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                        All types
                      </span>
                      {mediaTypeFilters.length === 0 ? (
                        <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                      ) : null}
                    </button>
                    {MEDIA_TYPE_PICK_ORDER.map((opt) => {
                      const active = mediaTypeFilters.includes(opt)
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleMediaTypePick(opt)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                        >
                          <span className="flex items-center gap-2 capitalize">
                            {opt === 'image' ? (
                              <Image className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                            ) : (
                              <Video className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                            )}
                            {opt}
                          </span>
                          {active ? (
                            <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={cn('relative', groupMenuOpen && 'z-[21]')}>
            <button
              type="button"
              onClick={() => {
                setGroupMenuOpen((o) => !o)
                setMediaTypeMenuOpen(false)
              }}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">Group</span>
              </div>
              <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
                <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                  {activeView.type === 'media' ? mediaGroupRowSummary : spaceGroupSummaryLabel}
                </span>
                <ChevronRight
                  className={cn(
                    'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                    groupMenuOpen && 'rotate-90',
                  )}
                />
              </div>
            </button>

            {groupMenuOpen && activeView.type === 'media' ? (
              <div className="dropdown-menu-solid z-dropdown absolute bottom-full left-0 right-0 mb-1 max-h-[min(85vh,480px)] overflow-y-auto p-2 shadow-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] p-1">
                    <button
                      type="button"
                      onClick={() => patchMediaMc({ group_by: 'none', group_sort: undefined })}
                      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span>None</span>
                      {mediaGbNormalized === 'none' ? (
                        <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                      ) : null}
                    </button>
                    {MEDIA_GROUP_BY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          patchMediaMc({
                            group_by: opt.id,
                            group_sort: mergedMc.group_sort ?? 'desc',
                          })
                        }
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                      >
                        <span>{opt.label}</span>
                        {mediaGbNormalized === opt.id ? (
                          <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  {mediaGbNormalized !== 'none' ? (
                    <div className="flex flex-wrap gap-1">
                      {(['asc', 'desc'] as const).map((dir) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => patchMediaMc({ group_sort: dir })}
                          className={cn(
                            'body-3 rounded-lg px-3 py-1.5 transition-colors',
                            (mergedMc.group_sort ?? 'desc') === dir
                              ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--foreground)]'
                              : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                          )}
                        >
                          {dir === 'asc' ? 'Ascending' : 'Descending'}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {groupMenuOpen && activeView.type !== 'media' ? (
              <div className="dropdown-menu-solid z-dropdown absolute bottom-full left-0 right-0 mb-1 max-h-[min(85vh,480px)] overflow-y-auto p-2 shadow-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] p-1">
                    <button
                      type="button"
                      onClick={() =>
                        void onViewPatch({ group_by: undefined, group_sort: undefined })
                      }
                      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span>None</span>
                      {!activeView.group_by ? (
                        <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                      ) : null}
                    </button>
                    {groupableFields.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          void onViewPatch({
                            group_by: f.id,
                            group_sort: activeView.group_sort ?? 'asc',
                          })
                        }
                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                      >
                        <span>{f.name}</span>
                        {activeView.group_by === f.id ? (
                          <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  {activeView.group_by ? (
                    <div className="flex flex-wrap gap-1">
                      {(['asc', 'desc'] as const).map((dir) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => void onViewPatch({ group_sort: dir })}
                          className={cn(
                            'body-3 rounded-lg px-3 py-1.5 transition-colors',
                            (activeView.group_sort ?? 'asc') === dir
                              ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--foreground)]'
                              : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                          )}
                        >
                          {dir === 'asc' ? 'A-Z' : 'Z-A'}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {onOpenStatusEditor ? (
            <button
              type="button"
              onClick={onOpenStatusEditor}
              className="flex w-full items-center justify-between transition-colors hover:opacity-80"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <span className="body-3 font-semibold text-[var(--foreground)]">Status</span>
              </div>
              <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
          ) : null}

          {showSubtasksCustomize ? (
            <>
              <button
                type="button"
                onClick={() => setSubtasksMenuOpen((o) => !o)}
                className="flex w-full items-center justify-between transition-colors hover:opacity-80"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 font-semibold text-[var(--foreground)]">Subtasks</span>
                </div>
                <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
                  <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                    {subtasksSummary}
                  </span>
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                      subtasksMenuOpen && 'rotate-90',
                    )}
                  />
                </div>
              </button>
              {subtasksMenuOpen ? (
                <div className="flex flex-wrap gap-1 px-3 pb-1.5">
                  {SUBTASKS_TOOLBAR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        void onViewPatch({
                          subtasks_display: opt.id,
                          subtasks_expanded: opt.id === 'expanded',
                        })
                      }
                      className={cn(
                        'body-3 rounded-lg px-3 py-1.5 transition-colors',
                        subtasksMode === opt.id
                          ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--foreground)]'
                          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <CustomizeViewManagementSection
          activeView={activeView}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onSharingPermissions={onOpenSharingPermissions}
        />
      </div>
    </motion.div>
  )
}

type FieldsTab = 'create' | 'existing'

type FieldsEditState =
  | null
  | { kind: 'create'; type: FieldType }
  | { kind: 'edit'; field: FieldDef }

export function DefaultFieldsSubView({
  schema,
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: {
  schema: SpaceSchema
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<FieldsTab>('existing')
  const [search, setSearch] = useState('')
  const [editState, setEditState] = useState<FieldsEditState>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  if (editState) {
    return (
      <motion.div
        className="flex flex-1 flex-col overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.15 }}
      >
        <FieldEditor
          mode={editState}
          activeView={activeView}
          onViewPatch={onViewPatch}
          onBack={() => setEditState(null)}
          onClose={onClose}
          onAfterCreate={() => {
            setEditState(null)
            setTab('existing')
            setSearch('')
          }}
          onAfterDelete={() => {
            setEditState(null)
            setTab('existing')
          }}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">Fields</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-[var(--border)] px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <input
            ref={searchRef}
            type="text"
            placeholder={
              tab === 'create'
                ? 'Search for a new field type...'
                : 'Search for new or existing fields'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 border-b border-[var(--border)] px-4">
        <div role="tablist" aria-label="Fields source" className="flex items-center gap-4">
          <FieldsTabButton active={tab === 'create'} onClick={() => setTab('create')}>
            Create new
          </FieldsTabButton>
          <FieldsTabButton active={tab === 'existing'} onClick={() => setTab('existing')}>
            Add existing
          </FieldsTabButton>
        </div>
      </div>

      {tab === 'create' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CreateNewFieldList
            searchQuery={search}
            onPickType={(type) => setEditState({ kind: 'create', type })}
          />
        </div>
      ) : (
        <ViewFieldsVisibilityContent
          schema={schema}
          activeView={activeView}
          onViewPatch={onViewPatch}
          autoFocusSearch={false}
          searchQuery={search}
          onSearchChange={setSearch}
          hideSearchInput
          onEditField={(field) => setEditState({ kind: 'edit', field })}
        />
      )}
    </motion.div>
  )
}

function FieldsTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'body-3 relative -mb-px border-b-2 py-2 transition-colors',
        active
          ? 'border-[var(--color-primary)] font-semibold text-[var(--foreground)]'
          : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
      )}
    >
      {children}
    </button>
  )
}
