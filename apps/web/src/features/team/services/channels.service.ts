import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { AgentChannel } from '@/lib/agents/agent-channels'

export type { AgentChannel } from '@/lib/agents/agent-channels'

export interface TelegramBotValidation {
  valid: boolean
  bot_id: number
  bot_username: string
  bot_first_name: string
}

export interface TelegramConnectResult {
  channel_id: string
  bot_username: string
}

export interface SlackInstallUrlResult {
  url: string
}

export interface SlackWorkspaceChannel {
  id: string
  name: string
}

export interface SlackChannelMapResult {
  channel_id: string
  channel_name: string
}

export async function validateTelegramToken(botToken: string): Promise<TelegramBotValidation> {
  return backendPost<TelegramBotValidation>('/api/telegram/validate-token', { bot_token: botToken })
}

export async function connectTelegram(
  agentKey: string,
  botToken: string,
): Promise<TelegramConnectResult> {
  return backendPost<TelegramConnectResult>('/api/telegram/connect', {
    agent_key: agentKey,
    bot_token: botToken,
  })
}

export async function disconnectTelegram(agentKey: string): Promise<void> {
  await backendDelete(`/api/telegram/disconnect/${agentKey}`)
}

export async function listAgentChannels(): Promise<AgentChannel[]> {
  return backendGet<AgentChannel[]>('/api/telegram/channels')
}

export async function toggleTelegramChannel(
  agentKey: string,
  isActive: boolean,
): Promise<AgentChannel> {
  return backendPatch<AgentChannel>(`/api/telegram/channel/${agentKey}/toggle`, {
    is_active: isActive,
  })
}

export async function setTelegramVisibility(
  agentKey: string,
  isPublic: boolean,
): Promise<AgentChannel> {
  return backendPatch<AgentChannel>(`/api/telegram/channel/${agentKey}/visibility`, {
    is_public: isPublic,
  })
}

export async function updateTelegramSettings(
  agentKey: string,
  settings: { default_campaign_id?: string | null },
): Promise<AgentChannel> {
  return backendPatch<AgentChannel>(`/api/telegram/channel/${agentKey}/settings`, settings)
}

export async function checkTelegramVerification(
  agentKey: string,
): Promise<{ verified: boolean; telegram_username?: string }> {
  return backendGet<{ verified: boolean; telegram_username?: string }>(
    `/api/telegram/verify-status/${agentKey}`,
  )
}

export async function getSlackInstallUrl(agentKey: string): Promise<SlackInstallUrlResult> {
  const qs = new URLSearchParams({ agent_key: agentKey })
  return backendGet<SlackInstallUrlResult>(`/api/slack/install?${qs.toString()}`)
}

export async function listSlackWorkspaceChannels(): Promise<SlackWorkspaceChannel[]> {
  return backendGet<SlackWorkspaceChannel[]>('/api/slack/workspace-channels')
}

export async function mapSlackChannel(
  agentKey: string,
  channelId: string,
  channelName: string,
): Promise<SlackChannelMapResult> {
  return backendPost<SlackChannelMapResult>('/api/slack/channel-map', {
    agent_key: agentKey,
    channel_id: channelId,
    channel_name: channelName,
  })
}

export async function disconnectSlack(agentKey: string): Promise<void> {
  await backendDelete(`/api/slack/disconnect/${agentKey}`)
}

export async function toggleSlackChannel(
  agentKey: string,
  isActive: boolean,
): Promise<AgentChannel> {
  return backendPatch<AgentChannel>(`/api/slack/channel/${agentKey}/toggle`, {
    is_active: isActive,
  })
}
