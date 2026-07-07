'use client'

import {
  AutomationRunsLog,
  type AutomationRunDisplayMeta,
} from '@/components/flows/AutomationRunsLog'

export function FlowsHistoryView({
  campaignId,
  spaceId,
  open,
  automationNames,
  automationMeta,
  spaceMeta,
}: {
  campaignId?: string | null
  spaceId?: string | null
  open: boolean
  automationNames: Record<string, string>
  automationMeta?: Record<string, AutomationRunDisplayMeta>
  spaceMeta?: Record<string, AutomationRunDisplayMeta>
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AutomationRunsLog
        campaignId={campaignId}
        spaceId={spaceId}
        open={open}
        automationNames={automationNames}
        automationMeta={automationMeta}
        spaceMeta={spaceMeta}
      />
    </div>
  )
}
