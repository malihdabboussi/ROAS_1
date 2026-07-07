import { z } from 'zod'

const MAX_SESSION_DURATION = 3600

export const StreamUsageSchema = z.object({
  durationSeconds: z
    .number()
    .positive('Duration must be positive')
    .max(MAX_SESSION_DURATION, 'Session duration exceeds maximum (1 hour)'),
  model: z.string().default('nova-2-multilingual'),
  metadata: z.record(z.string(), z.any()).optional(),
})

export type StreamUsageInput = z.infer<typeof StreamUsageSchema>

export interface StreamUsageResponse {
  success: boolean
  message?: string
  error?: string
}
