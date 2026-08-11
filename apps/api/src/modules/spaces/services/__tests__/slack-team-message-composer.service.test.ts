import { describe, expect, it, vi } from 'vitest'
import { SlackTeamMessageComposerService } from '../slack-team-message-composer.service'

const input = {
  userId: 'user-1',
  orgId: 'org-1',
  recipient: { name: 'Dylan', role: 'CEO', relationship: 'internal' },
  signals: [
    {
      kind: 'team_win',
      finding: 'ROAS reached 4.82x on $12,450 spend.',
      quote: 'ROAS reached 4.82x on $12,450 spend.',
      senderName: 'Maya',
      channelName: 'client-acme',
      timestamp: '1786400000.000100',
    },
  ],
  continuity: ['Yesterday: creative testing moved into review.'],
  context: {
    now: new Date('2026-08-10T17:00:00.000Z'),
    timezone: 'America/Los_Angeles',
    threadFollowUp: false,
  },
  forbiddenPrivateFacts: ['Dylan privately said the account is at risk.'],
}

function completion(text: string) {
  return {
    text,
    usage: { inputTokens: 120, outputTokens: 40, totalTokens: 160 },
    providerCostUsd: 0.002,
  }
}

describe('SlackTeamMessageComposerService', () => {
  it('returns evidence-specific Slack copy and a machine-readable scoped offer', async () => {
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue(
        completion(
          JSON.stringify({
            text: '*Maya* landed *4.82x ROAS* on *$12,450 spend* in #client-acme.\n\nI can turn the winning variables into a 5-bullet test brief by 2pm PT.',
            offers: [
              {
                kind: 'case_study',
                deliverable: '5-bullet test brief',
                ready_by: '2pm PT',
              },
            ],
          }),
        ),
      ),
    }
    const service = new SlackTeamMessageComposerService(gemini as never)

    await expect(service.compose(input)).resolves.toMatchObject({
      text: expect.stringContaining('$12,450'),
      offers: [{ kind: 'case_study', deliverable: '5-bullet test brief', ready_by: '2pm PT' }],
      usage: { totalTokens: 160, providerCostUsd: 0.002 },
    })
  })

  it('allows natural variation across consecutive compositions', async () => {
    const gemini = {
      callGeminiWithUsage: vi
        .fn()
        .mockResolvedValueOnce(
          completion(JSON.stringify({ text: '*Maya* hit *4.82x* on *$12,450*.', offers: [] })),
        )
        .mockResolvedValueOnce(
          completion(
            JSON.stringify({
              text: '*$12,450* in spend landed at *4.82x ROAS* — strong work from *Maya*.',
              offers: [],
            }),
          ),
        ),
    }
    const service = new SlackTeamMessageComposerService(gemini as never)

    const first = await service.compose(input)
    const second = await service.compose(input)

    expect(first.text).not.toBe(second.text)
  })

  it('rejects invented numbers, links, mentions, private facts, and canned offers', async () => {
    const invalid = [
      '*Maya* hit *5.1x* on *$12,450*.',
      'Details: https://invented.example/report',
      '<@UINVENTED> should own this.',
      'Dylan privately said the account is at risk.',
      'Want me to take a first pass?',
    ]

    for (const text of invalid) {
      const gemini = {
        callGeminiWithUsage: vi
          .fn()
          .mockResolvedValue(completion(JSON.stringify({ text, offers: [] }))),
      }
      const service = new SlackTeamMessageComposerService(gemini as never)
      await expect(service.compose(input)).rejects.toThrow(/composition/i)
    }
  })

  it('passes the belated personal-moment contract and forbids offers', async () => {
    const gemini = {
      callGeminiWithUsage: vi.fn().mockResolvedValue(
        completion(
          JSON.stringify({
            text: 'Belated happy birthday, *Dylan* 🎉 The #hello-everyone thread is a pretty good ROI report on the culture you built.',
            offers: [],
          }),
        ),
      ),
    }
    const service = new SlackTeamMessageComposerService(gemini as never)
    const result = await service.compose({
      ...input,
      signals: [
        {
          kind: 'personal_moment',
          finding: 'The thread reflects the culture Dylan built.',
          quote: 'Happy birthday Dylan — this team says everything about the culture you built.',
          senderName: 'Maya',
          channelName: 'hello-everyone',
          timestamp: '1786300000.000100',
        },
      ],
      context: {
        ...input.context,
        personalMoment: { eventType: 'birthday', belated: true },
      },
    })

    expect(result.text).toMatch(/belated happy birthday/i)
    expect(gemini.callGeminiWithUsage).toHaveBeenCalledWith(
      expect.stringContaining('"belated":true'),
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    )

    gemini.callGeminiWithUsage.mockResolvedValueOnce(
      completion(
        JSON.stringify({
          text: 'Belated happy birthday, *Dylan* 🎉',
          offers: [{ kind: 'draft', deliverable: 'thank-you', ready_by: '2pm' }],
        }),
      ),
    )
    await expect(
      service.compose({
        ...input,
        context: {
          ...input.context,
          personalMoment: { eventType: 'birthday', belated: true },
        },
      }),
    ).rejects.toThrow(/personal-moment offer/i)
  })
})
