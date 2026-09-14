import { z } from 'zod'
import {
  CUSTOM_MEETING_PROVIDER_ID_PATTERN,
  CUSTOM_MEETING_PROVIDER_PREFIX,
  type CustomMeetingProviderId,
} from '../providers/transcript-source.types'
import { FIELD_PATH_PATTERN } from './json-path-lite'

/**
 * A note taker defined from Settings: how it signs deliveries, which event to
 * accept, and where each meeting field lives in its JSON. Paths use dot
 * notation with `[]` for arrays (`transcript.speaker_blocks[].words`).
 */

const fieldPath = z.string().regex(FIELD_PATH_PATTERN, 'Use a dot path like meeting.title')
const headerName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9-]+$/, 'Header names use letters, digits and dashes')

export const NoteTakerSignatureSchema = z.discriminatedUnion('scheme', [
  z.object({ scheme: z.literal('none') }),
  z.object({
    scheme: z.literal('hmac_sha256'),
    header: headerName,
    encoding: z.enum(['hex', 'base64']),
    /** Text before the digest in the header value, for example `sha256=`. */
    prefix: z.string().max(32).optional(),
    keyEncoding: z.enum(['utf8', 'base64']).default('utf8'),
  }),
])

export const NoteTakerEventSchema = z.object({
  eventTypePath: fieldPath.optional(),
  /** When set, deliveries whose event type is not listed are acknowledged and ignored. */
  acceptValues: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  deliveryIdPath: fieldPath.optional(),
})

export const NoteTakerFieldMapSchema = z.object({
  externalId: fieldPath,
  title: fieldPath.optional(),
  startTime: fieldPath.optional(),
  endTime: fieldPath.optional(),
  hostEmail: fieldPath.optional(),
  sourceUrl: fieldPath.optional(),
  recordingUrl: fieldPath.optional(),
  summary: fieldPath.optional(),
  participants: z
    .object({ path: fieldPath, email: fieldPath.optional(), name: fieldPath.optional() })
    .optional(),
  transcript: z.object({
    path: fieldPath,
    speaker: fieldPath.optional(),
    text: fieldPath,
    timestamp: fieldPath.optional(),
  }),
  actions: z
    .object({
      path: fieldPath,
      text: fieldPath,
      assigneeName: fieldPath.optional(),
      assigneeEmail: fieldPath.optional(),
    })
    .optional(),
})

export const NoteTakerDefinitionInputSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional(),
  logoUrl: z.string().trim().url().max(500).optional(),
  signature: NoteTakerSignatureSchema,
  event: NoteTakerEventSchema.default({}),
  fieldMap: NoteTakerFieldMapSchema,
})

export const NoteTakerDefinitionUpdateSchema = NoteTakerDefinitionInputSchema.partial()

export const NoteTakerSuggestSchema = z.object({
  samplePayload: z.record(z.unknown()),
})

export const NoteTakerPreviewSchema = z.object({
  definition: NoteTakerDefinitionInputSchema,
  samplePayload: z.record(z.unknown()),
})

export type NoteTakerSignatureConfig = z.infer<typeof NoteTakerSignatureSchema>
export type NoteTakerEventConfig = z.infer<typeof NoteTakerEventSchema>
export type NoteTakerFieldMap = z.infer<typeof NoteTakerFieldMapSchema>
export type NoteTakerDefinitionInput = z.infer<typeof NoteTakerDefinitionInputSchema>
export type NoteTakerDefinitionUpdate = z.infer<typeof NoteTakerDefinitionUpdateSchema>

export type NoteTakerDefinition = NoteTakerDefinitionInput & {
  id: string
  slug: CustomMeetingProviderId
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** `Otter Notes` → `nt_otter_notes`; throws when nothing usable remains. */
export function slugFromDisplayName(displayName: string): CustomMeetingProviderId {
  const body = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  const slug = `${CUSTOM_MEETING_PROVIDER_PREFIX}${body}`
  if (!CUSTOM_MEETING_PROVIDER_ID_PATTERN.test(slug)) {
    throw new Error('Name must contain at least two letters or digits')
  }
  return slug as CustomMeetingProviderId
}
