'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { OptionBadge } from '@/components/ui/status/OptionBadge'
import type { SelectOption } from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'

const PLUS_CLASS = 'shrink-0 text-[10px] font-medium text-[var(--color-muted-foreground)]'

type TagOption = Pick<SelectOption, 'id' | 'label' | 'color'>

/**
 * Renders as many tag badges as fit in the container width, then +overflow (no horizontal scroll).
 */
export function ResponsiveTagChips({
  options,
  className,
}: {
  options: TagOption[]
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const n = options.length
  const sig = options.map((o) => `${o.id}:${o.label}`).join('|')
  const [fitCount, setFitCount] = useState(n)

  const recompute = useCallback(() => {
    if (n === 0) {
      setFitCount(0)
      return
    }
    const c = containerRef.current
    const m = measureRef.current
    if (!c || !m) return
    const available = c.getBoundingClientRect().width
    if (available <= 1) return

    const ch = m.children
    if (ch.length < n * 2) return

    const styles = getComputedStyle(m)
    const gap = Number.parseFloat(styles.gap) || 4

    const badgeW: number[] = []
    for (let i = 0; i < n; i++) {
      const w = (ch[i] as HTMLElement).getBoundingClientRect().width
      if (w < 0.5) return
      badgeW.push(w)
    }
    const plusW: number[] = Array(n + 1).fill(0)
    for (let o = 1; o <= n; o++) {
      const el = ch[n + o - 1] as HTMLElement
      plusW[o] = el.getBoundingClientRect().width
    }

    for (let k = n; k >= 0; k -= 1) {
      const over = n - k
      let total = 0
      for (let i = 0; i < k; i += 1) {
        total += badgeW[i] ?? 0
        if (i < k - 1) total += gap
      }
      if (over > 0) {
        if (k > 0) total += gap
        total += plusW[over] ?? 0
      }
      if (total <= available) {
        setFitCount(k)
        return
      }
    }
    setFitCount(0)
  }, [n, sig])

  useLayoutEffect(() => {
    recompute()
    const id = requestAnimationFrame(() => recompute())
    return () => cancelAnimationFrame(id)
  }, [recompute])

  useLayoutEffect(() => {
    const c = containerRef.current
    if (!c) return
    const ro = new ResizeObserver(() => recompute())
    ro.observe(c)
    return () => ro.disconnect()
  }, [recompute])

  if (n === 0) return null

  const safeFit = Math.min(fitCount, n)
  const over = n - safeFit
  return (
    <div className="relative w-full min-w-0 max-w-full">
      <div
        ref={measureRef}
        className="pointer-events-none invisible absolute -left-[9999px] top-0 z-[-1] flex w-max min-w-0 max-w-none items-center gap-1"
        aria-hidden
      >
        {options.map((o) => (
          <OptionBadge key={o.id} option={o} />
        ))}
        {Array.from({ length: n }, (_, j) => (
          <span key={`+${j + 1}`} className={PLUS_CLASS}>
            +{j + 1}
          </span>
        ))}
      </div>
      <div
        ref={containerRef}
        className={cn(
          'flex w-full min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-hidden',
          className,
        )}
      >
        {options.slice(0, safeFit).map((o) => (
          <OptionBadge key={o.id} option={o} />
        ))}
        {over > 0 && <span className={PLUS_CLASS}>+{over}</span>}
      </div>
    </div>
  )
}
