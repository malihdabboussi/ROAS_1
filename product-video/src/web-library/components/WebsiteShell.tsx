'use client'

import { Suspense, type ReactNode } from 'react'
import { EnterpriseContactModalProvider } from '@/components/EnterpriseContactModalProvider'
import { Navbar } from '@/components/Navbar'
import { WaitlistModalProvider } from '@/components/WaitlistModalProvider'
import { WaitlistUrlOpener } from '@/components/WaitlistUrlOpener'

export function WebsiteShell({ children }: { children: ReactNode }) {
  return (
    <WaitlistModalProvider>
      <EnterpriseContactModalProvider>
        <Suspense fallback={null}>
          <WaitlistUrlOpener />
        </Suspense>
        <Navbar />
        {children}
      </EnterpriseContactModalProvider>
    </WaitlistModalProvider>
  )
}
