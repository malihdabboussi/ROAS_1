import { z } from 'zod'

export const ClientErrorLogSchema = z.object({
  app: z.enum(['web', 'funnels']).optional(),
  feature: z.string().min(1).max(120),
  error_code: z.string().max(80).optional().nullable(),
  message: z.string().min(1).max(2000),
  severity: z.enum(['error', 'warn', 'critical']).optional(),
  stack: z.string().max(8000).optional().nullable(),
  component_stack: z.string().max(8000).optional().nullable(),
  source_context: z.record(z.string(), z.unknown()).optional().nullable(),
  url: z.string().max(1000).optional().nullable(),
  route: z.string().max(512).optional().nullable(),
  trace_id: z.string().uuid().optional().nullable(),
  message_id: z.string().uuid().optional().nullable(),
  request_id: z.string().max(256).optional().nullable(),
  run_id: z.string().max(256).optional().nullable(),
  conversation_id: z.string().uuid().optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional(),
})

export type ClientErrorLogBody = z.infer<typeof ClientErrorLogSchema>
