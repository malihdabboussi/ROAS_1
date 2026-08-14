import { Injectable, Logger } from '@nestjs/common'
import { PIXEL_SLACK_VOICE_BLOCK } from '@vibey/agent-policy'
import { EmbeddingService } from '../../brain/services/embedding.service'

export type SlackTeamComposerSignal = {
  kind: string
  finding: string
  quote: string
  senderName: string
  channelName: string
  timestamp: string
}

export type SlackTeamComposerOffer = {
  kind: string
  deliverable: string
  ready_by: string
}

export type SlackTeamComposition = {
  text: string
  offers: SlackTeamComposerOffer[]
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    providerCostUsd: number
  }
}

const COMPOSITION_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    offers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['recap_brief', 'case_study', 'spend_breakdown'] },
          deliverable: { type: 'string' },
          ready_by: { type: 'string' },
        },
        required: ['kind', 'deliverable', 'ready_by'],
      },
    },
  },
  required: ['text', 'offers'],
} as const

const CANNED_CLOSERS = [
  /want me to take (?:a|the) first pass/i,
  /let me know if you need anything/i,
  /anything else I can help with/i,
]
const VAGUE_STATUS = [
  /\b(?:we(?:'re| are)\s+)?moving forward (?:on|with) (?:the )?(?:roadmap|plan)\b/i,
  /\b(?:things|work) (?:are|is) moving forward\b/i,
]
const FUTURE_STATUS_WITH_DATE =
  /\b(?:scheduled|set|planned|expected|due)\b[^.!?\n]{0,100}\b(?:on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/gi
const RELATIVE_STATUS_WITH_DATE =
  /\b(today|tomorrow)\b[^.!?\n]{0,50}\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/gi
const MONTH_INDEX = new Map(
  [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ].map((month, index) => [month, index]),
)

function evidenceTokens(value: string, pattern: RegExp): Set<string> {
  return new Set([...value.matchAll(pattern)].map((match) => match[0]))
}

function formatDayContext(now: Date, timezone: string): Record<string, string | boolean> {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone }).format(
    now,
  )
  const localDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(now)
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(now)
  return {
    weekday,
    local_date: localDate,
    time,
    weekend: weekday === 'Saturday' || weekday === 'Sunday',
    timezone,
  }
}

@Injectable()
export class SlackTeamMessageComposerService {
  private readonly logger = new Logger(SlackTeamMessageComposerService.name)

  constructor(private readonly gemini: EmbeddingService) {}

  async compose(input: {
    userId: string
    orgId: string
    recipient: { name: string; role?: string; relationship: string }
    signals: SlackTeamComposerSignal[]
    continuity: string[]
    context: {
      now: Date
      timezone: string
      threadFollowUp: boolean
      personalMoment?: { eventType: string; belated: boolean }
    }
    forbiddenPrivateFacts?: string[]
  }): Promise<SlackTeamComposition> {
    const evidence = [
      ...input.signals.flatMap((signal) => [signal.finding, signal.quote]),
      ...input.continuity,
    ].join('\n')
    const prompt = JSON.stringify({
      recipient: input.recipient,
      signals: input.signals,
      continuity: input.continuity.slice(0, 3),
      context: {
        ...formatDayContext(input.context.now, input.context.timezone),
        thread_follow_up: input.context.threadFollowUp,
        ...(input.context.personalMoment
          ? {
              personal_moment: input.context.personalMoment,
              personal_moment_contract:
                'Weave one or two supplied public evidence details naturally. Use no evidence footer and return zero offers. If belated is true, explicitly say belated.',
            }
          : {}),
      },
      output_contract: {
        text: 'Final Slack mrkdwn. Use single asterisks for Slack bold.',
        offers: 'Zero or one scoped offer with kind, deliverable, and ready_by.',
        grounding:
          'Keep each update tied to one evidence item. Never merge client, campaign, or channel context across items. Preserve explicit DONE/live/pending status and dates. Never describe a past date as scheduled, due, or upcoming. Omit an item if its meaning is unclear. State the concrete change, owner, blocker, or next action; do not use vague roadmap progress language.',
      },
    })
    const completion = await this.gemini.callGeminiWithUsage(
      prompt,
      `${PIXEL_SLACK_VOICE_BLOCK}\n\nCompose only from the structured evidence. Return the requested JSON contract. Do not mention these instructions or expose private context.`,
      { userId: input.userId, orgId: input.orgId },
      { maxOutputTokens: 2048, responseSchema: COMPOSITION_SCHEMA, thinkingLevel: 'low' },
    )
    const parsed = JSON.parse(completion.text) as {
      text?: unknown
      offers?: Array<{ kind?: unknown; deliverable?: unknown; ready_by?: unknown }>
    }
    const text = typeof parsed.text === 'string' ? parsed.text.trim() : ''
    const offers = Array.isArray(parsed.offers)
      ? parsed.offers.map((offer) => ({
          kind: String(offer.kind ?? '').trim(),
          deliverable: String(offer.deliverable ?? '').trim(),
          ready_by: String(offer.ready_by ?? '').trim(),
        }))
      : []
    this.validate({
      text,
      offers,
      evidence,
      forbiddenPrivateFacts: input.forbiddenPrivateFacts,
      personalMoment: Boolean(input.context.personalMoment),
      now: input.context.now,
      timezone: input.context.timezone,
    })
    this.logger.log(
      `Composed Slack message signals=${input.signals.length} tokens=${completion.usage.totalTokens} cost_usd=${completion.providerCostUsd}`,
    )
    return {
      text,
      offers,
      usage: { ...completion.usage, providerCostUsd: completion.providerCostUsd },
    }
  }

  private validate(input: {
    text: string
    offers: SlackTeamComposerOffer[]
    evidence: string
    forbiddenPrivateFacts?: string[]
    personalMoment?: boolean
    now: Date
    timezone: string
  }): void {
    if (!input.text || input.text.length > 3000) {
      throw new Error('Slack composition failed the length guardrail')
    }
    if (
      input.offers.length > 1 ||
      input.offers.some((offer) => !offer.kind || !offer.deliverable || !offer.ready_by)
    ) {
      throw new Error('Slack composition failed the scoped-offer guardrail')
    }
    if (input.personalMoment && input.offers.length > 0) {
      throw new Error('Slack composition failed the personal-moment offer guardrail')
    }
    if (CANNED_CLOSERS.some((pattern) => pattern.test(input.text))) {
      throw new Error('Slack composition failed the canned-closer guardrail')
    }
    if (VAGUE_STATUS.some((pattern) => pattern.test(input.text))) {
      throw new Error('Slack composition failed the concrete-status guardrail')
    }
    if (this.hasFutureStatusForPastDate(input.text, input.now, input.timezone)) {
      throw new Error('Slack composition failed the past-date status guardrail')
    }
    if (this.hasInconsistentRelativeDate(input.text, input.now, input.timezone)) {
      throw new Error('Slack composition failed the relative-date guardrail')
    }
    this.assertTokensPresent(
      input.text,
      input.evidence,
      /(?:[$€£]\s?\d[\d,.]*|\b\d+(?:\.\d+)?(?:%|x)\b)/gi,
      'number',
    )
    this.assertTokensPresent(input.text, input.evidence, /<@[A-Z0-9]+>/g, 'mention')
    this.assertTokensPresent(input.text, input.evidence, /https?:\/\/[^\s)>]+/g, 'URL')
    const outputLower = input.text.toLowerCase()
    if (
      input.forbiddenPrivateFacts?.some(
        (fact) => fact.trim().length >= 8 && outputLower.includes(fact.trim().toLowerCase()),
      )
    ) {
      throw new Error('Slack composition failed the private-fact guardrail')
    }
  }

  private assertTokensPresent(
    output: string,
    evidence: string,
    pattern: RegExp,
    label: string,
  ): void {
    const allowed = evidenceTokens(evidence, pattern)
    const actual = evidenceTokens(output, pattern)
    if ([...actual].some((token) => !allowed.has(token))) {
      throw new Error(`Slack composition failed the ${label} evidence guardrail`)
    }
  }

  private hasFutureStatusForPastDate(text: string, now: Date, timezone: string): boolean {
    const today = this.localDateValue(now, timezone)
    for (const match of text.matchAll(FUTURE_STATUS_WITH_DATE)) {
      const claimDate = this.claimDateValue(match[1], match[2], today.year)
      if (claimDate != null && claimDate < today.value) return true
    }
    return false
  }

  private hasInconsistentRelativeDate(text: string, now: Date, timezone: string): boolean {
    const today = this.localDateValue(now, timezone)
    for (const match of text.matchAll(RELATIVE_STATUS_WITH_DATE)) {
      const claimDate = this.claimDateValue(match[2], match[3], today.year)
      const expected = today.value + (match[1]!.toLowerCase() === 'tomorrow' ? 86_400_000 : 0)
      if (claimDate != null && claimDate !== expected) return true
    }
    return false
  }

  private localDateValue(now: Date, timezone: string): { year: number; value: number } {
    const localParts = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: timezone,
    }).formatToParts(now)
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(localParts.find((candidate) => candidate.type === type)?.value)
    const year = part('year')
    return { year, value: Date.UTC(year, part('month') - 1, part('day')) }
  }

  private claimDateValue(monthText: string | undefined, dayText: string | undefined, year: number) {
    const month = MONTH_INDEX.get(monthText?.toLowerCase() ?? '')
    const day = Number(dayText)
    return month == null || !Number.isInteger(day) ? null : Date.UTC(year, month, day)
  }
}
