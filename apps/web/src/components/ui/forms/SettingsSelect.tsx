'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom'
import { Check, ChevronDown } from 'lucide-react'

function referenceContainsNode(ref: unknown, node: Node): boolean {
  return ref instanceof Element ? ref.contains(node) : false
}

export interface SettingsSelectOption<V extends string = string> {
  value: V
  label: string
}

export interface SettingsSelectProps<V extends string = string> {
  value: V
  options: readonly SettingsSelectOption<V>[]
  onChange: (value: V) => void
  placeholder?: string
  disabled?: boolean
  wrapperClassName?: string
  triggerClassName?: string
  menuMinWidth?: number
  id?: string
}

export function SettingsSelect<V extends string = string>({
  value,
  options,
  onChange,
  placeholder = 'Select',
  disabled = false,
  wrapperClassName = 'relative w-full',
  triggerClassName = 'gap-spacing-1 h-spacing-9 px-spacing-3 input-glass rounded-spacing-2 flex w-full items-center justify-between transition-colors disabled:opacity-60',
  menuMinWidth,
  id,
}: SettingsSelectProps<V>) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          elements.floating.style.minWidth = `${Math.max(
            rects.reference.width,
            menuMinWidth ?? rects.reference.width,
          )}px`
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    if (!open) return
    const closest = triggerRef.current?.closest<HTMLElement>(
      '[role="dialog"], [data-slot="dialog-content"]',
    )
    setPortalRoot(closest ?? document.body)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        !referenceContainsNode(refs.reference.current, target) &&
        !refs.floating.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, refs])

  const setRefs = (node: HTMLButtonElement | null) => {
    triggerRef.current = node
    refs.setReference(node)
  }

  const display = options.find((option) => option.value === value)?.label ?? placeholder

  const menu =
    open && !disabled && portalRoot
      ? createPortal(
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-dropdown pointer-events-auto outline-none"
            data-dropdown
          >
            <div className="dropdown-menu-solid rounded-spacing-2 max-h-60 overflow-hidden">
              <div className="p-spacing-1 max-h-60 overflow-y-auto">
                {options.map((option) => {
                  const isSelected = value === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setOpen(false)
                      }}
                      className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${isSelected ? 'dropdown-option-selected' : 'hover:bg-hover-subtle hover:text-foreground text-muted-foreground'}`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? (
                        <Check className="icon-sm text-foreground ml-spacing-2 flex-shrink-0" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          portalRoot,
        )
      : null

  return (
    <div className={wrapperClassName}>
      <button
        ref={setRefs}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={triggerClassName}
      >
        <span className="body-3 text-foreground truncate">{display}</span>
        <ChevronDown
          className={`icon-sm text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  )
}
