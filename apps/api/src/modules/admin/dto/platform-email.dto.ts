import { z } from 'zod'

export const PlatformEmailDomainDto = z.object({
  domain: z.string().min(1, 'Domain is required'),
  subdomain: z.string().max(200).optional(),
})
export type PlatformEmailDomainDto = z.infer<typeof PlatformEmailDomainDto>

export const PlatformEmailSenderDto = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
  replyTo: z.string().email().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  /** SendGrid verified senders: ISO 3166-1 alpha-2 only */
  country: z
    .string()
    .length(2, 'Country must be a 2-letter ISO code (e.g. US)')
    .regex(/^[A-Za-z]{2}$/, 'Country must be letters only (e.g. US)')
    .transform((s) => s.toUpperCase()),
  /** SendGrid: at most 2 characters (e.g. CA); leave empty if not applicable */
  state: z.string().max(2, 'State/region must be at most 2 characters (e.g. CA)').optional(),
  zip: z.string().max(32).optional(),
})
export type PlatformEmailSenderDto = z.infer<typeof PlatformEmailSenderDto>
