import { z } from 'zod'

export const RecurrenceFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'days_after',
  'custom',
])
export const RecurrenceTriggerSchema = z.enum(['status_change', 'due_date'])
export const RecurrenceTriggerStatusSchema = z.enum(['done', 'in_review'])
export const RecurrenceModeSchema = z.enum(['create_task', 'update_status'])
export const RecurrenceResetStatusSchema = z.string().min(1)
export const MonthlyAnchorSchema = z.enum(['same_day', 'nth_weekday', 'first_day', 'last_day'])
export const CustomUnitSchema = z.enum(['day', 'week', 'month', 'year'])
export const RecurrenceEndSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('forever') }),
  z.object({ type: z.literal('count'), count: z.number().int().min(1).max(1000) }),
  z.object({ type: z.literal('until'), until: z.string().datetime() }),
])

export const RecurrenceCloneIncludeSchema = z
  .object({
    include_everything: z.boolean().optional(),
    description: z.boolean().optional(),
    assignee: z.boolean().optional(),
    priority: z.boolean().optional(),
    tags: z.boolean().optional(),
    custom_fields: z.boolean().optional(),
    subtasks: z.boolean().optional(),
  })
  .optional()

export const RecurrenceSpecSchema = z
  .object({
    frequency: RecurrenceFrequencySchema,
    interval: z.number().int().min(1).max(365),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
    trigger: RecurrenceTriggerSchema,
    trigger_status: RecurrenceTriggerStatusSchema.optional(),
    mode: RecurrenceModeSchema.optional(),
    create_new_task: z.boolean().optional(),
    update_same_item: z.boolean().optional(),
    new_instance_status: z.string().min(1).optional(),
    reset_status: RecurrenceResetStatusSchema.optional(),
    clone_include: RecurrenceCloneIncludeSchema,
    sync_to_due_date: z.boolean(),
    end: RecurrenceEndSchema,
    skip_weekends: z.boolean().optional(),
    monthly_anchor: MonthlyAnchorSchema.optional(),
    days_after_count: z.number().int().min(1).max(365).optional(),
    custom_unit: CustomUnitSchema.optional(),
    occurrences_created: z.number().int().min(0).optional(),
    last_materialized_at: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    const createNew =
      value.create_new_task !== undefined ? value.create_new_task : value.mode !== 'update_status'
    const updateSame =
      value.update_same_item !== undefined ? value.update_same_item : value.mode === 'update_status'
    if (value.trigger === 'status_change' && !value.trigger_status) {
      ctx.addIssue({
        path: ['trigger_status'],
        code: z.ZodIssueCode.custom,
        message: 'trigger_status is required when trigger is status_change',
      })
    }
    if (!createNew && !updateSame) {
      ctx.addIssue({
        path: ['create_new_task'],
        code: z.ZodIssueCode.custom,
        message:
          'At least one of create_new_task or update_same_item must be true (or set legacy mode).',
      })
    }
    if (updateSame && !value.reset_status) {
      ctx.addIssue({
        path: ['reset_status'],
        code: z.ZodIssueCode.custom,
        message:
          'reset_status is required when update_same_item is true (or mode is update_status)',
      })
    }
    if (value.frequency === 'days_after' && !value.days_after_count) {
      ctx.addIssue({
        path: ['days_after_count'],
        code: z.ZodIssueCode.custom,
        message: 'days_after_count is required when frequency is days_after',
      })
    }
    if (value.frequency === 'custom' && !value.custom_unit) {
      ctx.addIssue({
        path: ['custom_unit'],
        code: z.ZodIssueCode.custom,
        message: 'custom_unit is required when frequency is custom',
      })
    }
    if (value.frequency === 'days_after' && value.trigger === 'due_date') {
      ctx.addIssue({
        path: ['trigger'],
        code: z.ZodIssueCode.custom,
        message: 'days_after frequency requires status_change trigger',
      })
    }
  })

export type RecurrenceSpecDto = z.infer<typeof RecurrenceSpecSchema>
