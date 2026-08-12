'use client'

import { forwardRef } from 'react'
import {
  CampaignFinanceTabContainer,
  type CampaignFinanceTabHandle,
} from '@/app/(dashboard)/campaigns/[id]/finance/CampaignFinanceTabContainer'
import type { ViewDef } from '../../types/space-schema'
import type { ReportingToolbarApi } from './shared/reporting-toolbar.types'

export type { CampaignFinanceTabHandle }

interface FinanceOverviewViewProps {
  campaignId: string
  campaignName: string | null
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
  financeSearchQuery?: string
}

export const FinanceOverviewView = forwardRef<CampaignFinanceTabHandle, FinanceOverviewViewProps>(
  function FinanceOverviewView(
    {
      campaignId,
      campaignName,
      activeView,
      onViewPatch,
      onRegisterReportingToolbar,
      financeSearchQuery = '',
    },
    ref,
  ) {
    const config = activeView.reporting_config ?? {}
    const reportingTimeRange = config.time_range ?? '30d'

    return (
      <div className="scrollbar-thin flex h-0 min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-3 [&>div]:pr-0">
        <CampaignFinanceTabContainer
          ref={ref}
          campaignId={campaignId}
          campaignName={campaignName}
          embedded
          hideInlineCreateButtons
          reportingTimeRange={reportingTimeRange}
          onReportingTimeRangeChange={(tr) =>
            onViewPatch({ reporting_config: { ...config, time_range: tr } })
          }
          toolbarHidesRevenueHeaderControls
          financeSearchQuery={financeSearchQuery}
          onRegisterReportingToolbar={onRegisterReportingToolbar}
        />
      </div>
    )
  },
)
