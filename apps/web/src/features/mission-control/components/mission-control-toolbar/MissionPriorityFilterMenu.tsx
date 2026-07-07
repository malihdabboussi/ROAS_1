import { MissionToolbarSelectedCheck } from './MissionToolbarSelectedCheck'
import {
  PRIORITY_FILTERS,
  type MissionPriorityFilter,
} from './mission-control-toolbar-options'

interface MissionPriorityFilterMenuProps {
  priorityFilters: MissionPriorityFilter[]
  onPriorityFiltersChange: (priorities: MissionPriorityFilter[]) => void
  onClose: () => void
}

export function MissionPriorityFilterMenu({
  priorityFilters,
  onPriorityFiltersChange,
  onClose,
}: MissionPriorityFilterMenuProps) {
  return (
    <div className="dropdown-menu-solid p-spacing-2 min-w-40">
      <div className="space-y-spacing-0">
        <button
          type="button"
          onClick={() => {
            onPriorityFiltersChange([])
            onClose()
          }}
          className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center justify-between text-left transition-all ${priorityFilters.length === 0 ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
        >
          <div className="font-medium">Any priority</div>
        </button>
        {PRIORITY_FILTERS.map((option) => {
          const isSelected = priorityFilters.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                const next = isSelected
                  ? priorityFilters.filter((priority) => priority !== option.id)
                  : [...priorityFilters, option.id]
                onPriorityFiltersChange(next)
              }}
              className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center justify-between text-left transition-all ${isSelected ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
            >
              <div className="font-medium">{option.label}</div>
              {isSelected && <MissionToolbarSelectedCheck />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
