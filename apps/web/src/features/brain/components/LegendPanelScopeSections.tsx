import {
  CAMPAIGN_DOMAIN_COLORS,
  CAMPAIGN_DOMAIN_LABELS,
  CAMPAIGN_SOURCE_COLORS,
  CAMPAIGN_SOURCE_LABELS,
  COMPANY_OBJECT_TYPE_COLORS,
  COMPANY_OBJECT_TYPE_LABELS,
  COMPANY_RELATION_COLORS,
  knowledgeSourceTypeColor,
  knowledgeSourceTypeLabel,
  RELATIONSHIP_COLORS,
} from '../types'
import { LegendCount, LegendLineRow, LegendMarkerRow, LegendSectionLabel } from './LegendPanelRows'

type CountMap = Record<string, number>

interface ConnectionCountsProps {
  connectionCounts: CountMap
}

interface KnowledgeLegendSectionProps extends ConnectionCountsProps {
  sourceCounts?: CountMap
}

export function KnowledgeLegendSection({
  connectionCounts,
  sourceCounts,
}: KnowledgeLegendSectionProps) {
  return (
    <div className="px-spacing-3 py-spacing-3 space-y-spacing-3">
      <div className="space-y-1">
        <LegendSectionLabel>Objects</LegendSectionLabel>
        {Object.entries(sourceCounts ?? {})
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => {
            const varName = knowledgeSourceTypeColor(key)
            return (
              <LegendMarkerRow
                key={key}
                label={knowledgeSourceTypeLabel(key)}
                count={count}
                style={{
                  background: `rgba(var(${varName}), 0.35)`,
                  border: `1px solid rgba(var(${varName}), 0.55)`,
                  boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                }}
              />
            )
          })}
      </div>

      <RelationshipLegendSection connectionCounts={connectionCounts} />
    </div>
  )
}

interface CampaignLegendSectionProps extends ConnectionCountsProps {
  domainCounts?: CountMap
  sourceCounts?: CountMap
}

export function CampaignLegendSection({
  connectionCounts,
  domainCounts,
  sourceCounts,
}: CampaignLegendSectionProps) {
  return (
    <div className="px-spacing-3 py-spacing-3 space-y-spacing-3">
      <div className="space-y-1">
        <LegendSectionLabel>Domains</LegendSectionLabel>
        {Object.entries(CAMPAIGN_DOMAIN_COLORS).map(([key, varName]) => {
          const count = domainCounts?.[key]
          if (count == null) return null
          return (
            <LegendMarkerRow
              key={key}
              label={CAMPAIGN_DOMAIN_LABELS[key] ?? key}
              count={count}
              style={{
                background: `rgba(var(${varName}), 0.35)`,
                border: `1px solid rgba(var(${varName}), 0.55)`,
                boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
              }}
            />
          )
        })}
      </div>

      <div className="space-y-1">
        <LegendSectionLabel>Sources</LegendSectionLabel>
        {Object.entries(CAMPAIGN_SOURCE_COLORS).map(([key, varName]) => {
          const count = sourceCounts?.[key]
          if (count == null) return null
          return (
            <LegendMarkerRow
              key={key}
              label={CAMPAIGN_SOURCE_LABELS[key] ?? key}
              count={count}
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{
                background: `rgba(var(${varName}), 0.35)`,
                border: `1px solid rgba(var(${varName}), 0.55)`,
                boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
              }}
            />
          )
        })}
      </div>

      <RelationshipLegendSection connectionCounts={connectionCounts} />
    </div>
  )
}

interface CompanyLegendSectionProps extends ConnectionCountsProps {
  experienceCount?: number
  memoryCounts?: CountMap
}

export function CompanyLegendSection({
  connectionCounts,
  experienceCount,
  memoryCounts,
}: CompanyLegendSectionProps) {
  return (
    <div className="px-spacing-3 py-spacing-3 space-y-spacing-3">
      <CompanyObjectGroup
        title="Operating cognition"
        keys={['belief', 'perspective', 'tension']}
        memoryCounts={memoryCounts}
        markerClassName="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        markerStyle={(varName) => ({
          background: `radial-gradient(circle, rgba(var(${varName}), 0.85) 0%, rgba(var(${varName}), 0.25) 70%)`,
          border: `1px solid rgba(var(${varName}), 0.7)`,
          boxShadow: `0 0 8px rgba(var(${varName}), 0.45)`,
        })}
      />

      <CompanyObjectGroup
        title="Operating patterns"
        keys={['standard', 'move', 'anti_pattern', 'protocol']}
        memoryCounts={memoryCounts}
      />

      <CompanyObjectGroup
        title="Decisions & rules"
        keys={['decision', 'retrieval_rule']}
        memoryCounts={memoryCounts}
      />

      <div className="space-y-1">
        <LegendSectionLabel>Signals</LegendSectionLabel>
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 flex-shrink-0"
            style={{
              background: 'rgba(var(--brain-co-signal-rgb), 0.3)',
              border: '1px solid rgba(var(--brain-co-signal-rgb), 0.5)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
          <span className="body-3 text-muted-foreground">Proposed / lineage</span>
          {experienceCount != null && <LegendCount>{experienceCount}</LegendCount>}
        </div>
      </div>

      <div className="space-y-1">
        <LegendSectionLabel>Relationships</LegendSectionLabel>
        {Object.entries(COMPANY_RELATION_COLORS).map(([key, varName]) => (
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

function RelationshipLegendSection({ connectionCounts }: ConnectionCountsProps) {
  return (
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
  )
}

interface CompanyObjectGroupProps {
  keys: readonly string[]
  markerClassName?: string
  markerStyle?: (varName: string) => React.CSSProperties
  memoryCounts?: CountMap
  title: string
}

function CompanyObjectGroup({
  keys,
  markerClassName,
  markerStyle = (varName) => ({
    background: `rgba(var(${varName}), 0.35)`,
    border: `1px solid rgba(var(${varName}), 0.55)`,
    boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
  }),
  memoryCounts,
  title,
}: CompanyObjectGroupProps) {
  return (
    <div className="space-y-1">
      <LegendSectionLabel>{title}</LegendSectionLabel>
      {keys.map((key) => {
        const varName = COMPANY_OBJECT_TYPE_COLORS[key] ?? '--brain-co-belief-rgb'
        const count = memoryCounts?.[key]
        if (count == null) return null
        return (
          <LegendMarkerRow
            key={key}
            label={COMPANY_OBJECT_TYPE_LABELS[key] ?? key}
            count={count}
            className={markerClassName}
            style={markerStyle(varName)}
          />
        )
      })}
    </div>
  )
}
