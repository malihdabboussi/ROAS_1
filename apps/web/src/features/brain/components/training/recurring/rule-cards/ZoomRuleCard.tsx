'use client'

import { Video } from 'lucide-react'
import type { RecurringTrainingRule } from '../../../../services/recurring-rules.service'

export function ZoomRuleCard({
  rule: _rule,
}: {
  rule: Extract<RecurringTrainingRule, { kind: 'zoom_auto' }>
}) {
  return (
    <div className="border-border p-spacing-3 border-t">
      <div className="surface-bg rounded-spacing-2 p-spacing-3 gap-spacing-2 flex items-start">
        <Video className="icon-sm text-muted-foreground mt-spacing-0-5 shrink-0" />
        <p className="body-3 text-muted-foreground">
          Zoom is registered in the integrations catalog. Recurring recording training will appear
          here once the backend Zoom ingestion endpoints are live.
        </p>
      </div>
    </div>
  )
}
