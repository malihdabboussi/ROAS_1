import { useEffect, useId, useRef, useState } from 'react'

export type ExtDropdownOption = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: ExtDropdownOption[]
  disabled?: boolean
  className?: string
  emptyLabel?: string
  id?: string
  'aria-labelledby'?: string
  /** Always show this label on the trigger regardless of selected value. */
  triggerLabel?: string
}

export function ExtDropdown({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  emptyLabel = '—',
  id: idProp,
  'aria-labelledby': ariaLabelledby,
  triggerLabel: triggerLabelProp,
}: Props) {
  const autoId = useId()
  const listboxId = idProp ?? `ext-dd-${autoId}`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const selected = options.find((o) => o.value === value)
  const triggerLabel = triggerLabelProp ?? selected?.label ?? emptyLabel

  const off = disabled || options.length === 0

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`.trim()} data-dropdown>
      <button
        type="button"
        className="ext-dropdown-trigger w-full"
        id={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={ariaLabelledby}
        aria-controls={open ? `${listboxId}-list` : undefined}
        disabled={off}
        onClick={() => !off && setOpen((v) => !v)}
      >
        <span className="ext-dropdown-trigger-label">{triggerLabel}</span>
      </button>
      {open && !off && (
        <div className="z-dropdown mt-spacing-1 absolute left-0 right-0 top-full">
          <div
            id={`${listboxId}-list`}
            className="dropdown-menu-solid dropdown-list-scroll gap-spacing-1 p-spacing-2 flex min-w-0 flex-col"
            role="listbox"
            aria-labelledby={ariaLabelledby}
          >
            {options.map((opt) => {
              const isSel = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  className={`ext-dropdown-option body-3 text-muted-foreground ${isSel ? 'dropdown-sort-option-selected' : ''} `}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <span className="ext-dropdown-option-text">{opt.label}</span>
                  {isSel && (
                    <div className="dropdown-sort-check ml-spacing-2 shrink-0">
                      <svg
                        viewBox="0 0 20 20"
                        className="ext-dropdown-check-svg relative z-30"
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
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
