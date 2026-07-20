'use client'

import type { ReactNode } from 'react'
import { Brain, Clock, Compass, Layers, Lightbulb, Link2 } from 'lucide-react'
import type { BrainHealthData } from '../types'

// ============================================================================
// Helpers
// ============================================================================

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ============================================================================
// Props
// ============================================================================

interface BrainStatsProps {
  health: BrainHealthData
  beliefCount?: number
  perspectiveCount?: number
  queueCount?: number
  /**
   * Vocabulary for the bar. Knowledge scopes (space/campaign knowledge) count
   * indexed Objects, not Memories, and have no embedding queue.
   */
  variant?: 'memories' | 'knowledge' | 'company'
}

// ============================================================================
// Component
// ============================================================================

export default function BrainStats({
  health,
  beliefCount,
  perspectiveCount,
  queueCount,
  variant = 'memories',
}: BrainStatsProps) {
  const isKnowledge = variant === 'knowledge'
  const isCompany = variant === 'company'
  const stats: Array<{ icon: ReactNode; label: string; value: number | string }> = [
    {
      icon: <Brain className="h-3.5 w-3.5" />,
      label: isKnowledge || isCompany ? 'Objects' : 'Memories',
      value: health.total_memories,
    },
    {
      icon: <Link2 className="h-3.5 w-3.5" />,
      label: isCompany ? 'Relationships' : 'Connections',
      value: health.total_connections,
    },
  ]
  if (isCompany) {
    stats.push({
      icon: <Layers className="h-3.5 w-3.5" />,
      label: 'Signals',
      value: health.experience_sources ?? 0,
    })
  }
  if (!isCompany && beliefCount !== undefined) {
    stats.push({
      icon: <Lightbulb className="h-3.5 w-3.5" />,
      label: 'Beliefs',
      value: beliefCount,
    })
  }
  if (!isCompany && perspectiveCount !== undefined) {
    stats.push({
      icon: <Compass className="h-3.5 w-3.5" />,
      label: 'Perspectives',
      value: perspectiveCount,
    })
  }
  if (!isKnowledge && !isCompany) {
    stats.push({
      icon: <Layers className="h-3.5 w-3.5" />,
      label: 'Queue',
      value: queueCount ?? health.embedding_queue,
    })
  }
  stats.push({
    icon: <Clock className="h-3.5 w-3.5" />,
    label: isCompany ? 'Last dream' : 'Last capture',
    value: relativeTime(health.last_capture),
  })

  return (
    <div>
      <div className="gap-spacing-4 surface-card border-border px-spacing-4 flex items-center rounded-lg border py-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{s.icon}</span>
            <span className="typo-caption text-muted-foreground">{s.label}</span>
            <span className="typo-caption text-foreground font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
