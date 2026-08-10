import { z } from 'zod'

export const StartFathomConnectSchema = z.object({
  redirectTo: z.string().url(),
  connection_scope: z.enum(['personal', 'org_shared']).optional(),
})

export const ListFathomMeetingsSchema = z.object({
  cursor: z.string().optional(),
})

export const UpdateFathomAgendaExclusionSchema = z.object({
  minimized: z.boolean(),
  event: z.object({
    key: z.string().min(1).max(1000),
    eventId: z.string().min(1).max(500),
    title: z.string().min(1).max(1000),
    start: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: 'Valid event start is required',
      }),
    source: z.enum(['google_calendar', 'outlook', 'fathom']),
    accountId: z.string().max(500).nullable(),
  }),
})

export type UpdateFathomAgendaExclusionDto = z.infer<typeof UpdateFathomAgendaExclusionSchema>

export const CreateFathomWebhookSchema = z.object({
  destinationUrl: z.string().url(),
  triggeredFor: z
    .array(
      z.enum([
        'my_recordings',
        'shared_external_recordings',
        'my_shared_with_team_recordings',
        'shared_team_recordings',
      ]),
    )
    .min(1),
  includeTranscript: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
  includeActionItems: z.boolean().optional(),
  includeCrmMatches: z.boolean().optional(),
})
