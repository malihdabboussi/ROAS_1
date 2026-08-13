import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageGraderQcSlackBridgeService } from '../page-grader-qc-slack-bridge.service'

describe('PageGraderQcSlackBridgeService', () => {
  const svc = { client: {} }
  const sync = { authorizeWebhookSecret: vi.fn() }
  const pageGraderApi = { applyQcAction: vi.fn() }
  const slackTools = { sendBlockMessageToTarget: vi.fn() }
  const slackApi = { verifyRequestSignature: vi.fn() }
  let service: PageGraderQcSlackBridgeService

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SLACK_SIGNING_SECRET = 'signing-secret'
    sync.authorizeWebhookSecret.mockResolvedValue([{ userId: 'user-1', orgId: 'org-1' }])
    slackTools.sendBlockMessageToTarget.mockResolvedValue({
      success: true,
      channel: 'D123',
      ts: '123.456',
    })
    service = new PageGraderQcSlackBridgeService(
      svc as never,
      sync as never,
      pageGraderApi as never,
      slackTools as never,
      slackApi as never,
    )
  })

  afterEach(() => {
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
    expect(responseFetch).toHaveBeenCalledWith(
      payload.response_url,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
