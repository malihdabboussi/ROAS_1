'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ComposerTryTipBanner } from '@/components/chat/ComposerTryTipBanner'
import {
  addTryTipDismissedId,
  readTryTipDismissedIds,
} from '@/components/global-chat/lib/global-chat-storage'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import {
  COMPOSER_TRY_TIP_ROTATE_MS,
  COMPOSER_TRY_TIPS,
  composerTryTipRotationSeed,
  pickComposerTryTip,
} from '@/lib/chat/composer-try-tips'

function conversationTipKey(conversationId?: string | null) {
  return conversationId ?? 'new'
}

export function ChatComposerTryTip({
  className,
  conversationId,
}: {
  className?: string
  conversationId?: string | null
}) {
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const [dismissedIds, setDismissedIds] = useState(readTryTipDismissedIds)
  const hiddenConversationsRef = useRef(new Set<string>())
  const [, setHiddenVersion] = useState(0)
  const conversationKey = conversationTipKey(conversationId)
  const [rotation, setRotation] = useState(() => ({
    conversationKey,
    index: composerTryTipRotationSeed(conversationId),
  }))
  const rotationIndex =
    rotation.conversationKey === conversationKey
      ? rotation.index
      : composerTryTipRotationSeed(conversationId)
  const tip = pickComposerTryTip(dismissedIds, rotationIndex)
  const hidden = hiddenConversationsRef.current.has(conversationKey)

  const hideInConversation = useCallback((id?: string | null) => {
    hiddenConversationsRef.current.add(conversationTipKey(id))
    setHiddenVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    if (hidden || !tip) return
    const remainingCount = COMPOSER_TRY_TIPS.filter(
      (item) => !dismissedIds.includes(item.id),
    ).length
    if (remainingCount < 2) return
    const timer = window.setInterval(() => {
      setRotation((previous) => ({
        conversationKey,
        index:
          (previous.conversationKey === conversationKey
            ? previous.index
            : composerTryTipRotationSeed(conversationId)) + 1,
      }))
    }, COMPOSER_TRY_TIP_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [conversationId, conversationKey, dismissedIds, hidden, tip])

  const dismiss = useCallback((id: string) => {
    setDismissedIds(addTryTipDismissedId(id))
  }, [])

  if (hidden || !tip) return null

  return (
    <ComposerTryTipBanner
      className={className}
      body={tip.body}
      onTry={() => {
        dismiss(tip.id)
        hideInConversation(conversationId)
        seedComposer({
          content: tip.prompt,
          railIntent: 'new',
          seedMode: tip.seedMode,
        })
      }}
      onDismiss={() => {
        dismiss(tip.id)
        hideInConversation(conversationId)
      }}
    />
  )
}
