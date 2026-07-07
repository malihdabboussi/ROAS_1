'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Monitor, Smartphone, Tablet } from 'lucide-react'
import type { PresentationViewportSize } from '@/lib/artifacts'

const VIEWPORT_DROPDOWN_WIDTH = 200

const VIEWPORT_OPTIONS: { id: PresentationViewportSize; label: string; icon: typeof Monitor }[] =
  [
    { id: 'desktop', label: 'Desktop', icon: Monitor },
    { id: 'tablet', label: 'Tablet', icon: Tablet },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
  ]

interface PresentationViewportMenuProps {
  viewport: PresentationViewportSize
  onViewportChange: (viewport: PresentationViewportSize) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PresentationViewportMenu({
  viewport,
  onViewportChange,
  open,
  onOpenChange,
}: PresentationViewportMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const ActiveViewportIcon = VIEWPORT_OPTIONS.find((option) => option.id === viewport)?.icon ?? Monitor
  const activeViewportLabel =
    VIEWPORT_OPTIONS.find((option) => option.id === viewport)?.label ?? 'Desktop'

  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const left = Math.max(8, rect.left + rect.width / 2 - VIEWPORT_DROPDOWN_WIDTH / 2)
    setPosition({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-viewport-dropdown]') && !buttonRef.current?.contains(target)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onOpenChange])

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        data-tooltip={activeViewportLabel}
        data-side="bottom"
        className="tooltip h-spacing-7 text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex aspect-square shrink-0 items-center justify-center rounded-spacing-2 transition-colors"
        aria-label={`Preview size: ${activeViewportLabel}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <ActiveViewportIcon className="icon-sm shrink-0" />
      </button>
      {open
        ? createPortal(
            <div
              data-viewport-dropdown
              className="dropdown-menu-solid z-dropdown fixed w-[200px] rounded-spacing-3 border border-border p-spacing-1 shadow-lg"
              style={{ top: position.top, left: position.left }}
            >
              {VIEWPORT_OPTIONS.map((option) => {
                const Icon = option.icon
                const isActive = option.id === viewport
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onViewportChange(option.id)
                      onOpenChange(false)
                    }}
                    className={`body-3 gap-spacing-2 flex w-full items-center rounded-spacing-2 px-spacing-3 py-spacing-1-5 text-left transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                    }`}
                  >
                    <Icon className="icon-sm shrink-0" />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
