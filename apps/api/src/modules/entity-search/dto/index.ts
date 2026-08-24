import { z } from 'zod'

export const EntitySearchKindSchema = z.enum([
  'client',
  'request',
  'task',
  'doc',
  'channel',
  'space',
  'mission',
  'person',
  'agent',
  'conversation',
  'campaign',
  'artifact',
  'deliverable',
])

export const EntitySearchQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
  types: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(EntitySearchKindSchema).optional()),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).max(2000).optional().default(0),
  /** Scope conversation results to a space campaign (task modal @@ menu). */
  campaign_id: z.string().uuid().optional(),
})

export type EntitySearchQueryDto = z.infer<typeof EntitySearchQuerySchema>
