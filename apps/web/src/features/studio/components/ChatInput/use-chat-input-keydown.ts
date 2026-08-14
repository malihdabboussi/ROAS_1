import { useCallback } from 'react'
import type {
  Dispatch,
  KeyboardEvent,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from 'react'
import { flushSync } from 'react-dom'
import type {
  AtMentionItem,
  StudioArtifactNavRow,
  StudioAtMenuTabId,
  StudioMediaNavRow,
} from './chat-input-at-mentions'
import {
  handleChatInputMenuKeyDown,
  type ChatInputMenuAtNavSlice,
} from './chat-input-menu-keyboard'
import { handleChatInputShortcutKey } from './chat-input-shortcuts'
import type { SlashItem } from './chat-input-slash-menu'
import { getSlashBackspaceTextUpdate } from './chat-input-slash-selection'
import type { ChatInputRecordingState } from './chat-input-recording-footer'

export interface UseChatInputKeyDownOptions {
  disabled: boolean
  recordingState: ChatInputRecordingState
  onStartRecording: () => void
  onStopRecording: () => void
  onVoiceStart?: () => void
  atMenuOpen: boolean
  atNavCount: number
  atHighlight: number
  atMenuTab: StudioAtMenuTabId
  crossCampaignMode: boolean
  atNavSlice: ChatInputMenuAtNavSlice
  artifactRows: readonly StudioArtifactNavRow[]
  mediaRows: readonly StudioMediaNavRow[]
  setAtMenuOpen: Dispatch<SetStateAction<boolean>>
  setCrossCampaignMode: Dispatch<SetStateAction<boolean>>
  setCrossCampaignId: Dispatch<SetStateAction<string | null>>
  setAtHighlight: Dispatch<SetStateAction<number>>
  setAtArtifactCollapsedByType: Dispatch<SetStateAction<Record<string, boolean>>>
  setAtArtifactMoreByType: Dispatch<SetStateAction<Record<string, boolean>>>
  setAtMediaCollapsedByType: Dispatch<SetStateAction<Record<string, boolean>>>
  setAtMediaMoreByType: Dispatch<SetStateAction<Record<string, boolean>>>
  onAtSelect: (item: AtMentionItem, sourceCampaignId?: string) => void
  slashMenuOpen: boolean
  slashVisibleItems: readonly SlashItem[]
  slashHighlight: number
  setSlashMenuOpen: Dispatch<SetStateAction<boolean>>
  setSlashHighlight: Dispatch<SetStateAction<number>>
  onSlashSelect: (item: SlashItem) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  displayText: string
  allSlashItemsRef: MutableRefObject<SlashItem[]>
  setValue: Dispatch<SetStateAction<string>>
  setDisplayText: Dispatch<SetStateAction<string>>
  resizeTextarea: () => void
  hasPastedBlocks: boolean
  queueLength: number
  onSendNow?: () => void
  onSend: () => void
}

export function useChatInputKeyDown({
  disabled,
  recordingState,
  onStartRecording,
  onStopRecording,
  onVoiceStart,
  atMenuOpen,
  atNavCount,
  atHighlight,
  atMenuTab,
  crossCampaignMode,
  atNavSlice,
  artifactRows,
  mediaRows,
  setAtMenuOpen,
  setCrossCampaignMode,
  setCrossCampaignId,
  setAtHighlight,
  setAtArtifactCollapsedByType,
  setAtArtifactMoreByType,
  setAtMediaCollapsedByType,
  setAtMediaMoreByType,
  onAtSelect,
  slashMenuOpen,
  slashVisibleItems,
  slashHighlight,
  setSlashMenuOpen,
  setSlashHighlight,
  onSlashSelect,
  textareaRef,
  value,
  displayText,
  allSlashItemsRef,
  setValue,
  setDisplayText,
  resizeTextarea,
  hasPastedBlocks,
  queueLength,
  onSendNow,
  onSend,
}: UseChatInputKeyDownOptions) {
  return useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        handleChatInputShortcutKey({
          event,
          disabled,
          recordingState,
          onStartRecording,
          onStopRecording,
          onVoiceStart,
        })
      ) {
        return
      }
      if (
        handleChatInputMenuKeyDown({
          event,
          atMenuOpen,
          atNavCount,
          atHighlight,
          atMenuTab,
          crossCampaignMode,
          atNavSlice,
          artifactRows,
          mediaRows,
          onCloseAtMenu: () => setAtMenuOpen(false),
          onExitCrossCampaign: () => {
            setCrossCampaignMode(false)
            setCrossCampaignId(null)
          },
          onAtHighlightChange: setAtHighlight,
          onAtSelect,
          onToggleArtifactCollapsed: (typeKey) =>
            setAtArtifactCollapsedByType((prev) => ({
              ...prev,
              [typeKey]: !(prev[typeKey] === true),
            })),
          onShowAllArtifacts: (typeKey) =>
            setAtArtifactMoreByType((prev) => ({ ...prev, [typeKey]: true })),
          onToggleMediaCollapsed: (typeKey) =>
            setAtMediaCollapsedByType((prev) => ({
              ...prev,
              [typeKey]: !(prev[typeKey] === true),
            })),
          onShowAllMedia: (typeKey) =>
            setAtMediaMoreByType((prev) => ({ ...prev, [typeKey]: true })),
          slashMenuOpen,
          slashVisibleItems,
          slashHighlight,
          onCloseSlashMenu: () => setSlashMenuOpen(false),
          onSlashHighlightChange: setSlashHighlight,
          onSlashSelect,
        })
      ) {
        return
      }
      if (event.key === 'Backspace' && !slashMenuOpen) {
        const t = textareaRef.current
        if (t) {
          const text = recordingState === 'idle' ? value : displayText
          const cursor = t.selectionStart
          const selEnd = t.selectionEnd
          if (cursor === selEnd) {
            const update = getSlashBackspaceTextUpdate(
              text,
              cursor,
              allSlashItemsRef.current.map((item) => item.key),
            )
            if (update.changed) {
              event.preventDefault()
              flushSync(() => {
                if (recordingState === 'idle') setValue(update.nextText)
                else setDisplayText(update.nextText)
              })
              t.selectionStart = t.selectionEnd = update.cursor
              resizeTextarea()
              return
            }
          }
        }
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        const text = recordingState === 'idle' ? value : displayText
        const hasText = text.trim().length > 0 || hasPastedBlocks

        if (!hasText && queueLength > 0 && onSendNow) {
          onSendNow()
          return
        }

        onSend()
      }
    },
    [
      allSlashItemsRef,
      artifactRows,
      atHighlight,
      atMenuOpen,
      atMenuTab,
      atNavCount,
      atNavSlice,
      crossCampaignMode,
      disabled,
      displayText,
      hasPastedBlocks,
      mediaRows,
      onAtSelect,
      onSend,
      onSendNow,
      onSlashSelect,
      onStartRecording,
      onStopRecording,
      onVoiceStart,
      queueLength,
      recordingState,
      resizeTextarea,
      setAtArtifactCollapsedByType,
      setAtArtifactMoreByType,
      setAtHighlight,
      setAtMediaCollapsedByType,
      setAtMediaMoreByType,
      setAtMenuOpen,
      setCrossCampaignId,
      setCrossCampaignMode,
      setDisplayText,
      setSlashHighlight,
      setSlashMenuOpen,
      setValue,
      slashHighlight,
      slashMenuOpen,
      slashVisibleItems,
      textareaRef,
      value,
    ],
  )
}
