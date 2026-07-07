import { z } from 'zod'

export const OpenAICodexConnectSchema = z.object({
  redirectTo: z.string().optional(),
})

export const OpenAICodexCompleteCallbackSchema = z
  .object({
    callbackUrl: z.string().optional(),
    code: z.string().optional(),
    state: z.string().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.callbackUrl?.trim()) || Boolean(value.code?.trim() && value.state?.trim()),
    { message: 'callbackUrl or code/state is required' },
  )
