import { FILTER_TABS } from './ready-employees-modal.constants'

export interface ReadyEmployeeFilterTabsProps {
  teamFilter: string | null
  onChange: (next: string | null) => void
  variant: 'mobile' | 'sidebar'
}

export function ReadyEmployeeFilterTabs({
  teamFilter,
  onChange,
  variant,
}: ReadyEmployeeFilterTabsProps) {
  if (variant === 'mobile') {
    return (
      <div className="flex shrink-0 flex-wrap gap-2 px-3 py-3">
        {FILTER_TABS.map((tab) => {
          const isActive = (tab.id === 'all' && !teamFilter) || teamFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id === 'all' ? null : isActive ? null : tab.id)}
              className={`badge-glass ${isActive ? tab.badge : 'badge-glass-muted'} cursor-pointer px-3 py-1 transition-all`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="gap-spacing-1 p-spacing-3 flex shrink-0 flex-wrap border-b border-border">
      {FILTER_TABS.map((tab) => {
        const isActive = (tab.id === 'all' && !teamFilter) || teamFilter === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id === 'all' ? null : isActive ? null : tab.id)}
            className={`badge-glass badge-glass-sm ${isActive ? tab.badge : 'badge-glass-muted'} cursor-pointer transition-all`}
            style={{ position: 'relative' }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
