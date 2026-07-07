'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

/**
 * Fires Meta Pixel PageView on client-side route changes (App Router soft navigations).
 * Initial PageView is sent by the inline script in `app/layout.tsx`.
 */
export function MetaPixelPageView() {
  const pathname = usePathname()
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    window.fbq?.('track', 'PageView')
  }, [pathname])

  return null
}
