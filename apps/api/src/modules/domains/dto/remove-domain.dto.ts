import { z } from 'zod'

export const RemoveDomainSchema = z.object({
  domain_id: z.string().uuid(),
})

export type RemoveDomainDto = z.infer<typeof RemoveDomainSchema>
