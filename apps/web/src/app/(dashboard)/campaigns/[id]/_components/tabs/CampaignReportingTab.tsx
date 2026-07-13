'use client'

import { useCallback, useMemo, useState } from 'react'
import { CampaignFinanceTabContainer } from '../../finance/CampaignFinanceTabContainer'
import { createCampaignReportingView } from '../../_lib/campaign-reporting-view'
import { CampaignOverviewView } from '@/features/spaces/components/reporting/CampaignOverviewView'
import { EmailAnalyticsView } from '@/features/spaces/components/reporting/EmailAnalyticsView'
import { FunnelAnalyticsView } from '@/features/spaces/components/reporting/FunnelAnalyticsView'
import { ReportingTimeRangeSelector } from '@/features/spaces/components/reporting/shared/ReportingTimeRangeSelector'
import type { ViewDef } from '@/features/spaces/types/space-schema'

type ReportingSection = 'overview' | 'funnels' | 'email' | 'revenue'

const SECTIONS: { id: ReportingSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'funnels', label: 'Funnels' },
  { id: 'email', label: 'Email' },
  { id: 'revenue', label: 'Revenue' },
]

interface CampaignReportingTabProps {
  campaignId: string
  campaignName: string
}

export function CampaignReportingTab({ campaignId, campaignName }: CampaignReportingTabProps) {
  const [section, setSection] = useState<ReportingSection>('overview')
  const [overviewView, setOverviewView] = useState<ViewDef>(() =>
    createCampaignReportingView('campaign_overview', 'Overview'),
  )
  const [funnelView, setFunnelView] = useState<ViewDef>(() =>
    createCampaignReportingView('funnel_analytics', 'Funnels'),
  )
  const [emailView, setEmailView] = useState<ViewDef>(() =>
    createCampaignReportingView('email_analytics', 'Email'),
  )

  const activeConfigView = useMemo(() => {
    if (section === 'funnels') return funnelView
    if (section === 'email') return emailView
    return overviewView
  }, [section, overviewView, funnelView, emailView])

  const patchActiveView = useCallback(
    (patch: Partial<ViewDef>) => {
      const merge = (prev: ViewDef): ViewDef => ({
        ...prev,
        ...patch,
        reporting_config: {
          ...(prev.reporting_config ?? {}),
          ...(patch.reporting_config ?? {}),
        },
      })
      if (section === 'funnels') setFunnelView((prev) => merge(prev))
      else if (section === 'email') setEmailView((prev) => merge(prev))
      else setOverviewView((prev) => merge(prev))
    },
    [section],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-spacing-4 flex flex-wrap items-center justify-between gap-3">
        <div className="gap-spacing-1 flex flex-wrap">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`rounded-spacing-3 body-3 px-3 py-1.5 transition-colors ${
                section === item.id
                  ? 'chip-glass-blue font-medium'
                  : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {section !== 'revenue' ? (
          <ReportingTimeRangeSelector
            variant="chip"
            config={activeConfigView.reporting_config ?? {}}
            onConfigPatch={(patch) =>
              patchActiveView({
                reporting_config: { ...activeConfigView.reporting_config, ...patch },
              })
            }
          />
        ) : null}
      </div>

      {section === 'overview' ? (
        <CampaignOverviewView
          campaignId={campaignId}
          activeView={overviewView}
          onViewPatch={patchActiveView}
        />
      ) : null}

      {section === 'funnels' ? (
        <FunnelAnalyticsView
          campaignId={campaignId}
          activeView={funnelView}
          onViewPatch={patchActiveView}
        />
      ) : null}

      {section === 'email' ? (
        <EmailAnalyticsView
          campaignId={campaignId}
          activeView={emailView}
          onViewPatch={patchActiveView}
        />
      ) : null}

      {section === 'revenue' ? (
        <div className="min-h-0 flex-1">
          <CampaignFinanceTabContainer
            campaignId={campaignId}
            campaignName={campaignName}
            embedded
            hideInlineCreateButtons={false}
          />
        </div>
      ) : null}
    </div>
  )
}
