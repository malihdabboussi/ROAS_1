'use client'

import { AdsPerformanceView } from '@/features/studio/components/preview/AdsPerformanceView'
import type { ViewDef } from '../../types/space-schema'
import type { ReportingToolbarApi } from './shared/reporting-toolbar.types'

interface AdsPerformanceSpaceViewProps {
  campaignId: string
  campaignName: string | null
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
}

export function AdsPerformanceSpaceView({
  campaignId,
  campaignName,
  activeView,
  onViewPatch,
  onRegisterReportingToolbar,
}: AdsPerformanceSpaceViewProps) {
  const config = activeView.reporting_config ?? {}
  const hasCustomDates = Boolean(config.custom_start || config.custom_end)
  const tr = hasCustomDates ? 'all' : (config.time_range ?? '30d')

  return (
    <div className="scrollbar-thin flex h-0 min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-3">
      <AdsPerformanceView
        campaignId={campaignId}
        campaignName={campaignName}
        embedded
        externalTimeRange={tr}
        onExternalTimeRangeChange={(v) =>
          onViewPatch({ reporting_config: { ...config, time_range: v } })
        }
        adCampaignRowIdsFilter={config.ad_campaign_ids}
        onRegisterReportingToolbar={onRegisterReportingToolbar}
      />
    </div>
  )
}
