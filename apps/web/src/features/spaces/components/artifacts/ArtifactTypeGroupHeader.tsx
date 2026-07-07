'use client'

import { LucideIcon } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'
import {
  ARTIFACT_KIND_BADGE_COLOR,
  ARTIFACT_KIND_ICONS,
  ARTIFACT_KIND_LABELS,
} from '../../lib/all-artifacts'
import { spaceGroupBadgeChipProps } from '../../lib/space-group-badge-glass'
import type { ArtifactViewType } from '../../types/space-schema'

export function ArtifactTypeGroupHeader({
  viewType,
  label,
}: {
  viewType: ArtifactViewType
  label?: string
}) {
  const chip = spaceGroupBadgeChipProps(ARTIFACT_KIND_BADGE_COLOR[viewType])
  const text = label ?? ARTIFACT_KIND_LABELS[viewType]
  const icon = ARTIFACT_KIND_ICONS[viewType]

  return (
    <span
      className={cn(
        'rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider',
        chip.chipClassName,
      )}
      style={chip.style}
    >
      <LucideIcon name={icon} className="h-3.5 w-3.5 shrink-0 opacity-90" />
      {text}
    </span>
  )
}
