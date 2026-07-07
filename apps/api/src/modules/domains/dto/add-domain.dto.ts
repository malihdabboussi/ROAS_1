import { z } from 'zod'

export const AddDomainSchema = z.object({
  domain_name: z
    .string()
    .min(4)
    .regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, 'Invalid domain name format'),
})

export type AddDomainDto = z.infer<typeof AddDomainSchema>
