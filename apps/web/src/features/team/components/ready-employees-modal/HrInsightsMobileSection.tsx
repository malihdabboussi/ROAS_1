import type { Dispatch, SetStateAction } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { ReadyEmployeeProfile } from '@/lib/agents/ready-employee-types'
import { RoleEmblem } from '../RoleEmblem'
import { HrInsightsBlurredPlaceholder } from './HrInsightsBlurredPlaceholder'
import { HrInsightsTeamBody } from './HrInsightsTeamBody'
import type { HrInsightsData } from './ready-employees-modal.types'

export interface HrInsightsMobileSectionProps {
  hrAgent: MissionAgent
  hrInsights: HrInsightsData | null
  hrInsightsLoading: boolean
  hrCollapsed: boolean
  setHrCollapsed: Dispatch<SetStateAction<boolean>>
  highlightedHire: { profile: ReadyEmployeeProfile; reason: string } | null
  getDisplayName: (profile: ReadyEmployeeProfile) => string
  onGetHrInsights: () => void | Promise<void>
}

export function HrInsightsMobileSection({
  hrAgent,
  hrInsights,
  hrInsightsLoading,
  hrCollapsed,
  setHrCollapsed,
  highlightedHire,
  getDisplayName,
  onGetHrInsights,
}: HrInsightsMobileSectionProps) {
  return (
    <div className="px-3 pt-2">
      <div className="card-glass-panel rounded-spacing-2 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (!hrInsights && !hrInsightsLoading) void onGetHrInsights()
            setHrCollapsed((p) => !p)
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5"
        >
          {hrAgent.image_url ? (
            <img
              src={hrAgent.image_url}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <span className="text-primary text-sm font-bold">{hrAgent.name.charAt(0)}</span>
            </div>
          )}
          <span className="body-3 text-foreground flex-1 text-left font-semibold">HR Insights</span>
          {!hrInsights && !hrInsightsLoading && (
            <span className="body-4 text-primary">Get Insights</span>
          )}
          {hrCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {!hrCollapsed && (
          <div className="border-t border-border px-3 py-3">
            {hrInsightsLoading && !hrInsights ? (
              <div className="flex items-center justify-center py-6">
                <VibeyLoadingOrb state="processing" size="md" />
              </div>
            ) : hrInsights ? (
              <div className="space-y-3">
                <HrInsightsTeamBody hrInsights={hrInsights} />
                {highlightedHire && (
                  <>
                    <p className="body-4 text-foreground mt-2 font-semibold uppercase tracking-wide">
                      Next Hire
                    </p>
                    <div className="chip-glass-orange rounded-spacing-2 flex items-center gap-2 px-3 py-3">
                      <RoleEmblem roleKey={highlightedHire.profile.role_key} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="body-3 text-foreground truncate font-medium">
                          {getDisplayName(highlightedHire.profile)}
                        </p>
                        <p className="body-4 text-muted-foreground">{highlightedHire.reason}</p>
                      </div>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void onGetHrInsights()}
                  disabled={hrInsightsLoading}
                  className="button-glass-primary body-3 mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2 font-medium"
                >
                  {hrInsightsLoading ? 'Refreshing...' : 'Refresh Insights'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <HrInsightsBlurredPlaceholder variant="mobile" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
