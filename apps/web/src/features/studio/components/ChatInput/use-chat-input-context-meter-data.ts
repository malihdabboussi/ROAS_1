import { useDeferredValue, useMemo } from 'react'
import { useLiveContextEstimate } from '../../hooks/useLiveContextEstimate'
import {
  useActiveContextBreakdown,
  useActiveContextUsage,
  useActiveMessages,
} from '../../store/use-chat-store'
import type { MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { AttachedFile } from '../chat/FileAttachments'
import { DEFAULT_ESTIMATED_CONTEXT_WINDOW } from './chat-input-constants'

type ChatInputPastedTextBlock = {
  id: string
  text: string
}

interface UseChatInputContextMeterDataOptions {
  selectedContextOption?: { tokens: number } | null
  activeModelOption?: { contextWindow?: number | null } | null
  inputValue: string
  attachedFiles: readonly AttachedFile[]
  attachedArtifacts: readonly AttachedArtifact[]
  attachedReferences: readonly MessageReference[]
  pastedBlocks: readonly ChatInputPastedTextBlock[]
}

export function useChatInputContextMeterData({
  selectedContextOption,
  activeModelOption,
  inputValue,
  attachedFiles,
  attachedArtifacts,
  attachedReferences,
  pastedBlocks,
}: UseChatInputContextMeterDataOptions) {
  const contextUsage = useActiveContextUsage()
  const contextBreakdown = useActiveContextBreakdown()
  const activeMessages = useActiveMessages()
  const deferredInputValue = useDeferredValue(inputValue)
  const activeContextWindowTokens =
    selectedContextOption?.tokens ??
    activeModelOption?.contextWindow ??
    contextBreakdown?.contextWindow ??
    contextUsage?.contextWindow ??
    DEFAULT_ESTIMATED_CONTEXT_WINDOW
  const attachments = useMemo(
    () =>
      attachedFiles.map((file) => ({
        filename: file.file.name,
        type: file.file.type,
        sizeBytes: file.file.size,
        preview: file.parsed
          ?.map((parsed) => parsed.preview)
          .filter(Boolean)
          .join('\n'),
      })),
    [attachedFiles],
  )
  const artifacts = useMemo(
    () =>
      attachedArtifacts.map((artifact) => ({
        label: artifact.label,
        type: artifact.type,
      })),
    [attachedArtifacts],
  )
  const references = useMemo(() => [...attachedReferences], [attachedReferences])
  const pastedBlocksList = useMemo(() => [...pastedBlocks], [pastedBlocks])
  const liveContextBreakdown = useLiveContextEstimate({
    baseline: contextBreakdown,
    fallbackContextWindow: activeContextWindowTokens,
    fallbackInputTokens: contextUsage?.inputTokens ?? null,
    messages: activeMessages,
    draftText: deferredInputValue,
    attachments,
    artifacts,
    references,
    pastedBlocks: pastedBlocksList,
  })
  const contextMeter = liveContextBreakdown ?? contextBreakdown

  return {
    contextMeter,
    hasContextMeter: Boolean(contextMeter),
  }
}
