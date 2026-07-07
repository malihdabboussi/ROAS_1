import { z } from 'zod'

export const OpenDmSchema = z.object({
  target_user_id: z.string().uuid(),
})
export type OpenDmInput = z.infer<typeof OpenDmSchema>

export const ListDmMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.string().datetime().optional(),
})
export type ListDmMessagesQueryInput = z.infer<typeof ListDmMessagesQuerySchema>

export const SendDmMessageSchema = z
  .object({
    content: z.string().trim().max(8000).optional(),
    content_blocks: z.array(z.record(z.unknown())).optional(),
    metadata: z.record(z.unknown()).optional(),
    attachments: z.array(z.string().url()).max(10).optional(),
  })
  .refine(
    (value) =>
      !!value.content?.trim() ||
      (value.content_blocks?.length ?? 0) > 0 ||
      (value.attachments?.length ?? 0) > 0,
    { message: 'Message content or attachments are required.' },
  )
export type SendDmMessageInput = z.infer<typeof SendDmMessageSchema>

export const EditDmMessageSchema = z.object({
  content: z.string().min(1).max(8000),
})
export type EditDmMessageInput = z.infer<typeof EditDmMessageSchema>
