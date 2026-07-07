'use client'

/**
 * Ported from apps/web LegendPanel — user Brain legend only (no campaign / agent Knowledge tab / API).
 */
import { useEffect, useRef, useState } from 'react'
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  ENTRY_TYPE_COLORS,
  ENTRY_TYPE_LABELS,
  MEMORY_TYPE_COLORS,
  MEMORY_TYPE_LABELS,
  RELATIONSHIP_COLORS,
  SNAPSHOT_TYPE_COLORS,
} from './types'
import type { BrainConnection } from './types'

interface LegendPanelProps {
  memoryCounts?: Record<string, number>
  snapshotCounts?: Record<string, number>
  experienceCount?: number
  skEntryCount?: number
  connections?: BrainConnection[]
  isAgentBrain?: boolean
  /** `overlay`: bottom-right on canvas. `sidebar`: fixed column right of graph (wheel zoom targets graph only). */
  variant?: 'overlay' | 'sidebar'
  showSnapshots?: boolean
  showSkKnowledge?: boolean
  animate?: boolean
  /** Fade root in on mount (marketing sequence). */
  fadeIn?: boolean
  /** Delay before count-up animation starts (s). */
  numberRollDelay?: number
  /** When `fadeIn` is true, called after the opacity intro finishes. */
  onFadeInComplete?: () => void
  /**
   * When true with `variant="overlay"`, root is not absolutely positioned.
   * Parent should place the panel (e.g. `absolute bottom-2 left-2` + scale).
   */
  embed?: boolean
}

function RollingNumber({
  value,
  animate: shouldAnimate,
  delay: rollDelay = 0.5,
}: {
  value: number
  animate?: boolean
  delay?: number
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    if (shouldAnimate) {
      const controls = animate(count, value, {
        duration: 2,
        ease: [0.16, 1, 0.3, 1],
        delay: rollDelay,
      })
      return controls.stop
    } else {
      count.set(value)
    }
  }, [value, shouldAnimate, count, rollDelay])

  return <motion.span>{rounded}</motion.span>
}

export default function LegendPanel({
  memoryCounts,
  snapshotCounts,
  experienceCount,
  skEntryCount,
  connections,
  isAgentBrain,
  variant = 'overlay',
  showSnapshots = true,
  showSkKnowledge = true,
  animate: shouldAnimate = false,
  fadeIn = false,
  numberRollDelay = 0.5,
  onFadeInComplete,
  embed = false,
}: LegendPanelProps) {
  const fadeInDoneRef = useRef(false)
  const connectionCounts = (connections ?? []).reduce<Record<string, number>>((acc, c) => {
    const key = c.relationship_type ?? 'related_to'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const [collapsed, setCollapsed] = useState(false)

  const rootClass =
    variant === 'sidebar'
      ? 'surface-card border-border flex h-full min-h-0 w-[200px] flex-shrink-0 flex-col border-l z-40'
      : embed
        ? 'pointer-events-auto z-50 flex flex-col items-start relative'
        : 'left-4 bottom-4 pointer-events-auto absolute z-50 flex flex-col items-start'

  const panelClass =
    variant === 'sidebar'
      ? 'surface-card flex min-h-0 flex-1 flex-col overflow-hidden border-0'
      : 'surface-card border-border w-[180px] overflow-hidden rounded-lg border'

  const legendBodySections = (
    <div className="px-spacing-3 py-spacing-3 space-y-3">
      {!isAgentBrain && (
        <div className="space-y-1">
          <p className="typo-caption text-muted-foreground uppercase tracking-wider">Memories</p>
          {Object.entries(MEMORY_TYPE_COLORS)
            .filter(([key]) => key !== 'snapshot')
            .map(([key, varName]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{
                    background: `rgba(var(${varName}), 0.35)`,
                    border: `1px solid rgba(var(${varName}), 0.55)`,
                    boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                  }}
                />
                <span className="body-3 text-muted-foreground">
                  {MEMORY_TYPE_LABELS[key] ?? key}
                </span>
                {memoryCounts?.[key] != null && (
                  <span className="typo-caption text-muted-foreground ml-auto">
                    <RollingNumber
                      value={memoryCounts[key]}
                      animate={shouldAnimate}
                      delay={numberRollDelay}
                    />
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      {!isAgentBrain && showSnapshots && (
        <div className="space-y-1">
          <p className="typo-caption text-muted-foreground uppercase tracking-wider">Snapshots</p>
          {Object.entries(SNAPSHOT_TYPE_COLORS).map(([key, varName]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 flex-shrink-0"
                style={{
                  background: `rgba(var(${varName}), 0.35)`,
                  border: `1px solid rgba(var(${varName}), 0.55)`,
                  boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                  transform: 'rotate(45deg)',
                }}
              />
              <span className="body-3 text-muted-foreground">{key}</span>
              {snapshotCounts?.[key] != null && (
                <span className="typo-caption text-muted-foreground ml-auto">
                  <RollingNumber
                    value={snapshotCounts[key]}
                    animate={shouldAnimate}
                    delay={numberRollDelay}
                  />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <p className="typo-caption text-muted-foreground uppercase tracking-wider">
          Experiences / Sources
        </p>
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 flex-shrink-0"
            style={{
              background: 'rgba(var(--brain-document-rgb), 0.3)',
              border: '1px solid rgba(var(--brain-document-rgb), 0.5)',
              boxShadow: '0 0 6px rgba(var(--brain-document-rgb), 0.2)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
          <span className="body-3 text-muted-foreground">Experience / Source</span>
          {experienceCount != null && (
            <span className="typo-caption text-muted-foreground ml-auto">
              <RollingNumber
                value={experienceCount}
                animate={shouldAnimate}
                delay={numberRollDelay}
              />
            </span>
          )}
        </div>
      </div>

      {showSkKnowledge && (skEntryCount ?? 0) > 0 && (
        <div className="space-y-1">
          <p className="typo-caption text-muted-foreground uppercase tracking-wider">
            SK Knowledge
          </p>
          {Object.entries(ENTRY_TYPE_COLORS)
            .filter(([key]) => (memoryCounts?.[key] ?? 0) > 0)
            .map(([key, varName]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{
                    background: `rgba(var(${varName}), 0.35)`,
                    border: `1px solid rgba(var(${varName}), 0.55)`,
                    boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                  }}
                />
                <span className="body-3 text-muted-foreground">
                  {ENTRY_TYPE_LABELS[key] ?? key}
                </span>
                {memoryCounts?.[key] != null && (
                  <span className="typo-caption text-muted-foreground ml-auto">
                    <RollingNumber
                      value={memoryCounts[key]}
                      animate={shouldAnimate}
                      delay={numberRollDelay}
                    />
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="space-y-1">
        <p className="typo-caption text-muted-foreground uppercase tracking-wider">Connections</p>
        {Object.entries(RELATIONSHIP_COLORS).map(([key, varName]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="flex w-3 flex-shrink-0 items-center">
              <div
                className="h-px w-full"
                style={{
                  background: `rgba(var(${varName}), 0.8)`,
                  boxShadow: `0 0 4px rgba(var(${varName}), 0.5)`,
                }}
              />
            </div>
            <span className="body-3 text-muted-foreground capitalize">
              {key.replace(/_/g, ' ')}
            </span>
            {connectionCounts[key] != null && (
              <span className="typo-caption text-muted-foreground ml-auto">
                <RollingNumber
                  value={connectionCounts[key]}
                  animate={shouldAnimate}
                  delay={numberRollDelay}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const inner = (
    <div className={panelClass}>
      <div className="px-spacing-3 pt-spacing-3 pb-spacing-1 flex items-center justify-between">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between transition-colors"
          >
            <span className="body-3 font-medium">Legend</span>
            <ChevronUp className="icon-xs" />
          </button>
        ) : (
          <>
            <span className="body-3 text-foreground font-medium">Legend</span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse"
            >
              <ChevronDown className="icon-xs" />
            </button>
          </>
        )}
      </div>

      {variant === 'overlay' && !collapsed ? (
        <div className="overflow-hidden">
          <div style={{ scrollbarWidth: 'thin' }}>{legendBodySections}</div>
        </div>
      ) : variant === 'sidebar' ? (
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="legend-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="min-h-0 flex-1 overflow-hidden"
            >
              <div className="max-h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {legendBodySections}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}
    </div>
  )

  if (fadeIn) {
    return (
      <motion.div
        className={rootClass}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          if (fadeInDoneRef.current) return
          fadeInDoneRef.current = true
          onFadeInComplete?.()
        }}
      >
        {inner}
      </motion.div>
    )
  }

  return <div className={rootClass}>{inner}</div>
}
