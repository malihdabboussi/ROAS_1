import type { RefObject } from 'react'
import {
  CONTEXT_BREAKDOWN_PANEL_ENABLED,
} from './chat-input-constants'
import { useChatInputContextMeterData } from './use-chat-input-context-meter-data'
import { useChatInputContextPopover } from './use-chat-input-context-popover'

type ContextMeterDataOptions = Parameters<typeof useChatInputContextMeterData>[0]
type ChatInputRecordingState = 'idle' | 'recording' | 'finishing'

interface UseChatInputContextControllerOptions
  extends Omit<ContextMeterDataOptions, 'inputValue'> {
  recordingState: ChatInputRecordingState
  value: string
  displayText: string
  composerShellRef: RefObject<HTMLElement | null>
  breakdownPanelEnabled?: boolean
}

export function useChatInputContextController({
  recordingState,
  value,
  displayText,
  composerShellRef,
  breakdownPanelEnabled = CONTEXT_BREAKDOWN_PANEL_ENABLED !== 'false',
  ...meterOptions
}: UseChatInputContextControllerOptions) {
  const inputValue = recordingState === 'idle' ? value : displayText
  const { contextMeter, hasContextMeter } = useChatInputContextMeterData({
    ...meterOptions,
    inputValue,
  })
  const {
    contextPopoverAnchorRef,
    contextPopoverTriggerRef,
    contextPopoverPanelRef,
    contextPopoverOpen,
    setContextPopoverOpen,
    contextPopoverPosition,
    updateContextPopoverPosition,
    toggleContextPopover,
  } = useChatInputContextPopover({
    enabled: hasContextMeter && breakdownPanelEnabled,
    composerShellRef,
  })

  return {
    inputValue,
    contextMeter,
    hasContextMeter,
    breakdownPanelEnabled,
    contextPopoverAnchorRef,
    contextPopoverTriggerRef,
    contextPopoverPanelRef,
    contextPopoverOpen,
    setContextPopoverOpen,
    contextPopoverPosition,
    updateContextPopoverPosition,
    toggleContextPopover,
  }
}
