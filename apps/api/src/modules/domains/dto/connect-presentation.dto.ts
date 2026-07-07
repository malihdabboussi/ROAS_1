import { z } from 'zod'

export const ConnectPresentationSchema = z.object({
  domain_id: z.string().uuid(),
  presentation_id: z.string().uuid(),
})

export type ConnectPresentationDto = z.infer<typeof ConnectPresentationSchema>
