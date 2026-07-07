import { z } from 'zod'

export const ConnectFirefliesSchema = z.object({
  apiKey: z.string().min(1),
})

export const ListFirefliesTranscriptsSchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional(),
  skip: z.coerce.number().min(0).optional(),
  title: z.string().optional(),
})
