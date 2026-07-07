import { z } from 'zod'

export const ConnectProjectSchema = z.object({
  domain_id: z.string().uuid(),
  project_id: z.string().uuid(),
})

export type ConnectProjectDto = z.infer<typeof ConnectProjectSchema>
