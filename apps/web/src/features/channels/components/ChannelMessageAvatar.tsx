'use client'

import { Bot } from 'lucide-react'
import { VibeyHeroDepthOrbEmbed } from '@/components/vibey/vibey-hero-depth-orb'

export function ChannelMessageAvatar({
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
      <span className="bg-secondary inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <VibeyHeroDepthOrbEmbed coreCount={1200} pointSize={0.008} groupScale={1.6} />
      </span>
    )
  }
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={senderLabel}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    )
  }
  if (isAgent) {
    return (
      <span className="bg-muted text-muted-foreground inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
        <Bot className="h-4 w-4" />
      </span>
    )
  }
  return (
    <span className="bg-muted text-muted-foreground inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase">
      {senderLabel.charAt(0)}
    </span>
  )
}
