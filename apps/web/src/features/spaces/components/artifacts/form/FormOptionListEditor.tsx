import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { OptionDot } from '@/components/ui/status/OptionBadge'
import type { FormQuestionOption } from '@/lib/forms'
import { glassSwatchStyle, presetToHex, TAG_COLORS } from '@/lib/ui/field-color-presets'
import { cn } from '@/lib/utils/cn'

export function FormOptionListEditor({
  options,
  onChange,
}: {
  options: FormQuestionOption[]
  onChange: (next: FormQuestionOption[]) => void
}) {
  const [pickerForId, setPickerForId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerForId) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target) return
      if (wrapperRef.current?.contains(target)) return
      setPickerForId(null)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [pickerForId])

  return (
    <div ref={wrapperRef} className="space-y-spacing-2">
      <p className="body-4 text-muted-foreground font-medium">Options</p>
      {options.map((option, index) => (
        <div key={option.id} className="gap-spacing-2 relative flex items-center">
          <button
            type="button"
            onClick={() => setPickerForId((current) => (current === option.id ? null : option.id))}
            className="rounded-spacing-1 hover:bg-hover-subtle p-spacing-1 inline-flex items-center justify-center transition-colors"
            aria-label="Change color"
            title="Change color"
          >
            <OptionDot color={option.color} size="sm" />
          </button>
          <input
            value={option.label}
            onChange={(event) => {
              const next = [...options]
              next[index] = { ...option, label: event.target.value }
              onChange(next)
            }}
            className="h-spacing-9 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground px-spacing-3 focus:ring-ring min-w-0 flex-1 border outline-none focus:ring-2"
            placeholder="Option label"
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
            className="h-spacing-7 w-spacing-7 rounded-spacing-2 text-muted-foreground hover:text-destructive inline-flex items-center justify-center transition-colors"
            aria-label="Remove option"
            title="Remove option"
          >
            <X className="icon-xs" />
          </button>
          {pickerForId === option.id ? (
            <div className="surface-card border-border rounded-spacing-2 p-spacing-2 absolute left-0 top-full z-dropdown mt-1 w-52 border shadow-lg">
              <div className="grid grid-cols-6 gap-1.5">
                {TAG_COLORS.map((color) => {
                  const selected = option.color === color.id
                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        const next = [...options]
                        next[index] = { ...option, color: color.id }
                        onChange(next)
                        setPickerForId(null)
                      }}
                      title={color.label}
                      aria-label={color.label}
                      aria-pressed={selected}
                      className={cn(
                        'h-6 w-6 overflow-hidden rounded-md transition-transform hover:scale-110',
                        selected && 'ring-foreground ring-offset-background ring-1 ring-offset-1',
                      )}
                      style={glassSwatchStyle(presetToHex(color.id))}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const colorId = TAG_COLORS[options.length % TAG_COLORS.length]?.id ?? 'purple'
          onChange([
            ...options,
            {
              id: `opt_${Date.now()}`,
              label: `Option ${options.length + 1}`,
              color: colorId,
            },
          ])
        }}
        className="gap-spacing-2 hover:border-foreground/40 group flex w-full items-center text-left"
        aria-label="Add option"
      >
        <span className="p-spacing-1 inline-flex items-center justify-center">
          <OptionDot size="sm" />
        </span>
        <span className="h-spacing-9 body-3 rounded-spacing-2 border-border text-muted-foreground group-hover:text-foreground group-hover:border-foreground/40 px-spacing-3 flex min-w-0 flex-1 items-center border border-dashed bg-transparent transition-colors">
          Add option
        </span>
      </button>
    </div>
  )
}
