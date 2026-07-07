'use client'

import { useMemo, useRef } from 'react'
import {
  countJsonTokens,
  countTextTokens,
  type ContextBreakdown,
  type ContextCategorySlice,
} from '@vibey/context-breakdown'
import type { Message, MessageReference } from '../types'
import {
  countMessagesTokens,
  getMessagesTokenSignature,
} from '../utils/context-token-counter'

type PastedTextBlock = {
  id: string
  text: string
}

interface DraftAttachmentSummary {
  filename?: string
  name?: string
  label?: string
  type?: string
  sizeBytes?: number
  preview?: string
}

function replaceSlice(
  slices: ContextCategorySlice[],
  replacement: ContextCategorySlice,
): ContextCategorySlice[] {
  const next = slices.filter((slice) => slice.id !== replacement.id)
  if (replacement.tokens > 0) next.push(replacement)
  return next
}

function resolveConversationTokens(
  messages: Message[],
  baselineConversationTokens: number,
  fallbackInputTokens: number | null | undefined,
): number {
  const measuredConversationTokens = countMessagesTokens(messages)
  return baselineConversationTokens > 0
    ? Math.max(baselineConversationTokens, measuredConversationTokens)
    : Math.max(measuredConversationTokens, fallbackInputTokens ?? 0)
}

export function useLiveContextEstimate(params: {
  baseline: ContextBreakdown | null
  fallbackContextWindow?: number | null
  fallbackInputTokens?: number | null
  messages: Message[]
  draftText: string
  attachments?: DraftAttachmentSummary[]
  artifacts?: DraftAttachmentSummary[]
  references?: MessageReference[]
  pastedBlocks?: PastedTextBlock[]
}): ContextBreakdown | null {
  const {
    baseline,
    fallbackContextWindow,
    fallbackInputTokens,
    messages,
    draftText,
    attachments = [],
    artifacts = [],
    references = [],
    pastedBlocks = [],
  } = params

  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const messagesTokenSignature = useMemo(() => getMessagesTokenSignature(messages), [messages])
  const baselineConversationTokens =
    baseline?.slices.find((slice) => slice.id === 'conversation')?.tokens ?? 0

  const conversationTokens = useMemo(() => {
    return resolveConversationTokens(
      messagesRef.current,
      baselineConversationTokens,
      fallbackInputTokens,
    )
  }, [baselineConversationTokens, fallbackInputTokens, messagesTokenSignature])

  return useMemo(() => {
    const contextWindow =
      fallbackContextWindow && fallbackContextWindow > 0
        ? fallbackContextWindow
        : baseline?.contextWindow
    if (!contextWindow || contextWindow <= 0) return null

    const baselineConversationTokens =
      baseline?.slices.find((slice) => slice.id === 'conversation')?.tokens ?? 0
    const pastedText = pastedBlocks.map((block) => block.text).join('\n\n')
    const draftTextTokens = countTextTokens([draftText, pastedText].filter(Boolean).join('\n\n'))
    const attachmentTokens = attachments.length > 0 ? countJsonTokens(attachments) : 0
    const artifactTokens = artifacts.length > 0 ? countJsonTokens(artifacts) : 0
    const referenceTokens = references.length > 0 ? countJsonTokens(references) : 0

    let slices =
      baseline && conversationTokens === baselineConversationTokens
        ? baseline.slices
        : replaceSlice(baseline?.slices ?? [], {
            id: 'conversation',
            label: 'Conversation',
            tokens: conversationTokens,
          })

    slices = replaceSlice(slices, {
      id: 'draft',
      label: 'Current draft',
      tokens: draftTextTokens + attachmentTokens + artifactTokens + referenceTokens,
      entries: [
        { id: 'draft_text', label: 'Composer text', tokens: draftTextTokens },
        { id: 'draft_files', label: 'Pending files', tokens: attachmentTokens },
        { id: 'draft_artifacts', label: 'Pending artifacts', tokens: artifactTokens },
        { id: 'draft_references', label: 'Pending references', tokens: referenceTokens },
      ].filter((entry) => entry.tokens > 0),
    })

    const totalTokens = slices.reduce((sum, slice) => sum + slice.tokens, 0)
    return {
      version: 1,
      ...(baseline ?? {}),
      source: 'estimate',
      generatedAt: baseline?.generatedAt ?? 0,
      contextWindow,
      totalTokens,
      slices,
    }
  }, [
    artifacts,
    attachments,
    baseline,
    conversationTokens,
    draftText,
    fallbackContextWindow,
    pastedBlocks,
    references,
  ])
}
