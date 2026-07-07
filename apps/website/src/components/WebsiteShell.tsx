'use client'

import { Suspense, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { EnterpriseContactModalProvider } from '@/components/EnterpriseContactModalProvider'
import { Navbar } from '@/components/Navbar'
import { WaitlistModalProvider } from '@/components/WaitlistModalProvider'
import { WaitlistUrlOpener } from '@/components/WaitlistUrlOpener'

const NAVLESS_PATH_PREFIXES = ['/executive-brief'] as const

function isNavlessPath(pathname: string | null) {
  if (!pathname) return false
  return NAVLESS_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function WebsiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideNav = isNavlessPath(pathname)

  return (
    <WaitlistModalProvider>
      <EnterpriseContactModalProvider>
        <Suspense fallback={null}>
          <WaitlistUrlOpener />
        </Suspense>
        {hideNav ? null : <Navbar />}
        {children}
      </EnterpriseContactModalProvider>
    </WaitlistModalProvider>
  )
}
