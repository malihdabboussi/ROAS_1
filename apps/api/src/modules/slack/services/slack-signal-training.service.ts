import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { SlackPeopleRepository } from '../repositories/slack-people.repository'
import { SlackSignalTrainingRepository } from '../repositories/slack-signal-training.repository'
import type { SlackShadowAction } from '../types/slack.types'

type PlannedAction = { recipient_names: string[]; message: string }
type Person = { id: string; display_name: string; relationship_kind: string }

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
        },
        required: ['recipient_names', 'message'],
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
  ) {}

  async train(input: {
    supabase: SupabaseClient
    orgId: string
    userId: string
    signalId: string
    instruction: string
    saveAsRule: boolean
  }) {
    const [signals, directory] = await Promise.all([
      this.people.listShadowActions(input.supabase, input.orgId, 200),
      this.people.listPeople(input.supabase, input.orgId) as Promise<Person[]>,
    ])
    const signal = signals.find((candidate) => candidate.id === input.signalId)
    if (!signal || signal.target_member_id) throw new NotFoundException('Slack signal not found')
    const internalPeople = directory.filter((person) => person.relationship_kind === 'internal')
    if (internalPeople.length === 0) {
      throw new BadRequestException('Classify at least one Slack person as Internal first')
    }
    const completion = await this.gemini.callGeminiWithUsage(
      [
        'Turn the administrator instruction into concise internal Slack Shadow drafts.',
        'Never draft a proactive message to an external or ignored person.',
        'Use only exact names in the internal directory. Omit unknown recipients.',
        'Use multiple recipient names only when the administrator explicitly asks for a group chat.',
        `Signal: ${signal.proposed_content}`,
        `Reason: ${signal.rationale ?? 'Not supplied'}`,
        `Instruction: ${input.instruction}`,
        `Internal directory: ${internalPeople.map((person) => person.display_name).join(', ')}`,
      ].join('\n'),
      undefined,
      { userId: input.userId, orgId: input.orgId },
      { responseSchema: ACTION_PLAN_SCHEMA, thinkingLevel: 'low', maxOutputTokens: 2048 },
    )
    const parsed = JSON.parse(completion.text) as { actions?: PlannedAction[] }
    const internalByName = new Map(
      internalPeople.map((person) => [person.display_name.trim().toLowerCase(), person]),
    )
    const actions: SlackShadowAction[] = []
    for (const plan of parsed.actions ?? []) {
      const recipients = plan.recipient_names
        .map((name) => internalByName.get(name.trim().toLowerCase()))
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
            recipient_names: recipients.map((person) => person.display_name),
            additional_recipient_member_ids: additional.map((person) => person.id),
            shadow_only: true,
          },
        }),
      )
    }
    if (actions.length === 0) {
      throw new BadRequestException('The instruction did not resolve to an internal recipient')
    }
    const rule = input.saveAsRule
      ? await this.rules.createRule(input.supabase, {
          orgId: input.orgId,
          userId: input.userId,
          signalId: input.signalId,
          instruction: input.instruction,
        })
      : null
    await this.people.reviewShadowAction(input.supabase, {
      actionId: signal.id,
      orgId: input.orgId,
      reviewedBy: input.userId,
      status: 'approved',
    })
    return { actions, rule }
  }
}
