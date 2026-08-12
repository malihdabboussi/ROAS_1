'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'

function homeMobileTitle(pathname: string): string {
  if (pathname === '/home') return 'Home'
  if (pathname === '/home/inbox') return 'Inbox'
  if (pathname === '/home/meetings') return 'Meetings'
  if (pathname === '/home/my-tasks') return 'My Tasks'
  if (pathname.startsWith('/home/channels')) return 'Channels'
  return 'Home'
}

export function HomeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const title = homeMobileTitle(pathname)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MobilePageHeader title={title} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}
