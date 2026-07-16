import { z } from 'zod'

export const ConnectPageGraderSchema = z.object({
  baseUrl: z.string().url().min(1),
  apiKey: z.string().min(1),
})

export type ConnectPageGraderDto = z.infer<typeof ConnectPageGraderSchema>

export const ListPageGraderClientsSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
})

export type ListPageGraderClientsDto = z.infer<typeof ListPageGraderClientsSchema>

export const SendPageGraderWorkSchema = z.object({
  client_id: z.string().uuid(),
  note: z.string().max(4000).optional(),
  space_id: z.string().uuid(),
  space_item_ids: z.array(z.string().uuid()).min(1).max(50),
})

export type SendPageGraderWorkDto = z.infer<typeof SendPageGraderWorkSchema>
