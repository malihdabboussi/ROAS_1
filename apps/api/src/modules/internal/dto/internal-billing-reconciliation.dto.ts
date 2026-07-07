import { z } from 'zod'

const AuditTotalsSchema = z
  .object({
    openrouterAllTimeStartUsd: z.number().nonnegative().optional(),
    openrouterAllTimeEndUsd: z.number().nonnegative().optional(),
    openrouterActualWindowUsd: z.number().nonnegative().optional(),
    dbExactOpenrouterCostUsd: z.number().nonnegative().optional(),
    estimatedMissingOpenrouterActualUsd: z.number().nonnegative().optional(),
  })
  .strict()

export const OrgOpenRouterReconciliationSchema = z
  .object({
    orgId: z.string().uuid(),
    batchId: z
      .string()
      .min(8)
      .max(160)
      .regex(/^[A-Za-z0-9:_-]+$/),
    windowStart: z.string().datetime({ offset: true }),
    windowEnd: z.string().datetime({ offset: true }),
    allocationFactor: z.number().positive(),
    batchCredits: z.number().int().positive(),
    maxVisibleRowCredits: z.number().int().min(500).max(20000).default(2500),
    dryRun: z.boolean().default(true),
    audit: AuditTotalsSchema.optional(),
  })
  .strict()
  .refine((body) => new Date(body.windowStart).getTime() < new Date(body.windowEnd).getTime(), {
    message: 'windowStart must be before windowEnd',
    path: ['windowEnd'],
  })

export type OrgOpenRouterReconciliationDto = z.infer<typeof OrgOpenRouterReconciliationSchema>
