import { z } from 'zod'

export const McpAuthorizeQueryDto = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(32),
  code_challenge_method: z.literal('S256'),
  resource: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  org_id: z.string().uuid().optional(),
})

export type McpAuthorizeQueryDto = z.infer<typeof McpAuthorizeQueryDto>

export const McpRegisterClientDto = z.object({
  client_name: z.string().min(1).optional(),
  client_uri: z.string().url().optional(),
  logo_uri: z.string().url().optional(),
  redirect_uris: z.array(z.string().min(1)).min(1),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z
    .enum(['none', 'client_secret_basic', 'client_secret_post'])
    .optional(),
})

export type McpRegisterClientDto = z.infer<typeof McpRegisterClientDto>

export const McpAuthorizeRequestParamDto = z.object({
  requestId: z.string().min(1),
})

export type McpAuthorizeRequestParamDto = z.infer<typeof McpAuthorizeRequestParamDto>

export const McpConsentDto = z.object({
  request_id: z.string().min(1),
  selected_scopes: z.array(z.string().min(1)).optional(),
  selected_org_id: z.string().uuid().nullable().optional(),
})

export type McpConsentDto = z.infer<typeof McpConsentDto>

export const McpTokenDto = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string().min(1),
  code_verifier: z.string().optional(),
  refresh_token: z.string().optional(),
  resource: z.string().url(),
})

export type McpTokenDto = z.infer<typeof McpTokenDto>

export const McpIntrospectDto = z.object({
  token: z.string().min(1),
})

export type McpIntrospectDto = z.infer<typeof McpIntrospectDto>

export const McpRevokeDto = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
})

export type McpRevokeDto = z.infer<typeof McpRevokeDto>
