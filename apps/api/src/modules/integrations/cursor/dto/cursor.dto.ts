import { z } from 'zod'

export const ConnectCursorSchema = z.object({
  apiKey: z.string().min(1).max(500),
  webhookSecret: z.string().max(500).optional(),
  connectionScope: z.enum(['personal', 'org_shared']).optional(),
})

export const DisconnectCursorSchema = z.object({
  connectionId: z.string().uuid().optional(),
})
