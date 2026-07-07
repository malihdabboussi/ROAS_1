import { z } from 'zod'

export const VerifyDomainSchema = z.object({
  domain_id: z.string().uuid(),
})

export type VerifyDomainDto = z.infer<typeof VerifyDomainSchema>
