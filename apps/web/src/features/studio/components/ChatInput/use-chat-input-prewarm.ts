'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import {
  createChatPrewarmScheduler,
  type ChatModelSettings,
  type PrewarmChatContextParams,
} from '@/features/studio/services/chat.service'

type ChatPrewarmScheduler = ReturnType<typeof createChatPrewarmScheduler>

interface UseChatInputPrewarmOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  conversationId: string | null | undefined
  campaignId?: string
  spaceId?: string | null
  scopeKind?: string | null
  activeComposerModel: string
  activeModelSettings: ChatModelSettings | null
  createScheduler?: () => ChatPrewarmScheduler
}

export function useChatInputPrewarm({
  textareaRef,
  conversationId,
  campaignId,
  spaceId,
  scopeKind,
  activeComposerModel,
  activeModelSettings,
  createScheduler = createChatPrewarmScheduler,
}: UseChatInputPrewarmOptions) {
  const prewarmSchedulerRef = useRef<ChatPrewarmScheduler | null>(null)
  if (!prewarmSchedulerRef.current) {
    prewarmSchedulerRef.current = createScheduler()
  }

  const buildPrewarmPayload = useCallback((): PrewarmChatContextParams => {
    return {
      conversation_id: conversationId,
      ...(campaignId ? { campaign_id: campaignId } : {}),
      ...(spaceId !== undefined ? { space_id: spaceId } : {}),
      ...(scopeKind !== undefined ? { scope_kind: scopeKind } : {}),
      model: activeComposerModel,
      ...(activeModelSettings ? { model_settings: activeModelSettings } : {}),
      source: 'studio',
    }
  }, [activeComposerModel, activeModelSettings, campaignId, conversationId, scopeKind, spaceId])

  const triggerPrewarmNow = useCallback(() => {
    prewarmSchedulerRef.current?.onFocus(buildPrewarmPayload())
  }, [buildPrewarmPayload])

  const triggerPrewarmDebounced = useCallback(() => {
    prewarmSchedulerRef.current?.onInput(buildPrewarmPayload())
  }, [buildPrewarmPayload])

  useEffect(() => {
    return () => prewarmSchedulerRef.current?.cancel()
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.activeElement !== textareaRef.current) return
    triggerPrewarmDebounced()
  }, [textareaRef, triggerPrewarmDebounced])

  return {
    triggerPrewarmNow,
    triggerPrewarmDebounced,
  }
}
