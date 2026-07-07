import { z } from 'zod'

export const ConnectFunnelSchema = z.object({
  domain_id: z.string().uuid(),
  funnel_id: z.string().uuid(),
})

export type ConnectFunnelDto = z.infer<typeof ConnectFunnelSchema>
