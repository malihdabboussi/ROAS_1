'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  Bot,
  ChevronRight,
  FileText,
  Folder,
  Fullscreen,
  HardDrive,
  Hash,
  Library,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Pin,
  Plus,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { ConfirmDialog } from '@/features/settings/components/settings-content/ConfirmDialog'
import { ResizableDivider } from '@/features/studio/components/layout/ResizableDivider'
import { usePanelResize } from '@/features/studio/hooks/usePanelResize'
import type { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { listDriveFiles, type GoogleDriveFile } from '@/lib/services/google-drive-api'
import { cn } from '@/lib/utils/cn'
import { getDocsTreeDndInvalidToastMessage } from '../config/docs-tree-dnd-toast.config'
import {
  buildDocToolbarSearchHaystack,
  filterItemsByToolbarSearch,
} from '../lib/apply-space-toolbar-filters'
import { buildDocsTreeReorder, type DocsTreeDndZone } from '../lib/docs-tree-dnd-apply'
import { formatAbsoluteDateTime, formatRelativeDate } from '../lib/format-relative-date'
import { groupItems, type GroupData } from '../lib/group-items'
import { spaceGroupBadgeChipProps } from '../lib/space-group-badge-glass'
import { getGroupByFieldSyncPatch, mergeSpaceItemPartials } from '../lib/space-list-groupby-patch'
import { useSpacesStore } from '../store/use-spaces-store'
import type { SpaceItem } from '../types'
import type {
  DocsConfig,
  DocsDriveCardSize,
  DocsDriveGroupBy,
  DocSourceKey,
  FieldDef,
  SelectOption,
  ViewDef,
} from '../types/space-schema'
import { DocMenuDropdown } from './doc-menu/DocMenuDropdown'
import type { DocMenuTarget } from './doc-menu/use-doc-menu-actions'
import { DocEditorPanel } from './docs/DocEditorPanel'
import { ListView } from './ListView'
import { ShareModal } from './ShareModal'
import {
  buildSpaceDocChatDragPayload,
  htmlToPlainTextPreview,
  readFieldValue,
  toFieldPatch,
} from './space-item-values'
import { SpaceListDndShell } from './SpaceListDndRow'
import { DocsAddDocMenu } from './toolbar/DocsAddDocMenu'

function DocsEmptyIllustration() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      {/* Back Left: small doc */}
      <div className="card-glass left-spacing-2 top-spacing-20 gap-spacing-1-5 p-spacing-2 absolute flex h-24 w-20 -rotate-6 flex-col opacity-40">
        <MessageSquare className="h-spacing-3 w-spacing-3 shrink-0 text-blue-400 opacity-80" />
        <div className="bg-secondary h-spacing-1 w-3/4 rounded-full" />
        <div className="bg-secondary h-spacing-1 w-1/2 rounded-full opacity-70" />
        <div className="bg-muted-foreground h-spacing-1 mt-auto w-full rounded-full opacity-25" />
      </div>

      {/* Center: focused doc page */}
      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-36 -translate-x-1/2 rotate-2 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border gap-spacing-1 bg-muted px-spacing-2 py-spacing-1 flex items-center border-b opacity-80">
          <FileText className="h-spacing-2 w-spacing-2 shrink-0 text-emerald-400" />
          <div className="bg-muted-foreground h-spacing-1-5 w-1/2 rounded-full opacity-30" />
        </div>

        <div className="gap-spacing-2 p-spacing-2-5 flex flex-1 flex-col">
          <div className="space-y-spacing-1">
            <div className="bg-foreground h-spacing-2 w-full rounded-full opacity-25" />
            <div className="bg-foreground h-spacing-2 w-3/4 rounded-full opacity-25" />
          </div>

          <div className="space-y-spacing-1 opacity-60">
            <div className="bg-muted-foreground h-spacing-1 w-full rounded-full opacity-30" />
            <div className="bg-muted-foreground h-spacing-1 w-5/6 rounded-full opacity-30" />
            <div className="bg-muted-foreground h-spacing-1 w-2/3 rounded-full opacity-30" />
          </div>

          <div className="gap-spacing-1 mt-auto flex items-center">
            <span className="h-spacing-3 w-spacing-8 rounded-full bg-emerald-400/15" />
            <div className="bg-secondary h-spacing-1 flex-1 rounded-full opacity-60" />
          </div>
        </div>
      </div>

      {/* Back Right: small doc */}
      <div className="card-glass right-spacing-2 top-spacing-24 gap-spacing-1 p-spacing-1-5 absolute flex h-20 w-16 rotate-12 flex-col opacity-40">
        <HardDrive className="h-spacing-2-5 w-spacing-2-5 shrink-0 text-amber-400 opacity-80" />
        <div className="bg-secondary h-spacing-1 w-full rounded-full" />
        <div className="bg-muted-foreground h-spacing-1 mt-auto w-1/2 rounded-full opacity-25" />
      </div>

      {/* Decorative Glows */}
      <div className="h-spacing-16 w-spacing-16 absolute left-1/4 top-1/2 -z-10 rounded-full bg-emerald-400 opacity-10 blur-2xl" />
      <div className="h-spacing-20 w-spacing-20 absolute bottom-1/4 right-1/4 -z-10 rounded-full bg-blue-400 opacity-10 blur-3xl" />
    </div>
  )
}

function DocsEmptyStatePanel(props: {
  variant: 'empty' | 'filtered'
  readOnly: boolean
  onClearFilters?: () => void
}) {
  const title =
    props.variant === 'filtered' ? 'No docs match your current filters' : 'No documents yet'
  const body =
    props.variant === 'filtered'
      ? 'Turn off Source filters or clear Search in the toolbar, or use Customize → Source to widen what is shown.'
      : props.readOnly
        ? 'No documents are visible in this shared view.'
        : 'Create a doc with + Doc above. Studio threads, Channels, DMs, and Mission outputs can appear here alongside Drive files.'

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <DocsEmptyIllustration />
      <div className="max-w-md text-center">
        <p className="body-3 font-semibold text-[var(--foreground)]">{title}</p>
        <p className="body-3 mt-2 leading-relaxed text-[var(--color-muted-foreground)]">{body}</p>
        {props.variant === 'filtered' && !props.readOnly && props.onClearFilters ? (
          <button
            type="button"
            className="body-3 mt-4 rounded-lg border border-[var(--color-border)] px-4 py-2 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
            onClick={() => props.onClearFilters?.()}
          >
            Clear all doc filters
          </button>
        ) : null}
      </div>
    </div>
  )
}

function resolveDocSource(value: string | undefined): DocSourceKey {
  if (value === 'studio') return 'studio'
  if (value === 'channel') return 'channel'
  if (value === 'dm') return 'dm'
  if (value === 'mission') return 'mission'
  if (value === 'campaign') return 'campaign'
  if (value === 'drive') return 'drive'
  return 'space'
}

/** Official Google Drive triangle logo. Sized via className (pass `h-X w-X`). */
function GoogleDriveLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78" className={className} aria-hidden>
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
        fill="#00ac47"
      />
      <path
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
        fill="#ea4335"
      />
      <path
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
        fill="#00832d"
      />
      <path
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684fc"
      />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  )
}

/** Leading icon for a doc list row: replaces the generic status dot (non-interactive markup). */
function docListLeadingIconContent(item: SpaceItem): ReactNode {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const docSource = resolveDocSource(cd._doc_source as string | undefined)
  const isFolderDoc = (cd._doc_kind as string | undefined) === 'folder'
  const driveIconLinkRaw = cd._drive_icon_link
  const driveIconLink =
    typeof driveIconLinkRaw === 'string' && driveIconLinkRaw.trim() ? driveIconLinkRaw : null

  if (docSource === 'drive') {
    if (isFolderDoc) {
      return <GoogleDriveLogo className="h-4 w-4 shrink-0" />
    }
    if (driveIconLink) {
      return <img src={driveIconLink} alt="" className="h-4 w-4 shrink-0" aria-hidden />
    }
    return <GoogleDriveLogo className="h-4 w-4 shrink-0" />
  }
  if (docSource === 'mission') {
    return <Bot className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
  }
  if (docSource === 'channel') {
    return <Hash className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
  }
  if (docSource === 'dm') {
    return <UserRound className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
  }
  if (docSource === 'studio') {
    return <MessageSquare className="h-4 w-4 shrink-0 text-blue-400" aria-hidden />
  }
  if (docSource === 'campaign') {
    return <Library className="h-4 w-4 shrink-0 text-blue-400" aria-hidden />
  }
  return <FileText className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
}

function DocListLeadingDragIcon({
  item,
  enableChatDrag,
}: {
  item: SpaceItem
  enableChatDrag: boolean
}) {
  const icon = docListLeadingIconContent(item)
  if (!enableChatDrag) return icon
  return (
    <span
      draggable
      title="Drag into chat"
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.stopPropagation()
        e.dataTransfer.effectAllowed = 'copy'
        e.dataTransfer.setData(
          'application/x-vibey-artifact',
          JSON.stringify(buildSpaceDocArtifactPayload(item)),
        )
      }}
      className="inline-flex cursor-grab active:cursor-grabbing"
    >
      {icon}
    </span>
  )
}

const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

type DriveInlineBrowseState = {
  listingSource: 'my_drive' | 'shared_with_me' | 'shared_drives'
  workspaceDriveId: string | null
  folderStack: { id: string; name: string }[]
}

type DriveListingGroup = { key: string; label: string; files: GoogleDriveFile[] }

function driveFileTypeBucket(f: GoogleDriveFile): { key: string; label: string } {
  const m = f.mimeType ?? ''
  if (m === DRIVE_FOLDER_MIME_TYPE) return { key: 'folder', label: 'Folders' }
  if (m === 'application/vnd.google-apps.document') return { key: 'gdoc', label: 'Google Docs' }
  if (m === 'application/vnd.google-apps.spreadsheet')
    return { key: 'gsheet', label: 'Google Sheets' }
  if (m === 'application/vnd.google-apps.presentation')
    return { key: 'gslides', label: 'Google Slides' }
  if (m === 'application/vnd.google-apps.form') return { key: 'gform', label: 'Google Forms' }
  if (m === 'application/pdf') return { key: 'pdf', label: 'PDFs' }
  if (m.startsWith('image/')) return { key: 'image', label: 'Images' }
  if (m.startsWith('video/')) return { key: 'video', label: 'Videos' }
  if (m.startsWith('audio/')) return { key: 'audio', label: 'Audio' }
  if (m.startsWith('text/') || m === 'application/json')
    return { key: 'text', label: 'Text & Code' }
  if (
    m.includes('zip') ||
    m.includes('compressed') ||
    m.includes('archive') ||
    m === 'application/x-tar'
  )
    return { key: 'archive', label: 'Archives' }
  return { key: 'other', label: 'Other' }
}

const DRIVE_TYPE_GROUP_ORDER: string[] = [
  'folder',
  'gdoc',
  'gsheet',
  'gslides',
  'gform',
  'pdf',
  'image',
  'video',
  'audio',
  'text',
  'archive',
  'other',
]

function driveFileModifiedBucket(f: GoogleDriveFile): { key: string; label: string; sort: number } {
  const ts = f.modifiedTime ? new Date(f.modifiedTime).getTime() : NaN
  if (!Number.isFinite(ts)) return { key: 'unknown', label: 'No date', sort: 9 }
  const now = Date.now()
  const diff = now - ts
  const day = 86_400_000
  if (diff < day) return { key: 'today', label: 'Today', sort: 0 }
  if (diff < 7 * day) return { key: 'week', label: 'This week', sort: 1 }
  if (diff < 30 * day) return { key: 'month', label: 'This month', sort: 2 }
  if (diff < 90 * day) return { key: 'quarter', label: 'Last 3 months', sort: 3 }
  if (diff < 365 * day) return { key: 'year', label: 'This year', sort: 4 }
  return { key: 'older', label: 'Older', sort: 5 }
}

function buildDriveListingGroups(
  files: GoogleDriveFile[],
  groupBy: DocsDriveGroupBy,
): DriveListingGroup[] | null {
  if (groupBy === 'flat') return null
  const map = new Map<string, DriveListingGroup>()
  if (groupBy === 'type') {
    for (const f of files) {
      const b = driveFileTypeBucket(f)
      const g = map.get(b.key) ?? { key: b.key, label: b.label, files: [] }
      g.files.push(f)
      map.set(b.key, g)
    }
    return Array.from(map.values()).sort(
      (a, b) => DRIVE_TYPE_GROUP_ORDER.indexOf(a.key) - DRIVE_TYPE_GROUP_ORDER.indexOf(b.key),
    )
  }
  const sortById = new Map<string, number>()
  for (const f of files) {
    const b = driveFileModifiedBucket(f)
    sortById.set(b.key, b.sort)
    const g = map.get(b.key) ?? { key: b.key, label: b.label, files: [] }
    g.files.push(f)
    map.set(b.key, g)
  }
  return Array.from(map.values()).sort(
    (a, b) => (sortById.get(a.key) ?? 99) - (sortById.get(b.key) ?? 99),
  )
}

function docItemDriveBrowseListingSource(
  item: SpaceItem,
): 'my_drive' | 'shared_with_me' | 'shared_drives' {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const raw = cd._drive_list_source
  if (raw === 'my_drive' || raw === 'shared_with_me' || raw === 'shared_drives') return raw
  if (typeof cd._drive_workspace_id === 'string' && cd._drive_workspace_id.trim())
    return 'shared_drives'
  return 'my_drive'
}

function buildSpaceDocArtifactPayload(item: SpaceItem): {
  id: string
  type: 'space_doc'
  label: string
} {
  const { id, label } = buildSpaceDocChatDragPayload(item)
  return { id, type: 'space_doc', label }
}

function emitSpaceDocFocus(item: SpaceItem): void {
  if (typeof window === 'undefined') return
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  window.dispatchEvent(
    new CustomEvent('space:artifact-focus', {
      detail: {
        type: 'space_doc',
        id: item.id,
        name: item.title?.trim() ? item.title.trim() : 'Untitled',
        spaceId: item.space_id,
        docSource: resolveDocSource(cd._doc_source as string | undefined),
        docKind: typeof cd._doc_kind === 'string' ? cd._doc_kind : 'file',
      },
    }),
  )
}

function TreeNode({
  item,
  depth,
  selectedId,
  onSelect,
  childrenByParent,
  collapsedNodes,
  onToggleCollapse,
  onUpdateItem,
  listActiveId,
  onContextMenu,
  enableChatDrag,
}: {
  item: SpaceItem
  depth: number
  selectedId: string | null
  onSelect: (id: string) => void
  childrenByParent: Map<string, SpaceItem[]>
  collapsedNodes: Record<string, boolean>
  onToggleCollapse: (id: string) => void
  onUpdateItem: (id: string, patch: Partial<SpaceItem>) => void
  listActiveId: string | null
  onContextMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
  enableChatDrag: boolean
}) {
  const active = item.id === selectedId
  const children = childrenByParent.get(item.id)
  const hasChildren = children && children.length > 0
  const collapsed = collapsedNodes[item.id] ?? false
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const docSource = resolveDocSource(cd._doc_source as string | undefined)
  const docIcon = cd._doc_icon as string | undefined
  const docIconColor = cd._doc_icon_color as string | undefined
  const isFolderDoc = (cd._doc_kind as string | undefined) === 'folder'
  const driveIconLink =
    typeof cd._drive_icon_link === 'string' && cd._drive_icon_link.trim()
      ? cd._drive_icon_link
      : null
  const isDriveDoc = docSource === 'drive'

  const fallbackIcon =
    docSource === 'mission'
      ? 'bot'
      : docSource === 'channel'
        ? 'hash'
        : docSource === 'dm'
          ? 'user-round'
          : docSource === 'studio'
            ? 'message-square'
            : docSource === 'drive'
              ? 'hard-drive'
              : 'file-text'
  const fallbackColor =
    docSource === 'mission'
      ? 'text-violet-400'
      : docSource === 'channel'
        ? 'text-cyan-400'
        : docSource === 'dm'
          ? 'text-indigo-400'
          : docSource === 'studio'
            ? 'text-blue-400'
            : docSource === 'drive'
              ? 'text-amber-400'
              : 'text-emerald-400'

  const iconName = docIcon || fallbackIcon
  const iconColor = docIcon ? getIconColor(docIconColor) : null

  const handleIconChange = (name: string) => {
    onUpdateItem(item.id, { custom_data: { ...cd, _doc_icon: name } })
  }
  const handleColorChange = (colorId: IconColorId) => {
    onUpdateItem(item.id, { custom_data: { ...cd, _doc_icon_color: colorId } })
  }

  const handleChatDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!enableChatDrag) return
    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData(
      'application/x-vibey-artifact',
      JSON.stringify(buildSpaceDocArtifactPayload(item)),
    )
    e.dataTransfer.setData('text/plain', item.id)
  }

  return (
    <>
      <SpaceListDndShell itemId={item.id} listActiveId={listActiveId} allowInto>
        {() => (
          <div
            draggable={enableChatDrag}
            onDragStart={handleChatDragStart}
            className={cn(
              'group/tree-node body-3 gap-spacing-2 flex w-full items-center rounded-lg text-left transition-colors',
              active
                ? 'bg-[var(--color-hover-subtle)] font-medium text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onContextMenu={
              onContextMenu
                ? (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onContextMenu(item, { x: e.clientX, y: e.clientY })
                  }
                : undefined
            }
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggleCollapse(item.id)}
                className="shrink-0 rounded p-0.5"
                aria-expanded={!collapsed}
              >
                <ChevronRight
                  className={cn(
                    'h-2.5 w-2.5 transition-transform duration-150',
                    !collapsed && 'rotate-90',
                  )}
                />
              </button>
            ) : (
              <span className="w-[14px] shrink-0" aria-hidden />
            )}
            {isDriveDoc ? (
              driveIconLink ? (
                <img src={driveIconLink} alt="" className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <HardDrive className={cn('h-3.5 w-3.5 shrink-0', fallbackColor)} />
              )
            ) : (
              <IconPicker
                value={iconName}
                color={docIconColor}
                onChange={handleIconChange}
                onColorChange={handleColorChange}
                size="sm"
                customTrigger={
                  <LucideIcon
                    name={iconName}
                    className={cn('h-3 w-3', iconColor ? iconColor.textColor : fallbackColor)}
                  />
                }
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (isFolderDoc) {
                  if (hasChildren) onToggleCollapse(item.id)
                  return
                }
                onSelect(item.id)
              }}
              className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2"
            >
              <span className="truncate">{item.title || 'Untitled'}</span>
            </button>
          </div>
        )}
      </SpaceListDndShell>
      {hasChildren &&
        !collapsed &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            item={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            childrenByParent={childrenByParent}
            collapsedNodes={collapsedNodes}
            onToggleCollapse={onToggleCollapse}
            onUpdateItem={onUpdateItem}
            listActiveId={listActiveId}
            onContextMenu={onContextMenu}
            enableChatDrag={enableChatDrag}
          />
        ))}
    </>
  )
}

function DocsTreeSplitWithDivider({ sidebar, editor }: { sidebar: ReactNode; editor: ReactNode }) {
  const { chatWidthPercent, isDragging, containerRef, chatRef, handleMouseDown } = usePanelResize({
    defaultWidthPercent: 30,
    minPercent: 22,
    maxPercent: 44,
  })
  return (
    <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <div
        ref={chatRef}
        className={cn(
          'group/tree-sidebar flex min-h-0 shrink-0 flex-col overflow-hidden bg-[var(--background)] will-change-[width]',
          !isDragging && 'transition-[width] duration-300 ease-out',
        )}
        style={{ width: `${chatWidthPercent}%`, minWidth: '240px' }}
      >
        {sidebar}
      </div>
      <ResizableDivider
        onMouseDown={handleMouseDown}
        isDragging={isDragging}
        compact
        showGrip={false}
      />
      <div className="surface-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-tl-2xl">
        {editor}
      </div>
    </div>
  )
}

function ensureDocCustomData(extra: Record<string, unknown>): Record<string, unknown> {
  const next = { ...extra }
  const prev =
    next.custom_data && typeof next.custom_data === 'object' && !Array.isArray(next.custom_data)
      ? { ...(next.custom_data as Record<string, unknown>) }
      : {}
  next.custom_data = { ...prev, _view_type: 'doc' }
  return next
}

function toDocMenuTarget(item: SpaceItem): DocMenuTarget {
  return {
    id: item.id,
    space_id: item.space_id,
    title: item.title,
    status: item.status,
    priority: item.priority,
    assignee_type: item.assignee_type,
    assignee_id: item.assignee_id,
    assignees: item.assignees,
    start_date: item.start_date,
    due_date: item.due_date,
    doc_body: item.doc_body,
    custom_data: item.custom_data,
    parent_item_id: item.parent_item_id,
  }
}

interface DocsViewProps {
  view: ViewDef
  items: SpaceItem[]
  fieldsById: Map<string, FieldDef>
  allFields: FieldDef[]
  visibleFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onOpenDetail?: (item: SpaceItem) => void
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onDeleteItem: (itemId: string) => void | Promise<void>
  onPushToAgent: (
    itemId: string,
    options?: import('./cells/MissionSendDropdown').MissionSendOptions,
  ) => Promise<void>
  onCreateOption: (fieldId: string, option: SelectOption) => Promise<void>
  onUpdateOption: (
    fieldId: string,
    optionId: string,
    updates: Partial<SelectOption>,
  ) => Promise<void>
  onDeleteOption: (fieldId: string, optionId: string) => Promise<void>
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onEditCategories?: () => void
  onEditStatuses?: () => void
  onAddField?: () => void
  campaignId?: string | null
  onCampaignDocsRefresh?: () => void
  readOnly?: boolean
  readOnlyOpenItems?: boolean
  /** Inline Drive grouping (toolbar-controlled). */
  driveGroupBy?: DocsDriveGroupBy
  /** Inline Drive card density (toolbar-controlled). */
  driveCardSize?: DocsDriveCardSize
  /** Notify parent (toolbar) when inline Drive browse activates / exits. */
  onDriveBrowseActiveChange?: (active: boolean) => void
  /** Live toolbar search (debounced in toolbar; not persisted on the view). */
  toolbarSearchQuery?: string
  onToolbarSearchQueryChange?: (query: string) => void
  docsCloud?: ReturnType<typeof useCloudAttach>
}

function upgradeDriveThumbSize(url: string): string {
  return url
    .replace(/=s\d+(-c)?$/, '=w800')
    .replace(/=w\d+-h\d+$/, '=w800')
    .replace(/&sz=[^&]+/, '&sz=w800')
}

function driveFileTypeLabel(file: GoogleDriveFile): string {
  const m = file.mimeType ?? ''
  if (m === DRIVE_FOLDER_MIME_TYPE) return 'Folder'
  if (m === 'application/vnd.google-apps.document') return 'Doc'
  if (m === 'application/vnd.google-apps.spreadsheet') return 'Sheet'
  if (m === 'application/vnd.google-apps.presentation') return 'Slides'
  if (m === 'application/vnd.google-apps.form') return 'Form'
  if (m === 'application/pdf') return 'PDF'
  if (m.startsWith('image/')) return 'Image'
  if (m.startsWith('video/')) return 'Video'
  if (m.startsWith('audio/')) return 'Audio'
  return 'File'
}

function DocsDriveInlineListRow(props: { file: GoogleDriveFile; onActivate: () => void }) {
  const { file, onActivate } = props
  const isFolder = file.mimeType === DRIVE_FOLDER_MIME_TYPE
  const owner = Array.isArray(file.owners) && file.owners[0] ? file.owners[0] : null
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
      className="grid grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,140px)] items-center gap-3 border-b border-[var(--border)] px-4 py-2 transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <div className="flex min-w-0 items-center gap-2">
        {isFolder ? (
          <Folder className="h-4 w-4 shrink-0 text-amber-400" />
        ) : typeof file.iconLink === 'string' && file.iconLink.trim() ? (
          <img src={file.iconLink} alt="" className="h-4 w-4 shrink-0" />
        ) : (
          <FileText className="text-muted-foreground h-4 w-4 shrink-0 opacity-70" />
        )}
        <span className="truncate text-sm text-[var(--foreground)]">{file.name || 'Untitled'}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        {owner?.photoLink ? (
          <img
            src={owner.photoLink}
            alt=""
            referrerPolicy="no-referrer"
            className="h-5 w-5 shrink-0 rounded-full"
          />
        ) : (
          <span className="bg-secondary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]">
            {(owner?.displayName ?? '?').slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="truncate">{owner?.displayName ?? owner?.emailAddress ?? '—'}</span>
      </div>
      <span className="truncate text-xs text-[var(--color-muted-foreground)]">
        {typeof file.modifiedTime === 'string' && file.modifiedTime.trim()
          ? formatRelativeDate(file.modifiedTime)
          : '—'}
      </span>
    </div>
  )
}

function DocsDriveInlineEntryCard(props: {
  file: GoogleDriveFile
  onActivate: () => void
  size: DocsDriveCardSize
}) {
  const { file, onActivate, size } = props
  const isFolder = file.mimeType === DRIVE_FOLDER_MIME_TYPE
  const [thumbFailed, setThumbFailed] = useState(false)
  const rawThumb =
    typeof file.thumbnailLink === 'string' && file.thumbnailLink.trim()
      ? file.thumbnailLink.trim()
      : ''
  const showPreview = size === 'preview'
  const previewUrl =
    showPreview && !isFolder && rawThumb && !thumbFailed ? upgradeDriveThumbSize(rawThumb) : ''
  const coverLike = Boolean(previewUrl)
  const typeLabel = driveFileTypeLabel(file)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate()
    }
  }

  if (size === 'small') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onActivate}
        onKeyDown={handleKeyDown}
        className="card-glass group/doc gap-spacing-1 flex w-full cursor-pointer flex-col items-center rounded-lg p-2 text-center transition-colors hover:bg-[var(--color-hover-subtle)]"
        title={file.name || 'Untitled'}
      >
        {isFolder ? (
          <Folder className="h-7 w-7 shrink-0 text-amber-400" />
        ) : typeof file.iconLink === 'string' && file.iconLink.trim() ? (
          <img src={file.iconLink} alt="" className="h-6 w-6 shrink-0" />
        ) : (
          <FileText className="text-muted-foreground h-6 w-6 shrink-0 opacity-70" />
        )}
        <span className="line-clamp-2 w-full text-[10px] font-medium leading-tight text-[var(--foreground)]">
          {file.name || 'Untitled'}
        </span>
      </div>
    )
  }

  const shellClassName = cn(
    'card-glass group/doc relative flex w-full cursor-pointer flex-col items-start rounded-xl text-left transition-colors hover:bg-[var(--color-hover-subtle)]',
    coverLike ? 'overflow-hidden' : 'gap-2 p-4',
  )

  return (
    <div
      role="button"
      tabIndex={0}
      className={shellClassName}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      {coverLike ? (
        <div className="relative h-44 w-full shrink-0 overflow-hidden bg-[var(--color-hover-subtle)]">
          <img
            src={previewUrl}
            alt=""
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setThumbFailed(true)}
          />
          {typeof file.iconLink === 'string' && file.iconLink.trim() ? (
            <span className="bg-[var(--background)]/80 absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md shadow-sm">
              <img src={file.iconLink} alt="" className="h-4 w-4" />
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={cn('flex w-full flex-1 flex-col gap-2', coverLike && 'p-4')}>
        {!coverLike && (
          <div className="flex items-center gap-2">
            {isFolder ? (
              <Folder className="h-8 w-8 shrink-0 text-amber-400" />
            ) : typeof file.iconLink === 'string' && file.iconLink.trim() ? (
              <img src={file.iconLink} alt="" className="h-8 w-8 shrink-0" />
            ) : (
              <FileText className="text-muted-foreground h-8 w-8 shrink-0 opacity-70" />
            )}
          </div>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
          {file.name || 'Untitled'}
        </h3>
        <div className="mt-auto flex w-full flex-wrap items-center gap-2 pt-2 text-[10px] text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-400">
            <HardDrive className="h-2.5 w-2.5" />
            Drive · {typeLabel}
          </span>
          {typeof file.modifiedTime === 'string' && file.modifiedTime.trim() ? (
            <>
              <span>·</span>
              <span>{formatRelativeDate(file.modifiedTime)}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function sharedItemPublicHref(item: SpaceItem): string | undefined {
  if (item.share_link_enabled && item.share_token) return `/shared/item/${item.share_token}`
  return undefined
}

function DocCard({
  item,
  pinned,
  large,
  categoryField,
  showCoverImage,
  onOpenDetail,
  onBrowseDriveFolder,
  onTogglePin,
  onOpenFullMode,
  onOpenMenu,
  draggable,
  onDragStart,
  sharedHref,
  onContextMenu,
}: {
  item: SpaceItem
  pinned: boolean
  large?: boolean
  categoryField?: FieldDef | null
  showCoverImage?: boolean
  onOpenDetail?: (item: SpaceItem) => void
  onBrowseDriveFolder?: (item: SpaceItem) => void
  onTogglePin?: (itemId: string) => void
  onOpenFullMode?: (item: SpaceItem) => void
  onOpenMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, item: SpaceItem) => void
  sharedHref?: string
  onContextMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
}) {
  const plainText = htmlToPlainTextPreview(item.doc_body ?? '')
  const wc = plainText.split(/\s+/).filter(Boolean).length
  const excerpt = plainText.length > 200 ? plainText.slice(0, 200) + '…' : plainText
  const catValue = categoryField ? (readFieldValue(item, categoryField.id) as string | null) : null
  const catOption = catValue ? categoryField?.options?.find((o) => o.id === catValue) : null
  const docSource = resolveDocSource(
    (item.custom_data as Record<string, unknown>)?._doc_source as string | undefined,
  )
  const isFolderDoc =
    ((item.custom_data as Record<string, unknown>)?._doc_kind as string | undefined) === 'folder'
  const docCoverRaw = (item.custom_data as Record<string, unknown>)?._doc_cover_url
  const coverUrl =
    showCoverImage && typeof docCoverRaw === 'string' && docCoverRaw.trim() ? docCoverRaw : null
  const driveFileIdRaw = (item.custom_data as Record<string, unknown>)?._drive_file_id
  const driveFileId =
    typeof driveFileIdRaw === 'string' && driveFileIdRaw.trim() ? driveFileIdRaw : ''
  const canBrowseDriveFolder =
    Boolean(onBrowseDriveFolder) && docSource === 'drive' && isFolderDoc && Boolean(driveFileId)

  const opensDocDetail = Boolean(onOpenDetail) && !sharedHref && !canBrowseDriveFolder

  const shellClassName = cn(
    'card-glass group/doc relative flex w-full flex-col items-start text-left transition-colors',
    sharedHref || opensDocDetail || canBrowseDriveFolder
      ? 'cursor-pointer hover:bg-[var(--color-hover-subtle)]'
      : 'cursor-default',
    coverUrl ? 'overflow-hidden rounded-xl' : 'gap-2 rounded-xl p-4',
    !coverUrl && large && 'p-6',
    draggable && 'cursor-grab active:cursor-grabbing',
  )

  const inner = (
    <>
      {coverUrl && (
        <img src={coverUrl} alt="" className="h-32 w-full shrink-0 rounded-t-xl object-cover" />
      )}

      <div
        className={cn(
          'flex w-full flex-1 flex-col items-start gap-2',
          coverUrl && 'rounded-b-xl p-4',
          coverUrl && large && 'p-6 pt-4',
        )}
      >
        {(onTogglePin || onOpenMenu || onOpenFullMode) && (
          <div
            className="absolute right-3 top-3 z-[1] flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/doc:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            {onTogglePin ? (
              <button
                type="button"
                onClick={() => onTogglePin(item.id)}
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                  pinned && 'text-[var(--foreground)] opacity-100',
                )}
                title={pinned ? 'Unpin' : 'Pin'}
                aria-label={pinned ? 'Unpin doc' : 'Pin doc'}
              >
                <Pin className={cn('h-3.5 w-3.5', pinned && 'fill-current')} />
              </button>
            ) : null}
            {onOpenMenu ? (
              <button
                type="button"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  onOpenMenu(item, { x: rect.right, y: rect.bottom })
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                aria-label="Doc options"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onOpenFullMode ? (
              <button
                type="button"
                onClick={() => onOpenFullMode(item)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                aria-label="Open full mode"
              >
                <Fullscreen className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        )}
        {catOption && (
          <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            {catOption.label}
            {pinned && ' · PINNED'}
          </span>
        )}
        {!catOption && pinned && (
          <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            PINNED
          </span>
        )}

        {!coverUrl && canBrowseDriveFolder ? (
          <div className="flex items-center gap-2">
            <GoogleDriveLogo className="h-8 w-8 shrink-0" />
          </div>
        ) : null}

        <h3
          className={cn(
            'line-clamp-2 font-semibold text-[var(--foreground)]',
            large ? 'text-lg' : 'text-sm',
          )}
        >
          {item.title || 'Untitled'}
        </h3>

        {excerpt && (
          <p
            className={cn(
              'line-clamp-2 text-[var(--color-muted-foreground)]',
              large ? 'body-3' : 'text-xs',
            )}
          >
            {excerpt}
          </p>
        )}

        <div className="mt-auto flex w-full items-center gap-2 pt-2 text-[10px] text-[var(--color-muted-foreground)]">
          {docSource === 'mission' && (
            <>
              <span className="inline-flex items-center gap-0.5 rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-400">
                <Bot className="h-2.5 w-2.5" />
                Mission
              </span>
              <span>·</span>
            </>
          )}
          {docSource === 'studio' && (
            <>
              <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-400">
                <MessageSquare className="h-2.5 w-2.5" />
                Studio
              </span>
              <span>·</span>
            </>
          )}
          {docSource === 'channel' && (
            <>
              <span className="inline-flex items-center gap-0.5 rounded bg-cyan-500/10 px-1.5 py-0.5 text-cyan-400">
                <Hash className="h-2.5 w-2.5" />
                Channel
              </span>
              <span>·</span>
            </>
          )}
          {docSource === 'dm' && (
            <>
              <span className="inline-flex items-center gap-0.5 rounded bg-indigo-500/10 px-1.5 py-0.5 text-indigo-400">
                <UserRound className="h-2.5 w-2.5" />
                DM
              </span>
              <span>·</span>
            </>
          )}
          {docSource === 'drive' && (
            <>
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-400">
                <HardDrive className="h-2.5 w-2.5" />
                Drive
              </span>
              <span>·</span>
            </>
          )}
          {docSource === 'space' && (
            <>
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400">
                <FileText className="h-2.5 w-2.5" />
                Space
              </span>
              <span>·</span>
            </>
          )}
          {docSource === 'campaign' && (
            <>
              <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-400">
                <Library className="h-2.5 w-2.5" />
                Campaign
              </span>
              <span>·</span>
            </>
          )}
          <span title={formatAbsoluteDateTime(item.created_at ?? item.updated_at)}>
            {formatRelativeDate(item.created_at ?? item.updated_at)}
          </span>
          {wc > 0 && (
            <>
              <span>·</span>
              <span>{wc.toLocaleString()} words</span>
            </>
          )}
        </div>
      </div>
    </>
  )

  if (sharedHref) {
    return (
      <Link
        href={sharedHref}
        className={cn(shellClassName, 'block no-underline')}
        draggable={false}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div
      role={opensDocDetail || canBrowseDriveFolder ? 'button' : undefined}
      tabIndex={opensDocDetail || canBrowseDriveFolder ? 0 : undefined}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, item) : undefined}
      onClick={
        canBrowseDriveFolder
          ? () => onBrowseDriveFolder?.(item)
          : opensDocDetail
            ? () => onOpenDetail?.(item)
            : undefined
      }
      onContextMenu={
        onContextMenu
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              onContextMenu(item, { x: e.clientX, y: e.clientY })
            }
          : undefined
      }
      onKeyDown={
        opensDocDetail || canBrowseDriveFolder
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (canBrowseDriveFolder) onBrowseDriveFolder?.(item)
                else onOpenDetail?.(item)
              }
            }
          : undefined
      }
      className={shellClassName}
    >
      {inner}
    </div>
  )
}

export function DocsView({
  view,
  items,
  fieldsById,
  allFields,
  visibleFields,
  roster,
  currentUserId,
  onOpenDetail,
  onViewPatch,
  onUpdateItem,
  onDeleteItem,
  onPushToAgent,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onEditCategories,
  onEditStatuses,
  onAddField,
  campaignId,
  onCampaignDocsRefresh,
  readOnly = false,
  readOnlyOpenItems = false,
  driveGroupBy = 'flat',
  driveCardSize = 'preview',
  onDriveBrowseActiveChange,
  toolbarSearchQuery = '',
  onToolbarSearchQueryChange,
  docsCloud,
}: DocsViewProps) {
  const createItem = useSpacesStore((s) => s.createItem)
  const updateItemsBatch = useSpacesStore((s) => s.updateItemsBatch)
  const refreshSpaces = useSpacesStore((s) => s.refresh)
  const [docMenuState, setDocMenuState] = useState<{
    item: SpaceItem
    position: { x: number; y: number }
  } | null>(null)
  const [deleteDocTarget, setDeleteDocTarget] = useState<SpaceItem | null>(null)
  const [deletingDoc, setDeletingDoc] = useState(false)
  const [shareDocTarget, setShareDocTarget] = useState<SpaceItem | null>(null)
  const inlineDocsAddMenuRef = useRef<HTMLDivElement | null>(null)
  const [inlineDocsAddMenuOpen, setInlineDocsAddMenuOpen] = useState(false)
  const [inlineDocsAddMenuPosition, setInlineDocsAddMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  const docsConfig = useMemo(
    (): DocsConfig => ({ display_mode: 'grid', ...(view.docs_config ?? {}) }),
    [view.docs_config],
  )
  const requestedMode = docsConfig.display_mode ?? 'grid'
  const displayMode = readOnly && requestedMode === 'tree' ? 'grid' : requestedMode
  const pinnedIds = docsConfig.pinned_item_ids ?? []
  const showCoverOnCards = docsConfig.show_cover_images ?? false
  const canOpenReadOnlyItems = readOnly && readOnlyOpenItems

  const openInlineDocsAddMenu = useCallback((trigger: HTMLElement) => {
    const labelTarget =
      trigger.querySelector<HTMLElement>('[data-space-quick-add-label]') ?? trigger
    const rect = labelTarget.getBoundingClientRect()
    const menuWidth = 208
    const viewportPadding = 8
    setInlineDocsAddMenuPosition({
      top: rect.bottom + 4,
      left: Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
      ),
    })
    setInlineDocsAddMenuOpen(true)
  }, [])

  useEffect(() => {
    if (!inlineDocsAddMenuOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && inlineDocsAddMenuRef.current?.contains(target)) return
      setInlineDocsAddMenuOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInlineDocsAddMenuOpen(false)
    }
    const handleViewportMove = () => setInlineDocsAddMenuOpen(false)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportMove)
    window.addEventListener('scroll', handleViewportMove, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportMove)
      window.removeEventListener('scroll', handleViewportMove, true)
    }
  }, [inlineDocsAddMenuOpen])

  const [driveInlineBrowse, setDriveInlineBrowse] = useState<DriveInlineBrowseState | null>(null)
  const [driveListingFiles, setDriveListingFiles] = useState<GoogleDriveFile[]>([])
  const [driveListingNextPage, setDriveListingNextPage] = useState<string | undefined>()
  const [driveListingLoading, setDriveListingLoading] = useState(false)
  const [driveListingLoadingMore, setDriveListingLoadingMore] = useState(false)
  const driveDocsScrollRef = useRef<HTMLDivElement>(null)

  const driveBrowseFetchKey = useMemo(() => {
    if (!driveInlineBrowse) return null
    const { listingSource, workspaceDriveId, folderStack } = driveInlineBrowse
    if (folderStack.length === 0) return null
    return `${listingSource}|${workspaceDriveId ?? ''}|${folderStack.map((s) => s.id).join('/')}`
  }, [driveInlineBrowse])

  useEffect(() => {
    if (!driveBrowseFetchKey || !driveInlineBrowse) {
      setDriveListingFiles([])
      setDriveListingNextPage(undefined)
      setDriveListingLoading(false)
      return
    }
    const currentId = driveInlineBrowse.folderStack[driveInlineBrowse.folderStack.length - 1]!.id
    let cancelled = false
    setDriveListingLoading(true)
    setDriveListingNextPage(undefined)
    void listDriveFiles({
      folderId: currentId,
      pageSize: 50,
      source: driveInlineBrowse.listingSource,
      driveId:
        driveInlineBrowse.listingSource === 'shared_drives' && driveInlineBrowse.workspaceDriveId
          ? driveInlineBrowse.workspaceDriveId
          : undefined,
    })
      .then((r) => {
        if (cancelled) return
        setDriveListingFiles(r.files ?? [])
        setDriveListingNextPage(r.nextPageToken)
      })
      .finally(() => {
        if (!cancelled) setDriveListingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [driveBrowseFetchKey])

  useEffect(() => {
    onDriveBrowseActiveChange?.(driveInlineBrowse !== null)
  }, [driveInlineBrowse, onDriveBrowseActiveChange])

  useEffect(() => {
    return () => {
      onDriveBrowseActiveChange?.(false)
    }
  }, [onDriveBrowseActiveChange])

  const handleOpenMappedDriveFolderBrowse = useCallback((item: SpaceItem) => {
    const cd = item.custom_data as Record<string, unknown>
    const folderIdRaw = cd._drive_file_id
    const folderId = typeof folderIdRaw === 'string' && folderIdRaw.trim() ? folderIdRaw.trim() : ''
    if (!folderId) return
    emitSpaceDocFocus(item)
    const listingSource = docItemDriveBrowseListingSource(item)
    const workspaceRaw = cd._drive_workspace_id
    const workspaceDriveId =
      typeof workspaceRaw === 'string' && workspaceRaw.trim() ? workspaceRaw.trim() : null
    setDriveInlineBrowse({
      listingSource,
      workspaceDriveId,
      folderStack: [{ id: folderId, name: item.title?.trim() ? item.title.trim() : 'Folder' }],
    })
  }, [])

  const exitDriveInlineBrowse = useCallback(() => {
    setDriveInlineBrowse(null)
    setDriveListingFiles([])
    setDriveListingNextPage(undefined)
  }, [])

  const drillDriveInlineFolder = useCallback((file: GoogleDriveFile) => {
    setDriveInlineBrowse((prev) =>
      prev
        ? {
            ...prev,
            folderStack: [...prev.folderStack, { id: file.id, name: file.name || 'Folder' }],
          }
        : null,
    )
  }, [])

  const handleDriveInlineFileActivate = useCallback(
    (file: GoogleDriveFile) => {
      const match = items.find((i) => {
        const id = String((i.custom_data as Record<string, unknown>)?._drive_file_id ?? '')
        return id === file.id
      })
      if (match) {
        if (!(readOnly && !canOpenReadOnlyItems)) {
          emitSpaceDocFocus(match)
          onOpenDetail?.(match)
        }
        return
      }
      if (typeof file.webViewLink === 'string' && file.webViewLink.trim())
        window.open(file.webViewLink, '_blank', 'noopener,noreferrer')
    },
    [items, onOpenDetail, readOnly, canOpenReadOnlyItems],
  )

  const appendDriveListingPage = useCallback(async () => {
    if (
      !driveInlineBrowse ||
      !driveListingNextPage ||
      driveListingLoadingMore ||
      driveListingLoading
    )
      return
    const currentId = driveInlineBrowse.folderStack[driveInlineBrowse.folderStack.length - 1]!.id
    setDriveListingLoadingMore(true)
    try {
      const r = await listDriveFiles({
        folderId: currentId,
        pageToken: driveListingNextPage,
        pageSize: 50,
        source: driveInlineBrowse.listingSource,
        driveId:
          driveInlineBrowse.listingSource === 'shared_drives' && driveInlineBrowse.workspaceDriveId
            ? driveInlineBrowse.workspaceDriveId
            : undefined,
      })
      setDriveListingFiles((prev) => [...prev, ...(r.files ?? [])])
      setDriveListingNextPage(r.nextPageToken)
    } finally {
      setDriveListingLoadingMore(false)
    }
  }, [driveInlineBrowse, driveListingLoading, driveListingLoadingMore, driveListingNextPage])

  const handleDriveDocsScroll = useCallback(() => {
    const el = driveDocsScrollRef.current
    if (!el || !driveInlineBrowse || !driveListingNextPage) return
    if (driveListingLoadingMore || driveListingLoading) return
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 72) return
    void appendDriveListingPage()
  }, [
    driveInlineBrowse,
    driveListingNextPage,
    driveListingLoadingMore,
    driveListingLoading,
    appendDriveListingPage,
  ])

  const activateDriveFileInline = useCallback(
    (f: GoogleDriveFile) => {
      if (f.mimeType === DRIVE_FOLDER_MIME_TYPE) drillDriveInlineFolder(f)
      else handleDriveInlineFileActivate(f)
    },
    [drillDriveInlineFolder, handleDriveInlineFileActivate],
  )

  const handleDocContextMenu = useCallback(
    (item: SpaceItem, position: { x: number; y: number }) => {
      if (readOnly) return
      setDocMenuState({ item, position })
    },
    [readOnly],
  )

  const sourceFilters: DocSourceKey[] = docsConfig.doc_source_filters ?? []

  const docSearchHaystacks = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) {
      map.set(item.id, buildDocToolbarSearchHaystack(item))
    }
    return map
  }, [items])

  const filteredItems = useMemo(() => {
    let out = items
    if (sourceFilters.length > 0) {
      out = out.filter((i) => {
        const src = resolveDocSource(
          (i.custom_data as Record<string, unknown>)?._doc_source as string | undefined,
        )
        return sourceFilters.includes(src)
      })
    }
    if (toolbarSearchQuery.trim()) {
      out = filterItemsByToolbarSearch(out, toolbarSearchQuery, docSearchHaystacks)
    }
    return out
  }, [items, sourceFilters, toolbarSearchQuery, docSearchHaystacks])

  const docsOnAddItemInGroup = useCallback(
    async (
      title: string,
      groupFieldId: string,
      groupKey: string,
      fieldExtras?: Record<string, unknown>,
    ) => {
      const extra: Record<string, unknown> = { ...(fieldExtras ?? {}) }
      if (groupFieldId === 'status') extra.status = groupKey
      else if (groupFieldId === 'priority') extra.priority = groupKey
      else if (groupFieldId === 'category') {
        const base =
          extra.custom_data &&
          typeof extra.custom_data === 'object' &&
          !Array.isArray(extra.custom_data)
            ? { ...(extra.custom_data as Record<string, unknown>) }
            : {}
        if (groupKey === '__none__' || groupKey === '') base.category = null
        else base.category = groupKey
        extra.custom_data = base
      } else if (groupFieldId === 'assignee') {
        if (groupKey === '__unassigned__') {
          extra.assignee_type = 'unassigned'
          extra.assignee_id = null
          extra.assignees = []
        } else {
          const entry =
            roster.find((r) => r.participant_id === groupKey) ??
            roster.find(
              (r) =>
                (r.kind === 'human' && r.user_id === groupKey) ||
                (r.kind === 'agent' && r.agent_key === groupKey),
            )
          if (entry) {
            extra.assignee_type = entry.kind === 'agent' ? 'agent' : 'human'
            extra.assignee_id = entry.kind === 'agent' ? entry.agent_key! : entry.user_id!
            extra.assignees = [{ type: extra.assignee_type, id: extra.assignee_id }]
          }
        }
      }
      await createItem(title, ensureDocCustomData(extra))
    },
    [createItem, roster],
  )

  const docsQuickAddOnSubmitItem = useCallback(
    async (title: string, extras: Record<string, unknown>) => {
      await createItem(title, ensureDocCustomData(extras))
    },
    [createItem],
  )

  /**
   * Docs list row activation: Drive **folder** docs drill into the inline Drive browse view
   * (matching the docs grid card behavior) instead of opening the right detail panel.
   * All other docs continue to use the standard `onOpenDetail` flow.
   */
  const docsListOnOpenDetail = useCallback(
    (item: SpaceItem) => {
      emitSpaceDocFocus(item)
      const cd = (item.custom_data ?? {}) as Record<string, unknown>
      const docSource = resolveDocSource(cd._doc_source as string | undefined)
      const isFolderDoc = (cd._doc_kind as string | undefined) === 'folder'
      const driveFileIdRaw = cd._drive_file_id
      const driveFileId =
        typeof driveFileIdRaw === 'string' && driveFileIdRaw.trim() ? driveFileIdRaw.trim() : ''
      if (docSource === 'drive' && isFolderDoc && driveFileId) {
        handleOpenMappedDriveFolderBrowse(item)
        return
      }
      onOpenDetail?.(item)
    },
    [handleOpenMappedDriveFolderBrowse, onOpenDetail],
  )

  const handleOpenDocDetail = useCallback(
    (item: SpaceItem) => {
      emitSpaceDocFocus(item)
      onOpenDetail?.(item)
    },
    [onOpenDetail],
  )

  const categoryField = useMemo(
    () => fieldsById.get('category') ?? allFields.find((f) => f.id === 'category') ?? null,
    [fieldsById, allFields],
  )

  const groupByField = useMemo(
    () => (view.group_by ? allFields.find((f) => f.id === view.group_by) : undefined),
    [view.group_by, allFields],
  )

  const topLevelItems = useMemo(
    () => filteredItems.filter((i) => !i.parent_item_id),
    [filteredItems],
  )
  const itemsById = useMemo(() => new Map(topLevelItems.map((i) => [i.id, i])), [topLevelItems])

  const pinnedItems = useMemo(() => {
    return pinnedIds.map((id) => itemsById.get(id)).filter(Boolean) as SpaceItem[]
  }, [itemsById, pinnedIds])

  const unpinnedItems = useMemo(() => {
    const pinSet = new Set(pinnedIds)
    return topLevelItems.filter((i) => !pinSet.has(i.id))
  }, [topLevelItems, pinnedIds])

  const rawTopLevelCount = useMemo(() => items.filter((i) => !i.parent_item_id).length, [items])

  const hasActiveDocFilters =
    (docsConfig.doc_source_filters ?? []).length > 0 || Boolean(toolbarSearchQuery.trim())

  const isFilteredToEmpty =
    topLevelItems.length === 0 && rawTopLevelCount > 0 && hasActiveDocFilters

  const clearDocSourceFilters = useCallback(() => {
    void onViewPatch({
      docs_config: { ...docsConfig, doc_source_filters: [] },
    })
    onToolbarSearchQueryChange?.('')
  }, [docsConfig, onToolbarSearchQueryChange, onViewPatch])

  const groups: GroupData[] | null = useMemo(() => {
    if (!groupByField) return null
    if (groupByField.id === '_doc_source') {
      const opts = groupByField.options ?? []
      const ordered = (view.group_sort ?? 'asc') === 'desc' ? [...opts].reverse() : opts
      const buckets = new Map<string, SpaceItem[]>()
      for (const opt of ordered) buckets.set(opt.id, [])
      for (const item of unpinnedItems) {
        const src = resolveDocSource(
          (item.custom_data as Record<string, unknown>)?._doc_source as string | undefined,
        )
        if (!buckets.has(src)) buckets.set(src, [])
        buckets.get(src)!.push(item)
      }
      const result: GroupData[] = []
      for (const opt of ordered) {
        const bucket = buckets.get(opt.id) ?? []
        if (bucket.length > 0) {
          result.push({ key: opt.id, label: opt.label, color: opt.color ?? 'muted', items: bucket })
        }
      }
      return result
    }
    return groupItems(unpinnedItems, groupByField, view.group_sort ?? 'asc', roster, false)
  }, [unpinnedItems, groupByField, view.group_sort, roster])

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)

  const togglePin = useCallback(
    async (itemId: string) => {
      const current = docsConfig.pinned_item_ids ?? []
      let next: string[]
      if (current.includes(itemId)) {
        next = current.filter((id) => id !== itemId)
      } else {
        /** MRU at front; max 3 — pinning a fourth drops the previous oldest */
        next = [itemId, ...current.filter((id) => id !== itemId)].slice(0, 3)
      }
      await onViewPatch({ docs_config: { ...docsConfig, pinned_item_ids: next } })
    },
    [docsConfig, onViewPatch],
  )

  const handleGroupDrop = useCallback(
    (e: React.DragEvent, groupKey: string) => {
      e.preventDefault()
      setDragOverGroup(null)
      if (!groupByField) return
      const itemId = e.dataTransfer.getData('text/plain')
      if (!itemId) return
      const item = itemsById.get(itemId)
      if (!item) return
      const currentVal = readFieldValue(item, groupByField.id)
      if (String(currentVal ?? '') === groupKey) return
      const patch = toFieldPatch(item, groupByField.id, groupKey)
      void onUpdateItem(itemId, patch)
    },
    [groupByField, itemsById, onUpdateItem],
  )

  const pinnedGridCols =
    pinnedItems.length === 1
      ? 'grid-cols-1'
      : pinnedItems.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  const hasDndGroups = Boolean(groups && groupByField) && !readOnly

  const handleCardDragStart = useCallback(
    (e: React.DragEvent, item: SpaceItem) => {
      e.dataTransfer.setData(
        'application/x-vibey-artifact',
        JSON.stringify(buildSpaceDocArtifactPayload(item)),
      )
      if (hasDndGroups) {
        e.dataTransfer.effectAllowed = 'copyMove'
        e.dataTransfer.setData('text/plain', item.id)
      } else {
        e.dataTransfer.effectAllowed = 'copy'
      }
    },
    [hasDndGroups],
  )

  const [treeSelectedId, setTreeSelectedId] = useState<string | null>(null)

  const childrenByParent = useMemo(() => {
    const map = new Map<string, SpaceItem[]>()
    for (const item of filteredItems) {
      if (!item.parent_item_id) continue
      const arr = map.get(item.parent_item_id) ?? []
      arr.push(item)
      map.set(item.parent_item_id, arr)
    }
    return map
  }, [filteredItems])

  const treeGroups: GroupData[] | null = useMemo(() => {
    if (!groupByField) return null
    if (groupByField.id === '_doc_source') {
      const opts = groupByField.options ?? []
      const ordered = (view.group_sort ?? 'asc') === 'desc' ? [...opts].reverse() : opts
      const buckets = new Map<string, SpaceItem[]>()
      for (const opt of ordered) buckets.set(opt.id, [])
      for (const item of topLevelItems) {
        const src = resolveDocSource(
          (item.custom_data as Record<string, unknown>)?._doc_source as string | undefined,
        )
        if (!buckets.has(src)) buckets.set(src, [])
        buckets.get(src)!.push(item)
      }
      const result: GroupData[] = []
      for (const opt of ordered) {
        const bucket = buckets.get(opt.id) ?? []
        if (bucket.length > 0) {
          result.push({ key: opt.id, label: opt.label, color: opt.color ?? 'muted', items: bucket })
        }
      }
      return result
    }
    return groupItems(topLevelItems, groupByField, view.group_sort ?? 'asc', roster, false)
  }, [topLevelItems, groupByField, view.group_sort, roster])

  const [treeCollapsedGroups, setTreeCollapsedGroups] = useState<Record<string, boolean>>({})
  const [treeCollapsedNodes, setTreeCollapsedNodes] = useState<Record<string, boolean>>({})
  const [docsTreeDndActiveId, setDocsTreeDndActiveId] = useState<string | null>(null)

  const handleOpenFullMode = useCallback(
    async (item: SpaceItem) => {
      emitSpaceDocFocus(item)
      setTreeSelectedId(item.id)
      if (displayMode !== 'tree') {
        await onViewPatch({ docs_config: { ...docsConfig, display_mode: 'tree' } })
      }
    },
    [displayMode, docsConfig, onViewPatch],
  )

  const docsTreeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const treeSelectedItem = useMemo(
    () => (treeSelectedId ? (filteredItems.find((i) => i.id === treeSelectedId) ?? null) : null),
    [treeSelectedId, filteredItems],
  )

  useEffect(() => {
    if (displayMode !== 'tree') return
    if (treeSelectedId && filteredItems.some((i) => i.id === treeSelectedId)) return
    const first = topLevelItems[0]
    if (first) setTreeSelectedId(first.id)
    else setTreeSelectedId(null)
  }, [displayMode, filteredItems, topLevelItems, treeSelectedId])

  useEffect(() => {
    if (displayMode !== 'tree' || !treeSelectedItem) return
    emitSpaceDocFocus(treeSelectedItem)
  }, [displayMode, treeSelectedItem])

  const docMenuItemShareable = docMenuState
    ? !docMenuState.item.id.startsWith('cdoc:') &&
      !docMenuState.item.id.startsWith('mdel:') &&
      resolveDocSource(
        ((docMenuState.item.custom_data ?? {}) as Record<string, unknown>)._doc_source as
          | string
          | undefined,
      ) !== 'drive'
    : false

  const docMenuLayer = (
    <>
      {docMenuState ? (
        <DocMenuDropdown
          doc={toDocMenuTarget(docMenuState.item)}
          campaignId={campaignId}
          pointerPosition={docMenuState.position}
          onClose={() => setDocMenuState(null)}
          onChanged={() => void refreshSpaces()}
          onOpenDoc={docMenuState ? () => void handleOpenFullMode(docMenuState.item) : undefined}
          onShare={docMenuItemShareable ? () => setShareDocTarget(docMenuState.item) : undefined}
          onDelete={() => setDeleteDocTarget(docMenuState.item)}
        />
      ) : null}
      {shareDocTarget ? (
        <ShareModal
          open
          onClose={() => setShareDocTarget(null)}
          entityType="item"
          spaceId={shareDocTarget.space_id}
          entityId={shareDocTarget.id}
          entityName={shareDocTarget.title || 'Untitled'}
          docMode
          item={shareDocTarget}
          roster={roster}
          onItemPatch={async (patch) => {
            await onUpdateItem(shareDocTarget.id, patch)
          }}
        />
      ) : null}
      <ConfirmDialog
        open={!!deleteDocTarget}
        onOpenChange={(open) => {
          if (!open && !deletingDoc) setDeleteDocTarget(null)
        }}
        title="Delete doc?"
        description={`Are you sure you want to delete "${deleteDocTarget?.title || 'Untitled'}"? This cannot be undone.`}
        confirmText="Delete"
        confirmDisabled={deletingDoc}
        confirmingText="Deleting..."
        onConfirm={async () => {
          if (!deleteDocTarget) return
          setDeletingDoc(true)
          try {
            await Promise.resolve(onDeleteItem(deleteDocTarget.id))
            if (treeSelectedId === deleteDocTarget.id) setTreeSelectedId(null)
            setDeleteDocTarget(null)
            setDocMenuState(null)
            toast.success('Doc deleted')
          } catch {
            toast.error('Failed to delete doc')
          } finally {
            setDeletingDoc(false)
          }
        }}
      />
    </>
  )

  const handleTreeAddPage = useCallback(async () => {
    const item = await createItem('Untitled', ensureDocCustomData({}))
    if (item) setTreeSelectedId(item.id)
  }, [createItem])

  const handleDocsTreeDragStart = useCallback((e: DragStartEvent) => {
    setDocsTreeDndActiveId(String(e.active.id))
  }, [])

  const handleDocsTreeDragCancel = useCallback(() => {
    setDocsTreeDndActiveId(null)
  }, [])

  const handleDocsTreeDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setDocsTreeDndActiveId(null)
      if (!over) return
      const oStr = String(over.id)
      const activeId = String(active.id)
      const m = oStr.match(/^dnd:drop:([^:]+):(before|after|into)$/)
      if (!m || m[1] == null || m[2] == null) return
      const overId = m[1]
      const zone = m[2] as DocsTreeDndZone
      const result = buildDocsTreeReorder(filteredItems, activeId, overId, zone)
      if (!result.ok) {
        toast.error(getDocsTreeDndInvalidToastMessage(result.reason))
        return
      }
      const activeItem = filteredItems.find((i) => i.id === activeId)
      const overItem = filteredItems.find((i) => i.id === overId)
      const groupFieldPatch =
        groupByField && activeItem && overItem
          ? getGroupByFieldSyncPatch(activeItem, overItem, groupByField)
          : null
      const entries = result.updates.map((u) => {
        const base: Partial<SpaceItem> = {
          parent_item_id: u.parent_item_id,
          sort_order: u.sort_order,
        }
        const payload =
          u.id === activeId && groupFieldPatch
            ? mergeSpaceItemPartials(base, groupFieldPatch)
            : base
        return { itemId: u.id, payload }
      })
      if (zone === 'into') {
        setTreeCollapsedNodes((prev) => ({ ...prev, [overId]: false }))
      }
      void updateItemsBatch(entries).catch(() => toast.error('Failed to reorder pages'))
    },
    [filteredItems, groupByField, updateItemsBatch],
  )

  const driveNavigateToInlineDepth = useCallback((depthIndex: number) => {
    setDriveInlineBrowse((prev) =>
      prev && depthIndex >= 0 && depthIndex < prev.folderStack.length
        ? { ...prev, folderStack: prev.folderStack.slice(0, depthIndex + 1) }
        : prev,
    )
  }, [])

  if (driveInlineBrowse && (displayMode === 'grid' || displayMode === 'list')) {
    return (
      <>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              {driveInlineBrowse.folderStack.map((seg, idx) => {
                const isLast = idx === driveInlineBrowse.folderStack.length - 1
                return (
                  <span key={`${seg.id}-${idx}`} className="flex min-w-0 items-center gap-1">
                    {idx > 0 ? (
                      <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    ) : null}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={isLast ? undefined : () => driveNavigateToInlineDepth(idx)}
                      className={cn(
                        'truncate text-left transition-colors',
                        isLast
                          ? 'cursor-default font-semibold text-[var(--foreground)]'
                          : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)] hover:underline',
                      )}
                    >
                      {seg.name}
                    </button>
                  </span>
                )
              })}
            </div>
            <button
              type="button"
              onClick={exitDriveInlineBrowse}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
            >
              Exit folder
            </button>
          </div>
          <div
            ref={driveDocsScrollRef}
            onScroll={handleDriveDocsScroll}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {displayMode === 'list' ? (
              <div className="flex flex-col">
                {driveListingLoading ? (
                  <div className="p-4">
                    <ListSkeleton rows={5} label="Loading Drive…" />
                  </div>
                ) : driveListingFiles.length === 0 ? (
                  <p className="body-3 p-4 text-[var(--color-muted-foreground)]">
                    This folder is empty.
                  </p>
                ) : (
                  <>
                    <div className="sticky top-0 z-[1] grid grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,140px)] gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      <span>Name</span>
                      <span>Owner</span>
                      <span>Modified</span>
                    </div>
                    {(() => {
                      const groups = buildDriveListingGroups(driveListingFiles, driveGroupBy)
                      if (!groups) {
                        return driveListingFiles.map((f) => (
                          <DocsDriveInlineListRow
                            key={f.id}
                            file={f}
                            onActivate={() => activateDriveFileInline(f)}
                          />
                        ))
                      }
                      return groups.map((group) => (
                        <div key={group.key}>
                          <div className="bg-[var(--color-hover-subtle)]/50 flex items-center gap-2 border-b border-[var(--border)] px-4 py-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground)]">
                              {group.label}
                            </span>
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              {group.files.length}
                            </span>
                          </div>
                          {group.files.map((f) => (
                            <DocsDriveInlineListRow
                              key={f.id}
                              file={f}
                              onActivate={() => activateDriveFileInline(f)}
                            />
                          ))}
                        </div>
                      ))
                    })()}
                  </>
                )}
                {driveListingLoadingMore ? (
                  <p className="body-3 px-4 py-3 text-center text-[var(--color-muted-foreground)]">
                    Loading more…
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-4">
                {driveListingLoading ? (
                  <ListSkeleton rows={5} label="Loading Drive…" />
                ) : driveListingFiles.length === 0 ? (
                  <p className="body-3 text-[var(--color-muted-foreground)]">
                    This folder is empty.
                  </p>
                ) : (
                  (() => {
                    const groups = buildDriveListingGroups(driveListingFiles, driveGroupBy)
                    const gridCols =
                      driveCardSize === 'small'
                        ? 'grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9'
                        : driveCardSize === 'compact'
                          ? 'grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
                          : 'grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                    if (!groups) {
                      return (
                        <div className={cn('grid', gridCols)}>
                          {driveListingFiles.map((f) => (
                            <DocsDriveInlineEntryCard
                              key={f.id}
                              file={f}
                              size={driveCardSize}
                              onActivate={() => activateDriveFileInline(f)}
                            />
                          ))}
                        </div>
                      )
                    }
                    return (
                      <div className="gap-spacing-10 flex flex-col">
                        {groups.map((group) => (
                          <div key={group.key}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded-spacing-2 inline-flex items-center bg-[var(--color-hover-subtle)] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
                                {group.label}
                              </span>
                              <span className="text-xs text-[var(--color-muted-foreground)]">
                                {group.files.length}
                              </span>
                            </div>
                            <div className={cn('grid', gridCols)}>
                              {group.files.map((f) => (
                                <DocsDriveInlineEntryCard
                                  key={f.id}
                                  file={f}
                                  size={driveCardSize}
                                  onActivate={() => activateDriveFileInline(f)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()
                )}
                {driveListingLoadingMore ? (
                  <p className="body-3 text-center text-[var(--color-muted-foreground)]">
                    Loading more…
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
        {docMenuLayer}
      </>
    )
  }

  if (displayMode === 'tree') {
    return (
      <>
        <DocsTreeSplitWithDivider
          sidebar={
            <>
              <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
                <span className="min-w-0 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Pages
                </span>
                <button
                  type="button"
                  aria-label="Add page"
                  onClick={() => void handleTreeAddPage()}
                  className="pointer-events-none -mr-1 shrink-0 translate-x-2 rounded-md p-1 text-[var(--color-muted-foreground)] opacity-0 transition-all duration-200 ease-out hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] group-hover/tree-sidebar:pointer-events-auto group-hover/tree-sidebar:translate-x-0 group-hover/tree-sidebar:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>

              <DndContext
                sensors={docsTreeSensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDocsTreeDragStart}
                onDragEnd={handleDocsTreeDragEnd}
                onDragCancel={handleDocsTreeDragCancel}
              >
                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1.5">
                  <div className="min-h-0 flex-1">
                    {treeGroups
                      ? treeGroups.map((group) => {
                          const collapsed = treeCollapsedGroups[group.key] ?? false
                          const chip = spaceGroupBadgeChipProps(group.color)
                          return (
                            <div key={group.key} className="mb-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setTreeCollapsedGroups((m) => ({
                                    ...m,
                                    [group.key]: !m[group.key],
                                  }))
                                }
                                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left"
                              >
                                <ChevronRight
                                  className={cn(
                                    'h-2.5 w-2.5 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-150',
                                    !collapsed && 'rotate-90',
                                  )}
                                />
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                                    chip.chipClassName,
                                  )}
                                  style={chip.style}
                                >
                                  {group.label}
                                </span>
                                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                                  {group.items.length}
                                </span>
                              </button>
                              {!collapsed &&
                                group.items.map((item) => (
                                  <TreeNode
                                    key={item.id}
                                    item={item}
                                    depth={1}
                                    selectedId={treeSelectedId}
                                    onSelect={setTreeSelectedId}
                                    childrenByParent={childrenByParent}
                                    collapsedNodes={treeCollapsedNodes}
                                    onToggleCollapse={(id) =>
                                      setTreeCollapsedNodes((m) => ({ ...m, [id]: !m[id] }))
                                    }
                                    onUpdateItem={(id, patch) => void onUpdateItem(id, patch)}
                                    listActiveId={docsTreeDndActiveId}
                                    onContextMenu={handleDocContextMenu}
                                    enableChatDrag={!readOnly}
                                  />
                                ))}
                            </div>
                          )
                        })
                      : topLevelItems.map((item) => (
                          <TreeNode
                            key={item.id}
                            item={item}
                            depth={0}
                            selectedId={treeSelectedId}
                            onSelect={setTreeSelectedId}
                            childrenByParent={childrenByParent}
                            collapsedNodes={treeCollapsedNodes}
                            onToggleCollapse={(id) =>
                              setTreeCollapsedNodes((m) => ({ ...m, [id]: !m[id] }))
                            }
                            onUpdateItem={(id, patch) => void onUpdateItem(id, patch)}
                            listActiveId={docsTreeDndActiveId}
                            onContextMenu={handleDocContextMenu}
                            enableChatDrag={!readOnly}
                          />
                        ))}
                    <button
                      type="button"
                      onClick={() => void handleTreeAddPage()}
                      className={cn(
                        'group/addpage mt-0.5 flex w-full items-center rounded-lg py-1.5 pr-2 text-left text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                        treeGroups ? 'pl-5' : 'pl-2',
                      )}
                    >
                      <span className="w-[14px] shrink-0" />
                      <Plus
                        className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-colors group-hover/addpage:text-[var(--foreground)]"
                        strokeWidth={2.5}
                      />
                      <span className="ml-1.5">Add page</span>
                    </button>
                  </div>
                </nav>
              </DndContext>
            </>
          }
          editor={
            treeSelectedItem ? (
              <DocEditorPanel
                key={treeSelectedItem.id}
                item={treeSelectedItem}
                view={view}
                categoryField={categoryField}
                allFields={allFields}
                roster={roster}
                currentUserId={currentUserId}
                campaignId={campaignId}
                onClose={() => setTreeSelectedId(null)}
                onUpdated={() => {}}
                onEditCategories={onEditCategories}
                onEditStatuses={onEditStatuses}
                onCreateOption={onCreateOption}
                onUpdateOption={onUpdateOption}
                onDeleteOption={onDeleteOption}
                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                onCampaignDocsRefresh={onCampaignDocsRefresh}
                inline
                onSelectChildDoc={setTreeSelectedId}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="body-3 text-[var(--color-muted-foreground)]">
                  {topLevelItems.length === 0
                    ? 'No pages yet. Click "Add page" to create one.'
                    : 'Select a page from the sidebar.'}
                </p>
              </div>
            )
          }
        />
        {docMenuLayer}
      </>
    )
  }

  if (displayMode === 'list') {
    if (isFilteredToEmpty) {
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DocsEmptyStatePanel
            variant="filtered"
            readOnly={readOnly}
            onClearFilters={clearDocSourceFilters}
          />
        </div>
      )
    }
    return (
      <>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ListView
            items={filteredItems}
            visibleFields={visibleFields}
            roster={roster}
            currentUserId={currentUserId}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onPushToAgent={onPushToAgent}
            onOpenDetail={docsListOnOpenDetail}
            activeView={view}
            allFields={allFields}
            onViewChange={onViewPatch}
            surface="list"
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            onAddItemInGroup={docsOnAddItemInGroup}
            onEditStatuses={onEditStatuses}
            onEditCategories={onEditCategories}
            onAddField={onAddField}
            quickAddOnSubmitItem={docsQuickAddOnSubmitItem}
            quickAddLabels={{ addTaskLabel: 'Add doc', inputPlaceholder: 'Doc name' }}
            quickAddInactiveAction={openInlineDocsAddMenu}
            readOnly={readOnly}
            getRowChatDragPayload={(item) => (readOnly ? null : buildSpaceDocArtifactPayload(item))}
            renderLeadingItemSlot={(item) => (
              <DocListLeadingDragIcon item={item} enableChatDrag={!readOnly} />
            )}
            onRowContextMenu={readOnly ? undefined : handleDocContextMenu}
            bulkItemKind="doc"
          />
        </div>
        {docsCloud ? (
          <DocsAddDocMenu
            open={inlineDocsAddMenuOpen}
            setOpen={setInlineDocsAddMenuOpen}
            rootRef={inlineDocsAddMenuRef}
            docsCloud={docsCloud}
            createItem={createItem}
            campaignId={campaignId}
            trigger="none"
            fixedPosition={inlineDocsAddMenuPosition}
            renderCloudModals={false}
          />
        ) : null}
        {docMenuLayer}
      </>
    )
  }

  if (isFilteredToEmpty) {
    return (
      <>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          <DocsEmptyStatePanel
            variant="filtered"
            readOnly={readOnly}
            onClearFilters={clearDocSourceFilters}
          />
        </div>
        {docMenuLayer}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-6 p-4">
          {pinnedItems.length > 0 && (
            <div className={`grid ${pinnedGridCols} gap-3`}>
              {pinnedItems.map((item) => (
                <DocCard
                  key={item.id}
                  item={item}
                  pinned
                  large={pinnedItems.length === 1}
                  showCoverImage={showCoverOnCards}
                  categoryField={categoryField}
                  onOpenDetail={readOnly && !canOpenReadOnlyItems ? undefined : handleOpenDocDetail}
                  onBrowseDriveFolder={handleOpenMappedDriveFolderBrowse}
                  onTogglePin={readOnly ? undefined : togglePin}
                  onOpenFullMode={readOnly ? undefined : handleOpenFullMode}
                  onOpenMenu={readOnly ? undefined : handleDocContextMenu}
                  draggable={!readOnly}
                  onDragStart={handleCardDragStart}
                  onContextMenu={readOnly ? undefined : handleDocContextMenu}
                  sharedHref={
                    readOnly && !canOpenReadOnlyItems ? sharedItemPublicHref(item) : undefined
                  }
                />
              ))}
            </div>
          )}

          {groups && groups.some((group) => group.items.length > 0) ? (
            <div className="gap-spacing-10 flex flex-col">
              {groups.map((group) => {
                const collapsed = collapsedGroups[group.key] ?? false
                const groupChip = spaceGroupBadgeChipProps(group.color)
                const isOver = dragOverGroup === group.key
                return (
                  <div
                    key={group.key}
                    onDragOver={
                      readOnly
                        ? undefined
                        : (e) => {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                            setDragOverGroup(group.key)
                          }
                    }
                    onDragLeave={readOnly ? undefined : () => setDragOverGroup(null)}
                    onDrop={readOnly ? undefined : (e) => handleGroupDrop(e, group.key)}
                    className={cn(
                      'rounded-xl transition-colors',
                      isOver && 'bg-[var(--color-hover-subtle)]',
                    )}
                  >
                    <div className="group/header mb-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedGroups((m) => ({ ...m, [group.key]: !m[group.key] }))
                        }
                        className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
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
                          'rounded-spacing-2 inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
                          groupChip.chipClassName,
                        )}
                        style={groupChip.style}
                      >
                        {group.label}
                      </span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {group.items.length}
                      </span>
                      {onEditCategories && !readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditCategories()
                          }}
                          aria-label="Category options"
                          title="Category options"
                          className="ml-auto shrink-0 rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--foreground)] group-hover/header:opacity-100"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {!collapsed && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {group.items.map((item) => (
                          <DocCard
                            key={item.id}
                            item={item}
                            pinned={pinnedIds.includes(item.id)}
                            showCoverImage={showCoverOnCards}
                            categoryField={categoryField}
                            onOpenDetail={
                              readOnly && !canOpenReadOnlyItems ? undefined : handleOpenDocDetail
                            }
                            onBrowseDriveFolder={handleOpenMappedDriveFolderBrowse}
                            onTogglePin={readOnly ? undefined : togglePin}
                            onOpenFullMode={readOnly ? undefined : handleOpenFullMode}
                            onOpenMenu={readOnly ? undefined : handleDocContextMenu}
                            draggable={!readOnly}
                            onDragStart={handleCardDragStart}
                            onContextMenu={readOnly ? undefined : handleDocContextMenu}
                            sharedHref={
                              readOnly && !canOpenReadOnlyItems
                                ? sharedItemPublicHref(item)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unpinnedItems.map((item) => (
                <DocCard
                  key={item.id}
                  item={item}
                  pinned={false}
                  showCoverImage={showCoverOnCards}
                  categoryField={categoryField}
                  onOpenDetail={readOnly && !canOpenReadOnlyItems ? undefined : handleOpenDocDetail}
                  onBrowseDriveFolder={handleOpenMappedDriveFolderBrowse}
                  onTogglePin={readOnly ? undefined : togglePin}
                  onOpenFullMode={readOnly ? undefined : handleOpenFullMode}
                  onOpenMenu={readOnly ? undefined : handleDocContextMenu}
                  draggable={!readOnly}
                  onDragStart={handleCardDragStart}
                  onContextMenu={readOnly ? undefined : handleDocContextMenu}
                  sharedHref={
                    readOnly && !canOpenReadOnlyItems ? sharedItemPublicHref(item) : undefined
                  }
                />
              ))}
            </div>
          )}

          {topLevelItems.length === 0 && rawTopLevelCount === 0 ? (
            <div className="flex min-h-[300px] w-full flex-1 flex-col py-4">
              <DocsEmptyStatePanel variant="empty" readOnly={readOnly} />
            </div>
          ) : null}
        </div>
      </div>
      {docMenuLayer}
    </>
  )
}
