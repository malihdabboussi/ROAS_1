import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { SlackPeopleRepository } from '../repositories/slack-people.repository'
import { SlackSignalTrainingRepository } from '../repositories/slack-signal-training.repository'
import type { SlackShadowAction } from '../types/slack.types'
import { SlackSignalResolutionService } from './slack-signal-resolution.service'

type Destination = 'dm' | 'group_dm' | 'source_thread' | 'thread_broadcast' | 'source_channel'
type PlannedAction = { recipient_names: string[]; message: string; destination: Destination }
type Person = {
  id: string
  platform_id: string
  display_name: string
  username: string | null
  title: string | null
  relationship_kind: string
}

const DESTINATIONS = ['dm', 'group_dm', 'source_thread', 'thread_broadcast', 'source_channel']
const ACTION_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          recipient_names: { type: 'array', items: { type: 'string' } },
          message: { type: 'string' },
          destination: { type: 'string', enum: DESTINATIONS },
        },
        required: ['recipient_names', 'message', 'destination'],
      },
    },
  },
  required: ['actions'],
}

@Injectable()
export class SlackSignalTrainingService {
  constructor(
    private readonly people: SlackPeopleRepository,
    private readonly rules: SlackSignalTrainingRepository,
    private readonly gemini: EmbeddingService,
    private readonly resolution: SlackSignalResolutionService,
  ) {}

  async train(input: {
    supabase: SupabaseClient
    orgId: string
    userId: string
    signalId: string
    instruction: string
    saveAsRule: boolean
  }) {
    const refreshed = await this.resolution.refresh(input.supabase, input.orgId, input.signalId)
    const signal = refreshed.action
    if (signal.target_member_id) throw new NotFoundException('Slack signal not found')
    if (refreshed.resolution.resolved) {
      return {
        actions: [],
        rule: null,
        signal,
        diagnostics: {
          resolved: true,
          unmatched_recipients: [],
          unsupported_destinations: [],
          explanation: refreshed.resolution.reason,
        },
      }
    }

    const directory = (await this.people.listPeople(input.supabase, input.orgId)) as Person[]
    const internalPeople = directory.filter((person) => person.relationship_kind === 'internal')
    if (internalPeople.length === 0) {
      throw new BadRequestException('Classify at least one Slack person as Internal first')
    }
    const completion = await this.gemini.callGeminiWithUsage(
      [
        'Turn the administrator instruction into concise internal Slack Shadow drafts.',
        'Never draft a proactive message to an External or Ignored person.',
        'Resolve a human by full name, unique first name, Slack ID, username, or unique team role.',
        'Destinations: dm, group_dm, source_thread, thread_broadcast, source_channel.',
        'Use source_thread for a reply only in the source thread; thread_broadcast also surfaces the reply in the channel.',
        'Use source_channel for a new channel message. All output remains Shadow until an admin approves it.',
        `Signal: ${signal.proposed_content}`,
        `Reason: ${signal.rationale ?? 'Not supplied'}`,
        `Instruction: ${input.instruction}`,
        `Internal directory: ${internalPeople
          .map(
            (person) =>
              `${person.display_name} [Slack ${person.platform_id}; username ${person.username ?? 'none'}; role ${person.title ?? 'none'}]`,
          )
          .join('; ')}`,
      ].join('\n'),
      undefined,
      { userId: input.userId, orgId: input.orgId },
      { responseSchema: ACTION_PLAN_SCHEMA, thinkingLevel: 'low', maxOutputTokens: 2048 },
    )
    const parsed = JSON.parse(completion.text) as { actions?: PlannedAction[] }
    const aliases = this.buildAliasIndex(internalPeople)
    const unmatched = new Set<string>()
    const unsupported = new Set<string>()
    const actions: SlackShadowAction[] = []
    for (const plan of parsed.actions ?? []) {
      if (!DESTINATIONS.includes(plan.destination)) {
        unsupported.add(String(plan.destination))
        continue
      }
      const recipients = plan.recipient_names
        .map((name) => {
          const person = aliases.get(this.normalize(name))
          if (!person) unmatched.add(name)
          return person
        })
        .filter((person): person is Person => Boolean(person))
      if (recipients.length === 0 || !plan.message.trim()) continue
      const [primary, ...additional] = recipients
      actions.push(
        await this.people.createShadowAction(input.supabase, {
          orgId: input.orgId,
          userId: input.userId,
          agentKey: 'pixel',
          targetMemberId: primary.id,
          actionKind: 'message',
          proposedContent: plan.message.trim(),
          rationale: `Admin-taught response to: ${signal.proposed_content}`,
          sourceChannelId: signal.source_channel_id,
          sourceMessageTs: signal.source_message_ts,
          workflowKey: 'slack_signal_training',
          metadata: {
            parent_signal_id: signal.id,
            admin_instruction: input.instruction,
            destination: plan.destination,
            recipient_names: recipients.map((person) => person.display_name),
            recipient_slack_ids: recipients.map((person) => person.platform_id),
            additional_recipient_member_ids: additional.map((person) => person.id),
            source_thread_ts:
              typeof signal.metadata?.source_thread_ts === 'string'
                ? signal.metadata.source_thread_ts
                : signal.source_message_ts,
            shadow_only: true,
          },
        }),
      )
    }
    const rule = input.saveAsRule
      ? await this.rules.createRule(input.supabase, {
          orgId: input.orgId,
          userId: input.userId,
          signalId: input.signalId,
          instruction: input.instruction,
        })
      : null
    if (actions.length > 0) {
      await this.people.reviewShadowAction(input.supabase, {
        actionId: signal.id,
        orgId: input.orgId,
        reviewedBy: input.userId,
        status: 'approved',
      })
    }
    return {
      actions,
      rule,
      signal,
      diagnostics: {
        resolved: false,
        unmatched_recipients: [...unmatched],
        unsupported_destinations: [...unsupported],
        explanation:
          actions.length > 0
            ? 'Shadow plan created. Nothing was sent.'
            : 'No action was created. Review the unmatched recipients or requested destination.',
      },
    }
  }

  private buildAliasIndex(people: Person[]): Map<string, Person> {
    const candidates = new Map<string, Person[]>()
    for (const person of people) {
      const aliases = [
        person.display_name,
        person.display_name.split(/\s+/)[0],
        person.platform_id,
        person.username,
        person.title,
      ]
      for (const alias of aliases) {
        if (!alias) continue
        const key = this.normalize(alias)
        const existing = candidates.get(key) ?? []
        if (!existing.some((candidate) => candidate.id === person.id)) {
          candidates.set(key, [...existing, person])
        }
      }
    }
    return new Map(
      [...candidates.entries()]
        .filter(([, matches]) => matches.length === 1)
        .map(([alias, matches]) => [alias, matches[0]]),
    )
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/^@/, '')
  }
}
