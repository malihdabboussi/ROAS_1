import { useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { toast } from 'sonner'
import type { ChatModelSettings, LlmModelOption } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'
import type { DocumentAttachment, MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { AttachedFile } from '../chat/FileAttachments'
import type { ChatInputRecordingState } from './chat-input-recording-footer'
import { attachedFilesToDocumentAttachments } from './chat-input-file-state'
import { isModelStrategyId } from './chat-input-model-settings'

type ChatInputSendCallback = (
  content: string,
  documents?: DocumentAttachment[],
  artifacts?: AttachedArtifact[],
  model?: string,
  references?: MessageReference[],
  modelSettings?: ChatModelSettings,
) => void

export interface UseChatInputSendOptions {
  value: string
  displayText: string
  recordingState: ChatInputRecordingState
  mergeForSend: (text: string) => string
  disabled: boolean
  sendDisabled: boolean
  isStreaming: boolean
  onSend: ChatInputSendCallback
  onEnqueue?: ChatInputSendCallback
  activeComposerModel: string
  activeModelSettings: ChatModelSettings
  modelOptions: readonly LlmModelOption[]
  attachedFiles: readonly AttachedFile[]
  attachedArtifacts: readonly AttachedArtifact[]
  attachedReferences: readonly MessageReference[]
  draftContextKey: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  setValue: Dispatch<SetStateAction<string>>
  setDisplayText: Dispatch<SetStateAction<string>>
  clearPastedBlocks: () => void
  clearAttachedFiles: () => void
  setAttachedArtifacts: Dispatch<SetStateAction<AttachedArtifact[]>>
  setAttachedReferences: Dispatch<SetStateAction<MessageReference[]>>
  clearComposerDraft?: (draftContextKey: string) => void
  toastError?: (message: string) => void
}

export function useChatInputSend({
  value,
  displayText,
  recordingState,
  mergeForSend,
  disabled,
  sendDisabled,
  isStreaming,
  onSend,
  onEnqueue,
  activeComposerModel,
  activeModelSettings,
  modelOptions,
  attachedFiles,
  attachedArtifacts,
  attachedReferences,
  draftContextKey,
  textareaRef,
  setValue,
  setDisplayText,
  clearPastedBlocks,
  clearAttachedFiles,
  setAttachedArtifacts,
  setAttachedReferences,
  clearComposerDraft = (key) => useChatStore.getState().clearComposerDraft(key),
  toastError = toast.error,
}: UseChatInputSendOptions) {
  return useCallback(() => {
    const text = recordingState === 'idle' ? value : displayText
    const trimmed = mergeForSend(text)
    if (!trimmed || disabled || sendDisabled) return
    if (attachedFiles.some((file) => file.uploading)) return

    const hasImageAttachments = attachedFiles.some((file) =>
      file.parsed?.some((parsed) => parsed.type === 'image'),
    )
    if (hasImageAttachments && activeComposerModel && !isModelStrategyId(activeComposerModel)) {
      const selectedModel = modelOptions.find((model) => model.id === activeComposerModel)
      if (selectedModel && !selectedModel.supportsImages) {
        toastError(
          `${selectedModel.label} doesn't support images. Pick a different model or remove the images.`,
        )
        return
      }
    }

    const documents = attachedFilesToDocumentAttachments(attachedFiles)
    const docs = documents.length > 0 ? documents : undefined
    const artifacts = attachedArtifacts.length > 0 ? [...attachedArtifacts] : undefined
    const references = attachedReferences.length > 0 ? [...attachedReferences] : undefined

    if (isStreaming && onEnqueue) {
      onEnqueue(trimmed, docs, artifacts, activeComposerModel, references, activeModelSettings)
    } else {
      onSend(trimmed, docs, artifacts, activeComposerModel, references, activeModelSettings)
    }

    setValue('')
    setDisplayText('')
    clearPastedBlocks()
    clearAttachedFiles()
    setAttachedArtifacts([])
    setAttachedReferences([])
    clearComposerDraft(draftContextKey)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [
    value,
    displayText,
    recordingState,
    mergeForSend,
    disabled,
    sendDisabled,
    attachedFiles,
    activeComposerModel,
    modelOptions,
    attachedArtifacts,
    attachedReferences,
    isStreaming,
    onEnqueue,
    activeModelSettings,
    onSend,
    setValue,
    setDisplayText,
    clearPastedBlocks,
    clearAttachedFiles,
    setAttachedArtifacts,
    setAttachedReferences,
    clearComposerDraft,
    draftContextKey,
    textareaRef,
    toastError,
  ])
}
