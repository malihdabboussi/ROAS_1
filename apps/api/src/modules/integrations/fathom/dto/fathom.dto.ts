import { z } from 'zod'

export const StartFathomConnectSchema = z.object({
  redirectTo: z.string().url(),
  connection_scope: z.enum(['personal', 'org_shared']).optional(),
})

export const ListFathomMeetingsSchema = z.object({
  cursor: z.string().optional(),
})

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
