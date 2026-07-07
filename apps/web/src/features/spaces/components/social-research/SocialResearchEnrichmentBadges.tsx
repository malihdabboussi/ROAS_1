'use client'

import { ScanText, Zap } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import { resolveSocialResearchEnrichmentFlags } from '../../lib/social-research-enrichment'

type SocialResearchEnrichmentBadgesProps = {
  customData: Record<string, unknown>
  /** Compact overlay for list thumbnails; default footer row for grid cards. */
  variant?: 'footer' | 'overlay'
  className?: string
}

function badgeClass(active: boolean, variant: 'footer' | 'overlay'): string {
  if (variant === 'overlay') {
    return cn(
      'flex items-center justify-center rounded bg-black/60 p-0.5',
      active ? 'text-success' : 'text-white opacity-40',
    )
  }
  return cn(
    'flex items-center justify-center rounded p-0.5',
    active ? 'text-success' : 'text-[var(--color-muted-foreground)] opacity-35',
  )
}

export function SocialResearchEnrichmentBadges({
  customData,
  variant = 'footer',
  className,
}: SocialResearchEnrichmentBadgesProps) {
  const { analyzed, hasFormulaBreakdown } = resolveSocialResearchEnrichmentFlags(customData)
  const iconClass = variant === 'overlay' ? 'h-3 w-3' : 'icon-xs'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5',
        variant === 'footer' && 'ml-auto',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Tooltip
        label={analyzed ? 'Analyzed' : 'Not analyzed yet'}
        side={variant === 'overlay' ? 'left' : 'top'}
      >
        <span
          className={badgeClass(analyzed, variant)}
          aria-label={analyzed ? 'Analyzed' : 'Not analyzed yet'}
        >
          <ScanText className={iconClass} />
        </span>
      </Tooltip>
      <Tooltip
        label={hasFormulaBreakdown ? 'Formula breakdown ready' : 'No formula breakdown yet'}
        side={variant === 'overlay' ? 'left' : 'top'}
      >
        <span
          className={badgeClass(hasFormulaBreakdown, variant)}
          aria-label={hasFormulaBreakdown ? 'Formula breakdown ready' : 'No formula breakdown yet'}
        >
          <Zap className={iconClass} />
        </span>
      </Tooltip>
    </div>
  )
}
