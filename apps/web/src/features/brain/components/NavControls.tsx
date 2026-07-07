'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Brain,
  Clock,
  Compass,
  Crosshair,
  Droplet,
  Layers,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { OrganizeLayout } from './ForceGraph'

interface NavControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onCenter: () => void
  onOrganize: (layout: OrganizeLayout) => void
  nodesMonochrome?: boolean
  onToggleNodesMonochrome?: () => void
}

const LAYOUTS: Array<{
  id: OrganizeLayout
  label: string
  description: string
  icon: typeof Clock
}> = [
  {
    id: 'time',
    label: 'By Time',
    description: 'Newest at center, older outward',
    icon: Clock,
  },
  {
    id: 'significance',
    label: 'By Significance',
    description: 'Most significant at the core',
    icon: Sparkles,
  },
  {
    id: 'cognition',
    label: 'By Cognition',
    description: 'Perspectives → beliefs → memories',
    icon: Compass,
  },
  {
    id: 'domain',
    label: 'By Domain',
    description: 'Cluster by domain or source',
    icon: Layers,
  },
]

export default function NavControls({
  onZoomIn,
  onZoomOut,
  onCenter,
  onOrganize,
  nodesMonochrome,
  onToggleNodesMonochrome,
}: NavControlsProps) {
  const btnClass =
    'w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors rounded'
  const [organizeOpen, setOrganizeOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOrganizeOpen(true)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOrganizeOpen(false), 180)
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  return (
    <div className="bottom-spacing-4 left-spacing-4 absolute z-40">
      <div className="surface-card border-border flex flex-col overflow-visible rounded-lg border">
        <Tooltip label="Zoom in" side="right">
          <button onClick={onZoomIn} className={btnClass}>
            <Plus className="icon-sm" />
          </button>
        </Tooltip>

        <div className="border-border border-t" />

        <Tooltip label="Zoom out" side="right">
          <button onClick={onZoomOut} className={btnClass}>
            <Minus className="icon-sm" />
          </button>
        </Tooltip>

        <div className="border-border border-t" />

        {onToggleNodesMonochrome ? (
          <>
            <Tooltip label={nodesMonochrome ? 'Show colored nodes' : 'White nodes'} side="right">
              <button
                type="button"
                onClick={onToggleNodesMonochrome}
                className={`${btnClass} ${nodesMonochrome ? 'bg-muted/30 text-foreground' : ''}`}
                aria-pressed={nodesMonochrome}
              >
                <Droplet className="icon-sm" />
              </button>
            </Tooltip>

            <div className="border-border border-t" />
          </>
        ) : null}

        <Tooltip label="Center" side="right">
          <button onClick={onCenter} className={btnClass}>
            <Crosshair className="icon-xs" />
          </button>
        </Tooltip>

        <div className="border-border border-t" />

        <div className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
          <button
            onClick={() => setOrganizeOpen((v) => !v)}
            className={btnClass}
            aria-haspopup="menu"
            aria-expanded={organizeOpen}
          >
            <Brain className="icon-xs" />
          </button>
          {organizeOpen && (
            <div
              className="dropdown-menu-solid p-spacing-2 ml-spacing-2 absolute bottom-0 left-full w-[240px] rounded-xl"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
              data-dropdown
            >
              <p className="px-spacing-2 pt-spacing-1 pb-spacing-2 typo-caption text-muted-foreground uppercase tracking-wider">
                Organize
              </p>
              {LAYOUTS.map((layout) => {
                const Icon = layout.icon
                return (
                  <button
                    key={layout.id}
                    onClick={() => {
                      onOrganize(layout.id)
                      setOrganizeOpen(false)
                    }}
                    className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-start text-left transition-colors"
                  >
                    <Icon className="icon-sm mt-0.5 flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="body-3 text-foreground block font-medium">
                        {layout.label}
                      </span>
                      <span className="typo-caption text-muted-foreground block">
                        {layout.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
