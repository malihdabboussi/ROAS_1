import { z } from 'zod'

export const DisconnectFunnelSchema = z.object({
  funnel_id: z.string().uuid(),
})

export type DisconnectFunnelDto = z.infer<typeof DisconnectFunnelSchema>
