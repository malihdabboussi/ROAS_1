'use client'

import { useLayoutEffect, useState, type RefObject } from 'react'

export function useTriggerIsVisible(triggerRef: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const el = triggerRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setVisible(rect.width > 0 && rect.height > 0 && el.offsetParent !== null)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [triggerRef])

  return visible
}
