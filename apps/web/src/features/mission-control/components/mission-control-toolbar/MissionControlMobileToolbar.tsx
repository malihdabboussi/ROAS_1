import { ArrowUpDown, ChevronDown, Flag, Kanban, List } from 'lucide-react'
import { MissionPriorityFilterMenu } from './MissionPriorityFilterMenu'
import { MissionStatusFilterMenu } from './MissionStatusFilterMenu'
import { MissionToolbarSearchInput } from './MissionToolbarSearchInput'
import {
  STATUS_PILLS,
  type MissionControlToolbarProps,
  type MissionToolbarDropdown,
} from './mission-control-toolbar-options'

interface MissionControlMobileToolbarProps extends MissionControlToolbarProps {
  activeDropdown: MissionToolbarDropdown | null
  setActiveDropdown: (dropdown: MissionToolbarDropdown | null) => void
  hasPriorityFilters: boolean
}

export function MissionControlMobileToolbar({
  activeDropdown,
  setActiveDropdown,
  hasPriorityFilters,
  statusFilter,
  onStatusFilterChange,
  priorityFilters,
  onPriorityFiltersChange,
  searchValue,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: MissionControlMobileToolbarProps) {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <MissionToolbarSearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search..."
        wrapperClassName="relative min-w-0 flex-1"
        inputClassName="w-full"
      />

      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === 'mobile-filter' ? null : 'mobile-filter')
          }
          className={`pill pill--sm flex items-center gap-1 ${statusFilter !== 'all' && statusFilter !== 'open' ? 'pill--active' : ''}`}
        >
          <span className="relative z-10">
            {statusFilter === 'all'
              ? 'All'
              : (STATUS_PILLS.find((pill) => pill.id === statusFilter)?.label ?? 'Open')}
          </span>
          <ChevronDown className="icon-xs relative z-10" />
        </button>
        {activeDropdown === 'mobile-filter' && (
          <MissionStatusFilterMenu
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            onClose={() => setActiveDropdown(null)}
          />
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === 'mobile-priority' ? null : 'mobile-priority')
          }
          className={`button-glass-blue h-spacing-8 px-spacing-2 flex shrink-0 items-center rounded-lg ${hasPriorityFilters ? 'pill--active' : ''}`}
          title="Filter by priority"
        >
          <Flag className="icon-sm" />
        </button>
        {activeDropdown === 'mobile-priority' && (
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
        className="button-glass-blue h-spacing-8 px-spacing-2 flex shrink-0 items-center rounded-lg"
        title={viewMode === 'list' ? 'Kanban view' : 'List view'}
      >
        {viewMode === 'list' ? <Kanban className="icon-sm" /> : <List className="icon-sm" />}
      </button>
      <button
        type="button"
        onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
        aria-label="Sort missions"
        title="Sort missions"
        className="button-glass-blue h-spacing-8 px-spacing-2 flex shrink-0 items-center rounded-lg"
      >
        <ArrowUpDown className="icon-sm" />
      </button>
    </div>
  )
}
