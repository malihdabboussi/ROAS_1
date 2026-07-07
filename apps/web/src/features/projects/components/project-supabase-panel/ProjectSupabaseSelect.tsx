import { ChevronDown } from 'lucide-react'

export type SupabasePanelSelectField = 'org' | 'region' | 'existing-project'

export interface SupabasePanelSelectOption {
  value: string
  label: string
  description?: string
}

interface ProjectSupabaseSelectProps {
  field: SupabasePanelSelectField
  labelText: string
  value: string
  onChange: (next: string) => void
  placeholder: string
  options: SupabasePanelSelectOption[]
  activeField: SupabasePanelSelectField | null
  onActiveFieldChange: (next: SupabasePanelSelectField | null) => void
}

export function ProjectSupabaseSelect({
  field,
  labelText,
  value,
  onChange,
  placeholder,
  options,
  activeField,
  onActiveFieldChange,
}: ProjectSupabaseSelectProps) {
  const isOpen = activeField === field
  const selected = options.find((o) => o.value === value)
  const labelId = `supabase-panel-${field}-label`
  const triggerId = `supabase-panel-${field}-trigger`

  return (
    <div>
      <span className="body-4 text-muted-foreground mb-1 block" id={labelId}>
        {labelText}
      </span>
      <div className="relative w-full">
        <button
          type="button"
          id={triggerId}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${labelId} ${triggerId}`}
          disabled={options.length === 0}
          onClick={() => {
            if (options.length === 0) return
            onActiveFieldChange(isOpen ? null : field)
          }}
          className="input-glass body-2 gap-spacing-2 px-spacing-3 h-spacing-10 rounded-spacing-2 flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={`icon-sm text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {isOpen && options.length > 0 && (
          <div className="mt-spacing-1 z-dropdown absolute left-0 top-full w-full" data-dropdown>
            <div className="dropdown-menu-solid p-spacing-2 w-full">
              <div className="dropdown-list-scroll space-y-spacing-0">
                {options.map((opt) => {
                  const isSelected = value === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value)
                        onActiveFieldChange(null)
                      }}
                      className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'dropdown-sort-option-selected text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="min-w-0 text-left">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.description ? (
                          <div className="typo-caption text-muted-foreground truncate">
                            {opt.description}
                          </div>
                        ) : null}
                      </div>
                      {isSelected ? (
                        <div className="dropdown-sort-check ml-spacing-2 shrink-0">
                          <svg
                            viewBox="0 0 20 20"
                            className="tint-green relative z-30 h-2.5 w-2.5"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
