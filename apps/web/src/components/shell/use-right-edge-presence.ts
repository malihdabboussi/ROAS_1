'use client'

import { useEffect, useState } from 'react'

const RIGHT_EDGE_TRANSITION_MS = 300

export function useRightEdgePresence(open: boolean, initiallyVisible = false) {
  const [mounted, setMounted] = useState(initiallyVisible && open)
  const [visible, setVisible] = useState(initiallyVisible && open)

  useEffect(() => {
    if (open) {
      if (!mounted) {
        setMounted(true)
        return
      }
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    setVisible(false)
    const timer = setTimeout(() => setMounted(false), RIGHT_EDGE_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [mounted, open])

  return { mounted, visible }
}
