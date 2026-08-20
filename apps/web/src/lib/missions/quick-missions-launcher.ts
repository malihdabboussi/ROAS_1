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

export type QuickMissionsLauncherOptions = {
  spaceId?: string | null
  parentMissionId?: string | null
}

type QuickMissionsLauncherContextValue = {
  open: boolean
  playbookKey: string | null
  spaceId: string | null
  parentMissionId: string | null
  openLauncher: (playbookKey?: string, options?: QuickMissionsLauncherOptions) => void
  closeLauncher: () => void
}

const DEFAULT_LAUNCHER: QuickMissionsLauncherContextValue = {
  open: false,
  playbookKey: null,
  spaceId: null,
  parentMissionId: null,
  openLauncher: () => undefined,
  closeLauncher: () => undefined,
}

const QuickMissionsLauncherContext =
  createContext<QuickMissionsLauncherContextValue>(DEFAULT_LAUNCHER)

export function QuickMissionsLauncherProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [playbookKey, setPlaybookKey] = useState<string | null>(null)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [parentMissionId, setParentMissionId] = useState<string | null>(null)
  const openLauncher = useCallback(
    (nextPlaybookKey?: string, options?: QuickMissionsLauncherOptions) => {
      setPlaybookKey(nextPlaybookKey ?? null)
      setSpaceId(options?.spaceId ?? null)
      setParentMissionId(options?.parentMissionId ?? null)
      setOpen(true)
    },
    [],
  )
  const closeLauncher = useCallback(() => {
    setOpen(false)
    setPlaybookKey(null)
    setSpaceId(null)
    setParentMissionId(null)
  }, [])
  const value = useMemo(
    () => ({
      open,
      playbookKey,
      spaceId,
      parentMissionId,
      openLauncher,
      closeLauncher,
    }),
    [closeLauncher, open, openLauncher, parentMissionId, playbookKey, spaceId],
  )

  return createElement(QuickMissionsLauncherContext.Provider, { value }, children)
}

export function useQuickMissionsLauncher() {
  return useContext(QuickMissionsLauncherContext)
}
