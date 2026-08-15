'use client'

import { SquareArrowOutUpRight, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { COMPOSER_TRY_TIP_MESSAGES } from '@/lib/chat/composer-try-tips'
import { cn } from '@/lib/utils/cn'

export function ComposerTryTipBanner({
  body,
  onTry,
  onDismiss,
  className,
}: {
  body: string
  onTry: () => void
  onDismiss: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-border bg-card mb-spacing-2 gap-spacing-2 px-spacing-3 py-spacing-2 rounded-spacing-2 flex w-full min-w-0 items-center border',
        className,
      )}
    >
      <span className="badge-glass badge-glass-muted typo-caption shrink-0 font-medium">
        {COMPOSER_TRY_TIP_MESSAGES.badge}
      </span>
      <p className="body-4 text-foreground min-w-0 flex-1 leading-snug">{body}</p>
      <div className="gap-spacing-1 flex shrink-0 items-center">
        <Tooltip label={COMPOSER_TRY_TIP_MESSAGES.tryTooltip} side="top" delayMs={200}>
          <button
            type="button"
            className="button-compact button-glass-neutral gap-spacing-1"
            onClick={onTry}
          >
            {COMPOSER_TRY_TIP_MESSAGES.try}
            <SquareArrowOutUpRight className="icon-xs" aria-hidden />
          </button>
        </Tooltip>
        <button
          type="button"
          className="btn-icon-bare"
          aria-label={COMPOSER_TRY_TIP_MESSAGES.dismiss}
          onClick={onDismiss}
        >
          <X className="icon-sm" aria-hidden />
        </button>
      </div>
    </div>
  )
}
