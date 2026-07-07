'use client'

import { Bot } from 'lucide-react'
import { VibeyHeroDepthOrbEmbed } from '@/components/vibey/vibey-hero-depth-orb'

const AVATAR_SIZE = 'h-6 w-6'
const AVATAR_IMG = `${AVATAR_SIZE} shrink-0 rounded-full object-cover`

/** Mirrors ChannelMessageBubble.MsgAvatar (system orb / image / bot / initial) at task row size. */
export function TaskActivityAvatar({
  senderLabel,
  avatarUrl,
  isAgent,
  isSystem,
}: {
  senderLabel: string
  avatarUrl: string | null
  isAgent: boolean
  isSystem: boolean
}) {
  if (isSystem) {
    return (
      <span
        className={`${AVATAR_SIZE} bg-secondary inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full`}
      >
        <VibeyHeroDepthOrbEmbed
          coreCount={600}
          pointSize={0.01}
          groupScale={1.8}
          disablePointerInteraction
        />
      </span>
    )
  }
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className={AVATAR_IMG} />
  }
  if (isAgent) {
    return (
      <span
        className={`bg-muted text-muted-foreground ${AVATAR_SIZE} inline-flex shrink-0 items-center justify-center rounded-full`}
      >
        <Bot className="icon-xs" />
      </span>
    )
  }
  return (
    <span
      className={`bg-muted text-muted-foreground ${AVATAR_SIZE} typo-section-label inline-flex shrink-0 items-center justify-center rounded-full`}
    >
      {senderLabel.charAt(0) || '?'}
    </span>
  )
}
