import { z } from 'zod'

export const DisconnectPresentationSchema = z.object({
  presentation_id: z.string().uuid(),
})

export type DisconnectPresentationDto = z.infer<typeof DisconnectPresentationSchema>
