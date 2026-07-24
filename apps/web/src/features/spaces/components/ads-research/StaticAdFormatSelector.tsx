import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  STATIC_AD_FAMILY_LABELS,
  STATIC_AD_FORMATS,
  type StaticAdFamily,
} from '../../config/static-ad-formats.config'

export function StaticAdFormatSelector({
  selectedFormatIds,
  onToggle,
}: {
  selectedFormatIds: string[]
  onToggle: (formatId: string) => void
}) {
  return (
    <div className="gap-spacing-4 flex flex-col">
      {(Object.keys(STATIC_AD_FAMILY_LABELS) as StaticAdFamily[]).map((family) => (
        <div key={family} className="gap-spacing-2 flex flex-col">
          <p className="body-3 text-foreground font-medium">{STATIC_AD_FAMILY_LABELS[family]}</p>
          <div className="gap-spacing-2 grid sm:grid-cols-2 lg:grid-cols-3">
            {STATIC_AD_FORMATS.filter((format) => format.family === family).map((format) => {
              const selected = selectedFormatIds.includes(format.id)
              return (
                <button
                  key={format.id}
                  type="button"
                  className={cn(
                    'p-spacing-3 gap-spacing-2 rounded-spacing-2 flex items-start border text-left',
                    selected
                      ? 'card-glass-blue text-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-hover-subtle border-transparent',
                  )}
                  aria-pressed={selected}
                  onClick={() => onToggle(format.id)}
                >
                  {selected ? (
                    <Check className="icon-sm text-primary mt-spacing-0-5 shrink-0" />
                  ) : (
                    <Circle className="icon-sm text-muted-foreground mt-spacing-0-5 shrink-0" />
                  )}
                  <span className="min-w-0">
                    <span className="body-3 text-foreground block font-medium">{format.name}</span>
                    <span className="body-4 text-muted-foreground block">{format.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
