import { describe, expect, it, vi } from 'vitest'
import { SlackAutomationHealthService } from './slack-automation-health.service'

describe('SlackAutomationHealthService', () => {
  it('summarizes persisted skip and delivery decisions', async () => {
    const repo = {
      listRecentRuns: vi.fn().mockResolvedValue([
        {
          created_at: '2026-08-11T02:00:00.000Z',
          skipped_reason: 'quiet_hours',
          actions_executed: [{ type: 'observe_slack_team', result: { sent: 1 } }],
          delivery_outcomes: [
            { can_send: true, reason: 'allowed' },
            { can_send: false, reason: 'recipient_not_active' },
          ],
        },
        { actions_executed: [{ type: 'create_task' }], delivery_outcomes: [] },
      ]),
    }
    const service = new SlackAutomationHealthService(repo as never)

    await expect(service.getSummary({} as never, 'org-1')).resolves.toEqual({
      window_hours: 24,
      ran: 1,
      skipped: { quiet_hours: 1 },
      delivered: 1,
      held: { recipient_not_active: 1 },
      last_run_at: '2026-08-11T02:00:00.000Z',
    })
  })
})
