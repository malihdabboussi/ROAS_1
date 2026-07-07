import { z } from 'zod'

export const UpdateDefaultAccountSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('personal'),
    orgId: z.null().optional(),
  }),
  z.object({
    mode: z.literal('org'),
    orgId: z.string().uuid('Invalid organization ID'),
  }),
])

export type UpdateDefaultAccountInput = z.infer<typeof UpdateDefaultAccountSchema>
