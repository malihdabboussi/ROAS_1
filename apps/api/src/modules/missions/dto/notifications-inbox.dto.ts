import { z } from 'zod'

export const InboxViewSchema = z.enum(['primary', 'other', 'later', 'cleared', 'all'])
export type InboxView = z.infer<typeof InboxViewSchema>

export const NotificationIdParamSchema = z.object({
  notificationId: z.string().uuid(),
})
export type NotificationIdParam = z.infer<typeof NotificationIdParamSchema>

export const ListNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  unread_only: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  view: InboxViewSchema.default('all'),
  types: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((type) => type.trim())
            .filter(Boolean)
        : [],
    ),
})
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>

export const NotificationBucketBodySchema = z.object({
  bucket: z.enum(['primary', 'other']),
})
export type NotificationBucketBody = z.infer<typeof NotificationBucketBodySchema>

export const NotificationSnoozeBodySchema = z.object({
  until: z
    .string()
    .datetime({ offset: true })
    .refine((value) => Date.parse(value) > Date.now(), {
      message: 'Snooze time must be in the future',
    }),
})
export type NotificationSnoozeBody = z.infer<typeof NotificationSnoozeBodySchema>

export const ClearNotificationsBodySchema = z.object({
  view: InboxViewSchema.exclude(['all']),
})
export type ClearNotificationsBody = z.infer<typeof ClearNotificationsBodySchema>
