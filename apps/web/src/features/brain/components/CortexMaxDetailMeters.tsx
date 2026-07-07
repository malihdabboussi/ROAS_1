import { Heart } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import type { BeliefPattern } from '../types'
import { formatPercent } from './cortex-max-detail-formatters'

export function BeliefEmotionalBars({
  signature,
}: {
  signature: NonNullable<BeliefPattern['emotional_signature']>
}) {
  const valence = signature.avg_valence
  const intensity = signature.avg_intensity
  const intentLabel = signature.speaker_intent ?? signature.intent

  const hasContent =
    Boolean(signature.dominant_emotion?.trim()) ||
    (typeof valence === 'number' && !Number.isNaN(valence)) ||
    (typeof intensity === 'number' && !Number.isNaN(intensity)) ||
    Boolean(intentLabel?.trim())

  if (!hasContent) return null

  const pctIntensity =
    typeof intensity === 'number' && !Number.isNaN(intensity)
      ? Math.round(Math.max(0, Math.min(1, intensity)) * 100)
      : null

  return (
    <div className="space-y-spacing-2 p-spacing-3 rounded-xl border border-border bg-surface-subtle">
      {signature.dominant_emotion ? (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <Heart className="icon-xs text-primary shrink-0" aria-hidden />
          <span className="typo-caption text-muted-foreground uppercase tracking-wider">
            Emotion
          </span>
          <span className="badge-glass badge-glass-purple badge-glass-sm body-4 capitalize">
            {signature.dominant_emotion}
          </span>
        </div>
      ) : null}

      {typeof valence === 'number' && !Number.isNaN(valence) ? (
        <div className="space-y-spacing-1">
          <div className="gap-spacing-2 flex items-center justify-between">
            <span className="typo-caption text-muted-foreground uppercase tracking-wider">
              Valence
            </span>
            <span className="typo-caption text-foreground shrink-0 font-medium">
              {valence > 0 ? '+' : ''}
              {valence.toFixed(1)}
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-muted-foreground/25 absolute left-1/2 top-0 z-10 h-full w-px -translate-x-1/2"
              aria-hidden
            />
            <div
              className={cn(
                'absolute top-0 h-full w-spacing-1 -translate-x-1/2 rounded-full',
                valence > 0
                  ? 'bg-primary'
                  : valence < 0
                    ? 'bg-destructive'
                    : 'bg-muted-foreground',
              )}
              style={{ left: `${((valence + 1) / 2) * 100}%` }}
              aria-hidden
            />
          </div>
        </div>
      ) : null}

      {pctIntensity !== null ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="typo-caption text-muted-foreground uppercase tracking-wider">
              Intensity
            </span>
            <span className="typo-caption text-foreground shrink-0 font-medium">
              {pctIntensity}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pctIntensity}%` }}
              aria-hidden
            />
          </div>
        </div>
      ) : null}

      {intentLabel ? (
        <div className="space-y-spacing-1">
          <span className="typo-caption text-muted-foreground uppercase tracking-wider">
            Intent
          </span>
          <span className="badge-glass badge-glass-cyan badge-glass-sm body-4 capitalize">
            {intentLabel.replace(/_/g, ' ')}
          </span>
        </div>
      ) : null}
    </div>
  )
}

const STATUS_TONE: Record<string, { label: string; tooltip: string; badge: string }> = {
  emerging: {
    label: 'Emerging',
    tooltip: 'New pattern - not yet stable.',
    badge: 'badge-glass-cyan',
  },
  active: {
    label: 'Active',
    tooltip: 'Consolidated. Currently shapes thinking.',
    badge: 'badge-glass-green',
  },
  shifting: {
    label: 'Shifting',
    tooltip: 'Contradicting evidence is appearing.',
    badge: 'badge-glass-orange',
  },
  challenged: {
    label: 'Challenged',
    tooltip: 'Atlas marked this belief as challenged.',
    badge: 'badge-glass-orange',
  },
  transforming: {
    label: 'Transforming',
    tooltip: 'Belief is evolving into something new.',
    badge: 'badge-glass-purple',
  },
  resolved: {
    label: 'Resolved',
    tooltip: 'Closed out - no longer active.',
    badge: 'badge-glass-muted',
  },
  transformed: {
    label: 'Transformed',
    tooltip: 'Replaced by a newer perspective.',
    badge: 'badge-glass-muted',
  },
}

const STATUS_FALLBACK = {
  label: 'Unknown',
  tooltip: 'Status not recognized.',
  badge: 'badge-glass-muted',
}

function strengthTone(value: number): { fill: string; tooltip: string } {
  if (value >= 0.8) {
    return {
      fill: 'bg-primary',
      tooltip: 'High confidence - strongly supported by aligned beliefs.',
    }
  }
  if (value >= 0.5) {
    return {
      fill: 'bg-primary',
      tooltip: 'Solid confidence - meaningful supporting evidence.',
    }
  }
  if (value >= 0.3) {
    return {
      fill: 'bg-muted-foreground',
      tooltip: 'Forming - limited evidence so far.',
    }
  }
  return {
    fill: 'bg-destructive',
    tooltip: 'Weak - early signal only.',
  }
}

interface BeliefMeterProps {
  status: string
  strength: number
  memoryCount: number
}

export function BeliefMeter({ status, strength, memoryCount }: BeliefMeterProps) {
  const tone = STATUS_TONE[status] ?? STATUS_FALLBACK
  const clamped = Math.max(0, Math.min(1, strength))
  const strength_ = strengthTone(clamped)
  return (
    <div className="surface-card flex h-9 shrink-0 items-stretch divide-x divide-border overflow-hidden rounded-xl border border-border">
      <Tooltip label={tone.tooltip} side="bottom" triggerClassName="block h-full">
        <div className="px-spacing-3 flex h-full items-center">
          <span className={cn('badge-glass badge-glass-sm gap-spacing-1', tone.badge)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {tone.label}
          </span>
        </div>
      </Tooltip>
      <Tooltip
        label={`${strength_.tooltip} (${formatPercent(clamped)})`}
        side="bottom"
        triggerClassName="block h-full"
      >
        <div className="px-spacing-3 gap-spacing-2 flex h-full w-32 items-center">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full', strength_.fill)}
              style={{ width: `${Math.round(clamped * 100)}%` }}
            />
          </div>
          <span className="typo-caption text-foreground shrink-0 font-medium">
            {formatPercent(clamped)}
          </span>
        </div>
      </Tooltip>
      <Tooltip
        label={`${memoryCount} supporting memory${memoryCount === 1 ? '' : 'ies'} reinforce this belief.`}
        side="bottom"
        triggerClassName="block h-full"
      >
        <div className="px-spacing-3 flex h-full items-center">
          <span className="body-3 text-foreground font-medium">{memoryCount}</span>
        </div>
      </Tooltip>
    </div>
  )
}

interface PerspectiveMeterProps {
  status: string
  strength: number
  beliefCount: number
}

export function PerspectiveMeter({ status, strength, beliefCount }: PerspectiveMeterProps) {
  const tone = STATUS_TONE[status] ?? STATUS_FALLBACK
  const clamped = Math.max(0, Math.min(1, strength))
  const strength_ = strengthTone(clamped)
  return (
    <div className="surface-card flex h-9 shrink-0 items-stretch divide-x divide-border overflow-hidden rounded-xl border border-border">
      <Tooltip label={tone.tooltip} side="bottom" triggerClassName="block h-full">
        <div className="px-spacing-3 flex h-full items-center">
          <span className={cn('badge-glass badge-glass-sm gap-spacing-1', tone.badge)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {tone.label}
          </span>
        </div>
      </Tooltip>
      <Tooltip
        label={`${strength_.tooltip} (${formatPercent(clamped)})`}
        side="bottom"
        triggerClassName="block h-full"
      >
        <div className="px-spacing-3 gap-spacing-2 flex h-full w-32 items-center">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn('h-full rounded-full', strength_.fill)}
              style={{ width: `${Math.round(clamped * 100)}%` }}
            />
          </div>
          <span className="typo-caption text-foreground shrink-0 font-medium">
            {formatPercent(clamped)}
          </span>
        </div>
      </Tooltip>
      <Tooltip
        label={`${beliefCount} belief${beliefCount === 1 ? '' : 's'} clustered into this perspective.`}
        side="bottom"
        triggerClassName="block h-full"
      >
        <div className="px-spacing-3 flex h-full items-center">
          <span className="body-3 text-foreground font-medium">{beliefCount}</span>
        </div>
      </Tooltip>
    </div>
  )
}
