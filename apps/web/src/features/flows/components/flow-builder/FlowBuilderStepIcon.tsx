'use client'

import type { LucideIcon } from 'lucide-react'
import type { FlowBuilderBadgeVariant } from '@/lib/flows/flow-builder-canvas.utils'
import { cn } from '@/lib/utils/cn'

export function FlowBuilderStepIcon({
  Icon,
  badgeVariant,
  logoSrc,
  avatarSrc,
  size = 'md',
  humanGate = false,
}: {
  Icon: LucideIcon
  badgeVariant: FlowBuilderBadgeVariant
  logoSrc?: string | null
  avatarSrc?: string | null
  size?: 'md' | 'sm'
  humanGate?: boolean
}) {
  const sizeClass = size === 'sm' ? 'flow-builder-step-panel-icon' : ''

  if (avatarSrc) {
    return (
      <span
        className={cn(
          'flow-builder-step-icon flow-builder-step-icon-avatar shrink-0 overflow-hidden',
          sizeClass,
        )}
      >
        <img src={avatarSrc} alt="" className="block h-full w-full object-cover" />
      </span>
    )
  }

  if (logoSrc) {
    return (
      <span
        className={cn(
          'flow-builder-step-icon flow-builder-step-icon-logo shrink-0 overflow-hidden',
          sizeClass,
        )}
      >
        <img src={logoSrc} alt="" className="block h-full w-full object-contain p-spacing-1" />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'flow-builder-step-icon shrink-0',
        sizeClass,
        humanGate && 'flow-builder-step-icon-human',
        `flow-builder-step-icon-${badgeVariant}`,
      )}
    >
      <Icon className={size === 'sm' ? 'icon-sm' : 'icon-md'} />
    </span>
  )
}
