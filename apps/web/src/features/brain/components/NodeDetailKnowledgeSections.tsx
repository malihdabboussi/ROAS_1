'use client'

import { ExternalLink } from 'lucide-react'
import type { BrainMemory } from '../types'
import { knowledgeSourceTypeLabel } from '../types'
import { knowledgeSourceSupportsPreview } from '../lib/knowledge-source-preview'
import { KnowledgeSourcePreview } from './KnowledgeSourcePreview'
import {
  NodeDetailLabel,
  NodeDetailMediaPreview,
  NodeDetailMetricBar,
  NodeDetailProgressBar,
  NodeDetailRow,
  NodeDetailSection,
} from './NodeDetailBodyPrimitives'
import {
  formatDate,
  formatOptionalDate,
  parentLabel,
  shortHash,
  sourceHrefFromRetrieveVia,
  temporalRows,
} from './node-detail-formatters'

interface NodeDetailTypedSectionProps {
  node: BrainMemory
  typeColor: string
}

export function NodeDetailKnowledgeSourceSection({ node }: { node: BrainMemory }) {
  const sourceHref = sourceHrefFromRetrieveVia(node.retrieve_via)
  const parent = parentLabel(node.parent_type, node.parent_id)
  const indexedAt = formatOptionalDate(node.indexed_at)
  const sourceUpdatedAt = formatOptionalDate(node.source_updated_at)
  const hash = shortHash(node.content_hash)

  return (
    <>
      <h3 className="body-2 text-foreground font-medium">
        {node.name ?? node.source_title ?? 'Indexed source'}
      </h3>
      <p className="body-3 text-muted-foreground leading-relaxed">
        This is the indexed representation of the original source. Open the original for the
        full document, artifact, page, or file.
      </p>
      {knowledgeSourceSupportsPreview(node) ? (
        <KnowledgeSourcePreview node={node} sourceHref={sourceHref} />
      ) : node.summary || node.content ? (
        <NodeDetailSection title="Indexed summary" text={node.summary ?? node.content} />
      ) : null}

      <div className="space-y-spacing-2">
        <NodeDetailLabel>Source object</NodeDetailLabel>
        {node.knowledge_source_type && (
          <NodeDetailRow
            label="Type"
            value={knowledgeSourceTypeLabel(node.knowledge_source_type)}
          />
        )}
        {node.knowledge_scope && (
          <NodeDetailRow
            label="Scope"
            value={node.knowledge_scope === 'space' ? 'Space Knowledge' : 'Campaign Knowledge'}
          />
        )}
        {node.source_id && <NodeDetailRow label="Source ID" value={node.source_id} />}
        {parent && <NodeDetailRow label="Parent" value={parent} />}
      </div>

      <div className="space-y-spacing-2">
        <NodeDetailLabel>Vectorization</NodeDetailLabel>
        <NodeDetailRow
          label="Indexed chunks"
          value={node.chunk_count != null ? String(node.chunk_count) : '0'}
        />
        {indexedAt && <NodeDetailRow label="Indexed" value={indexedAt} />}
        {sourceUpdatedAt && <NodeDetailRow label="Source updated" value={sourceUpdatedAt} />}
        {hash && <NodeDetailRow label="Content hash" value={hash} />}
        <NodeDetailRow label="Graph updated" value={formatDate(node.updated_at ?? node.created_at)} />
      </div>

      {sourceHref ? (
        <a
          href={sourceHref}
          className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center rounded-lg font-medium"
        >
          <ExternalLink className="icon-sm" />
          Open original
        </a>
      ) : node.retrieve_via?.action ? (
        <NodeDetailRow label="Original action" value={node.retrieve_via.action} />
      ) : null}
    </>
  )
}

export function NodeDetailSnapshotSection({ node, typeColor }: NodeDetailTypedSectionProps) {
  return (
    <>
      {node.name && <h3 className="body-2 text-foreground font-medium">{node.name}</h3>}
      {node.core && <NodeDetailSection title="Core Insight" text={node.core} />}
      {node.one_liner && <NodeDetailSection title="One-Liner" text={node.one_liner} />}
      {node.story && <NodeDetailSection title="Story" text={node.story} />}
      {node.moment && <NodeDetailSection title="Moment" text={node.moment} />}
      {node.emotion && (
        <NodeDetailSection
          title="Emotion"
          text={
            typeof node.emotion === 'string'
              ? node.emotion
              : `${node.emotion.feeling ?? ''}${
                  node.emotion.intensity != null ? ` (${node.emotion.intensity}/10)` : ''
                }`
          }
        />
      )}
      {node.trigger_pattern && <NodeDetailSection title="Trigger" text={node.trigger_pattern} />}
      {node.method && <NodeDetailSection title="Method" text={node.method} />}
      {node.steps && (
        <NodeDetailSection
          title="Steps"
          text={Array.isArray(node.steps) ? node.steps.join('\n') : node.steps}
        />
      )}
      {node.filter && <NodeDetailSection title="Filter" text={node.filter} />}
      {node.challenge && <NodeDetailSection title="Challenge" text={node.challenge} />}
      {node.break_test && <NodeDetailSection title="Break Test" text={node.break_test} />}
      {node.risks && <NodeDetailSection title="Risks" text={node.risks} />}
      {node.proof && <NodeDetailSection title="Proof" text={node.proof} />}

      <div className="space-y-spacing-2">
        <NodeDetailRow label="Confidence" />
        <NodeDetailProgressBar value={node.confidence} color="blue" />
        <NodeDetailRow label="Significance" />
        <NodeDetailProgressBar
          value={node.significance_score ?? node.significance}
          color={typeColor}
        />
      </div>

      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}

export function NodeDetailSkEntrySection({ node, typeColor }: NodeDetailTypedSectionProps) {
  return (
    <>
      {node.name && <h3 className="body-2 text-foreground font-medium">{node.name}</h3>}
      {node.content && node.content !== node.name && (
        <p className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {node.content}
        </p>
      )}
      <NodeDetailMediaPreview node={node} />
      {node.entry_type && <NodeDetailRow label="Type" value={node.entry_type} />}
      {node.domain && <NodeDetailRow label="Domain" value={node.domain} />}
      <div className="space-y-spacing-2">
        {node.confidence != null && (
          <NodeDetailMetricBar label="Confidence" value={node.confidence} color={typeColor} />
        )}
      </div>
      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}

export function NodeDetailSkSourceSection({ node }: { node: BrainMemory }) {
  return (
    <>
      <h3 className="body-2 text-foreground font-medium">
        {node.content ?? node.source_title ?? node.name ?? 'Untitled Source'}
      </h3>
      {node.source_type && <NodeDetailRow label="Source Type" value={node.source_type} />}
      {node.domain && <NodeDetailRow label="Domain" value={node.domain} />}
      {temporalRows(node).map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}
