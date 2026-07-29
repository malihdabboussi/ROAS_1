import {
  readChatModelSettingsFromValue,
  type ChatModelSettings,
} from '@/lib/chat/chat-model-settings'

const SYSTEM_LIKE_EXACT = new Set(['atlas', 'vibey', 'hr', 'viktor', 'delegator'])

export const SYSTEM_LIKE_AGENT_KEYS = {
  has(key: string): boolean {
    if (SYSTEM_LIKE_EXACT.has(key)) return true
    return key.startsWith('viktor_') || key.startsWith('atlas_') || key.startsWith('widget_builder')
  },
}

/**
 * Auto-assigned to every campaign by the API (`CampaignsService.ensureCoreCampaignAgents`).
 * Keep in sync with `CAMPAIGN_CORE_AGENT_KEYS` in `apps/api/.../campaigns.service.ts`.
 */
export const CAMPAIGN_CORE_AGENT_KEYS = new Set(['vibey', 'atlas', 'brain_scholar'])

const BRAIN_SHARE_EXACT = new Set(['atlas', 'hr', 'viktor'])

/** Atlas, HR, Viktor: system/special agents that still get Share your brain in Upgrade + manage auto-sync */
export const USER_BRAIN_SHARE_EXTENDED_AGENT_KEYS = {
  has(key: string): boolean {
    if (BRAIN_SHARE_EXACT.has(key)) return true
    return key.startsWith('viktor_') || key.startsWith('atlas_')
  },
}

export const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  working: 'Working',
  offline: 'Offline',
}

export const STATUS_BADGES: Record<string, string> = {
  online: 'badge-glass badge-glass-green',
  idle: 'badge-glass badge-glass-muted',
  working: 'badge-glass badge-glass-blue',
  offline: 'badge-glass badge-glass-muted',
}

/** Glass status dot on agent cards/lists; matches STATUS_BADGES (working = blue, online = green). Deactivated uses muted. */
export function agentPresenceStatusDotClass(agent: {
  is_active?: boolean | null
  status?: string | null
}): string {
  if (agent.is_active === false) return 'status-dot-glass status-dot-glass-muted'
  if (agent.status === 'working') return 'status-dot-glass status-dot-glass-blue'
  if (agent.status === 'online') return 'status-dot-glass status-dot-glass-emerald'
  if (agent.status === 'idle') return 'status-dot-glass status-dot-glass-muted'
  return 'status-dot-glass status-dot-glass-muted'
}

export function agentModelSettings(agent: { config?: unknown }): ChatModelSettings | null {
  const cfg = (agent.config as Record<string, unknown> | null | undefined) ?? {}
  return readChatModelSettingsFromValue(cfg.model_settings)
}
