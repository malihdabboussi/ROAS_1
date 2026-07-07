import { ArrowUpDown, ChevronLeft, ChevronRight, Flag, Kanban, List } from 'lucide-react'
import { MissionPriorityFilterMenu } from './MissionPriorityFilterMenu'
import { MissionSortMenu } from './MissionSortMenu'
import { MissionToolbarSearchInput } from './MissionToolbarSearchInput'
import {
  STATUS_PILLS,
  type MissionControlToolbarProps,
  type MissionToolbarDropdown,
} from './mission-control-toolbar-options'

interface MissionControlDesktopToolbarProps extends MissionControlToolbarProps {
  activeDropdown: MissionToolbarDropdown | null
  setActiveDropdown: (dropdown: MissionToolbarDropdown | null) => void
  isPillsExpanded: boolean
  setIsPillsExpanded: (isExpanded: boolean) => void
  hasPriorityFilters: boolean
}

export function MissionControlDesktopToolbar({
  activeDropdown,
  setActiveDropdown,
  isPillsExpanded,
  setIsPillsExpanded,
  hasPriorityFilters,
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
}: MissionControlDesktopToolbarProps) {
  return (
    <div className="gap-spacing-4 hidden items-center justify-between md:flex">
      <div className="gap-spacing-2 flex items-center">
        <button
          type="button"
          onClick={() => {
            onStatusFilterChange('all')
            setIsPillsExpanded(!isPillsExpanded)
          }}
          className={`pill pill--sm gap-spacing-1 flex items-center ${statusFilter === 'all' ? 'pill--active' : ''}`}
        >
          <span className="relative z-10 flex items-center gap-1">
            All
            {isPillsExpanded ? (
              <ChevronLeft className="icon-xs" />
            ) : (
              <ChevronRight className="icon-xs" />
            )}
          </span>
        </button>

        {isPillsExpanded &&
          STATUS_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => onStatusFilterChange(pill.id)}
              className={`pill pill--sm ${statusFilter === pill.id ? 'pill--active' : ''}`}
            >
              <span className="relative z-10">{pill.label}</span>
            </button>
          ))}
      </div>

      <div className="gap-spacing-2 relative flex items-center">
        <MissionToolbarSearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search missions..."
          inputClassName="w-48"
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
            className={`button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium ${hasPriorityFilters ? 'pill--active' : ''}`}
            title="Filter by priority"
          >
            <span className="relative z-10">
              <Flag className="icon-sm" />
            </span>
          </button>
          {activeDropdown === 'priority' && (
            <div className="mt-spacing-1 absolute right-0 top-full z-dropdown" data-dropdown>
              <MissionPriorityFilterMenu
                priorityFilters={priorityFilters}
                onPriorityFiltersChange={onPriorityFiltersChange}
                onClose={() => setActiveDropdown(null)}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onViewModeChange(viewMode === 'list' ? 'kanban' : 'list')}
          className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
          title={viewMode === 'list' ? 'Kanban view' : 'List view'}
        >
          <span className="relative z-10">
            {viewMode === 'list' ? <Kanban className="icon-sm" /> : <List className="icon-sm" />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
          className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
        >
          <span className="relative z-10">
            <ArrowUpDown className="icon-sm" />
          </span>
        </button>

        {activeDropdown === 'sort' && (
          <div className="mt-spacing-1 absolute right-0 top-full z-dropdown" data-dropdown>
            <MissionSortMenu
              currentSort={currentSort}
              onSortChange={onSortChange}
              onClose={() => setActiveDropdown(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
