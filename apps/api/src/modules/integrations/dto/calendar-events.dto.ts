import { z } from 'zod'

const TimedIsoDateTimeSchema = z
  .string()
  .min(1)
  .refine((value) => !/^\d{4}-\d{2}-\d{2}$/.test(value.trim()), {
    message: 'Timed ISO 8601 datetime is required',
  })
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Valid ISO 8601 datetime is required',
  })

const OptionalTimedIsoDateTimeSchema = TimedIsoDateTimeSchema.optional()

export const CalendarProviderSchema = z.enum(['google_calendar', 'outlook'])

export const CalendarAgendaQuerySchema = z.object({
  start: z
    .string()
    .min(1, 'start is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Valid ISO 8601 start is required',
    }),
  end: z
    .string()
    .min(1, 'end is required')
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Valid ISO 8601 end is required',
    }),
  timezone: z.string().min(1).optional(),
  provider: CalendarProviderSchema.optional(),
}).refine((query) => Date.parse(query.end) > Date.parse(query.start), {
  message: 'end must be after start',
  path: ['end'],
})

export const CalendarEventParamSchema = z.object({
  provider: CalendarProviderSchema,
  eventId: z.string().min(1, 'eventId is required'),
})

const CalendarAttendeeInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  optional: z.boolean().optional(),
})

export const CreateCalendarEventSchema = z
  .object({
    provider: CalendarProviderSchema,
    title: z.string().min(1, 'title is required'),
    start: TimedIsoDateTimeSchema,
    end: TimedIsoDateTimeSchema,
    timezone: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    attendees: z.array(CalendarAttendeeInputSchema).optional(),
    calendar_id: z.string().min(1).optional(),
    create_video_meeting: z.boolean().optional(),
  })
  .refine((body) => Date.parse(body.end) > Date.parse(body.start), {
    message: 'end must be after start',
    path: ['end'],
  })

export const UpdateCalendarEventSchema = z
  .object({
    title: z.string().min(1).optional(),
    start: OptionalTimedIsoDateTimeSchema,
    end: OptionalTimedIsoDateTimeSchema,
    timezone: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    attendees: z.array(CalendarAttendeeInputSchema).optional(),
    calendar_id: z.string().min(1).optional(),
    create_video_meeting: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one calendar field is required',
  })
  .refine((body) => !body.start || !body.end || Date.parse(body.end) > Date.parse(body.start), {
    message: 'end must be after start',
    path: ['end'],
  })

export const DeleteCalendarEventQuerySchema = z.object({
  calendar_id: z.string().min(1).optional(),
})

export type CalendarAgendaQueryDto = z.infer<typeof CalendarAgendaQuerySchema>
export type CalendarEventParamDto = z.infer<typeof CalendarEventParamSchema>
export type CreateCalendarEventDto = z.infer<typeof CreateCalendarEventSchema>
export type UpdateCalendarEventDto = z.infer<typeof UpdateCalendarEventSchema>
export type DeleteCalendarEventQueryDto = z.infer<typeof DeleteCalendarEventQuerySchema>
