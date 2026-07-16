import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'
import { AutomationActionSchema, AutomationTriggerSchema } from '../dto'
import { findFirstAutomationContextIssue } from './automation-context-validation'
import { scheduleToCron } from './space-automation-scheduler.service'

const PublishableWhenEnabledSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: AutomationTriggerSchema,
  actions: z.array(AutomationActionSchema).min(1).max(20),
})

/** Mirrors the itemless action allow-list in space-automation-service-08.base.ts. */
const ITEMLESS_ALLOWED_ACTION_TYPES = new Set<string>([
  'create_task',
  'agent_suggest_tasks',
  'send_email',
  'send_slack_message',
  'send_channel_message',
  'create_artifact',
  'publish_artifact',
  'unpublish_artifact',
  'create_contact',
  'sync_social_research',
  'select_social_outliers',
  'enrich_social_research_items',
  'ingest_youtube_channel_to_agent_brain',
  'send_to_agent',
  'send_to_agents',
  'send_to_cursor',
  'meetings_precall_prep',
])

/** Throws if the stored rule must not run while enabled (draft or incomplete). */
export function assertAutomationValidWhenEnabled(record: Record<string, unknown>): void {
  if (record.is_draft === true) {
    throw new BadRequestException('Publish the automation before enabling it')
  }
  const parsed = PublishableWhenEnabledSchema.safeParse({
    name: record.name,
    trigger: record.trigger,
    actions: record.actions,
  })
  if (!parsed.success) {
    const err = parsed.error.issues[0]
    const path = err?.path?.length ? `${err.path.join('.')}: ` : ''
    throw new BadRequestException(`${path}${err?.message ?? 'Automation is not valid to enable'}`)
  }

  parsed.data.actions.forEach((action, index) => {
    const raw = action as Record<string, unknown>
    if (
      action.type === 'send_to_agent' &&
      typeof raw.output_type === 'string' &&
      raw.output_type !== 'none' &&
      action.continuation !== 'after_task_completes'
    ) {
      throw new BadRequestException(
        `actions.${index}.continuation: artifact output requires waiting until the task completes`,
      )
    }
    if (
      action.type !== 'send_to_agent' &&
      action.type !== 'send_to_agents' &&
      action.type !== 'send_to_cursor' &&
      action.continuation === 'after_task_completes'
    ) {
      throw new BadRequestException(
        `actions.${index}.continuation: after_task_completes is only supported for agent steps`,
      )
    }
    if (action.type === 'send_email' && raw.subject_source === 'artifact') {
      return
    }
    if (action.type === 'send_email') {
      if (!action.subject_template?.trim()) {
        throw new BadRequestException(`actions.${index}.subject_template: Subject is required`)
      }
      if (!action.body_template?.trim()) {
        throw new BadRequestException(`actions.${index}.body_template: Body is required`)
      }
    }
  })

  if (parsed.data.trigger.type === 'schedule' || parsed.data.trigger.type === 'webhook_received') {
    // Disallow item-bound actions for itemless triggers — at run time there is
    // no source space item, so any action that mutates "this task" would crash.
    parsed.data.actions.forEach((action, index) => {
      if (!ITEMLESS_ALLOWED_ACTION_TYPES.has(action.type)) {
        throw new BadRequestException(
          `actions.${index}.type: action "${action.type}" is not supported for itemless triggers`,
        )
      }
    })
  }

  if (parsed.data.trigger.type === 'schedule') {
    // Validate the cron expression now so the user sees the error here, not
    // at the next cron tick.
    try {
      scheduleToCron(parsed.data.trigger.schedule)
    } catch (err) {
      throw new BadRequestException(
        `trigger.schedule: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const contextIssue = findFirstAutomationContextIssue(
    parsed.data.trigger as unknown as Record<string, unknown>,
    parsed.data.actions as unknown as Array<Record<string, unknown>>,
  )
  if (contextIssue) {
    throw new BadRequestException(
      `actions.${contextIssue.index}.type: step ${contextIssue.index + 1} (${contextIssue.actionType}) needs ${contextIssue.missing.join(', ')} context first`,
    )
  }
}
