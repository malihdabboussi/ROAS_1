'use client'

import { Radio } from 'lucide-react'
import type { RecurringTrainingRule } from '../../../../services/recurring-rules.service'

/**
 * Read AI has no schedule and nothing to pull: it pushes each finished
 * meeting to ROAS through the shared note-taker door, so this card only
 * explains that and reflects the connection state.
 */
export function ReadAiRuleCard({
  rule,
}: {
  rule: Extract<RecurringTrainingRule, { kind: 'read_ai_auto' }>
}) {
  return (
    <div className="border-border p-spacing-3 border-t">
      <div className="surface-bg rounded-spacing-2 p-spacing-3 gap-spacing-2 flex items-start">
        <Radio className="icon-sm text-muted-foreground mt-spacing-0-5 shrink-0" />
        <p className="body-3 text-muted-foreground">
          {rule.connected
            ? 'Read AI sends each finished meeting to ROAS as soon as its report is ready. The transcript goes through the same extraction as Fathom and Fireflies meetings, so there is nothing to sync or schedule.'
            : 'Read AI is not connected. Connect it in Settings › Integrations: paste the webhook address into Read AI, then paste the signing key back here. Meetings then arrive on their own.'}
        </p>
      </div>
    </div>
  )
}
