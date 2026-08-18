import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageGraderQcSlackBridgeService } from '../page-grader-qc-slack-bridge.service'

describe('PageGraderQcSlackBridgeService', () => {
  const svc = { client: {} }
  const sync = { authorizeWebhookSecret: vi.fn() }
  const pageGraderApi = { applyQcAction: vi.fn(), getClientScopeMap: vi.fn() }
  const slackTools = { sendBlockMessageToTarget: vi.fn(), sendMessage: vi.fn() }
  const slackApi = { verifyRequestSignature: vi.fn() }
  const cases = {
    recordExternal: vi.fn(),
    applyExternalAction: vi.fn(),
    findQcSlackAnchor: vi.fn(),
    attachSlackDelivery: vi.fn(),
  }
  let service: PageGraderQcSlackBridgeService

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SLACK_SIGNING_SECRET = 'signing-secret'
    sync.authorizeWebhookSecret.mockResolvedValue([{ userId: 'user-1', orgId: 'org-1' }])
    pageGraderApi.getClientScopeMap.mockResolvedValue({
      '1960ed48-b7cf-4da3-a745-9f0dc96b2ddb': {
        campaign_id: '2960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
      },
    })
    cases.findQcSlackAnchor.mockResolvedValue(null)
    cases.attachSlackDelivery.mockResolvedValue(undefined)
    slackTools.sendBlockMessageToTarget.mockResolvedValue({
      success: true,
      channel: 'D123',
      ts: '123.456',
    })
    slackTools.sendMessage.mockResolvedValue({
      success: true,
      channel: 'D123',
      ts: '789.000',
    })
    service = new PageGraderQcSlackBridgeService(
      svc as never,
      sync as never,
      pageGraderApi as never,
      slackTools as never,
      slackApi as never,
      cases as never,
    )
  })

  it('records QC, proactive launch, and campaign QC findings in the unified case ledger', async () => {
    const findingIds = [
      '6960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
      '7960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
      '8960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
    ]
    await service.deliverNotification(
      JSON.stringify({
        notification_id: 'qc:batch-1',
        admin_slack_user_id: 'U123',
        fallback_text: 'Three client findings need review.',
        finding_ids: findingIds,
        findings: [
          {
            id: findingIds[0],
            type: 'quality_control',
            summary: 'Landing page tracking is incomplete.',
            client_id: '1960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
            client_name: 'Wholesale Universe',
          },
          {
            id: findingIds[1],
            type: 'proactive_launch',
            summary: 'Launch is inside 48 hours without final creative approval.',
            client_id: '1960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
          },
          {
            id: findingIds[2],
            type: 'campaign_quality_control',
            summary: 'Webinar replay SMS lacks booking attribution.',
            client_id: '1960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
            page_grader_campaign_id: '3960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
            severity: 'high',
          },
        ],
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'QC findings' } }],
      }),
      'pgwh-secret',
    )

    expect(cases.recordExternal).toHaveBeenCalledTimes(3)
    expect(cases.recordExternal.mock.calls.map((call) => call[1].caseType)).toEqual([
      'quality_control',
      'proactive_launch',
      'campaign_quality_control',
    ])
    expect(cases.recordExternal).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: 'org-1',
        sourceKey: findingIds[2],
        externalClientId: '1960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
        externalCampaignId: '3960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
        campaignId: '2960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
        severity: 'high',
      }),
    )
    expect(cases.recordExternal.mock.invocationCallOrder[2]).toBeLessThan(
      slackTools.sendBlockMessageToTarget.mock.invocationCallOrder[0],
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete process.env.SLACK_SIGNING_SECRET
  })

  it('uses the ROAS Slack connection and binds callback context to mutable buttons', async () => {
    const findingId = '6960ed48-b7cf-4da3-a745-9f0dc96b2ddb'
    const result = await service.deliverNotification(
      JSON.stringify({
        notification_id: `qc:${findingId}`,
        admin_slack_user_id: 'U123',
        fallback_text: 'QC found one issue',
        finding_ids: [findingId],
        blocks: [
          {
            type: 'actions',
            block_id: `qc_actions_${findingId}`,
            elements: [
              {
                type: 'button',
                action_id: 'qc_snooze_tomorrow',
                text: { type: 'plain_text', text: 'Snooze until tomorrow' },
                value: findingId,
              },
            ],
          },
        ],
      }),
      'pgwh-secret',
    )

    expect(result).toMatchObject({ success: true, sender: 'roas_platform', channel: 'D123' })
    const params = slackTools.sendBlockMessageToTarget.mock.calls[0][3]
    expect(params.slackUserId).toBe('U123')
    expect(params.channelId).toBeNull()
    const context = JSON.parse(params.blocks[0].elements[0].value)
    expect(context).toEqual({
      source: 'page_grader_qc',
      finding_id: findingId,
      page_grader_user_id: 'user-1',
      page_grader_org_id: 'org-1',
    })
  })

  it('verifies Slack and sends a snooze action back through the Page Grader connection', async () => {
    const findingId = '6960ed48-b7cf-4da3-a745-9f0dc96b2ddb'
    slackApi.verifyRequestSignature.mockReturnValue(true)
    pageGraderApi.applyQcAction.mockResolvedValue({
      success: true,
      confirmation: ':alarm_clock: Snoozed',
    })
    const responseFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', responseFetch)
    const payload = {
      user: { id: 'U123', name: 'Dylan' },
      response_url: 'https://hooks.slack.com/actions/test',
      actions: [
        {
          action_id: 'qc_snooze_tomorrow',
          value: JSON.stringify({
            source: 'page_grader_qc',
            finding_id: findingId,
            page_grader_user_id: 'user-1',
            page_grader_org_id: 'org-1',
          }),
        },
      ],
    }
    const rawBody = Buffer.from(`payload=${encodeURIComponent(JSON.stringify(payload))}`)
    const work = service.beginInteractionProcessing({
      rawBody,
      signature: 'v0=test',
      timestamp: String(Math.floor(Date.now() / 1000)),
    })
    await work

    expect(pageGraderApi.applyQcAction).toHaveBeenCalledWith('user-1', findingId, {
      action: 'snooze_tomorrow',
      slack_user_id: 'U123',
      slack_user_name: 'Dylan',
    })
    expect(cases.applyExternalAction).toHaveBeenCalledWith(expect.anything(), {
      orgId: 'org-1',
      sourceType: 'page_grader_qc',
      sourceKey: findingId,
      action: 'snooze_tomorrow',
    })
    expect(responseFetch).toHaveBeenCalledWith(
      payload.response_url,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('measures a client launch once, then follows up in that thread instead of a new check-in', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-17T12:00:00.000Z'))
    const clientId = '1960ed48-b7cf-4da3-a745-9f0dc96b2ddb'
    const firstIds = [
      'a960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
      'b960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
    ]
    const laterIds = [
      'c960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
      'd960ed48-b7cf-4da3-a745-9f0dc96b2ddb',
    ]
    const body = (findingIds: string[]) =>
      JSON.stringify({
        notification_id: `launch:${findingIds[0]}`,
        admin_slack_user_id: 'U123',
        fallback_text: 'Launch Agent Check-in',
        finding_ids: findingIds,
        findings: [
          {
            id: findingIds[0],
            type: 'proactive_launch',
            summary: 'Impact Elite Coaching: Copywriting is overdue',
            client_id: clientId,
            client_name: 'Impact Elite Coaching',
          },
          {
            id: findingIds[1],
            type: 'proactive_launch',
            summary: 'Impact Elite Coaching: Copywriting is overdue',
            client_id: clientId,
            client_name: 'Impact Elite Coaching',
          },
        ],
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Launch Agent Check-in' } }],
      })

    await service.deliverNotification(body(firstIds), 'pgwh-secret')
    expect(slackTools.sendBlockMessageToTarget).toHaveBeenCalledTimes(1)
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(cases.attachSlackDelivery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        channelId: 'D123',
        parentTs: '123.456',
        sourceKeys: firstIds,
      }),
    )

    cases.findQcSlackAnchor.mockResolvedValue({
      first_seen_at: '2026-08-17T12:00:00.000Z',
      snoozed_until: null,
      metadata: {
        slack_channel: 'D123',
        slack_parent_ts: '123.456',
        slack_finding_fingerprint:
          'proactive_launch:impact elite coaching: copywriting is overdue',
        slack_last_follow_up_at: '2026-08-17T12:00:00.000Z',
      },
    })

    vi.setSystemTime(new Date('2026-08-17T13:00:00.000Z'))
    await service.deliverNotification(body(laterIds), 'pgwh-secret')
    expect(slackTools.sendBlockMessageToTarget).toHaveBeenCalledTimes(1)
    expect(slackTools.sendMessage).not.toHaveBeenCalled()
    expect(cases.attachSlackDelivery).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        parentTs: '123.456',
        sourceKeys: laterIds,
        followedUpAt: '2026-08-17T12:00:00.000Z',
      }),
    )

    vi.setSystemTime(new Date('2026-08-17T21:00:00.000Z'))
    await service.deliverNotification(body(laterIds), 'pgwh-secret')
    expect(slackTools.sendBlockMessageToTarget).toHaveBeenCalledTimes(1)
    expect(slackTools.sendMessage).toHaveBeenCalledTimes(1)
    expect(slackTools.sendMessage.mock.calls[0][3]).toMatchObject({
      channel_id: 'D123',
      thread_ts: '123.456',
    })
    expect(slackTools.sendMessage.mock.calls[0][3].text).toContain('Impact Elite Coaching')
    expect(slackTools.sendMessage.mock.calls[0][3].text).toContain('finalized')
    vi.useRealTimers()
  })
})
