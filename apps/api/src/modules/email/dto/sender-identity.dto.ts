import { z } from 'zod'

export const CreateSenderIdentitySchema = z.object({
  domainId: z.string().uuid('Invalid domain ID'),
  nickname: z.string().min(1, 'Nickname is required').max(100),
  fromEmail: z.string().email('Invalid email address'),
  fromName: z.string().min(1, 'Sender name is required').max(100),
  replyToEmail: z.string().email('Invalid reply-to email').optional(),
  replyToName: z.string().max(100).optional(),
  address: z.string().min(1, 'Address is required').max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().min(1, 'Country is required').max(100),
})

export type CreateSenderIdentityInput = z.infer<typeof CreateSenderIdentitySchema>

export const UpdateSenderIdentitySchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  fromName: z.string().min(1).max(100).optional(),
  replyToEmail: z.string().email().optional(),
  replyToName: z.string().max(100).optional(),
  address: z.string().min(1).max(255).optional(),
  address2: z.string().max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().min(1).max(100).optional(),
  signature: z.string().optional(),
})

export type UpdateSenderIdentityInput = z.infer<typeof UpdateSenderIdentitySchema>
