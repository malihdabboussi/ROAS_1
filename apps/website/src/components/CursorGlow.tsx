'use client'

import { useEffect, useRef } from 'react'

/**
 * Renders a subtle radial glow that follows the cursor.
 * Attach to a parent with `position: relative; overflow: hidden`.
 */
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = glowRef.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    function handleMove(e: MouseEvent) {
      const rect = parent!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      el!.style.transform = `translate(${x - 200}px, ${y - 200}px)`
      el!.style.opacity = '1'
    }

    function handleLeave() {
      el!.style.opacity = '0'
    }

    parent.addEventListener('mousemove', handleMove)
    parent.addEventListener('mouseleave', handleLeave)
    return () => {
      parent.removeEventListener('mousemove', handleMove)
      parent.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      className="pointer-events-none absolute h-[400px] w-[400px] rounded-full opacity-0 transition-opacity duration-300"
      style={{
        background:
          'radial-gradient(circle, rgb(var(--accent-secondary-rgb) / 0.08) 0%, transparent 70%)',
      }}
    />
  )
}
