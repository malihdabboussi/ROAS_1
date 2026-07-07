'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { COMPOSER_ACTIVE_RUN_TIPS } from '@/lib/chat/composer-active-run-tips'
import { TypewriterTipReveal } from './TypewriterTipReveal'

interface ComposerActiveRunTipCardProps {
  conversationId: string | null | undefined
  isStreaming: boolean
  stacked?: boolean
}

export function ComposerActiveRunTipCard({
  conversationId,
  isStreaming,
  stacked = false,
}: ComposerActiveRunTipCardProps) {
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * COMPOSER_ACTIVE_RUN_TIPS.length),
  )

  useEffect(() => {
    if (isStreaming) {
      setTipIndex(Math.floor(Math.random() * COMPOSER_ACTIVE_RUN_TIPS.length))
    }
  }, [conversationId, isStreaming])

  const handleCycleComplete = useCallback(() => {
    setTipIndex((prev) => (prev + 1) % COMPOSER_ACTIVE_RUN_TIPS.length)
  }, [])

  if (!isStreaming || !conversationId) return null

  const tipText = COMPOSER_ACTIVE_RUN_TIPS[tipIndex] ?? COMPOSER_ACTIVE_RUN_TIPS[0] ?? ''

  if (stacked) {
    return (
      <div className="gap-spacing-1 flex w-full min-w-0 items-start">
        <Lightbulb className="text-muted-foreground icon-xs shrink-0" aria-hidden />
        <div className="typo-xs text-muted-foreground line-clamp-2 min-w-0">
          <span className="font-medium">Tip: </span>
          <TypewriterTipReveal
            key={tipIndex}
            text={tipText}
            onCycleComplete={handleCycleComplete}
          />
        </div>
      </div>
    )
  }

  const content = (
    <>
      <Lightbulb
        className="text-muted-foreground mt-spacing-0-5 icon-xs shrink-0"
        aria-hidden
      />
      <div className="line-clamp-2 min-w-0">
        <span className="typo-xs text-muted-foreground font-medium">Tip: </span>
        <TypewriterTipReveal
          key={tipIndex}
          text={tipText}
          onCycleComplete={handleCycleComplete}
        />
      </div>
    </>
  )

  return (
    <div className="mb-spacing-1 w-full">
      <div className="composer-tip-bubble gap-spacing-1 flex w-full items-start">{content}</div>
    </div>
  )
}
