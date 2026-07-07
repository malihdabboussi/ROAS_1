'use client'

import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import type { BrainMemory } from '../types'

type NodeDetailTone = 'blue' | 'green' | 'muted' | 'orange' | 'purple' | 'red'

const BAR_CLASS_BY_TONE: Record<NodeDetailTone, string> = {
  blue: 'bar-glass-blue',
  green: 'bar-glass-green',
  muted: 'bar-glass-muted',
  orange: 'bar-glass-orange',
  purple: 'bar-glass-purple',
  red: 'bar-glass-red',
}

const TEXT_CLASS_BY_TONE: Record<NodeDetailTone, string> = {
  blue: 'text-primary',
  green: 'text-success',
  muted: 'text-muted-foreground',
  orange: 'text-warning',
  purple: 'text-primary',
  red: 'text-destructive',
}

function toneFromColor(color?: string): NodeDetailTone {
  const normalized = color?.toLowerCase() ?? ''
  if (
    normalized.includes('destructive') ||
    normalized.includes('red') ||
    normalized.includes('ef4444') ||
    normalized.includes('dc2626') ||
    normalized.includes('decision')
  ) {
    return 'red'
  }
  if (
    normalized.includes('success') ||
    normalized.includes('green') ||
    normalized.includes('22c55e') ||
    normalized.includes('10b981') ||
    normalized.includes('framework')
  ) {
    return 'green'
  }
  if (
    normalized.includes('warning') ||
    normalized.includes('orange') ||
    normalized.includes('f59e0b') ||
    normalized.includes('f97316') ||
    normalized.includes('eab308') ||
    normalized.includes('insight')
  ) {
    return 'orange'
  }
  if (
    normalized.includes('purple') ||
    normalized.includes('a855f7') ||
    normalized.includes('8b5cf6') ||
    normalized.includes('belief') ||
    normalized.includes('snapshot') ||
    normalized.includes('story')
  ) {
    return 'purple'
  }
  if (
    normalized.includes('blue') ||
    normalized.includes('60a5fa') ||
    normalized.includes('3b82f6') ||
    normalized.includes('fact') ||
    normalized.includes('principle')
  ) {
    return 'blue'
  }
  return 'muted'
}

export function NodeDetailLabel({ children }: { children: ReactNode }) {
  return (
    <span className="typo-caption text-muted-foreground uppercase tracking-wider">{children}</span>
  )
}

export function NodeDetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <NodeDetailLabel>{label}</NodeDetailLabel>
      {value && <span className="body-3 text-foreground">{value}</span>}
    </div>
  )
}

export function NodeDetailSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <NodeDetailLabel>{title}</NodeDetailLabel>
      <p className="body-3 text-muted-foreground mt-spacing-1 whitespace-pre-wrap leading-relaxed">
        {text}
      </p>
    </div>
  )
}

export function NodeDetailProgressBar({
  color,
  max = 1,
  value,
}: {
  color?: string
  max?: number
  value: number
}) {
  const safeMax = max > 0 ? max : 1
  const safeValue = Math.min(safeMax, Math.max(0, value))
  const tone = toneFromColor(color)
  return (
    <progress
      aria-label="Progress"
      className={`progress-bar-track ${BAR_CLASS_BY_TONE[tone]} w-full`}
      max={safeMax}
      value={safeValue}
    />
  )
}

export function NodeDetailMetricBar({
  color,
  label,
  value,
}: {
  color?: string
  label: string
  value: number
}) {
  const pct = Math.round(value * 100)
  const tone = toneFromColor(color)
  return (
    <div>
      <div className="mb-spacing-1 flex items-center justify-between">
        <span className="typo-caption text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={`typo-caption font-medium ${TEXT_CLASS_BY_TONE[tone]}`}>{pct}%</span>
      </div>
      <NodeDetailProgressBar color={color} value={value} />
    </div>
  )
}

export function NodeDetailMediaPreview({ node }: { node: BrainMemory }) {
  if (!node.media_type || node.media_type === 'text' || !node.media_url) return null
  if (node.media_type === 'image') {
    return (
      <img
        src={node.media_url}
        alt={node.source_title || 'Memory image'}
        className="max-h-72 w-full rounded-spacing-2 object-contain"
      />
    )
  }
  if (node.media_type === 'audio') {
    return <audio controls src={node.media_url} className="w-full" />
  }
  if (node.media_type === 'video') {
    return <video controls src={node.media_url} className="max-h-72 w-full rounded-spacing-2" />
  }
  if (node.media_type === 'pdf') {
    return (
      <a
        href={node.media_url}
        target="_blank"
        rel="noreferrer"
        className="body-3 text-primary inline-flex items-center underline"
      >
        <ExternalLink className="icon-sm mr-spacing-1" />
        Open PDF
      </a>
    )
  }
  return (
    <a
      href={node.media_url}
      target="_blank"
      rel="noreferrer"
      className="body-3 text-primary inline-flex items-center underline"
    >
      <ExternalLink className="icon-sm mr-spacing-1" />
      Open media
    </a>
  )
}
