'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Side = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  label: string
  side?: Side
  wide?: boolean
  delayMs?: number
  /** Merged onto the hover trigger wrapper (e.g. `h-full` inside flex `items-stretch`). */
  triggerClassName?: string
  children: React.ReactNode
}

export function Tooltip({
  label,
  side = 'top',
  wide,
  delayMs = 0,
  triggerClassName,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reposition = useCallback(() => {
    const el = triggerRef.current
    const tip = tipRef.current
    if (!el || !tip) return
    const r = el.getBoundingClientRect()
    const t = tip.getBoundingClientRect()
    const gap = 6
    const padding = 8
    let top = 0
    let left = 0
    switch (side) {
      case 'top':
        top = r.top - t.height - gap
        left = r.left + r.width / 2 - t.width / 2
        break
      case 'bottom':
        top = r.bottom + gap
        left = r.left + r.width / 2 - t.width / 2
        break
      case 'left':
        top = r.top + r.height / 2 - t.height / 2
        left = r.left - t.width - gap
        break
      case 'right':
        top = r.top + r.height / 2 - t.height / 2
        left = r.right + gap
        break
    }
    left = Math.max(padding, Math.min(left, window.innerWidth - t.width - padding))
    top = Math.max(padding, Math.min(top, window.innerHeight - t.height - padding))
    setPos({ top, left })
  }, [side])

  useEffect(() => {
    if (!visible) return
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [visible, reposition])

  const handleEnter = useCallback(() => {
    if (delayMs <= 0) {
      setVisible(true)
      return
    }
    delayRef.current = setTimeout(() => setVisible(true), delayMs)
  }, [delayMs])

  const handleLeave = useCallback(() => {
    if (delayRef.current) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }
    setVisible(false)
  }, [])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        // Clicking usually opens a popover/menu — hide the hint so they don't stack.
        onMouseDown={handleLeave}
        className={triggerClassName ?? 'inline-flex'}
      >
        {children}
      </span>
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tipRef}
            className="pointer-events-none fixed z-[9999]"
            style={{ top: pos.top, left: pos.left }}
          >
            <div
              className={
                wide ? 'tooltip-portal-bubble tooltip-portal-bubble-wide' : 'tooltip-portal-bubble'
              }
            >
              {label}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
