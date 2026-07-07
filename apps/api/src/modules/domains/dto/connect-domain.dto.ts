import { z } from 'zod'

export const ConnectDomainSchema = z.object({
  domain_id: z.string().uuid(),
  landing_page_id: z.string().uuid().optional(),
})

export type ConnectDomainDto = z.infer<typeof ConnectDomainSchema>
