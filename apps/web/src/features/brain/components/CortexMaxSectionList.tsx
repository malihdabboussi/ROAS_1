'use client'

import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  FileText,
  Layers,
  Lightbulb,
  UserRound,
  Users,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type {
  CortexItem,
  CortexSection,
  CortexSectionLabels,
} from './cortex-max-view-model'

const SECTION_ICONS: Record<CortexSection, LucideIcon> = {
  collective: Layers,
  avatars: Users,
  customers: Users,
  unlinkedSignals: AlertTriangle,
  timelines: Waypoints,
  identity: UserRound,
  perspectives: Compass,
  beliefs: Lightbulb,
  tensions: AlertTriangle,
  patterns: Waypoints,
  topic: FileText,
  entity: BookOpen,
}

const SECTION_INITIAL_LIMIT = 8

interface CortexMaxSectionListProps {
  sectionOrder: readonly CortexSection[]
  sectionLabels: CortexSectionLabels
  grouped: Record<CortexSection, CortexItem[]>
  allItemsLength: number
  selectedItemId: string | null
  expandedSections: Record<CortexSection, boolean>
  collapsedSections: Record<CortexSection, boolean>
  listEmptyMessage: ReactNode
  onToggleSection: (section: CortexSection) => void
  onToggleCategoryCollapsed: (section: CortexSection) => void
  onSelectItem: (item: CortexItem) => void
}

export function CortexMaxSectionList({
  sectionOrder,
  sectionLabels,
  grouped,
  allItemsLength,
  selectedItemId,
  expandedSections,
  collapsedSections,
  listEmptyMessage,
  onToggleSection,
  onToggleCategoryCollapsed,
  onSelectItem,
}: CortexMaxSectionListProps) {
  return (
    <>
      {sectionOrder.map((type) => {
        const group = grouped[type] ?? []
        const shouldShowEmptyTensions =
          type === 'tensions' && group.length === 0 && allItemsLength > 0
        const showEmptyCategoryRails = allItemsLength === 0
        if (group.length === 0 && !shouldShowEmptyTensions && !showEmptyCategoryRails) return null

        const Icon = SECTION_ICONS[type] ?? FileText
        const isExpanded = expandedSections[type] === true
        const isCollapsed = collapsedSections[type] === true
        const visibleItems = isExpanded ? group : group.slice(0, SECTION_INITIAL_LIMIT)
        const hiddenCount = Math.max(0, group.length - SECTION_INITIAL_LIMIT)

        return (
          <div key={type} className="mb-spacing-4 space-y-spacing-1">
            <button
              type="button"
              onClick={() => onToggleCategoryCollapsed(type)}
              className="px-spacing-3 pb-spacing-1 pt-spacing-1 flex w-full items-center justify-between transition-colors hover:text-foreground"
              aria-expanded={!isCollapsed}
            >
              <span className="typo-section-label gap-spacing-1 flex min-w-0 items-center text-muted-foreground">
                <Icon className="icon-xs shrink-0 opacity-70" aria-hidden />
                <span className="min-w-0 truncate">{sectionLabels[type] ?? type}</span>
              </span>
              <span className="typo-section-label text-muted-foreground/60 gap-spacing-1 flex shrink-0 items-center">
                {group.length}
                <ChevronDown
                  className={cn(
                    'icon-xs shrink-0 opacity-50 transition-transform',
                    isCollapsed ? '-rotate-90' : 'rotate-0',
                  )}
                  aria-hidden
                />
              </span>
            </button>
            {!isCollapsed && shouldShowEmptyTensions && (
              <p className="body-4 text-muted-foreground/70 px-spacing-3 py-spacing-1">
                No tensions yet. Atlas will surface challenged beliefs here.
              </p>
            )}
            {!isCollapsed &&
              visibleItems.map((item) => {
                const selected = selectedItemId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className={cn(
                      'body-3 px-spacing-3 py-spacing-1 flex w-full min-w-0 items-center rounded-lg text-left',
                      'nav-glass-hover-purple',
                      selected ? 'home-sidebar-item-active' : 'text-muted-foreground',
                    )}
                  >
                    <ChevronRight className="icon-xs mr-spacing-1 shrink-0 opacity-40" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  </button>
                )
              })}
            {!isCollapsed && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => onToggleSection(type)}
                className="body-4 px-spacing-3 py-spacing-1 gap-spacing-1 flex items-center text-left text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    'icon-xs shrink-0 transition-transform',
                    isExpanded ? 'rotate-180' : 'rotate-0',
                  )}
                />
                {isExpanded ? 'Show less' : `See ${hiddenCount} more`}
              </button>
            )}
          </div>
        )
      })}
      {listEmptyMessage}
    </>
  )
}
