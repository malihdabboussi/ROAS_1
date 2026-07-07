import { STATUS_PILLS, type MissionStatusFilter } from './mission-control-toolbar-options'

interface MissionStatusFilterMenuProps {
  statusFilter: MissionStatusFilter
  onStatusFilterChange: (status: MissionStatusFilter) => void
  onClose: () => void
}

export function MissionStatusFilterMenu({
  statusFilter,
  onStatusFilterChange,
  onClose,
}: MissionStatusFilterMenuProps) {
  const handleSelect = (status: MissionStatusFilter) => {
    onStatusFilterChange(status)
    onClose()
  }

  return (
    <div
      className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 z-dropdown absolute right-0 top-full mt-1 min-w-36"
      data-dropdown
    >
      <button
        type="button"
        onClick={() => handleSelect('all')}
        className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${statusFilter === 'all' ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
      >
        All
      </button>
      {STATUS_PILLS.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => handleSelect(pill.id)}
          className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${statusFilter === pill.id ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  )
}
