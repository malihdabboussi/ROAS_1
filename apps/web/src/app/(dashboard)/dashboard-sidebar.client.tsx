'use client'

import { useEffect, useState, type ComponentType } from 'react'
import type { SidebarProps } from '@/components/layout/sidebar/sidebar-types'

type SidebarComponent = ComponentType<SidebarProps>

export function DashboardSidebar(props: SidebarProps) {
  const [Sidebar, setSidebar] = useState<SidebarComponent | null>(null)

  useEffect(() => {
    void import('@/components/layout/Sidebar').then((mod) => {
      setSidebar(() => mod.Sidebar)
    })
  }, [])

  if (!Sidebar) {
    return <aside className="border-border bg-background w-[72px] shrink-0 border-r" aria-hidden />
  }

  return <Sidebar {...props} />
}
