'use client'

import { useRef, type ComponentType } from 'react'
import {
  ArrowLeft,
  Box,
  Calendar,
  ChevronRight,
  Columns2,
  Contact,
  FileText,
  Layers,
  List,
  MoreHorizontal,
  Rocket,
  Square,
  Telescope,
  X,
} from 'lucide-react'

interface TaskDetailHeaderProps {
  /** Last saved title; used as the breadcrumb's task crumb label. */
  committedTitle: string
  /** Falls back to `committedTitle` if blank — keeps the crumb non-empty while editing. */
  liveTitle: string
  /** Breadcrumb: name of the space this task lives in. */
  spaceName: string | null
  /** Breadcrumb: name of the active view (List, Board, Calendar, ...). */
  viewName: string | null
  /** Active view type → drives the breadcrumb view icon. */
  viewType?: string | null
  /**
   * Immediate parent task in the drill-in stack (open subtask from parent or from views).
   * Shown before the current title; click goes back one level (same stack as Back).
   */
  breadcrumbParentCrumb?: { committedTitle: string; onNavigate: () => void } | null
  /** When true, show a back arrow on the breadcrumb to return to the previous task. */
  canGoBack?: boolean
  onBack?: () => void
  onShare: () => void
  onClose: () => void
  /** Open the task right-click menu anchored at the 3-dot button. */
  onOpenMenu?: (anchor: HTMLElement) => void
}

const VIEW_ICON_BY_TYPE: Record<string, ComponentType<{ className?: string }>> = {
  list: List,
  table: List,
  kanban: Columns2,
  calendar: Calendar,
  missions: Rocket,
  instagram_research: Telescope,
  tiktok_research: Telescope,
  docs: FileText,
  contacts: Contact,
  channels: List,
  channel: List,
}

function getViewIcon(type: string | null | undefined): ComponentType<{ className?: string }> {
  if (!type) return Layers
  return VIEW_ICON_BY_TYPE[type] ?? Layers
}

export function TaskDetailHeader({
  committedTitle,
  liveTitle,
  spaceName,
  viewName,
  viewType,
  breadcrumbParentCrumb,
  canGoBack,
  onBack,
  onShare: _onShare,
  onClose,
  onOpenMenu,
}: TaskDetailHeaderProps) {
  const crumbTaskLabel = (committedTitle || liveTitle).trim() || 'Untitled task'
  const ViewIcon = getViewIcon(viewType)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="pt-spacing-2 pb-spacing-2 gap-spacing-2 flex items-center justify-between">
      <nav
        aria-label="Task location"
        className="body-3 gap-spacing-1 text-muted-foreground flex min-w-0 items-center"
      >
        {canGoBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground mr-spacing-1 flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
            aria-label="Back to previous task"
            title="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {spaceName ? (
          <span className="gap-spacing-1 flex min-w-0 max-w-[12rem] items-center" title={spaceName}>
            <Box className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{spaceName}</span>
          </span>
        ) : null}
        {spaceName && viewName ? (
          <ChevronRight className="text-muted-foreground/60 h-3 w-3 shrink-0" aria-hidden />
        ) : null}
        {viewName ? (
          <span className="gap-spacing-1 flex min-w-0 max-w-[10rem] items-center" title={viewName}>
            <ViewIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{viewName}</span>
          </span>
        ) : null}
        {(spaceName || viewName) && (
          <ChevronRight className="text-muted-foreground/60 h-3 w-3 shrink-0" aria-hidden />
        )}
        {breadcrumbParentCrumb ? (
          <>
            <button
              type="button"
              onClick={breadcrumbParentCrumb.onNavigate}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-1 flex min-w-0 max-w-[10rem] shrink-0 items-center rounded transition-colors"
              title={breadcrumbParentCrumb.committedTitle}
            >
              <Square className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {(breadcrumbParentCrumb.committedTitle || 'Parent task').trim() || 'Parent task'}
              </span>
            </button>
            <ChevronRight className="text-muted-foreground/60 h-3 w-3 shrink-0" aria-hidden />
          </>
        ) : null}
        <span
          className="text-foreground gap-spacing-1 flex min-w-0 items-center font-medium"
          title={crumbTaskLabel}
        >
          <Square className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{crumbTaskLabel}</span>
        </span>
      </nav>
      <div className="gap-spacing-1 flex shrink-0 items-center">
        {/* Share temporarily hidden — restore by importing { Share2 } and renaming
            `onShare: _onShare` back to `onShare` in the destructure, then re-enable:
        <span className="tooltip" data-tooltip="Share">
          <button type="button" onClick={onShare} className="btn-icon-glass">
            <Share2 className="icon-sm" />
          </button>
        </span>
        */}
        {onOpenMenu ? (
          <span className="tooltip" data-tooltip="More">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => menuButtonRef.current && onOpenMenu(menuButtonRef.current)}
              className="btn-icon-bare shrink-0"
              aria-label="More actions"
            >
              <MoreHorizontal className="icon-sm" />
            </button>
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="btn-icon-bare shrink-0"
          aria-label="Close"
        >
          <X className="icon-sm" />
        </button>
      </div>
    </div>
  )
}
