import { z } from 'zod'

export const StartCalendlyConnectSchema = z.object({
  redirectTo: z.string().min(1, 'redirectTo is required'),
})

// ── Event Types ──

const CalendlyLocationSchema = z.object({
  kind: z.enum([
    'ask_invitee',
    'custom',
    'google_conference',
    'gotomeeting_conference',
    'inbound_call',
    'microsoft_teams_conference',
    'outbound_call',
    'physical',
    'webex_conference',
    'zoom_conference',
  ]),
  location: z.string().optional(),
  additional_info: z.string().optional(),
  phone_number: z.string().optional(),
})

export const CreateCalendlyEventTypeSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  duration: z.number().int().min(1).max(720),
  duration_options: z.array(z.number().int().min(1).max(720)).max(4).optional(),
  locations: z.array(CalendlyLocationSchema).optional(),
  color: z
    .string()
    .regex(/^#[a-f\d]{6}$/, 'Must be a hex color like #1a73e8')
    .optional(),
  locale: z.enum(['de', 'en', 'fr', 'it', 'nl', 'pt', 'uk']).optional(),
  active: z.boolean().optional(),
  kind: z
    .enum([
      'ask_invitee',
      'custom',
      'google_conference',
      'gotomeeting_conference',
      'inbound_call',
      'microsoft_teams_conference',
      'outbound_call',
      'physical',
      'webex_conference',
      'zoom_conference',
    ])
    .optional(),
})

export const UpdateCalendlyEventTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  duration: z.number().int().min(1).max(720).optional(),
  duration_options: z.array(z.number().int().min(1).max(720)).max(4).optional(),
  locations: z.array(CalendlyLocationSchema).optional(),
  color: z
    .string()
    .regex(/^#[a-f\d]{6}$/, 'Must be a hex color like #1a73e8')
    .optional(),
  locale: z.enum(['de', 'en', 'fr', 'it', 'nl', 'pt', 'uk']).optional(),
  active: z.boolean().optional(),
})

// ── One-Off Event Types ──

export const CreateCalendlyOneOffEventTypeSchema = z.object({
  name: z.string().min(1).max(55, 'Maximum 55 characters'),
  duration: z.number().int().min(1).max(720),
  timezone: z.string().optional(),
  date_setting: z.object({
    type: z.literal('date_range'),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  }),
  location: z
    .object({
      kind: z.string().min(1),
      location: z.string().min(1),
      additional_info: z.string().optional(),
    })
    .optional(),
  co_hosts: z.array(z.string().url()).max(9).optional(),
})

// ── Scheduled Events ──

export const CreateCalendlyScheduledEventSchema = z.object({
  event_type: z.string().url('Must be a Calendly event type URI'),
  start_time: z.string().min(1, 'start_time is required'),
  invitee: z.object({
    name: z.string().min(1),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    timezone: z.string().min(1),
    text_reminder_number: z.string().nullable().optional(),
  }),
  location: z
    .object({
      kind: z.string().min(1),
      location: z.string().min(1),
    })
    .optional(),
  questions_and_answers: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        position: z.number().int().min(0),
      }),
    )
    .optional(),
  tracking: z
    .object({
      utm_campaign: z.string().optional(),
      utm_source: z.string().optional(),
      utm_medium: z.string().optional(),
      utm_content: z.string().optional(),
      utm_term: z.string().optional(),
      salesforce_uuid: z.string().optional(),
    })
    .optional(),
  event_guests: z.array(z.string().email()).optional(),
})

export const CancelCalendlyScheduledEventSchema = z.object({
  reason: z.string().optional(),
})

// ── Available Times ──

export const ListCalendlyAvailableTimesSchema = z.object({
  event_type: z.string().url('Must be a Calendly event type URI'),
  start_time: z.string().min(1, 'start_time is required'),
  end_time: z.string().min(1, 'end_time is required'),
})

// ── Scheduled Events List ──

export const ListCalendlyScheduledEventsSchema = z.object({
  min_start_time: z.string().optional(),
  max_start_time: z.string().optional(),
  status: z.enum(['active', 'canceled']).optional(),
})
