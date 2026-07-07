import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import { SlackApiIntegration } from '../../slack/integrations/slack-api.integration'
import { SlackRepository } from '../../slack/repositories/slack.repository'
import { LearnFromSlackModelOutputSchema, type LearnFromSlackResponse } from '../dto'
import { TeamRosterRepository } from '../repositories/team-roster.repository'
import { tryParseSlackLearnJson } from './team-roster-slack-json-parser'

const OWNER_ROLES = new Set(['owner', 'admin'])
const OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.6'
const MAX_MESSAGES_SAMPLED = 50
const MAX_MESSAGE_CHARS = 400
type LearnFromSlackCompletionJson = {
  choices?: Array<{ message?: { content?: unknown } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}
const LEARN_FROM_SLACK_JSON_SCHEMA = {
  name: 'learn_from_slack_profile',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      functional_role: {
        type: 'object',
        additionalProperties: false,
        properties: {
          value: { type: ['string', 'null'] },
          confidence: { type: 'number' },
          evidence: { type: 'string' },
        },
        required: ['value', 'confidence', 'evidence'],
      },
      specialties: {
        type: 'object',
        additionalProperties: false,
        properties: {
          value: {
            type: 'array',
            items: { type: 'string' },
          },
          confidence: { type: 'number' },
          evidence: { type: 'string' },
        },
        required: ['value', 'confidence', 'evidence'],
      },
      delegation_notes: {
        type: 'object',
        additionalProperties: false,
        properties: {
          value: { type: ['string', 'null'] },
          confidence: { type: 'number' },
          evidence: { type: 'string' },
        },
        required: ['value', 'confidence', 'evidence'],
      },
      timezone: {
        type: 'object',
        additionalProperties: false,
        properties: {
          value: { type: ['string', 'null'] },
          confidence: { type: 'number' },
        },
        required: ['value', 'confidence'],
      },
    },
    required: ['functional_role', 'specialties', 'delegation_notes', 'timezone'],
  },
} as const

@Injectable()
export class TeamRosterSlackLearnerService {
  private readonly logger = new Logger(TeamRosterSlackLearnerService.name)

  constructor(
    private readonly rosterRepo: TeamRosterRepository,
    private readonly slackRepo: SlackRepository,
    private readonly slackApi: SlackApiIntegration,
    private readonly openRouterBilling: OpenRouterBillingClientService,
  ) {}

  async learnFromSlack(
    supabase: SupabaseClient,
    actorUserId: string,
    orgId: string | null | undefined,
    targetUserId: string,
  ): Promise<LearnFromSlackResponse> {
    if (!orgId) {
      throw new BadRequestException('org_id is required to learn from Slack')
    }

    const [actorMembership, targetMembership] = await Promise.all([
      this.rosterRepo.getMembership(supabase, orgId, actorUserId),
      this.rosterRepo.getMembership(supabase, orgId, targetUserId),
    ])
    if (!actorMembership || !OWNER_ROLES.has(actorMembership.role)) {
      throw new ForbiddenException('Only org owner or admin can learn from Slack')
    }
    if (!targetMembership) {
      throw new NotFoundException('Target user is not a member of this org')
    }

    const target = await this.rosterRepo.getHumanProfile(supabase, targetUserId)
    if (!target) {
      throw new NotFoundException('Target team member not found')
    }
    const targetEmail = target.email
    if (!targetEmail) {
      throw new ConflictException({
        error: 'target_has_no_email',
        message: "This teammate has no email on file, so we can't match them to Slack.",
      })
    }
    const serviceSupabase = this.rosterRepo.getServiceRoleClient()
    const integration = await this.slackRepo.getIntegration(serviceSupabase, actorUserId, orgId)
    if (!integration?.access_token) {
      throw new ConflictException({
        error: 'slack_not_connected',
        message: 'Connect Slack first to learn from Slack.',
      })
    }
    const botToken = integration.access_token
    const integrationMeta =
      integration.metadata && typeof integration.metadata === 'object'
        ? (integration.metadata as Record<string, unknown>)
        : {}
    let slackUser =
      (await this.resolveSlackUserFromChannelMembers(
        serviceSupabase,
        actorUserId,
        orgId,
        target.display_name,
        targetEmail,
        botToken,
      )) ?? null
    let missingEmailScope = false
    if (!slackUser) {
      slackUser = await this.resolveSlackUserFromWorkspaceDirectory(
        botToken,
        target.display_name,
        targetEmail,
      )
    }

    if (!slackUser) {
      try {
        slackUser = await this.slackApi.usersLookupByEmail(botToken, targetEmail)
      } catch (err) {
        if (err instanceof Error && err.message === 'missing_scope') {
          missingEmailScope = true
        } else {
          throw err
        }
      }
    }
    if (!slackUser && missingEmailScope) {
      throw new ConflictException({
        error: 'slack_missing_scope',
        message:
          'Slack app is missing required users:read.email permission. Reinstall the Slack integration in Settings.',
      })
    }

    if (!slackUser) {
      throw new NotFoundException({
        error: 'slack_user_not_found',
        message: "Couldn't find this person in your Slack workspace.",
      })
    }

    const slackUserId = slackUser.id
    const info = (await this.slackApi.getUserInfo(botToken, slackUserId)) ?? slackUser
    const realName = info.real_name ?? info.profile?.display_name ?? slackUser.name ?? null
    const title = info.profile?.title ?? null
    const timezone = info.tz ?? null

    let messageMatches: Array<{
      text?: string
      ts?: string
      channel?: { id?: string; name?: string }
    }> = []
    let searchSucceeded = false
    try {
      const search = await this.slackApi.searchMessages(botToken, `from:<@${slackUserId}>`, {
        count: MAX_MESSAGES_SAMPLED,
        sort: 'timestamp',
        sort_dir: 'desc',
      })
      searchSucceeded = true
      messageMatches = search.messages?.matches ?? []
    } catch (err) {
      this.logger.warn(
        `Slack search.messages failed for ${slackUserId}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    if (!searchSucceeded || messageMatches.length === 0) {
      const fallbackMatches = await this.collectMessagesViaChannelHistory(botToken, slackUserId)
      if (fallbackMatches.length > messageMatches.length) {
        messageMatches = fallbackMatches
      }
    }

    const sampledMessages = messageMatches
      .map((m) => ({
        text: typeof m.text === 'string' ? m.text.slice(0, MAX_MESSAGE_CHARS) : '',
        channel: m.channel?.name ?? null,
      }))
      .filter((m) => m.text.length > 0)

    const userPrompt = [
      'You are inferring a team member profile from Slack data for a task-delegation system.',
      'Return ONLY JSON matching the exact schema below.',
      'Use null when evidence is weak. Include short evidence quotes (<=160 chars) from the Slack data.',
      'Be conservative and avoid guessing.',
      '',
      `Target email: ${targetEmail}`,
      `Slack real name: ${realName ?? '(unknown)'}`,
      `Slack profile title: ${title ?? '(none)'}`,
      `Slack profile timezone: ${timezone ?? '(none)'}`,
      `Messages sampled: ${sampledMessages.length}`,
      '',
      'Recent Slack messages (most recent first):',
      sampledMessages.length > 0
        ? sampledMessages
            .map((m, i) => `${i + 1}. [#${m.channel ?? 'unknown'}] ${m.text.replace(/\s+/g, ' ')}`)
            .join('\n')
        : '(no messages available)',
      '',
      'Return JSON with this exact shape:',
      '{',
      '  "functional_role": { "value": string|null, "confidence": number (0..1), "evidence": string },',
      '  "specialties":     { "value": string[], "confidence": number (0..1), "evidence": string },',
      '  "delegation_notes":{ "value": string|null, "confidence": number (0..1), "evidence": string },',
      '  "timezone":        { "value": string|null, "confidence": number (0..1) }',
      '}',
      '',
      'Rules:',
      '- functional_role: short title like "Head of Design", "Founder & CEO". Null if unclear.',
      '- specialties: up to 8 short tags (1-3 words each).',
      '- delegation_notes: 1-3 sentences describing what they like owning vs. not. Null if unclear.',
      '- timezone: IANA identifier (e.g. America/New_York) when the Slack timezone is recognizable.',
      '- evidence: short quote or paraphrase from above data. Empty string if no strong signal.',
      '- Output JSON only. No markdown.',
    ].join('\n')

    let llmJson: LearnFromSlackCompletionJson
    let creditsUsed = 0
    const creditsRemaining = 0
    try {
      const completion = await this.openRouterBilling.createChatCompletion<LearnFromSlackCompletionJson>({
        owner: { userId: actorUserId, orgId },
        feature: 'team_roster',
        action: 'learn_from_slack',
        sourcePath: 'team-roster/slack-learner',
        model: OPENROUTER_MODEL,
        body: {
          max_tokens: 1024,
          messages: [{ role: 'user', content: userPrompt }],
          response_format: {
            type: 'json_schema',
            json_schema: LEARN_FROM_SLACK_JSON_SCHEMA,
          },
        },
        metadata: {
          target_user_id: targetUserId,
          slack_user_id: slackUserId,
          messages_sampled: sampledMessages.length,
        },
      })
      llmJson = completion.data
      creditsUsed = Number(completion.settledAttempt?.credits_charged ?? 0)
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err
      this.logger.error(
        `OpenRouter learn-from-slack threw: ${err instanceof Error ? err.message : String(err)}`,
      )
      throw new ServiceUnavailableException({
        error: 'llm_failed',
        message: 'AI call failed. Try again in a moment.',
      })
    }

    const rawContent = llmJson.choices?.[0]?.message?.content
    const content =
      typeof rawContent === 'string'
        ? rawContent.trim()
        : rawContent && typeof rawContent === 'object'
          ? JSON.stringify(rawContent)
          : ''
    if (!content) {
      throw new ServiceUnavailableException({
        error: 'llm_failed',
        message: 'AI call returned empty response.',
      })
    }

    const parsedResult = tryParseSlackLearnJson(content)
    if (!parsedResult) {
      throw new ServiceUnavailableException({
        error: 'llm_failed',
        message: 'AI call returned invalid JSON.',
      })
    }

    const parseResult = LearnFromSlackModelOutputSchema.safeParse(parsedResult)
    if (!parseResult.success) {
      this.logger.warn(
        `learn-from-slack: model output failed validation: ${parseResult.error.message}`,
      )
      throw new ServiceUnavailableException({
        error: 'llm_failed',
        message: 'AI returned a response we could not validate.',
      })
    }

    return {
      source: 'slack',
      slack_user_id: slackUserId,
      slack_profile:
        realName || title || timezone ? { real_name: realName, title, timezone } : null,
      messages_sampled: sampledMessages.length,
      suggestions: parseResult.data,
      credits_used: creditsUsed,
      credits_remaining: creditsRemaining,
      model_name: OPENROUTER_MODEL,
    }
  }

  private async resolveSlackUserFromChannelMembers(
    supabase: SupabaseClient,
    actorUserId: string,
    orgId: string,
    targetDisplayName: string,
    targetEmail: string,
    botToken: string,
  ): Promise<{
    id: string
    name: string
    real_name?: string
    profile?: { display_name?: string; title?: string; image_72?: string }
    is_bot?: boolean
    tz?: string
  } | null> {
    let rows: Array<{
      platform_id: string
      display_name?: string | null
      username?: string | null
    }>
    try {
      rows = await this.rosterRepo.listSlackChannelMembers(supabase, actorUserId, orgId)
    } catch (error) {
      this.logger.warn(
        `Failed to query channel_members for Slack lookup: ${error instanceof Error ? error.message : String(error)}`,
      )
      return null
    }
    if (rows.length === 0) return null

    const targetName = this.normalizeMatch(targetDisplayName)
    const emailLocal = this.normalizeMatch(targetEmail.split('@')[0] ?? '')
    let bestSlackUserId: string | null = null
    let bestScore = 0

    for (const row of rows) {
      if (!row.platform_id) continue
      const display = this.normalizeMatch(row.display_name)
      const username = this.normalizeMatch(row.username)
      let score = 0

      if (targetName && display === targetName) score = Math.max(score, 120)
      if (targetName && username === targetName) score = Math.max(score, 110)
      if (emailLocal && username === emailLocal) score = Math.max(score, 100)
      if (targetName && display && (display.includes(targetName) || targetName.includes(display))) {
        score = Math.max(score, 80)
      }
      if (emailLocal && display && (display.includes(emailLocal) || emailLocal.includes(display))) {
        score = Math.max(score, 70)
      }

      if (score > bestScore) {
        bestScore = score
        bestSlackUserId = row.platform_id
      }
    }
    if (!bestSlackUserId) return null
    return this.slackApi.getUserInfo(botToken, bestSlackUserId)
  }

  private normalizeMatch(value: string | null | undefined): string {
    if (!value) return ''
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  private async collectMessagesViaChannelHistory(
    botToken: string,
    slackUserId: string,
  ): Promise<Array<{ text?: string; ts?: string; channel?: { id?: string; name?: string } }>> {
    const collected: Array<{
      text?: string
      ts?: string
      channel?: { id?: string; name?: string }
    }> = []
    try {
      const channels = await this.slackApi.listConversations(botToken)
      for (const ch of channels.slice(0, 25)) {
        if (collected.length >= MAX_MESSAGES_SAMPLED) break
        try {
          const history = await this.slackApi.getChannelHistory(botToken, ch.id, 100)
          for (const msg of history) {
            if (collected.length >= MAX_MESSAGES_SAMPLED) break
            const text = typeof msg.text === 'string' ? msg.text : ''
            if (msg.user === slackUserId && text.length > 0) {
              collected.push({
                text,
                ts: typeof msg.ts === 'string' ? msg.ts : undefined,
                channel: { id: ch.id, name: ch.name },
              })
            }
          }
        } catch (err) {
          this.logger.warn(
            `learnFromSlack: conversations.history failed for ${ch.id}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      }
    } catch (err) {
      this.logger.warn(
        `learnFromSlack: conversations.list failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    return collected
  }

  private async resolveSlackUserFromWorkspaceDirectory(
    botToken: string,
    targetDisplayName: string,
    targetEmail: string,
  ): Promise<{
    id: string
    name: string
    real_name?: string
    profile?: { display_name?: string; title?: string; image_72?: string }
    is_bot?: boolean
    tz?: string
  } | null> {
    const members = await this.slackApi.listUsers(botToken)
    const realMembers = members.filter((m) => !m.deleted && !m.is_bot)
    const targetName = this.normalizeMatch(targetDisplayName)
    const emailLocal = this.normalizeMatch(targetEmail.split('@')[0] ?? '')
    let best: (typeof realMembers)[number] | null = null
    let bestScore = 0

    for (const m of realMembers) {
      const display = this.normalizeMatch(m.profile?.display_name)
      const real = this.normalizeMatch(m.real_name)
      const username = this.normalizeMatch(m.name)
      let score = 0

      if (
        targetName &&
        (display === targetName || real === targetName || username === targetName)
      ) {
        score = Math.max(score, 120)
      }
      if (
        emailLocal &&
        (username === emailLocal || display === emailLocal || real === emailLocal)
      ) {
        score = Math.max(score, 110)
      }
      if (
        targetName &&
        ((display && (display.includes(targetName) || targetName.includes(display))) ||
          (real && (real.includes(targetName) || targetName.includes(real))))
      ) {
        score = Math.max(score, 80)
      }

      if (score > bestScore) {
        bestScore = score
        best = m
      }
    }

    return best ?? null
  }
}
