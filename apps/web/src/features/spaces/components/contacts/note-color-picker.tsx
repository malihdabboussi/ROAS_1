'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Palette } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  glassSwatchStyle,
  PRESET_HEX,
  TAG_COLORS,
  TagSwatchButton,
} from '../cells/field-color-presets-popover'
import type { NoteCardTintId } from './contact-note-card-tint'

const PAD = 8

function NoteColorMenuGrid({
  value: _value,
  onSelect,
}: {
  value: NoteCardTintId | null
  onSelect: (next: NoteCardTintId | null) => void
}) {
  return (
    <div className="p-2" role="listbox" aria-label="Note card colors">
      <div className="grid grid-cols-6 gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="group relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md"
          title="Default glass"
        >
          <span
            className="absolute inset-0 rounded-md"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              borderRadius: 'inherit',
            }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/25 to-transparent bg-[length:200%_100%] opacity-0 transition-opacity duration-200 group-hover:animate-[shimmer_1.1s_ease-in-out_infinite] group-hover:opacity-100 motion-reduce:group-hover:animate-none"
            aria-hidden
          />
        </button>
        {TAG_COLORS.map((c) => {
          const hex = PRESET_HEX[c.id] ?? '#6366f1'
          return (
            <TagSwatchButton
              key={c.id}
              title={c.label}
              onClick={() => onSelect(c.id)}
              swatchStyle={glassSwatchStyle(hex)}
            />
          )
        })}
      </div>
    </div>
  )
}

export interface NoteColorPickerProps {
  value: NoteCardTintId | null
  onChange: (next: NoteCardTintId | null) => void
  variant: 'square' | 'icon'
  placement: 'down' | 'up'
  disabled?: boolean
  className?: string
}

export function NoteColorPicker({
  value,
  onChange,
  variant,
  placement,
  disabled,
  className,
}: NoteColorPickerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const positionMenu = useCallback(() => {
    const tr = triggerRef.current?.getBoundingClientRect()
    const menuEl = menuRef.current
    if (!tr || !menuEl) return
    const mh = menuEl.offsetHeight
    const mw = menuEl.offsetWidth
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = tr.right - mw
    left = Math.min(Math.max(PAD, left), vw - mw - PAD)
    let top: number
    if (placement === 'up') {
      top = tr.top - PAD - mh
      if (top < PAD) top = tr.bottom + PAD
    } else {
      top = tr.bottom + PAD
      if (top + mh > vh - PAD) top = tr.top - PAD - mh
    }
    menuEl.style.top = `${Math.max(PAD, top)}px`
    menuEl.style.left = `${left}px`
  }, [placement])

  useLayoutEffect(() => {
    if (!open) return
    positionMenu()
    const raf = requestAnimationFrame(positionMenu)
    return () => cancelAnimationFrame(raf)
  }, [open, placement, positionMenu])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onScroll = () => positionMenu()
    const onResize = () => positionMenu()
    document.addEventListener('mousedown', onDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, positionMenu])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const selectAndClose = (next: NoteCardTintId | null) => {
    onChange(next)
    setOpen(false)
  }

  const triggerSquare = (
    <button
      type="button"
      ref={triggerRef}
      disabled={disabled}
      onClick={() => !disabled && setOpen((o) => !o)}
      className={cn(
        'relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md transition-colors',
        disabled && 'pointer-events-none opacity-40',
        open && 'ring-2 ring-[var(--color-primary)]',
        className,
      )}
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      {value == null ? (
        <span
          className="absolute inset-0 rounded-md"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
          aria-hidden
        />
      ) : (
        <span
          className="absolute inset-0 rounded-md"
          style={glassSwatchStyle(PRESET_HEX[value] ?? '#6366f1')}
          aria-hidden
        />
      )}
    </button>
  )

  const triggerIcon = (
    <button
      type="button"
      ref={triggerRef}
      disabled={disabled}
      onClick={() => !disabled && setOpen((o) => !o)}
      className={cn(
        'button-glass-neutral relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all',
        disabled && 'opacity-30',
        open && 'ring-2 ring-[var(--color-primary)]',
        className,
      )}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label="Note color"
    >
      {value == null ? (
        <Palette className="relative z-10 h-3.5 w-3.5" />
      ) : (
        <span
          className="absolute inset-0 rounded-full"
          style={glassSwatchStyle(PRESET_HEX[value] ?? '#6366f1')}
          aria-hidden
        />
      )}
    </button>
  )

  const trigger = variant === 'square' ? triggerSquare : triggerIcon

  return (
    <>
      {trigger}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              data-note-color-menu
              className="dropdown-menu-solid fixed z-[100002] overflow-hidden rounded-xl shadow-lg"
              style={{ top: 0, left: 0 }}
            >
              <NoteColorMenuGrid value={value} onSelect={selectAndClose} />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
