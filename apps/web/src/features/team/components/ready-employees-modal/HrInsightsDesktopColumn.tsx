import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Plus } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { ReadyEmployeeProfile } from '@/lib/agents/ready-employee-types'
import { RoleEmblem } from '../RoleEmblem'
import { HrInsightsBlurredPlaceholder } from './HrInsightsBlurredPlaceholder'
import { HrInsightsTeamBody } from './HrInsightsTeamBody'
import type { HrInsightsData } from './ready-employees-modal.types'

export interface HrInsightsDesktopColumnProps {
  hrAgent: MissionAgent
  hrInsights: HrInsightsData | null
  hrInsightsLoading: boolean
  highlightedHire: { profile: ReadyEmployeeProfile; reason: string } | null
  getDisplayName: (profile: ReadyEmployeeProfile) => string
  onGetHrInsights: () => void | Promise<void>
  onHireFromRecommendation: (profile: ReadyEmployeeProfile) => void | Promise<void>
  hireLoading: boolean
}

export function HrInsightsDesktopColumn({
  hrAgent,
  hrInsights,
  hrInsightsLoading,
  highlightedHire,
  getDisplayName,
  onGetHrInsights,
  onHireFromRecommendation,
  hireLoading,
}: HrInsightsDesktopColumnProps) {
  return (
    <div className="card-glass-panel rounded-spacing-2 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden border-0 px-4 py-4">
      <div className="flex shrink-0 items-center gap-3">
        {hrAgent.image_url ? (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
            <img src={hrAgent.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="bg-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
            <span className="text-primary text-xl font-bold">{hrAgent.name.charAt(0)}</span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="body-1 text-foreground font-semibold">HR Insights</h3>
          <p className="body-4 text-muted-foreground">Get team recommendations and top hire next</p>
        </div>
      </div>
      <div className="rounded-spacing-2 bg-muted/30 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {hrInsightsLoading && !hrInsights ? (
            <div className="flex h-full min-h-[220px] items-center justify-center">
              <VibeyLoadingOrb state="processing" size="md" />
            </div>
          ) : hrInsights ? (
            <HrInsightsTeamBody hrInsights={hrInsights} />
          ) : (
            <div className="flex flex-col gap-2">
              <HrInsightsBlurredPlaceholder variant="desktop" />
            </div>
          )}
        </div>
        {hrInsights && (
          <div className="shrink-0 px-3 pb-1">
            <p className="body-4 text-foreground mb-2 font-semibold uppercase tracking-wide">
              Next Hire
            </p>
            <AnimatePresence mode="wait">
              {highlightedHire ? (
                <motion.div
                  key={highlightedHire.profile.role_key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="chip-glass-orange rounded-spacing-2 flex flex-col gap-2 px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <RoleEmblem roleKey={highlightedHire.profile.role_key} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="body-3 text-foreground truncate font-medium leading-tight">
                        {getDisplayName(highlightedHire.profile)}
                      </p>
                      <p className="body-4 text-muted-foreground truncate">
                        {highlightedHire.profile.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onHireFromRecommendation(highlightedHire.profile)}
                      disabled={hireLoading}
                      className="btn-icon-glass rounded-spacing-3 shrink-0 disabled:opacity-50"
                      aria-label={`Add ${getDisplayName(highlightedHire.profile)}`}
                    >
                      <Plus className="icon-xs" />
                    </button>
                  </div>
                  {highlightedHire.reason && (
                    <p className="body-3 text-muted-foreground leading-snug">
                      {highlightedHire.reason}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.p
                  key="all-hired"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="body-3 text-muted-foreground"
                >
                  All recommended hires are on the team.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="flex shrink-0 flex-col gap-1 p-3 pt-0">
          <button
            type="button"
            onClick={() => void onGetHrInsights()}
            disabled={hrInsightsLoading}
            className="button-glass-primary body-2 rounded-spacing-3 flex w-full items-center justify-center gap-2 px-3 py-2"
          >
            {hrInsightsLoading ? (
              <VibeyLoadingOrb state="processing" size="sm" />
            ) : (
              <>
                {hrInsights ? 'Refresh insights' : 'Get insights'}
                <ExternalLink className="icon-xs" />
              </>
            )}
          </button>
          <p className="body-4 text-muted-foreground text-center">
            {hrInsights
              ? 'Insights based on your current team'
              : 'Get insights to receive HR recommendations and top hire next'}
          </p>
        </div>
      </div>
    </div>
  )
}
