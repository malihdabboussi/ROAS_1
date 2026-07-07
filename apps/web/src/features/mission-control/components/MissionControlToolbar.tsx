'use client'

import { useEffect, useState } from 'react'
import { MissionControlDesktopToolbar } from './mission-control-toolbar/MissionControlDesktopToolbar'
import { MissionControlMobileToolbar } from './mission-control-toolbar/MissionControlMobileToolbar'
import type {
  MissionControlToolbarProps,
  MissionToolbarDropdown,
} from './mission-control-toolbar/mission-control-toolbar-options'

export type {
  MissionControlToolbarProps,
  MissionPriorityFilter,
  MissionSort,
  MissionStatusFilter,
  MissionViewMode,
} from './mission-control-toolbar/mission-control-toolbar-options'

export function MissionControlToolbar({
  statusFilter,
  onStatusFilterChange,
  priorityFilters,
  onPriorityFiltersChange,
  currentSort,
  onSortChange,
  searchValue,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: MissionControlToolbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<MissionToolbarDropdown | null>(null)
  const [isPillsExpanded, setIsPillsExpanded] = useState(true)
  const hasPriorityFilters = priorityFilters.length > 0

  useEffect(() => {
    if (!activeDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activeDropdown])

  return (
    <div className="surface-card border-border rounded-spacing-2 p-spacing-3 sm:p-spacing-4 relative border">
      <MissionControlMobileToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        priorityFilters={priorityFilters}
        onPriorityFiltersChange={onPriorityFiltersChange}
        currentSort={currentSort}
        onSortChange={onSortChange}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        hasPriorityFilters={hasPriorityFilters}
      />
      <MissionControlDesktopToolbar
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        priorityFilters={priorityFilters}
        onPriorityFiltersChange={onPriorityFiltersChange}
        currentSort={currentSort}
        onSortChange={onSortChange}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        isPillsExpanded={isPillsExpanded}
        setIsPillsExpanded={setIsPillsExpanded}
        hasPriorityFilters={hasPriorityFilters}
      />
    </div>
  )
}
