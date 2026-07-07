import { z } from 'zod'

export const ProviderBillingAttemptSchema = z
  .object({
    attemptKey: z.string().min(8).max(300),
    sourceApp: z.string().min(1).max(80),
    sourcePath: z.string().min(1).max(240),
    billingOwnerType: z.enum(['personal', 'org', 'platform', 'subscription']),
    userId: z.string().uuid().nullable().optional(),
    orgId: z.string().uuid().nullable().optional(),
    campaignId: z.string().uuid().nullable().optional(),
    conversationId: z.string().uuid().nullable().optional(),
    feature: z.string().min(1).max(120),
    action: z.string().max(120).nullable().optional(),
    serviceType: z.string().min(1).max(80).default('text'),
    provider: z.string().min(1).max(80),
    requestedModel: z.string().max(240).nullable().optional(),
    resolvedModel: z.string().max(240).nullable().optional(),
    providerGenerationId: z.string().max(240).nullable().optional(),
    providerRequestId: z.string().max(240).nullable().optional(),
    inputTokens: z.number().int().nonnegative().nullable().optional(),
    outputTokens: z.number().int().nonnegative().nullable().optional(),
    cacheReadTokens: z.number().int().nonnegative().nullable().optional(),
    cacheWriteTokens: z.number().int().nonnegative().nullable().optional(),
    totalTokens: z.number().int().nonnegative().nullable().optional(),
    providerCostUsd: z.number().nonnegative().nullable().optional(),
    estimatedCostUsd: z.number().nonnegative().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const ProviderBillingReconcileSchema = z
  .object({
    limit: z.number().int().min(1).max(250).default(25),
    workerId: z.string().min(1).max(120).optional(),
  })
  .strict()

export const ProviderBillingSettleSchema = z
  .object({
    attemptId: z.string().uuid().optional(),
    providerGenerationId: z.string().min(4).max(240).optional(),
  })
  .strict()
  .refine((body) => Boolean(body.attemptId || body.providerGenerationId), {
    message: 'attemptId or providerGenerationId is required',
    path: ['attemptId'],
  })

export type ProviderBillingAttemptDto = z.infer<typeof ProviderBillingAttemptSchema>
export type ProviderBillingReconcileDto = z.infer<typeof ProviderBillingReconcileSchema>
export type ProviderBillingSettleDto = z.infer<typeof ProviderBillingSettleSchema>
