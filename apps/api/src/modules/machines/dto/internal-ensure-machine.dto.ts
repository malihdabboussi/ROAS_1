import { z } from 'zod'

export const InternalEnsureMachineBodySchema = z.object({
  user_id: z.string().uuid(),
})

export type InternalEnsureMachineBody = z.infer<typeof InternalEnsureMachineBodySchema>
