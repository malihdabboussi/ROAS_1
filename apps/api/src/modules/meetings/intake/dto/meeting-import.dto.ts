import { z } from 'zod'
import {
  isMeetingProviderId,
  type MeetingProviderId,
} from '../../providers/transcript-source.types'

export const MeetingProviderParamSchema = z
  .string()
  .refine(isMeetingProviderId, 'Unknown provider')
  .transform((value) => value as MeetingProviderId)

export const ImportMeetingSchema = z.object({
  externalId: z.string().min(1).max(500),
  brainId: z.string().uuid().optional(),
  targetBrain: z.enum(['user', 'campaign', 'agent', 'customer']).optional(),
  contactId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  domain: z
    .enum(['strategy', 'marketing', 'finance', 'operations', 'creative', 'general'])
    .optional(),
})

export type ImportMeetingDto = z.infer<typeof ImportMeetingSchema>
