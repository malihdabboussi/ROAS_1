import { z } from 'zod'

export const ConnectFirefliesSchema = z.object({
  apiKey: z.string().min(1),
  /** Secret set in Fireflies → Settings → Developer → Webhooks (16 to 32 characters). */
  webhookSecret: z.string().min(16).max(32).optional(),
})

export const UpdateFirefliesWebhookSecretSchema = z.object({
  webhookSecret: z.string().min(16).max(32),
})

export const ListFirefliesTranscriptsSchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional(),
  skip: z.coerce.number().min(0).optional(),
  title: z.string().optional(),
})
