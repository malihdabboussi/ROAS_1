import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackAutomationHealthRepository } from '../repositories/slack-automation-health.repository'

@Injectable()
export class SlackAutomationHealthService {
  constructor(private readonly repo: SlackAutomationHealthRepository) {}

  async getSummary(supabase: SupabaseClient, orgId: string, now = new Date()) {
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const rows = await this.repo.listRecentRuns(supabase, orgId, since)
    const slackRuns = rows.filter(
      (row) =>
        Array.isArray(row.actions_executed) &&
        row.actions_executed.some(
          (action) => action && typeof action === 'object' && action.type === 'observe_slack_team',
        ),
    )
    const skipped: Record<string, number> = {}
    const held: Record<string, number> = {}
    let delivered = 0
    for (const row of slackRuns) {
      if (typeof row.skipped_reason === 'string') {
        skipped[row.skipped_reason] = (skipped[row.skipped_reason] ?? 0) + 1
      }
      if (Array.isArray(row.actions_executed)) {
        for (const action of row.actions_executed) {
          if (
            !action ||
            typeof action !== 'object' ||
            !action.result ||
            typeof action.result !== 'object'
          )
            continue
          if (typeof action.result.sent === 'number') delivered += action.result.sent
        }
      }
      if (!Array.isArray(row.delivery_outcomes)) continue
      for (const outcome of row.delivery_outcomes) {
        if (!outcome || typeof outcome !== 'object') continue
        if (outcome.can_send !== true) {
          const reason = typeof outcome.reason === 'string' ? outcome.reason : 'unknown'
          held[reason] = (held[reason] ?? 0) + 1
        }
      }
    }
    return {
      window_hours: 24,
      ran: slackRuns.length,
      skipped,
      delivered,
      held,
      last_run_at: typeof slackRuns[0]?.created_at === 'string' ? slackRuns[0].created_at : null,
    }
  }
}
