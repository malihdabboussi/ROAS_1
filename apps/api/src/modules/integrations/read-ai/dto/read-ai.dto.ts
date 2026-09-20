import { z } from 'zod'

export const ConnectReadAiSchema = z.object({
  /** Signing key shown when creating the webhook in Read AI → Integrations → Webhooks. */
  signingKey: z.string().min(20).max(512),
})
