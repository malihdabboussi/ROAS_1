'use client'

import { Bot } from 'lucide-react'
import type { BrainMemory } from '../types'
import { COMPANY_OBJECT_TYPE_LABELS } from '../types'
import {
  NodeDetailLabel,
  NodeDetailMetricBar,
  NodeDetailRow,
  NodeDetailSection,
} from './NodeDetailBodyPrimitives'
import { formatDate, temporalRows } from './node-detail-formatters'

interface NodeDetailCognitionSectionProps {
  node: BrainMemory
  typeColor: string
}

function sourceTypeLabel(sourceType: string): string {
  if (sourceType === 'conversation') return 'Chat with agent'
  if (sourceType === 'fathom') return 'Fathom call'
  if (sourceType === 'fireflies') return 'Fireflies meeting'
  return sourceType
}

export function NodeDetailCompanyObjectSection({
  node,
  typeColor,
}: NodeDetailCognitionSectionProps) {
  return (
    <>
      <h3 className="body-2 text-foreground font-medium">
        {node.source_title ?? node.content ?? 'Company object'}
      </h3>
      <p className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {node.description ?? node.content}
      </p>
      <div className="space-y-spacing-2">
        <NodeDetailMetricBar label="Confidence" value={node.confidence} color={typeColor} />
      </div>
      <NodeDetailRow
        label="Type"
        value={
          COMPANY_OBJECT_TYPE_LABELS[node.object_type ?? node.memory_type] ??
          node.object_type ??
          node.memory_type
        }
      />
      {node.status && <NodeDetailRow label="Status" value={node.status} />}
      {node.source_signal_ids && node.source_signal_ids.length > 0 && (
        <NodeDetailRow label="Source signals" value={String(node.source_signal_ids.length)} />
      )}
      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
      <NodeDetailRow label="Updated" value={formatDate(node.updated_at ?? node.created_at)} />
    </>
  )
}

export function NodeDetailCompanySignalSection({
  node,
  typeColor,
}: NodeDetailCognitionSectionProps) {
  return (
    <>
      <h3 className="body-2 text-foreground font-medium">Company signal</h3>
      <p className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {node.content}
      </p>
      <NodeDetailMetricBar label="Confidence" value={node.confidence} color={typeColor} />
      {node.signal_type && <NodeDetailRow label="Signal type" value={node.signal_type} />}
      {node.status && <NodeDetailRow label="Status" value={node.status} />}
      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}

export function NodeDetailBeliefSection({ node, typeColor }: NodeDetailCognitionSectionProps) {
  return (
    <>
      <h3 className="body-2 text-foreground font-medium">
        {node.pattern_name ?? node.content ?? 'Belief Pattern'}
      </h3>
      {node.description && (
        <p className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {node.description}
        </p>
      )}
      <div className="space-y-spacing-2">
        <NodeDetailMetricBar label="Strength" value={node.confidence} color={typeColor} />
      </div>
      {node.belief_status && <NodeDetailRow label="Status" value={node.belief_status} />}
      {node.supporting_memories && (
        <NodeDetailRow label="Supporting Memories" value={String(node.supporting_memories.length)} />
      )}
      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}

export function NodeDetailPerspectiveSection({
  node,
  typeColor,
}: NodeDetailCognitionSectionProps) {
  return (
    <>
      <h3 className="body-2 text-foreground font-medium">
        {node.pattern_name ?? node.content ?? 'Perspective'}
      </h3>
      {node.description && (
        <p className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {node.description}
        </p>
      )}
      <div className="space-y-spacing-2">
        <NodeDetailMetricBar label="Strength" value={node.confidence} color={typeColor} />
      </div>
      {node.perspective_status && <NodeDetailRow label="Status" value={node.perspective_status} />}
      {node.belief_ids && <NodeDetailRow label="Beliefs" value={String(node.belief_ids.length)} />}
      {node.influence_areas && node.influence_areas.length > 0 && (
        <div>
          <NodeDetailLabel>Influence Areas</NodeDetailLabel>
          <div className="mt-spacing-1 gap-spacing-1 flex flex-wrap">
            {node.influence_areas.map((area) => (
              <span
                key={area}
                className="badge-glass badge-glass-muted typo-caption font-medium capitalize"
              >
                {area.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
      {node.blind_spots && <NodeDetailSection title="Blind Spots" text={node.blind_spots} />}
      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}

export function NodeDetailExperienceSection({ node }: { node: BrainMemory }) {
  return (
    <>
      <h3 className="body-2 text-foreground font-medium">
        {node.content ?? node.source_title ?? node.name ?? 'Experience'}
      </h3>
      {node.source_type && (
        <NodeDetailRow label="Source" value={sourceTypeLabel(node.source_type)} />
      )}
      {node.agent_id && (
        <div className="gap-spacing-1-5 flex items-center">
          <NodeDetailLabel>Agent</NodeDetailLabel>
          <span className="badge-glass badge-glass-purple typo-caption gap-spacing-1 inline-flex items-center font-medium capitalize">
            <Bot className="icon-xs" />
            {node.agent_id}
          </span>
        </div>
      )}
      {node.memory_count != null && (
        <NodeDetailRow label="Memories" value={String(node.memory_count)} />
      )}
      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}
