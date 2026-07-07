'use client'

import { Bot, Heart } from 'lucide-react'
import type { BrainMemory } from '../types'
import {
  NodeDetailLabel,
  NodeDetailMediaPreview,
  NodeDetailMetricBar,
  NodeDetailProgressBar,
  NodeDetailRow,
} from './NodeDetailBodyPrimitives'

type TemporalRow = {
  label: string
  value: string
}

const GREEN_EMOTIONS = new Set(['joy', 'hope'])
const BLUE_EMOTIONS = new Set(['confidence', 'curiosity'])
const PURPLE_EMOTIONS = new Set(['gratitude'])
const ORANGE_EMOTIONS = new Set(['determination', 'frustration', 'anxiety', 'overwhelm'])
const RED_EMOTIONS = new Set(['pride', 'fear', 'anger'])

function emotionBadgeClass(emotion: string): string {
  if (GREEN_EMOTIONS.has(emotion)) return 'badge-glass-green'
  if (BLUE_EMOTIONS.has(emotion)) return 'badge-glass-blue'
  if (PURPLE_EMOTIONS.has(emotion)) return 'badge-glass-purple'
  if (ORANGE_EMOTIONS.has(emotion)) return 'badge-glass-orange'
  if (RED_EMOTIONS.has(emotion)) return 'badge-glass-red'
  return 'badge-glass-muted'
}

function emotionTextClass(emotion: string): string {
  if (GREEN_EMOTIONS.has(emotion)) return 'text-success'
  if (BLUE_EMOTIONS.has(emotion)) return 'text-primary'
  if (PURPLE_EMOTIONS.has(emotion)) return 'text-primary'
  if (ORANGE_EMOTIONS.has(emotion)) return 'text-warning'
  if (RED_EMOTIONS.has(emotion)) return 'text-destructive'
  return 'text-muted-foreground'
}

function valenceLabel(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

interface NodeDetailMemorySectionProps {
  node: BrainMemory
  speakerName: string | null
  temporalRows: TemporalRow[]
  typeColor: string
}

export function NodeDetailMemorySection({
  node,
  speakerName,
  temporalRows,
  typeColor,
}: NodeDetailMemorySectionProps) {
  return (
    <>
      <p className="body-3 text-foreground leading-relaxed">{node.content}</p>
      <NodeDetailMediaPreview node={node} />

      <div className="space-y-spacing-2">
        <NodeDetailMetricBar
          label="Significance"
          value={node.significance}
          color={typeColor}
        />
        <NodeDetailMetricBar label="Confidence" value={node.confidence} color="blue" />
      </div>

      <div className="gap-spacing-2 flex flex-wrap items-center">
        {node.speaker && speakerName && (
          <div className="gap-spacing-1 flex items-center">
            <NodeDetailLabel>By</NodeDetailLabel>
            <span className="body-3 text-foreground">{speakerName}</span>
          </div>
        )}
        {node.agent_id && (
          <span className="badge-glass badge-glass-purple typo-caption gap-spacing-1 inline-flex items-center font-medium capitalize">
            <Bot className="icon-xs" />
            {node.agent_id}
          </span>
        )}
      </div>

      {node.source_emotion && (
        <div className="space-y-spacing-2">
          <div className="gap-spacing-2 flex items-center">
            <Heart className={`icon-xs ${emotionTextClass(node.source_emotion)}`} />
            <NodeDetailLabel>Emotion</NodeDetailLabel>
            <span
              className={`badge-glass typo-caption font-medium capitalize ${emotionBadgeClass(
                node.source_emotion,
              )}`}
            >
              {node.source_emotion}
            </span>
          </div>

          {node.emotional_valence != null && (
            <NodeDetailRow label="Valence" value={valenceLabel(node.emotional_valence)} />
          )}

          {node.emotional_intensity != null && (
            <>
              <NodeDetailRow label="Intensity" />
              <NodeDetailProgressBar
                value={node.emotional_intensity}
                color={node.source_emotion}
              />
            </>
          )}

          {node.speaker_intent && (
            <NodeDetailRow label="Intent" value={node.speaker_intent} />
          )}
        </div>
      )}

      {node.tags?.length > 0 && (
        <div>
          <NodeDetailLabel>Tags</NodeDetailLabel>
          <div className="mt-spacing-1 gap-spacing-1 flex flex-wrap">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="badge-glass badge-glass-muted typo-caption font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.source_type && <NodeDetailRow label="Source" value={node.source_type} />}
      {node.source_title && <NodeDetailRow label="Source Title" value={node.source_title} />}
      {temporalRows.map((row) => (
        <NodeDetailRow key={row.label} label={row.label} value={row.value} />
      ))}
    </>
  )
}
