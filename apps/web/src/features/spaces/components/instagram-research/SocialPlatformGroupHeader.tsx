'use client'

import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { cn } from '@/lib/utils/cn'
import { PLATFORM_GROUP_BADGE_COLOR, PLATFORM_LABELS } from '../../lib/all-social-research'
import { spaceGroupBadgeChipProps } from '../../lib/space-group-badge-glass'
import type { SocialPlatform } from '../../types/space-schema'

export function SocialPlatformGroupHeader({
  platform,
  label,
}: {
  platform: SocialPlatform
  label?: string
}) {
  const chip = spaceGroupBadgeChipProps(PLATFORM_GROUP_BADGE_COLOR[platform])
  const logo = getIntegrationLogoPath(platform)
  const text = label ?? PLATFORM_LABELS[platform]

  return (
    <span
      className={cn(
        'rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider',
        chip.chipClassName,
      )}
      style={chip.style}
    >
      {logo ? (
        <img src={logo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" aria-hidden />
      ) : null}
      {text}
    </span>
  )
}
