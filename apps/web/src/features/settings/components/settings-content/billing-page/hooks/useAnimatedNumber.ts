'use client'

import { useEffect, useRef, useState } from 'react'

export function useAnimatedNumber(
  from: number,
  to: number,
  duration: number,
  active: boolean,
): number {
  const [value, setValue] = useState(from)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      setValue(to)
      return
    }
    const startTime = performance.now()
    const diff = to - from
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + diff * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [from, to, duration, active])

  return value
}
