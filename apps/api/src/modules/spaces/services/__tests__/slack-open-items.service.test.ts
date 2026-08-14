import { describe, expect, it, vi } from 'vitest'
import { SlackOpenItemsService } from '../slack-open-items.service'

describe('SlackOpenItemsService', () => {
  it('writes every detected open ask as a client-scoped case before delivery selection', async () => {
    const items = {
      upsert: vi.fn().mockResolvedValue(undefined),
      resolveSlackScope: vi.fn().mockResolvedValue({
        scope_level: 'client',
        program_id: 'program-clients',
        campaign_id: 'campaign-client',
        space_id: null,
        client_label: 'Wholesale Universe',
        external_client_id: 'page-grader-client',
      }),
      listDueForResolution: vi.fn().mockResolvedValue([]),
      enforceRetention: vi.fn().mockResolvedValue(undefined),
    }
    const service = new SlackOpenItemsService(items as never, {} as never)
    const base = {
      orgId: 'org-1',
      subjectPersonId: 'person-1',
      clientLabel: 'Christian Osgood',
      slackTeamId: 'T1',
      channelId: 'C1',
      sourceMessageTs: '1786390000.001',
      now: new Date('2026-08-10T20:00:00Z'),
      sourceMetadata: {
        page_grader_client_id: 'page-grader-client',
        roas_campaign_id: 'campaign-client',
      },
    }

    await service.record({} as never, {
      ...base,
      signalKind: 'unanswered_question',
      summary: 'Can someone confirm the launch date?',
    })
    await service.record({} as never, {
      ...base,
      sourceMessageTs: '1786390001.001',
      signalKind: 'client_risk',
      summary: 'Client is blocked on tracking.',
    })

    expect(items.upsert).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        case_type: 'unanswered_ask',
        source_type: 'slack_message',
        source_key: 'C1:1786390000.001',
        scope_level: 'client',
        program_id: 'program-clients',
        campaign_id: 'campaign-client',
        due_at: '2026-08-11T19:26:40.001Z',
        first_seen_at: '2026-08-10T19:26:40.001Z',
      }),
    )
    expect(items.upsert).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ case_type: 'client_risk' }),
    )
  })

  it('rechecks due rows and persists resolved outcomes every fifteen minutes', async () => {
    const item = {
      id: 'item-1',
      case_type: 'unanswered_ask',
      status: 'open',
      last_activity_at: '2026-08-09T20:00:00Z',
      org_id: 'org-1',
      channel_id: 'C1',
      source_message_ts: '1.1',
      metadata: {},
    }
    const items = {
      listDueForResolution: vi.fn().mockResolvedValue([item]),
      saveResolution: vi.fn().mockResolvedValue(undefined),
      enforceRetention: vi.fn().mockResolvedValue(undefined),
    }
    const resolution = {
      inspectSource: vi.fn().mockResolvedValue({
        resolved: true,
        source_available: true,
        reason: 'A later human reply was found.',
        checked_at: '2026-08-10T20:00:00.000Z',
        reply_count: 1,
        reaction_count: 0,
      }),
    }
    const service = new SlackOpenItemsService(items as never, resolution as never)

    await service.reconcile({} as never, 'org-1', new Date('2026-08-10T20:00:00Z'))

    expect(items.listDueForResolution).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      '2026-08-10T19:45:00.000Z',
    )
    expect(items.saveResolution).toHaveBeenCalledWith(
      expect.anything(),
      item,
      expect.objectContaining({ resolved: true }),
    )
    expect(items.enforceRetention).toHaveBeenCalled()
  })

  it('does not turn a composite status recap with completed work into one open commitment', async () => {
    const items = {
      upsert: vi.fn(),
      resolveSlackScope: vi.fn(),
    }
    const service = new SlackOpenItemsService(items as never, {} as never)

    await service.record({} as never, {
      orgId: 'org-1',
      subjectPersonId: null,
      clientLabel: 'Yasir Khan',
      slackTeamId: 'T1',
      channelId: 'C1',
      sourceMessageTs: '1786482496.057049',
      signalKind: 'important_update',
      summary:
        'DONE - Ads relaunch - Aaron, live today (Aug 11). Video scripts are due by Thursday.',
      now: new Date('2026-08-13T20:00:00Z'),
    })

    expect(items.resolveSlackScope).not.toHaveBeenCalled()
    expect(items.upsert).not.toHaveBeenCalled()
  })

  it('resurfaces at 8h, 24h, and 72h with Viktor-style ages and resolves once', async () => {
    const base = {
      id: 'item-1',
      org_id: 'org-1',
      case_type: 'unanswered_ask',
      source_type: 'slack_message',
      source_key: 'C1:1.1',
      scope_level: 'client',
      program_id: 'program-1',
      campaign_id: 'campaign-1',
      space_id: null,
      external_client_id: 'client-1',
      severity: 'normal',
      due_at: '2026-08-11T06:00:00.000Z',
      breach_notified_at: null,
      snoozed_until: null,
      subject_person_id: null,
      client_label: 'Christian Osgood',
      channel_id: 'C1',
      source_message_ts: '1.1',
      summary: 'Christian is waiting on the launch answer',
      status: 'open',
      first_seen_at: '2026-08-10T06:00:00.000Z',
      last_activity_at: '2026-08-10T06:00:00.000Z',
      times_surfaced: 0,
      last_surfaced_at: null,
      resolution_note: null,
      metadata: {},
    }
    const items = { listContinuity: vi.fn().mockResolvedValue([base]) }
    const service = new SlackOpenItemsService(items as never, {} as never)

    const eightHour = await service.continuityPack({} as never, {
      orgId: 'org-1',
      now: new Date('2026-08-10T20:00:00.000Z'),
    })
    expect(eightHour.open[0]?.text).toContain('open ~14h')

    items.listContinuity.mockResolvedValueOnce([
      {
        ...base,
        status: 'resolved',
        metadata: {},
      },
    ])
    const resolved = await service.continuityPack({} as never, {
      orgId: 'org-1',
      now: new Date('2026-08-10T20:00:00.000Z'),
    })
    expect(resolved.resolved).toHaveLength(1)

    items.listContinuity.mockResolvedValueOnce([
      {
        ...base,
        status: 'resolved',
        metadata: { resolution_surfaced_at: '2026-08-10T19:00:00.000Z' },
      },
    ])
    const alreadySurfaced = await service.continuityPack({} as never, {
      orgId: 'org-1',
      now: new Date('2026-08-10T20:00:00.000Z'),
    })
    expect(alreadySurfaced.resolved).toHaveLength(0)
  })

  it('surfaces each unresolved 24-hour breach exactly once', async () => {
    const item = {
      id: 'case-1',
      client_label: 'Wholesale Universe',
      summary: 'Bonnie is waiting for webinar replay booking attribution.',
      first_seen_at: '2026-08-12T17:00:00.000Z',
    }
    const items = {
      listUnnotifiedBreaches: vi.fn().mockResolvedValue([item]),
      markBreachNotified: vi.fn().mockResolvedValue(undefined),
    }
    const service = new SlackOpenItemsService(items as never, {} as never)
    const now = new Date('2026-08-13T18:00:00.000Z')

    const breached = await service.breachPack({} as never, { orgId: 'org-1', now })
    expect(breached[0]?.text).toContain('24h response breach')
    expect(breached[0]?.text).toContain('Wholesale Universe')

    await service.markBreached({} as never, breached as never, now)
    expect(items.markBreachNotified).toHaveBeenCalledWith(
      expect.anything(),
      'case-1',
      '2026-08-13T18:00:00.000Z',
    )
  })
})
