'use client'

import { useCallback, useState } from 'react'
import {
  HOME_DASHBOARD_TEMPLATES,
  type HomeDashboardTemplateId,
} from '@/features/home/config/home-dashboard-v4.config'
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

  const handleHover = useCallback(
    (id: HomeDashboardTemplateId | null) => {
      setHoveredId(id)
      onHover?.(id)
    },
    [onHover],
  )

  return (
    <div className="flex flex-col items-center gap-3.5">
      <div className="hd4-template-fan-hint">Start with a template…</div>
      <div className="hd4-template-fan-row">
        {HOME_DASHBOARD_TEMPLATES.map((template, index) => {
          const Icon = template.icon
          const isSelected = selected === template.id
          const isHovered = hoveredId === template.id
          const tilt = template.tilt * 0.55
          const translateY = Math.abs(template.tilt)

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : template.id)}
              className={cn(
                'hd4-template-fan-card',
                isSelected && 'hd4-template-fan-card-selected',
              )}
              style={{
                transform: isHovered
                  ? 'rotate(0deg) translateY(-4px)'
                  : `rotate(${tilt}deg) translateY(${translateY}px)`,
                zIndex: isHovered ? 6 : isSelected ? 5 : index + 1,
              }}
              onMouseEnter={() => handleHover(template.id)}
              onMouseLeave={() => handleHover(null)}
            >
              <div className="hd4-template-fan-card-icon">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <span className="hd4-template-fan-card-label">{template.label}</span>
            </button>
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
