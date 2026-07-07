import { useLayoutEffect, useState } from 'react'

export function useSpaceCustomizeStageBounds(
  spaceBelowViewTabsRef: React.RefObject<HTMLDivElement | null>,
) {
  const [customizeStageBounds, setCustomizeStageBounds] = useState<{
    top: number
    height: number
  } | null>(null)

  useLayoutEffect(() => {
    const el = spaceBelowViewTabsRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const next = { top: r.top, height: r.height }
      setCustomizeStageBounds((prev) => {
        if (prev && prev.top === next.top && prev.height === next.height) return prev
        return next
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('scroll', measure, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', measure, true)
    }
  }, [spaceBelowViewTabsRef])

  return customizeStageBounds
}
