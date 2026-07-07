import { MissionToolbarSelectedCheck } from './MissionToolbarSelectedCheck'
import { SORT_OPTIONS, type MissionSort } from './mission-control-toolbar-options'

interface MissionSortMenuProps {
  currentSort: MissionSort
  onSortChange: (sort: MissionSort) => void
  onClose: () => void
}

export function MissionSortMenu({ currentSort, onSortChange, onClose }: MissionSortMenuProps) {
  return (
    <div className="dropdown-menu-solid p-spacing-2 min-w-48">
      <div className="space-y-spacing-3">
        <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 font-medium">Sort by</h3>
        {SORT_OPTIONS.map((group) => (
          <div key={group.group} className="space-y-spacing-1">
            <div className="typo-caption text-muted-foreground px-spacing-2 uppercase tracking-wider">
              {group.group}
            </div>
            <div className="space-y-spacing-0">
              {group.options.map((option) => {
                const isSelected = currentSort === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onSortChange(option.id)
                      onClose()
                    }}
                    className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center justify-between text-left transition-all ${isSelected ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="typo-caption text-muted-foreground">{option.description}</div>
                    </div>
                    {isSelected && <MissionToolbarSelectedCheck />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
