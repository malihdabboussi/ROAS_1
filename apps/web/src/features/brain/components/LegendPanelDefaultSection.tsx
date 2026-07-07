import { MEMORY_TYPE_COLORS, RELATIONSHIP_COLORS, SNAPSHOT_TYPE_COLORS } from '../types'
import { entryTypeColor, entryTypeLabel, memoryTypeLabel } from './legend-panel-helpers'
import {
  LegendCount,
  LegendLineRow,
  LegendMarkerRow,
  LegendSectionLabel,
} from './LegendPanelRows'

type CountMap = Record<string, number>

interface DefaultLegendSectionProps {
  beliefCount?: number
  connectionCounts: CountMap
  experienceCount?: number
  isAgentBrain?: boolean
  memoryCounts?: CountMap
  memoryLegendKeys: string[]
  perspectiveCount?: number
  skEntryCount?: number
  skRenderedKeys: string[]
  snapshotCounts?: CountMap
}

export function DefaultLegendSection({
  beliefCount,
  connectionCounts,
  experienceCount,
  isAgentBrain,
  memoryCounts,
  memoryLegendKeys,
  perspectiveCount,
  skEntryCount,
  skRenderedKeys,
  snapshotCounts,
}: DefaultLegendSectionProps) {
  return (
    <div className="px-spacing-3 py-spacing-3 space-y-spacing-3">
      {!isAgentBrain && (
        <div className="space-y-1">
          <LegendSectionLabel>Memories</LegendSectionLabel>
          {memoryLegendKeys
            .map((key) => [key, MEMORY_TYPE_COLORS[key] ?? '--brain-fact-rgb'] as const)
            .map(([key, varName]) => (
              <LegendMarkerRow
                key={key}
                label={memoryTypeLabel(key)}
                count={memoryCounts?.[key]}
                style={{
                  background: `rgba(var(${varName}), 0.35)`,
                  border: `1px solid rgba(var(${varName}), 0.55)`,
                  boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                }}
              />
            ))}
        </div>
      )}

      {!isAgentBrain && (beliefCount !== undefined || perspectiveCount !== undefined) && (
        <div className="space-y-1">
          <LegendSectionLabel>Cognition</LegendSectionLabel>
          {beliefCount !== undefined && (
            <LegendMarkerRow
              label="Beliefs"
              count={beliefCount}
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(var(--brain-belief-pattern-rgb), 0.85) 0%, rgba(var(--brain-belief-pattern-rgb), 0.25) 70%)',
                border: '1px solid rgba(var(--brain-belief-pattern-rgb), 0.7)',
                boxShadow: '0 0 8px rgba(var(--brain-belief-pattern-rgb), 0.45)',
              }}
            />
          )}
          {perspectiveCount !== undefined && (
            <LegendMarkerRow
              label="Perspectives"
              count={perspectiveCount}
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(var(--brain-perspective-rgb), 0.85) 0%, rgba(var(--brain-perspective-rgb), 0.25) 70%)',
                border: '1px solid rgba(var(--brain-perspective-rgb), 0.7)',
                boxShadow: '0 0 8px rgba(var(--brain-perspective-rgb), 0.45)',
              }}
            />
          )}
        </div>
      )}

      {!isAgentBrain && (
        <div className="space-y-1">
          <LegendSectionLabel>Snapshots</LegendSectionLabel>
          {Object.entries(SNAPSHOT_TYPE_COLORS).map(([key, varName]) => (
            <LegendMarkerRow
              key={key}
              label={key}
              count={snapshotCounts?.[key]}
              className="h-2.5 w-2.5 flex-shrink-0"
              style={{
                background: `rgba(var(${varName}), 0.35)`,
                border: `1px solid rgba(var(${varName}), 0.55)`,
                boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                transform: 'rotate(45deg)',
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-1">
        <LegendSectionLabel>Experiences / Sources</LegendSectionLabel>
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
          {experienceCount != null && <LegendCount>{experienceCount}</LegendCount>}
        </div>
      </div>

      {(skEntryCount ?? 0) > 0 && (
        <div className="space-y-1">
          <LegendSectionLabel>SK Knowledge</LegendSectionLabel>
          {skRenderedKeys.map((key) => {
            const varName = entryTypeColor(key)
            return (
              <LegendMarkerRow
                key={key}
                label={entryTypeLabel(key)}
                count={memoryCounts?.[key]}
                style={{
                  background: `rgba(var(${varName}), 0.35)`,
                  border: `1px solid rgba(var(${varName}), 0.55)`,
                  boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                }}
              />
            )
          })}
        </div>
      )}

      <div className="space-y-1">
        <LegendSectionLabel>Connections</LegendSectionLabel>
        {Object.entries(RELATIONSHIP_COLORS).map(([key, varName]) => (
          <LegendLineRow
            key={key}
            label={key.replace(/_/g, ' ')}
            count={connectionCounts[key]}
            varName={varName}
          />
        ))}
      </div>
    </div>
  )
}
