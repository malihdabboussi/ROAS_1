import { z } from 'zod'

export const BindRuntimeIdentityBodySchema = z.object({
  user_id: z.string().uuid(),
  machine_id: z.string().min(1).trim(),
})

export const ResetRuntimeIdentityBodySchema = z.object({
  machine_id: z.string().min(1).trim(),
})

export type BindRuntimeIdentityBody = z.infer<typeof BindRuntimeIdentityBodySchema>
export type ResetRuntimeIdentityBody = z.infer<typeof ResetRuntimeIdentityBodySchema>
