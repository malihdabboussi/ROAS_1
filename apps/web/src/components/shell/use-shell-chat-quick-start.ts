'use client'

import { useCallback, useMemo, useState, type RefObject } from 'react'
import {
  buildShellQuickStartSendContext,
  shellQuickStartMatchesComposer,
} from './shell-chat-quick-start.logic'
import type { ShellCreateMenuItem } from './shell-create-menu.config'
import type { ShellChatQuickStart } from './shell-empty-chat-prompts.config'
import {
  CREATE_TYPE_PICKERS,
  type CreateTypePickerOption,
} from './shell-create-type-pickers'

export function useShellChatQuickStart(setTextRef: RefObject<((text: string) => void) | null>) {
  const [activeQuickStart, setActiveQuickStart] = useState<ShellChatQuickStart | null>(null)
  const [pendingPickerItem, setPendingPickerItem] = useState<ShellCreateMenuItem | null>(null)

  const applyQuickStart = useCallback(
    (quickStart: ShellChatQuickStart, prompt: string) => {
      setPendingPickerItem(null)
      setActiveQuickStart(quickStart)
      setTextRef.current?.(prompt)
    },
    [setTextRef],
  )

  const selectQuickStart = useCallback(
    (quickStart: ShellCreateMenuItem) => {
      if (quickStart.typePicker) {
        setActiveQuickStart(null)
        setPendingPickerItem(quickStart)
        return
      }
      applyQuickStart(quickStart, quickStart.prompt)
    },
    [applyQuickStart],
  )

  const armQuickStart = useCallback((quickStart: ShellCreateMenuItem | ShellChatQuickStart) => {
    if ('typePicker' in quickStart && quickStart.typePicker) {
      setActiveQuickStart(null)
      setPendingPickerItem(quickStart)
      return
    }
    setPendingPickerItem(null)
    setActiveQuickStart(quickStart)
  }, [])

  const selectPickerOption = useCallback(
    (option: CreateTypePickerOption) => {
      if (!pendingPickerItem) return
      applyQuickStart(
        {
          id: `${pendingPickerItem.id}:${option.id}`,
          label: pendingPickerItem.label,
          icon: pendingPickerItem.icon,
          iconName: pendingPickerItem.iconName,
          prompt: option.prompt,
          systemContext: option.systemContext,
        },
        option.prompt,
      )
    },
    [applyQuickStart, pendingPickerItem],
  )

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
    clearPicker: () => setPendingPickerItem(null),
    clearQuickStart: () => {
      setActiveQuickStart(null)
      setPendingPickerItem(null)
    },
    handleComposerValueChange,
    pendingPicker: pendingPickerItem?.typePicker
      ? CREATE_TYPE_PICKERS[pendingPickerItem.typePicker]
      : null,
    pendingPickerId: pendingPickerItem?.typePicker ?? null,
    selectPickerOption,
    selectQuickStart,
  }
}
