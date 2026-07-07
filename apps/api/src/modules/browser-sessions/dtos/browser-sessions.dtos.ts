import { z } from 'zod'

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

const DomainSchema = z
  .string()
  .min(1)
  .max(256)
  .transform((s) => s.trim().replace(/^\./, '').toLowerCase())
  .refine((s) => DOMAIN_REGEX.test(s), { message: 'Invalid domain' })

export const BrowserSessionCookieSchema = z.object({
  name: z.string().min(1).max(256),
  value: z.string().max(8192),
  domain: z.string().max(256).optional(),
  path: z.string().max(512).optional(),
  expires: z.number().finite().nonnegative().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.enum(['Lax', 'None', 'Strict']).optional(),
})
export type BrowserSessionCookieInput = z.infer<typeof BrowserSessionCookieSchema>

export const SyncCookiesDto = z.object({
  domain: DomainSchema,
  cookies: z.array(BrowserSessionCookieSchema).min(1).max(500),
})
export type SyncCookiesInput = z.infer<typeof SyncCookiesDto>

export const PatchSessionDto = z.object({
  disabled: z.boolean(),
})
export type PatchSessionInput = z.infer<typeof PatchSessionDto>

export const DomainParamDto = z.object({
  domain: DomainSchema,
})
export type DomainParamInput = z.infer<typeof DomainParamDto>
