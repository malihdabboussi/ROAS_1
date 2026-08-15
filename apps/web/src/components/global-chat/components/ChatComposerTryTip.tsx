'use client'

import { useCallback, useState } from 'react'
import { ComposerTryTipBanner } from '@/components/chat/ComposerTryTipBanner'
import {
  addTryTipDismissedId,
  readTryTipDismissedIds,
} from '@/components/global-chat/lib/global-chat-storage'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { pickComposerTryTip } from '@/lib/chat/composer-try-tips'

export function ChatComposerTryTip({ className }: { className?: string }) {
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const [dismissedIds, setDismissedIds] = useState(readTryTipDismissedIds)
  const [hidden, setHidden] = useState(false)
  const tip = pickComposerTryTip(dismissedIds)

  const dismiss = useCallback((id: string) => {
    setDismissedIds(addTryTipDismissedId(id))
    setHidden(true)
  }, [])

  if (hidden || !tip) return null

  return (
    <ComposerTryTipBanner
      className={className}
      body={tip.body}
      onTry={() => {
        dismiss(tip.id)
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
