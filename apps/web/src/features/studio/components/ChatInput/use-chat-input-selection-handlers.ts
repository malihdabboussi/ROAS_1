import { useCallback } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useQuickMissionsLauncher } from '@/lib/missions'
import type { MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import {
  appendUniqueAttachedArtifact,
  appendUniqueMessageReference,
  buildAttachedArtifactFromAtMention,
  buildMessageReferenceFromAtMention,
  getAtCampaignSelectionTextUpdate,
  getAtMentionSelectionTextUpdate,
  isReferenceAtMentionItem,
} from './chat-input-at-mention-selection'
import type { AtMentionItem, StudioAtMenuTabId } from './chat-input-at-mentions'
import type { ChatInputRecordingState } from './chat-input-recording-footer'
import type { SlashItem } from './chat-input-slash-menu'
import { getSlashSelectionTextUpdate } from './chat-input-slash-selection'

export interface UseChatInputSelectionHandlersOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  recordingState: ChatInputRecordingState
  value: string
  displayText: string
  setValue: Dispatch<SetStateAction<string>>
  setDisplayText: Dispatch<SetStateAction<string>>
  setSlashMenuOpen: Dispatch<SetStateAction<boolean>>
  setAtMenuOpen: Dispatch<SetStateAction<boolean>>
  setCrossCampaignMode: Dispatch<SetStateAction<boolean>>
  setCrossCampaignId: Dispatch<SetStateAction<string | null>>
  setAtItems: Dispatch<SetStateAction<AtMentionItem[]>>
  setAtQuery: Dispatch<SetStateAction<string>>
  setAtMenuTab: Dispatch<SetStateAction<StudioAtMenuTabId>>
  setAtHighlight: Dispatch<SetStateAction<number>>
  setAttachedReferences: Dispatch<SetStateAction<MessageReference[]>>
  setAttachedArtifacts: Dispatch<SetStateAction<AttachedArtifact[]>>
  attachComposerSpaceTask: (id: string, label: string) => void
}

export function useChatInputSelectionHandlers({
  textareaRef,
  recordingState,
  value,
  displayText,
  setValue,
  setDisplayText,
  setSlashMenuOpen,
  setAtMenuOpen,
  setCrossCampaignMode,
  setCrossCampaignId,
  setAtItems,
  setAtQuery,
  setAtMenuTab,
  setAtHighlight,
  setAttachedReferences,
  setAttachedArtifacts,
  attachComposerSpaceTask,
}: UseChatInputSelectionHandlersOptions) {
  const { openLauncher } = useQuickMissionsLauncher()
  const focusTextareaAt = useCallback(
    (cursor: number) => {
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(cursor, cursor)
      })
    },
    [textareaRef],
  )

  const handleSlashSelect = useCallback(
    (item: SlashItem) => {
      if (item.type === 'playbook') {
        setSlashMenuOpen(false)
        openLauncher(item.key)
        return
      }
      const t = textareaRef.current
      const text = recordingState === 'idle' ? value : displayText
      const cursor = Math.min(t?.selectionStart ?? text.length, text.length)
      const update = getSlashSelectionTextUpdate(text, cursor, item.key)
      if (recordingState === 'idle') {
        setValue(update.nextText)
      } else {
        setDisplayText(update.nextText)
      }
      setSlashMenuOpen(false)
      focusTextareaAt(update.cursor)
    },
    [
      displayText,
      focusTextareaAt,
      openLauncher,
      recordingState,
      setDisplayText,
      setSlashMenuOpen,
      setValue,
      textareaRef,
      value,
    ],
  )

  const handleCampaignSelect = useCallback(
    (campaign: { id: string; name: string }) => {
      setCrossCampaignMode(true)
      setCrossCampaignId(campaign.id)
      const t = textareaRef.current
      const text = recordingState === 'idle' ? value : displayText
      const cursor = Math.min(t?.selectionStart ?? text.length, text.length)
      const update = getAtCampaignSelectionTextUpdate(text, cursor)
      if (update.changed) {
        if (recordingState === 'idle') setValue(update.nextText)
        else setDisplayText(update.nextText)
        focusTextareaAt(update.cursor)
      }
      setAtItems([])
      setAtQuery('')
      setAtMenuTab('artifacts')
      setAtHighlight(-1)
    },
    [
      displayText,
      focusTextareaAt,
      recordingState,
      setAtHighlight,
      setAtItems,
      setAtMenuTab,
      setAtQuery,
      setCrossCampaignId,
      setCrossCampaignMode,
      setDisplayText,
      setValue,
      textareaRef,
      value,
    ],
  )

  const handleAtSelect = useCallback(
    (item: AtMentionItem, sourceCampaignId?: string) => {
      const t = textareaRef.current
      const text = recordingState === 'idle' ? value : displayText
      const cursor = Math.min(t?.selectionStart ?? text.length, text.length)
      const update = getAtMentionSelectionTextUpdate(text, cursor)
      if (item.section === 'space-task') {
        if (recordingState === 'idle') {
          setValue(update.nextText)
        } else {
          setDisplayText(update.nextText)
        }
        setAtMenuOpen(false)
        setCrossCampaignMode(false)
        setCrossCampaignId(null)
        attachComposerSpaceTask(item.id, item.label)
        focusTextareaAt(update.cursor)
        return
      }
      if (recordingState === 'idle') {
        setValue(update.nextText)
      } else {
        setDisplayText(update.nextText)
      }
      setAtMenuOpen(false)
      setCrossCampaignMode(false)
      setCrossCampaignId(null)
      if (!isReferenceAtMentionItem(item)) return
      const ref = buildMessageReferenceFromAtMention(item, sourceCampaignId)
      setAttachedReferences((prev) => appendUniqueMessageReference(prev, ref))
      const artifact = buildAttachedArtifactFromAtMention(item, sourceCampaignId)
      setAttachedArtifacts((prev) => appendUniqueAttachedArtifact(prev, artifact))
      focusTextareaAt(update.cursor)
    },
    [
      attachComposerSpaceTask,
      displayText,
      focusTextareaAt,
      recordingState,
      setAtMenuOpen,
      setAttachedArtifacts,
      setAttachedReferences,
      setCrossCampaignId,
      setCrossCampaignMode,
      setDisplayText,
      setValue,
      textareaRef,
      value,
    ],
  )

  return {
    handleSlashSelect,
    handleCampaignSelect,
    handleAtSelect,
  }
}
