import { z } from 'zod'

export const CreateDomainSchema = z.object({
  domain: z
    .string()
    .min(4, 'Domain must be at least 4 characters')
    .max(255, 'Domain must be less than 255 characters')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/, 'Invalid domain format (e.g., example.com)'),
  subdomain: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z
      .string()
      .max(63, 'Subdomain must be less than 63 characters')
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/, 'Invalid subdomain format (e.g., mail, send, em)')
      .optional(),
  ),
  isDefault: z.boolean().default(false),
  customDkimSelector: z
    .string()
    .length(3, 'DKIM selector must be exactly 3 characters')
    .regex(/^[a-zA-Z0-9]{3}$/, 'DKIM selector must be 3 alphanumeric characters (e.g., vo1)')
    .optional(),
})

export type CreateDomainInput = z.infer<typeof CreateDomainSchema>
