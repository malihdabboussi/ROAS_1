'use client'

import { useEffect, useState, type ComponentType, type ReactNode } from 'react'

type GlobalChatLayoutComponent = ComponentType<{ children: ReactNode }>

export function DashboardShell({ children }: { children: ReactNode }) {
  const [GlobalChatLayout, setGlobalChatLayout] = useState<GlobalChatLayoutComponent | null>(null)

  useEffect(() => {
    void import('@/components/global-chat/containers/GlobalChatLayout').then((mod) => {
      setGlobalChatLayout(() => mod.GlobalChatLayout)
    })
  }, [])

  if (!GlobalChatLayout) {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <GlobalChatLayout>{children}</GlobalChatLayout>
    </div>
  )
}
