'use client'

import type { RefObject } from 'react'
import { Layers, SquareArrowOutUpRight } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

interface ConversationScopeTriggerProps {
  buttonRef: RefObject<HTMLButtonElement | null>
  label: string
  open: boolean
  saving: boolean
  showLabel: boolean
  compact: boolean
  tooltipLabel?: string
  campaignId?: string | null
  onToggle: () => void
  onOpenCampaign?: () => void
}

export function ConversationScopeTrigger({
  buttonRef,
  label,
  open,
  saving,
  showLabel,
  compact,
  tooltipLabel,
  campaignId,
  onToggle,
  onOpenCampaign,
}: ConversationScopeTriggerProps) {
  const canOpenCampaign = Boolean(campaignId && onOpenCampaign)

  return (
    <div className="gap-spacing-1 flex min-w-0 items-center">
      <Tooltip label={tooltipLabel ?? label}>
        <button
          ref={buttonRef}
          type="button"
          className={
            showLabel && compact
              ? 'badge-glass badge-glass-muted body-4 text-foreground w-spacing-20 gap-spacing-1 px-spacing-2 flex shrink-0 items-center truncate disabled:opacity-30'
              : showLabel
                ? 'badge-glass badge-glass-muted body-4 text-foreground max-w-spacing-72 gap-spacing-1 flex min-w-0 shrink items-center truncate disabled:opacity-30'
                : 'text-muted-foreground hover:text-foreground -ml-spacing-0-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30'
          }
          onClick={onToggle}
          disabled={saving}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={label}
          title="Reselect campaign and space"
        >
          {!showLabel ? <Layers className="icon-sm" aria-hidden /> : null}
          {showLabel ? <span className="truncate">{label}</span> : null}
        </button>
      </Tooltip>
      {canOpenCampaign ? (
        <Tooltip label="Open campaign">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
            onClick={onOpenCampaign}
            disabled={saving}
            aria-label="Open campaign"
            title="Open campaign"
          >
            <SquareArrowOutUpRight className="icon-sm" aria-hidden />
          </button>
        </Tooltip>
      ) : null}
    </div>
  )
}
