import { Search, X } from 'lucide-react'

interface MissionToolbarSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  wrapperClassName?: string
  inputClassName: string
}

export function MissionToolbarSearchInput({
  value,
  onChange,
  placeholder,
  wrapperClassName = 'relative',
  inputClassName,
}: MissionToolbarSearchInputProps) {
  return (
    <div className={wrapperClassName}>
      <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-glass input-leading body-3 h-spacing-8 pr-spacing-3 rounded-lg py-0 ${inputClassName}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-muted-foreground hover:text-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
          aria-label="Clear mission search"
        >
          <X className="icon-sm" />
        </button>
      )}
    </div>
  )
}
