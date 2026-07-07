import { z } from 'zod'

export const BroadcastSendSchema = z.object({
  send_type: z.literal('broadcast'),
  sequence_email_id: z.string().uuid().optional(),
  email_id: z.string().uuid().optional(),
  provider: z.string().min(1),
  list_id: z.string().optional(),
  segment_id: z.string().optional(),
  from_email: z.string().email(),
  from_name: z.string().min(1),
  schedule_date: z.string().datetime({ offset: true }).optional(),
})

export const SequenceSendSchema = z.object({
  send_type: z.literal('sequence'),
  sequence_id: z.string().uuid(),
  provider: z.string().min(1),
  list_id: z.string().optional(),
  segment_id: z.string().optional(),
  from_email: z.string().email(),
  from_name: z.string().min(1),
  start_date: z.string().datetime({ offset: true }).optional(),
})

export const EmailSendSchema = z
  .discriminatedUnion('send_type', [BroadcastSendSchema, SequenceSendSchema])
  .refine(
    (value) =>
      value.send_type !== 'broadcast' ||
      value.sequence_email_id !== undefined ||
      value.email_id !== undefined,
    { message: 'Either sequence_email_id or email_id is required' },
  )

export const PendingSendApproveSchema = z.object({
  pending_send_id: z.string().uuid(),
})

export type BroadcastSendPayload = z.infer<typeof BroadcastSendSchema>
export type SequenceSendPayload = z.infer<typeof SequenceSendSchema>
export type EmailSendPayload = z.infer<typeof EmailSendSchema>
