'use client'

import { useCallback, useMemo, useState, type RefObject } from 'react'
import {
  buildShellQuickStartSendContext,
  shellQuickStartMatchesComposer,
} from './shell-chat-quick-start.logic'
import type { ShellChatQuickStart } from './shell-empty-chat-prompts.config'

export function useShellChatQuickStart(
  setTextRef: RefObject<((text: string) => void) | null>,
  setComposerHasText: (hasText: boolean) => void,
) {
  const [activeQuickStart, setActiveQuickStart] = useState<ShellChatQuickStart | null>(null)

  const selectQuickStart = useCallback(
    (quickStart: ShellChatQuickStart) => {
      setActiveQuickStart(quickStart)
      setTextRef.current?.(quickStart.prompt)
    },
    [setTextRef],
  )

  const handleComposerValueChange = useCallback(
    (next: string) => {
      setComposerHasText(next.trim().length > 0)
      setActiveQuickStart((current) => {
        if (!current || shellQuickStartMatchesComposer(current, next)) return current
        return null
      })
    },
    [setComposerHasText],
  )

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
    buildSendContext,
    clearQuickStart: () => setActiveQuickStart(null),
    handleComposerValueChange,
    selectQuickStart,
  }
}
