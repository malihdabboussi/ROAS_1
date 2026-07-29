'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

type SiteLogoProps = {
  className?: string
  /** Always `icon-text-white-moregap` (dark chrome: modals, app mock sidebar). */
  forceDark?: boolean
}

const WHITE_SRC = '/Logos/logov2/icon-text-white-moregap.png'
const BLACK_SRC = '/Logos/logov2/icon-text-black.png'

/** Wordmark: `icon-text-black` only when resolved theme is `light`; otherwise white-moregap (matches `WebsiteThemeToggle` `isDark = resolvedTheme !== 'light'`). */
export function SiteLogo({ className = '', forceDark }: SiteLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (forceDark) {
    return (
      <img src={WHITE_SRC} alt="ROAS" className={`h-10 w-auto ${className}`} />
    )
  }

  const isLight = resolvedTheme === 'light'

  if (!mounted) {
    return (
      <>
        <img
          src={WHITE_SRC}
          alt="ROAS"
          className={`hidden h-10 w-auto dark:block ${className}`}
        />
        <img
          src={BLACK_SRC}
          alt=""
          aria-hidden
          className={`block h-10 w-auto dark:hidden ${className}`}
        />
      </>
    )
  }

  const src = isLight ? BLACK_SRC : WHITE_SRC
  return <img src={src} alt="ROAS" className={`h-10 w-auto ${className}`} />
}
