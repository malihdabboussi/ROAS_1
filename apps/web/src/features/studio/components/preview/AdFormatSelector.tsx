import { Film, Image as ImageIcon, LayoutGrid } from 'lucide-react'
import type { AdFormat } from '../../types'

const FORMAT_OPTIONS = [
  { value: 'SINGLE_IMAGE' as AdFormat, label: 'Image', icon: ImageIcon },
  { value: 'SINGLE_VIDEO' as AdFormat, label: 'Video', icon: Film },
  { value: 'CAROUSEL' as AdFormat, label: 'Carousel', icon: LayoutGrid },
] as const

interface AdFormatSelectorProps {
  value?: AdFormat | null
  onChange: (value: AdFormat) => void
}

export function AdFormatSelector({ value, onChange }: AdFormatSelectorProps) {
  const selectedValue = value || 'SINGLE_IMAGE'

  return (
    <div className="gap-spacing-2 grid grid-cols-3">
      {FORMAT_OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
        const selected = selectedValue === optionValue
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`gap-spacing-2 rounded-spacing-2 p-spacing-3 focus-visible:ring-primary/50 flex flex-col items-center border transition-all focus:outline-none focus-visible:ring-2 ${selected ? 'card-glass-active border-primary/40' : 'card-glass-interactive border-border/50'}`}
          >
            <Icon className={selected ? 'text-primary h-6 w-6' : 'text-muted-foreground h-6 w-6'} />
            <span
              className={`body-3 font-medium ${selected ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
