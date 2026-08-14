'use client'

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type QuickMissionsLauncherContextValue = {
  open: boolean
  playbookKey: string | null
  openLauncher: (playbookKey?: string) => void
  closeLauncher: () => void
}

const DEFAULT_LAUNCHER: QuickMissionsLauncherContextValue = {
  open: false,
  playbookKey: null,
  openLauncher: () => undefined,
  closeLauncher: () => undefined,
}

const QuickMissionsLauncherContext =
  createContext<QuickMissionsLauncherContextValue>(DEFAULT_LAUNCHER)

export function QuickMissionsLauncherProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [playbookKey, setPlaybookKey] = useState<string | null>(null)
  const openLauncher = useCallback((nextPlaybookKey?: string) => {
    setPlaybookKey(nextPlaybookKey ?? null)
    setOpen(true)
  }, [])
  const closeLauncher = useCallback(() => {
    setOpen(false)
    setPlaybookKey(null)
  }, [])
  const value = useMemo(
    () => ({ open, playbookKey, openLauncher, closeLauncher }),
    [closeLauncher, open, openLauncher, playbookKey],
  )

  return createElement(QuickMissionsLauncherContext.Provider, { value }, children)
}

export function useQuickMissionsLauncher() {
  return useContext(QuickMissionsLauncherContext)
}
