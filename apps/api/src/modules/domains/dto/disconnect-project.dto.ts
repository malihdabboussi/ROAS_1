import { z } from 'zod'

export const DisconnectProjectSchema = z.object({
  project_id: z.string().uuid(),
})

export type DisconnectProjectDto = z.infer<typeof DisconnectProjectSchema>
