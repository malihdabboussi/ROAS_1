import { Injectable, Logger } from '@nestjs/common'
import { verifyProjectSessionKey } from '@vibey/api-shared'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { CreditsService } from '../../billing/services/credits.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { ProjectRuntimeRepository } from '../repositories/project-runtime.repository'

interface AgentCallInput {
  projectId: string
  agentKey: string
  message: string
  context?: Record<string, unknown>
  sessionKey: string
}

interface AgentCallResult {
  content: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
    total_tokens: number
  }
}

@Injectable()
export class ProjectAgentCallService {
  private readonly logger = new Logger(ProjectAgentCallService.name)
  private readonly REQUEST_TIMEOUT_MS = 600_000

  constructor(
    private readonly repository: ProjectRuntimeRepository,
    private readonly creditsService: CreditsService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
  ) {}

  private get gatewayUrl(): string {
    return process.env.OPENCLAW_GATEWAY_URL ?? 'http://localhost:18789'
  }

  private get gatewayToken(): string {
    return process.env.OPENCLAW_GATEWAY_TOKEN ?? ''
  }

  validateSessionKey(projectId: string, sessionKey: string): boolean {
    return verifyProjectSessionKey(projectId, sessionKey, process.env.VIBEY_SESSION_KEY)
  }

  async callAgent(input: AgentCallInput): Promise<AgentCallResult> {
    const { projectId, agentKey, message, context } = input
    const { data: project, error: projectError } =
      await this.repository.findAgentCallProject(projectId)
    if (projectError || !project?.user_id) {
      throw new Error('Project not found')
    }
    await this.creditsService.assertHasAvailableCredits(
      String(project.user_id),
      project.org_id ? String(project.org_id) : null,
    )
    const runtime = await this.agentRuntime.resolveConversationRuntime(
      this.repository.client,
      String(project.user_id),
      agentKey,
      project.org_id ? String(project.org_id) : null,
    )
    await this.runtimeReadiness.ensureRuntimeReady({
      userId: String(project.user_id),
      orgId: project.org_id ? String(project.org_id) : null,
      agentKey: runtime.agentKey,
      gatewayAgentId: runtime.gatewayAgentId,
    })

    const contextLines: string[] = [
      `[Project App Request]`,
      `project_id: ${projectId}`,
      `This is a programmatic request from a running Vibey project app.`,
      `Respond with the requested analysis or output only. No conversational filler.`,
    ]
    if (context) {
      contextLines.push(`Additional context: ${JSON.stringify(context)}`)
    }

    const payload = {
      model: `openclaw:${runtime.gatewayAgentId}`,
      input: [
        {
          type: 'message',
          role: 'user',
          content: message,
        },
      ],
      instructions: contextLines.join('\n'),
      stream: false,
      max_output_tokens: 16_000,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.gatewayToken}`,
      'X-OpenClaw-Agent-Id': runtime.gatewayAgentId,
    }

    this.logger.log(
      `[AgentCall] project=${projectId} agent=${runtime.gatewayAgentId} message_len=${message.length}`,
    )

    const res = await fetch(`${this.gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      throw new Error(`Gateway returned ${res.status}: ${errorText.slice(0, 300)}`)
    }

    const responseBody = (await res.json()) as Record<string, unknown>

    const content = this.extractContent(responseBody)
    const usage = this.extractUsage(responseBody)
    const responseMetadata = this.extractMetadata(responseBody)
    const responseModel = this.extractMetadataString(responseMetadata, [
      'resolved_model_id',
      'provider_model',
      'actual_model',
    ])
    const billedModelName =
      responseModel ?? String(responseBody.model ?? `openclaw:${runtime.gatewayAgentId}`)
    const contextWindowTokens = this.extractMetadataNumber(
      responseMetadata,
      'context_window_tokens',
    )
    if (usage) {
      await this.creditsService.processDirectTextUsage({
        userId: String(project.user_id),
        orgId: project.org_id ? String(project.org_id) : undefined,
        feature: 'project_agent',
        action: agentKey,
        modelName: billedModelName,
        usage: {
          input: Math.max(
            0,
            usage.input_tokens - usage.cache_read_input_tokens - usage.cache_creation_input_tokens,
          ),
          output: usage.output_tokens,
          cacheRead: usage.cache_read_input_tokens,
          cacheWrite: usage.cache_creation_input_tokens,
          totalTokens: usage.total_tokens,
        },
        costSource: 'gateway_tokens',
        contextWindowTokens,
        resolvedModelId: billedModelName,
        metadata: {
          project_id: projectId,
          agent_key: runtime.agentKey,
          gateway_agent_id: runtime.gatewayAgentId,
          response_model: responseBody.model ?? null,
          ...(responseModel ? { resolved_model_id: responseModel } : {}),
        },
      })
    }

    this.logger.log(
      `[AgentCall] project=${projectId} agent=${runtime.gatewayAgentId} content_len=${content.length}`,
    )

    return { content, usage }
  }

  private extractContent(response: Record<string, unknown>): string {
    const output = response.output
    if (!Array.isArray(output)) return String(response.content ?? response.text ?? '')

    const textParts: string[] = []
    for (const item of output) {
      if (item && typeof item === 'object') {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part?.type === 'output_text' && typeof part.text === 'string') {
              textParts.push(part.text)
            }
          }
        }
      }
    }
    return textParts.join('\n') || String(response.content ?? '')
  }

  private extractUsage(response: Record<string, unknown>):
    | {
        input_tokens: number
        output_tokens: number
        cache_read_input_tokens: number
        cache_creation_input_tokens: number
        total_tokens: number
      }
    | undefined {
    const usage = response.usage
    if (!usage || typeof usage !== 'object') return undefined
    const u = usage as Record<string, unknown>
    const input_tokens = typeof u.input_tokens === 'number' ? u.input_tokens : 0
    const output_tokens = typeof u.output_tokens === 'number' ? u.output_tokens : 0
    const cache_read_input_tokens =
      typeof u.cache_read_input_tokens === 'number' ? u.cache_read_input_tokens : 0
    const cache_creation_input_tokens =
      typeof u.cache_creation_input_tokens === 'number' ? u.cache_creation_input_tokens : 0
    const total_tokens =
      typeof u.total_tokens === 'number' ? u.total_tokens : input_tokens + output_tokens
    return {
      input_tokens,
      output_tokens,
      cache_read_input_tokens,
      cache_creation_input_tokens,
      total_tokens,
    }
  }

  private extractMetadata(response: Record<string, unknown>): Record<string, unknown> {
    return response.metadata && typeof response.metadata === 'object'
      ? (response.metadata as Record<string, unknown>)
      : {}
  }

  private extractMetadataString(
    metadata: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = metadata[key]
      if (typeof value === 'string' && value.trim()) return value
    }
    return undefined
  }

  private extractMetadataNumber(
    metadata: Record<string, unknown>,
    key: string,
  ): number | undefined {
    const value = metadata[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }
}
