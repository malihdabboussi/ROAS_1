import { z } from 'zod'

export const ConnectGhlPitSchema = z.object({
  pit: z.string().min(8, 'Private Integration Token is required'),
  locationId: z.string().min(1, 'locationId is required'),
})

export type ConnectGhlPitDto = z.infer<typeof ConnectGhlPitSchema>

export const UpsertGhlLeadContactSchema = z.object({
  leadId: z.string().uuid('leadId must be a UUID'),
  email: z.string().email('email must be valid'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
})

export type UpsertGhlLeadContactDto = z.infer<typeof UpsertGhlLeadContactSchema>

const legacyHttpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

export const GhlProxyRequestSchema = z.object({
  gh_method: legacyHttpMethod,
  gh_path: z.string().min(1).regex(/^\//, 'gh_path must start with /'),
  gh_query: z.record(z.string()).optional(),
  gh_body: z.unknown().optional(),
  gh_version: z.string().min(1).optional(),
})

export type GhlProxyRequestDto = z.infer<typeof GhlProxyRequestSchema>
