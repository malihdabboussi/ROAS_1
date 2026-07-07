'use client'

import { CheckCircle2, Eye, Pin, ThumbsUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { Tooltip } from '@/components/ui/tooltip'

export type ChannelMessageReaction = { key: string; count: number; byMe: boolean }

const QUICK_REACTIONS = [
  { key: 'done', icon: CheckCircle2, label: 'Done' },
  { key: 'approve', icon: ThumbsUp, label: 'Approve' },
  { key: 'seen', icon: Eye, label: 'Seen' },
  { key: 'pin', icon: Pin, label: 'Important' },
] as const

const REACTION_STYLE_MAP: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>
    active: string
    inactive: string
  }
> = {
  done: {
    icon: CheckCircle2,
    active: 'badge-glass badge-glass-green',
    inactive: 'badge-glass badge-glass-muted hover:brightness-110',
  },
  approve: {
    icon: ThumbsUp,
    active: 'badge-glass badge-glass-orange',
    inactive: 'badge-glass badge-glass-muted hover:brightness-110',
  },
  seen: {
    icon: Eye,
    active: 'badge-glass badge-glass-blue',
    inactive: 'badge-glass badge-glass-muted hover:brightness-110',
  },
  pin: {
    icon: Pin,
    active: 'badge-glass badge-glass-red',
    inactive: 'badge-glass badge-glass-muted hover:brightness-110',
  },
}

export function ChannelMessageReactionBadge({
  reaction,
  onToggle,
}: {
  reaction: ChannelMessageReaction
  onToggle: () => void
}) {
  const style = REACTION_STYLE_MAP[reaction.key]
  if (style) {
    const Icon = style.icon
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`gap-1 ${reaction.byMe ? style.active : style.inactive}`}
      >
        <Icon className="h-3 w-3" />
        <span className="tabular-nums">{reaction.count}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
        reaction.byMe
          ? 'button-glass-blue'
          : 'border-border bg-muted text-foreground hover:border-primary/30 hover:bg-primary/10 border'
      }`}
    >
      <span>{reaction.key}</span>
      <span className="tabular-nums">{reaction.count}</span>
    </button>
  )
}

export function ChannelMessageQuickReactions({
  onToggleReaction,
}: {
  onToggleReaction: (key: string) => void
}) {
  return (
    <>
      {QUICK_REACTIONS.map((reaction) => (
        <Tooltip key={reaction.key} label={reaction.label} side="top" delayMs={300}>
          <button
            type="button"
            onClick={() => onToggleReaction(reaction.key)}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors"
          >
            <reaction.icon className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      ))}
    </>
  )
}
