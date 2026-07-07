import { z } from 'zod'

export const ConnectActiveCampaignSchema = z.object({
  apiUrl: z.string().url().min(1),
  apiKey: z.string().min(1),
})

export const IdParamSchema = z.object({
  id: z.string().min(1),
})

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
})
