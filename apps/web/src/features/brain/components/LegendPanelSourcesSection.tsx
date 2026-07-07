import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { SkStats } from '../services/sk.service'
import { LegendCount, LegendSectionLabel } from './LegendPanelRows'

interface LegendPanelSourcesSectionProps {
  stats: SkStats | null
  statsLoading: boolean
}

export function LegendPanelSourcesSection({
  stats,
  statsLoading,
}: LegendPanelSourcesSectionProps) {
  return (
    <div className="px-spacing-3 py-spacing-3">
      {statsLoading ? (
        <div className="py-spacing-4 flex items-center justify-center">
          <VibeyChatOrb state="processing" style="elastic" />
        </div>
      ) : !stats || Object.keys(stats.domainBreakdown).length === 0 ? (
        <p className="body-4 text-muted-foreground py-spacing-2 text-center">
          No knowledge domains yet
        </p>
      ) : (
        <div className="space-y-spacing-3">
          <div className="flex items-center justify-between">
            <span className="body-3 text-muted-foreground">Total entries</span>
            <span className="body-3 text-foreground font-medium">{stats.totalEntries}</span>
          </div>
          <div className="space-y-1">
            <LegendSectionLabel>Domains</LegendSectionLabel>
            {Object.entries(stats.domainBreakdown).map(([dom, count]) => (
              <div key={dom} className="flex items-center justify-between">
                <span className="body-3 text-muted-foreground capitalize">{dom}</span>
                <LegendCount>{count}</LegendCount>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
