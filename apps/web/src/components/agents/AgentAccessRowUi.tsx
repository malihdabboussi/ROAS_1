'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface AccessRowHoverCardProps {
  title: string
  description: string
  status: string | null
  children: ReactNode
}

export function AccessRowHoverCard({
  title,
  description,
  status,
  children,
}: AccessRowHoverCardProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    const el = triggerRef.current
    const card = cardRef.current
    if (!el || !card) return
    const r = el.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    const gap = 8
    const padding = 8
    let top = r.top + r.height / 2 - c.height / 2
    let left = r.left - c.width - gap
    if (left < padding) left = r.right + gap
    left = Math.max(padding, Math.min(left, window.innerWidth - c.width - padding))
    top = Math.max(padding, Math.min(top, window.innerHeight - c.height - padding))
    setPos({ top, left })
  }, [])

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

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="hover:bg-hover-subtle rounded-spacing-2 -mx-spacing-2 px-spacing-2 py-spacing-1 transition-colors"
      >
        {children}
      </div>
      {visible && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={cardRef}
              className="dropdown-menu-solid px-spacing-3 py-spacing-2 pointer-events-none fixed z-[9999] max-w-[280px]"
              style={{ top: pos.top, left: pos.left }}
            >
              <p className="body-3 text-foreground font-semibold">{title}</p>
              <p className="body-4 text-muted-foreground mt-spacing-1">{description}</p>
              {status ? (
                <p className="body-4 text-muted-foreground/70 mt-spacing-2">{status}</p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export function AccessIntegrationLogo({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <img
          src={src}
          alt={`${name} logo`}
          className="block h-full w-full object-contain object-center"
        />
      </span>
    )
  }
  return (
    <span className="text-muted-foreground inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-hover-subtle)] text-[9px] font-semibold">
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}
