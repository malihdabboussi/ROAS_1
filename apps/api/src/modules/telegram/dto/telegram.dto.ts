import { z } from 'zod'

export const ValidateTokenDtoSchema = z.object({
  bot_token: z
    .string()
    .min(10)
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid Telegram bot token format'),
})
export type ValidateTokenDto = z.infer<typeof ValidateTokenDtoSchema>

export const ConnectTelegramDtoSchema = z.object({
  bot_token: z.string().min(10),
  agent_key: z.string().min(1),
})
export type ConnectTelegramDto = z.infer<typeof ConnectTelegramDtoSchema>

export const AgentKeyParamSchema = z.object({
  agentKey: z.string().min(1),
})
export type AgentKeyParam = z.infer<typeof AgentKeyParamSchema>
