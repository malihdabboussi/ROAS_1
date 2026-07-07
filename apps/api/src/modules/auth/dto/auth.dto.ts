import { z } from 'zod'

export const LoginDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
export type LoginDto = z.infer<typeof LoginDto>

export const RegisterDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
export type RegisterDto = z.infer<typeof RegisterDto>

export const OAuthDto = z.object({
  provider: z.enum(['google', 'github']),
  message: z.string().optional(),
})
export type OAuthDto = z.infer<typeof OAuthDto>

export const ForgotPasswordDto = z.object({
  email: z.string().email('Invalid email address'),
})
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDto>
