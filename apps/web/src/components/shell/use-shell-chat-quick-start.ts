'use client'

import { useCallback, useMemo, useState, type RefObject } from 'react'
import { dispatchOpenQuickMissions } from '@/lib/missions'
import {
  buildShellQuickStartSendContext,
  shellQuickStartMatchesComposer,
} from './shell-chat-quick-start.logic'
import type { ShellCreateMenuItem } from './shell-create-menu.config'
import type { ShellChatQuickStart } from './shell-empty-chat-prompts.config'

export function useShellChatQuickStart(setTextRef: RefObject<((text: string) => void) | null>) {
  const [activeQuickStart, setActiveQuickStart] = useState<ShellChatQuickStart | null>(null)

  const selectQuickStart = useCallback(
    (quickStart: ShellCreateMenuItem) => {
      if (quickStart.action === 'mission') {
        dispatchOpenQuickMissions()
        return
      }
      setActiveQuickStart(quickStart)
      setTextRef.current?.(quickStart.prompt)
    },
    [setTextRef],
  )

  /** Arm the chip/systemContext without touching composer text (seeded externally). */
  const armQuickStart = useCallback((quickStart: ShellChatQuickStart) => {
    setActiveQuickStart(quickStart)
  }, [])

  const handleComposerValueChange = useCallback((next: string) => {
    setActiveQuickStart((current) => {
      if (!current || shellQuickStartMatchesComposer(current, next)) return current
      return null
    })
  }, [])

  const buildSendContext = useCallback(
    (content: string) => buildShellQuickStartSendContext(activeQuickStart, content),
    [activeQuickStart],
  )
  const activeCapabilityChip = useMemo(
    () =>
      activeQuickStart ? { label: activeQuickStart.label, icon: activeQuickStart.iconName } : null,
    [activeQuickStart],
  )

  return {
    activeCapabilityChip,
    armQuickStart,
    buildSendContext,
    clearQuickStart: () => setActiveQuickStart(null),
    handleComposerValueChange,
    selectQuickStart,
  }
}
