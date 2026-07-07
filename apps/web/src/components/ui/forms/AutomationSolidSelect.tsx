'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'

export interface AutomationSolidOption {
  value: string
  label: string
  description?: string
  leading?: ReactNode
}

interface AutomationSolidSelectProps {
  options: AutomationSolidOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  disabled?: boolean
  /** Default `default` (h-spacing-10); `compact` matches toolbar filter height. */
  size?: 'default' | 'compact'
  /**
   * Dropdown width: `min200` ensures at least 200px; `trigger` matches trigger width only.
   */
  menuWidth?: 'min200' | 'trigger'
  ariaLabel?: string
  /** Toolbar: icon-only trigger (Spaces quick-filter dock pattern). */
  variant?: 'field' | 'icon'
  triggerIcon?: ReactNode
  /** Shown when `variant` is `icon`. */
  tooltip?: string
  /** Tooltip position for icon variant. */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Non-default filter: stronger trigger chrome. */
  active?: boolean
}

export function AutomationSolidSelect({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  size = 'default',
  menuWidth = 'min200',
  ariaLabel,
  variant = 'field',
  triggerIcon,
  tooltip,
  tooltipSide = 'bottom',
  active = false,
}: AutomationSolidSelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [pos, setPos] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)

  const selected = options.find((o) => o.value === value) ?? null

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const w = menuWidth === 'trigger' ? rect.width : Math.max(rect.width, 200)
    let left = rect.left
    let top = rect.bottom + 4
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0
    const pad = 8
    if (vw > 0 && left + w > vw - pad) {
      left = Math.max(pad, vw - pad - w)
    }
    const below = vh > 0 ? vh - rect.bottom - pad : 288
    const above = vh > 0 ? rect.top - pad : 288
    const openUp = below < 220 && above > below
    const maxHeight = Math.max(160, Math.min(288, openUp ? above - 4 : below - 4))
    if (openUp) {
      top = Math.max(pad, rect.top - maxHeight - 4)
    }
    setPos({
      top,
      left,
      width: w,
      maxHeight,
    })
  }, [open, menuWidth])

  useEffect(() => {
    if (!open) return
    const closest = triggerRef.current?.closest<HTMLElement>(
      '[role="dialog"], [data-slot="dialog-content"]',
    )
    setPortalRoot(closest ?? document.body)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const iconTriggerButton = (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="listbox"
      onClick={() => !disabled && setOpen((o) => !o)}
      data-dropdown=""
      className={cn(
        'btn-icon-bare hover:bg-hover-subtle shrink-0',
        open || active ? 'bg-hover-subtle text-foreground' : '',
        className,
      )}
    >
      {triggerIcon}
    </button>
  )

  return (
    <>
      {variant === 'icon' && triggerIcon ? (
        tooltip ? (
          <Tooltip label={tooltip} side={tooltipSide} triggerClassName="inline-flex">
            <span className="inline-flex">{iconTriggerButton}</span>
          </Tooltip>
        ) : (
          iconTriggerButton
        )
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={
            size === 'compact'
              ? `body-4 text-muted-foreground hover:text-foreground h-spacing-7 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`
              : `body-3 text-muted-foreground hover:text-foreground h-spacing-10 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-3 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`
          }
          data-dropdown=""
        >
          <span className="gap-spacing-2 flex min-w-0 flex-1 items-center">
            {selected?.leading}
            <span className={`truncate ${selected ? 'text-foreground' : ''}`}>
              {selected?.label ?? placeholder}
            </span>
          </span>
          <ChevronDown className="icon-sm shrink-0 opacity-60" />
        </button>
      )}

      {open &&
        pos &&
        portalRoot &&
        createPortal(
          <div
            ref={menuRef}
            className="z-dropdown pointer-events-auto fixed"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            data-dropdown=""
          >
            <div
              className="dropdown-menu-solid px-spacing-4 py-spacing-3 overflow-y-auto"
              style={{ maxHeight: pos.maxHeight }}
            >
              <div className="flex flex-col">
                {options.map((opt) => {
                  const isSel = opt.value === value
                  return (
                    <button
                      key={opt.value === '' ? '__empty' : opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                      className={`gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 body-3 flex w-full items-center text-left transition-colors ${
                        isSel
                          ? 'bg-primary/10 text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.leading}
                      <span className="min-w-0 flex-1 truncate font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="typo-caption text-muted-foreground hidden sm:block">
                          {opt.description}
                        </span>
                      )}
                      {isSel && <Check className="icon-sm text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          portalRoot,
        )}
    </>
  )
}
