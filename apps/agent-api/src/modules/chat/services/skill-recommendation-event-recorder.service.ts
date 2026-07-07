import { createHash } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'

type RecordedCommand = {
  key: string
  type: 'skill' | 'workflow'
}

type RecordedToolStep = {
  name?: string
  label?: string
  status?: string
}

@Injectable()
export class SkillRecommendationEventRecorderService {
  private readonly logger = new Logger(SkillRecommendationEventRecorderService.name)
  private readonly settingsCache = new Map<string, { enabled: boolean; expiresAt: number }>()

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: ChatRuntimeRepository = new ChatRuntimeRepository(),
  ) {}

  async recordCompletion(input: {
    userId: string
    orgId?: string | null
    agentKey: string
    conversationId: string
    traceId?: string | null
    channel?: string | null
    prompt: string
    response: string
    toolSteps: RecordedToolStep[]
    resolvedCommands: RecordedCommand[]
  }): Promise<void> {
    if (!input.orgId) return
    if (!input.prompt.trim()) return
    if (!input.response.trim() && input.toolSteps.length === 0) return

    const enabled = await this.isEnabled(input.orgId)
    if (!enabled) return

    const skillKeys = input.resolvedCommands
      .filter((command) => command.type === 'skill')
      .map((command) => command.key)
    const workflowKeys = input.resolvedCommands
      .filter((command) => command.type === 'workflow')
      .map((command) => command.key)
    const toolNames = this.normalizeToolNames(input.toolSteps)

    const error = await this.repository.insertSkillRecommendationEvent(this.svc.client, {
      user_id: input.userId,
      org_id: input.orgId,
      agent_key: input.agentKey,
      conversation_id: input.conversationId,
      trace_id: input.traceId ?? null,
      channel: input.channel ?? null,
      prompt_fingerprint: this.fingerprintPrompt(input.prompt),
      prompt_excerpt: this.safeExcerpt(input.prompt),
      tool_signature: this.toolSignature(toolNames),
      tool_names: toolNames,
      skill_keys_used: skillKeys,
      workflow_keys_used: workflowKeys,
      status: 'completed',
    })

    if (error?.message?.includes('uq_skill_recommendation_events_trace')) return
    if (error) {
      this.logger.warn(`Failed to record skill recommendation event: ${error.message}`)
    }
  }

  private async isEnabled(orgId: string): Promise<boolean> {
    const cached = this.settingsCache.get(orgId)
    if (cached && cached.expiresAt > Date.now()) return cached.enabled

    const data = await this.repository.findOrganizationSettings(this.svc.client, orgId)
    const settings = data?.settings
    const raw =
      settings && typeof settings === 'object' && !Array.isArray(settings)
        ? (settings as Record<string, unknown>).skill_recommendations
        : null
    const enabled =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>).enabled === true
        : false
    this.settingsCache.set(orgId, { enabled, expiresAt: Date.now() + 60_000 })
    return enabled
  }

  private normalizeToolNames(toolSteps: RecordedToolStep[]): string[] {
    const names = toolSteps
      .filter((step) => step.status !== 'failed')
      .map((step) => step.name || step.label || '')
      .map((name) => name.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean)
    return [...new Set(names)].slice(0, 20)
  }

  private toolSignature(toolNames: string[]): string {
    if (toolNames.length === 0) return 'none'
    return toolNames.join('|')
  }

  private fingerprintPrompt(prompt: string): string {
    const normalized = prompt
      .toLowerCase()
      .replace(/\/[\w-]+/g, ' ')
      .replace(/https?:\/\/\S+/g, ' url ')
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, ' email ')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ' id ')
      .replace(/\b\d+\b/g, ' number ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((token) => token.length > 2)
      .slice(0, 36)
      .join(' ')
    return createHash('sha256')
      .update(normalized || 'empty')
      .digest('hex')
      .slice(0, 32)
  }

  private safeExcerpt(prompt: string): string {
    return prompt
      .replace(/https?:\/\/\S+/g, '[url]')
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email]')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[id]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280)
  }
}
