'use client'

import { useCallback, useEffect, useState } from 'react'
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

export function ChatComposerTryTip({
  className,
  conversationId,
}: {
  className?: string
  conversationId?: string | null
}) {
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const [dismissedIds, setDismissedIds] = useState(readTryTipDismissedIds)
  const [hidden, setHidden] = useState(false)
  const [rotationIndex, setRotationIndex] = useState(() =>
    composerTryTipRotationSeed(conversationId),
  )
  const tip = pickComposerTryTip(dismissedIds, rotationIndex)

  useEffect(() => {
    setHidden(false)
    setRotationIndex(composerTryTipRotationSeed(conversationId))
  }, [conversationId])

  useEffect(() => {
    if (hidden || !tip) return
    const remainingCount = COMPOSER_TRY_TIPS.filter(
      (item) => !dismissedIds.includes(item.id),
    ).length
    if (remainingCount < 2) return
    const timer = window.setInterval(() => {
      setRotationIndex((prev) => prev + 1)
    }, COMPOSER_TRY_TIP_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [dismissedIds, hidden, tip])

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
        setHidden(true)
        seedComposer({
          content: tip.prompt,
          railIntent: 'new',
          seedMode: tip.seedMode,
        })
      }}
      onDismiss={() => dismiss(tip.id)}
    />
  )
}
