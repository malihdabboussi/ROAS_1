import { z } from 'zod'

export const DeepgramStreamConfigSchema = z.object({
  model: z.string().default('nova-2'),
  interim_results: z.boolean().default(true),
  smart_format: z.boolean().default(true),
  language: z.string().default('en-US'),
})

export type DeepgramStreamConfig = z.infer<typeof DeepgramStreamConfigSchema>

export interface StreamConfigResponse {
  success: boolean
  apiKey: string
  config: DeepgramStreamConfig
}
