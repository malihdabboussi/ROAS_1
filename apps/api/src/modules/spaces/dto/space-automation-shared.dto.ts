import { z } from 'zod'
import {
  CONNECTED_APP_FLOW_PROVIDERS,
  CONNECTED_APP_FLOW_TRIGGER_SLUGS,
  connectedAppFlowProviderMatchesSlug,
  getConnectedAppFlowTriggerBySlug,
} from '../data/connected-app-flow-triggers'
import { SpaceItemAssigneeSchema } from './space-core.dto'

export const AutomationAssigneeTargetSchema = SpaceItemAssigneeSchema
/**
 * Fathom trigger source picker. Lets the rule author scope WHICH user's
 * Fathom feeds this rule:
 * - `self`: the rule creator's own connected Fathom (default).
 * - `user`: a specific connected Fathom integration in the org. Stored as
 *    `user_integration_id` so that the same human with both a personal and an
 *    org_shared Fathom appear as distinct sources.
 * - `team`: any human in `agent_team_members(team_id)` whose Fathom recording
 *    arrives. Used for "Sales team calls" style rules. Webhook router resolves
 *    members at runtime so adding a new member auto-extends the rule.
 *
 * Permission to use `user` or `team` is enforced server-side (only org
 * admin/owner can save such a rule).
 */
export const FathomSourceSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('self') }),
  z.object({ mode: z.literal('user'), user_integration_id: z.string().uuid() }),
  z.object({ mode: z.literal('team'), team_id: z.string().uuid() }),
])
export type FathomSourceDto = z.infer<typeof FathomSourceSchema>

export const SlackTriggerSlugSchema = z.enum([
  'SLACK_RECEIVE_DIRECT_MESSAGE',
  'SLACK_CHANNEL_MESSAGE_RECEIVED',
  'SLACK_RECEIVE_THREAD_REPLY',
  'SLACKBOT_RECEIVE_DIRECT_MESSAGE',
  'SLACKBOT_CHANNEL_MESSAGE_RECEIVED',
  'SLACKBOT_RECEIVE_THREAD_REPLY',
])
export const ArtifactKindSchema = z.enum([
  'funnel',
  'website',
  'form',
  'email',
  'sequence',
  'social_post',
  'presentation',
  'ad',
  'offer',
  'avatar',
])
export const TaskScopeSchema = z.enum(['tasks', 'subtasks', 'all'])
export const GmailInboxCategorySchema = z.enum([
  'primary',
  'promotions',
  'social',
  'updates',
  'forums',
])
export const ConnectedAppFlowProviderSchema = z.enum(
  CONNECTED_APP_FLOW_PROVIDERS as [string, ...string[]],
)
export const ConnectedAppFlowTriggerSlugSchema = z.enum(
  CONNECTED_APP_FLOW_TRIGGER_SLUGS as [string, ...string[]],
)

export function validateConnectedAppTriggerConfig(
  trigger: { provider?: string; trigger_slug?: string; trigger_config?: Record<string, unknown> },
  ctx: z.RefinementCtx,
  requireConfig: boolean,
): void {
  if (!trigger.provider || !trigger.trigger_slug) return
  if (!connectedAppFlowProviderMatchesSlug(trigger.provider, trigger.trigger_slug)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['provider'],
      message: 'provider must match trigger_slug',
    })
    return
  }
  if (!requireConfig) return
  const meta = getConnectedAppFlowTriggerBySlug(trigger.trigger_slug)
  for (const key of meta?.requiredConfigKeys ?? []) {
    const value = trigger.trigger_config?.[key]
    if (typeof value !== 'string' || value.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trigger_config', key],
        message: `${key} is required for ${trigger.trigger_slug}`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Time-based ("schedule") trigger
// ---------------------------------------------------------------------------

const SchedulePresetSchema = z.enum(['minutes', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'])
const SchedulePresetConfigSchema = z.object({
  mode: z.literal('preset'),
  preset: SchedulePresetSchema,
  /** Minutes between fires for preset `minutes` (1–59); hours/days/months for other presets (defaults to 1). */
  interval: z.number().int().min(1).max(60).optional(),
  /** "HH:MM" (24h). Required for daily/weekly/monthly. Ignored for hourly. */
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM (24h)')
    .optional(),
  /** 0=Sunday … 6=Saturday. Used for weekly when `weekdays` is absent. */
  day_of_week: z.number().int().min(0).max(6).optional(),
  /** 1-31. Required for monthly/yearly calendar-day presets. */
  day_of_month: z.number().int().min(1).max(31).optional(),
  /** When set (weekly), cron fires on each listed weekday (0=Sun … 6=Sat). */
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  /** Calendar month for yearly preset (1–12). */
  month: z.number().int().min(1).max(12).optional(),
})

const ScheduleCustomConfigSchema = z.object({
  mode: z.literal('custom'),
  /** 5-field cron expression. Validated again at the service layer with cron-parser. */
  cron: z.string().min(1).max(200),
})

export const ScheduleConfigSchema = z.discriminatedUnion('mode', [
  SchedulePresetConfigSchema,
  ScheduleCustomConfigSchema,
])
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>

export const ScheduleTimezoneSchema = z.string().min(1).max(80)
export const SendToAgentOutputTypeSchema = z.enum([
  'none',
  'email_artifact',
  'document_artifact',
  'pdf_artifact',
  'funnel_artifact',
  'website_artifact',
  'sequence_artifact',
  'social_post_artifact',
  'presentation_artifact',
  'ad_artifact',
  'offer_artifact',
  'avatar_artifact',
  'blog_post_artifact',
])
export const EmailArtifactSourceSchema = z.enum(['manual', 'artifact'])
export const AgentCollaborationSchema = z.enum(['allowed', 'disabled'])

export const ContinuationSchema = z.enum(['immediately', 'after_task_completes']).optional()

export const SocialResearchAutomationPlatformSchema = z.enum([
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'both',
  'all',
])
export const SocialResearchAutomationSyncModeSchema = z.enum(['use_existing', 'resync_30d'])
export const SocialResearchAutomationEnrichmentSchema = z.enum(['caption', 'hook', 'transcript'])
export const BrainImportDomainSchema = z.enum([
  'strategy',
  'marketing',
  'finance',
  'operations',
  'creative',
  'general',
])
