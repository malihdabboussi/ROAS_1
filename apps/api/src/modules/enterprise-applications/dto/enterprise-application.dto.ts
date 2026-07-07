import { z } from 'zod'

export const EnterpriseApplicationDto = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(200).optional(),
  company_name: z.string().min(1, 'Company name is required').max(200),
  company_size: z.enum(['1-10', '11-50', '51-200', '200+']),
  role_title: z.string().max(200).optional(),
  use_case: z.string().max(2000).optional(),
  team_size: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(500).optional(),
})
export type EnterpriseApplicationDto = z.infer<typeof EnterpriseApplicationDto>
