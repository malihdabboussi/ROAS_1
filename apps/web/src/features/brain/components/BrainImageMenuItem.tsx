'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronRight, ImageIcon, Trash2, Upload } from 'lucide-react'
import {
  dispatchBrainImagePicker,
  type BrainImagePickerAction,
} from '@/features/brain/lib/brain-image-picker.events'
import { cn } from '@/lib/utils/cn'

interface BrainImageMenuItemProps {
  brainId: string
  brainLabel: string
  scopeId?: string
  /** Visual style — 'menu' for portalled context menu rows, 'card' for the BrainHome card menu (smaller). */
  variant?: 'menu' | 'card'
  /** Called after the user picks an action so the parent menu can close. */
  onAction: () => void
}

const SUBMENU_ITEMS: Array<{
  action: BrainImagePickerAction
  label: string
  icon: typeof Upload
  danger?: boolean
}> = [
  { action: 'upload', label: 'Upload', icon: Upload },
  { action: 'library', label: 'Media library', icon: ImageIcon },
  { action: 'generate', label: 'Generate with AI', icon: Bot },
  { action: 'remove', label: 'Remove image', icon: Trash2, danger: true },
]

export function BrainImageMenuItem({
  brainId,
  brainLabel,
  scopeId,
  variant = 'menu',
  onAction,
}: BrainImageMenuItemProps) {
  const [open, setOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 160)
  }

  useEffect(() => {
    return () => cancelClose()
  }, [])

  const triggerAction = (action: BrainImagePickerAction) => {
    dispatchBrainImagePicker({ brainId, brainLabel, scopeId, action })
    setOpen(false)
    onAction()
  }

  const rowCls =
    variant === 'menu'
      ? cn(
          'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors',
          'text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground',
          open && 'bg-[var(--color-hover-subtle)] text-foreground',
        )
      : cn(
          'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors',
          open && 'bg-[var(--color-hover-subtle)] text-foreground',
        )

  return (
    <div
      ref={rowRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={rowCls}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">Change image</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
      {open ? (
        <div
          ref={flyoutRef}
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="dropdown-menu-solid p-spacing-2 gap-spacing-1 absolute left-full top-0 z-50 ml-1 flex w-56 flex-col rounded-md shadow-lg"
        >
          {SUBMENU_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.action}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  triggerAction(item.action)
                }}
                className={cn(
                  'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors',
                  item.danger
                    ? 'text-destructive hover:bg-red-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)]',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
