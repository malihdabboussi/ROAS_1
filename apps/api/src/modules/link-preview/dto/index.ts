import { z } from 'zod'

export const ResolveLinkPreviewsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
})
export type ResolveLinkPreviewsDto = z.infer<typeof ResolveLinkPreviewsSchema>
