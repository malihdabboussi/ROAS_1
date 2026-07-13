'use client'

import { useCallback, useState } from 'react'
import {
  HOME_DASHBOARD_TEMPLATES,
  type HomeDashboardTemplate,
  type HomeDashboardTemplateId,
} from '@/features/home/config/home-dashboard-v4.config'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { cn } from '@/lib/utils/cn'

export function HomeTemplateFan({
  selected,
  onSelect,
  onHover,
}: {
  selected: HomeDashboardTemplateId | null
  onSelect: (id: HomeDashboardTemplateId | null) => void
  onHover?: (id: HomeDashboardTemplateId | null) => void
}) {
  const [hoveredId, setHoveredId] = useState<HomeDashboardTemplateId | null>(null)
  const isMobileGrid = useMediaQuery('(max-width: 767px)')
  const isDesktopFan = useMediaQuery('(min-width: 960px)')

  const handleHover = useCallback(
    (id: HomeDashboardTemplateId | null) => {
      setHoveredId(id)
      onHover?.(id)
    },
    [onHover],
  )

  const rowClass = isMobileGrid
    ? 'hd4-template-grid'
    : isDesktopFan
      ? 'hd4-template-fan-row'
      : 'hd4-template-fan-row hd4-template-fan-row-scroll'

  return (
    <div className="flex min-w-0 flex-col items-center gap-3.5">
      <div className="hd4-template-fan-hint">Start with a template…</div>
      <div className={rowClass}>
        {HOME_DASHBOARD_TEMPLATES.map((template, index) => {
          const isSelected = selected === template.id
          const isHovered = hoveredId === template.id

          if (isMobileGrid) {
            return (
              <TemplateGridButton
                key={template.id}
                template={template}
                isSelected={isSelected}
                onSelect={onSelect}
              />
            )
          }

          return (
            <TemplateFanButton
              key={template.id}
              template={template}
              index={index}
              isSelected={isSelected}
              isHovered={isHovered}
              enableFanTilt={isDesktopFan}
              onSelect={onSelect}
              onHover={handleHover}
            />
          )
        })}
      </div>
      <button
        type="button"
        className="flex items-center gap-1.5 text-[13px] text-[var(--hd4-text-3)] transition-colors hover:text-[var(--hd4-text)]"
        onClick={() => onSelect(null)}
      >
        …or start blank <span className="text-sm">→</span>
      </button>
    </div>
  )
}

function TemplateGridButton({
  template,
  isSelected,
  onSelect,
}: {
  template: HomeDashboardTemplate
  isSelected: boolean
  onSelect: (id: HomeDashboardTemplateId | null) => void
}) {
  const Icon = template.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? null : template.id)}
      className={cn('hd4-template-grid-item', isSelected && 'hd4-template-grid-item-selected')}
    >
      <div className="hd4-template-fan-card-icon">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <span className="hd4-template-fan-card-label">{template.label}</span>
    </button>
  )
}

function TemplateFanButton({
  template,
  index,
  isSelected,
  isHovered,
  enableFanTilt,
  onSelect,
  onHover,
}: {
  template: HomeDashboardTemplate
  index: number
  isSelected: boolean
  isHovered: boolean
  enableFanTilt: boolean
  onSelect: (id: HomeDashboardTemplateId | null) => void
  onHover: (id: HomeDashboardTemplateId | null) => void
}) {
  const Icon = template.icon
  const tilt = template.tilt * 0.55
  const translateY = Math.abs(template.tilt)

  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? null : template.id)}
      className={cn('hd4-template-fan-card', isSelected && 'hd4-template-fan-card-selected')}
      style={
        enableFanTilt
          ? {
              transform: isHovered
                ? 'rotate(0deg) translateY(-4px)'
                : `rotate(${tilt}deg) translateY(${translateY}px)`,
              zIndex: isHovered ? 6 : isSelected ? 5 : index + 1,
            }
          : undefined
      }
      onMouseEnter={() => onHover(template.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="hd4-template-fan-card-icon">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <span className="hd4-template-fan-card-label">{template.label}</span>
    </button>
  )
}
