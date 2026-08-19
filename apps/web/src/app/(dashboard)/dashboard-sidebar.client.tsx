'use client'

import { useEffect, useState, type ComponentType } from 'react'
import type { SidebarProps } from '@/components/layout/sidebar/sidebar-types'
import {
  hydrateShellMenuDockFromStorage,
  useShellMenuDock,
} from '@/components/shell/use-shell-menu-dock'
import { useShellPrefsHydrated } from '@/components/shell/use-shell-prefs-hydrated'

type SidebarComponent = ComponentType<SidebarProps>

const COMPACT_RAIL_WIDTH = 56
const HQ_RAIL_WIDTH = 72

/**
 * Reserves the sidebar's real width while the Sidebar chunk loads so the page does not
 * jump when it mounts. Reads the persisted compact/simple-width prefs (same source the
 * real Sidebar uses) instead of a fixed 72px strip.
 */
function SidebarLoadingPlaceholder() {
  const hydrated = useShellPrefsHydrated()
  const menuCompact = useShellMenuDock((state) => state.menuCompact)
  const menuStyle = useShellMenuDock((state) => state.menuStyle)
  const simpleMenuWidth = useShellMenuDock((state) => state.simpleMenuWidth)
  useEffect(() => {
    hydrateShellMenuDockFromStorage()
  }, [])
  const width = !hydrated
    ? HQ_RAIL_WIDTH
    : menuCompact
      ? COMPACT_RAIL_WIDTH
      : menuStyle === 'simple'
        ? simpleMenuWidth
        : HQ_RAIL_WIDTH
  return (
    <aside
      className="border-border surface-card hidden h-full shrink-0 border-r md:block"
      style={{ width }}
      aria-hidden
      data-sidebar-loading
    />
  )
}

export function DashboardSidebar(props: SidebarProps) {
  const [Sidebar, setSidebar] = useState<SidebarComponent | null>(null)

  useEffect(() => {
    void import('@/components/layout/Sidebar').then((mod) => {
      setSidebar(() => mod.Sidebar)
    })
  }, [])

  if (!Sidebar) {
    return <SidebarLoadingPlaceholder />
  }

  return <Sidebar {...props} />
}
