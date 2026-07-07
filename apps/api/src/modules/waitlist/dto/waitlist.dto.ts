import { z } from 'zod'

export const WaitlistJoinDto = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(200).optional(),
  source: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  heard_from: z.string().max(200).optional(),
  use_case: z.string().max(200).optional(),
})
export type WaitlistJoinDto = z.infer<typeof WaitlistJoinDto>

export const RegisterWithInviteDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  code: z.string().min(1, 'Invite code is required'),
})
export type RegisterWithInviteDto = z.infer<typeof RegisterWithInviteDto>

export const FastTrackCheckoutDto = z.object({
  email: z.string().email('Invalid email address'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})
export type FastTrackCheckoutDto = z.infer<typeof FastTrackCheckoutDto>
