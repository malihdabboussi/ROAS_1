import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { ArtifactsService } from '../../artifacts/services/artifacts.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'

type BrainImportRuntimeExecutionChunk = {
  index: number
  total: number
  userPrompt: string
}

type BrainImportRuntimeExecutionPayload = {
  jobId: string
  userId: string
  orgId: string | null
  jobType: string
  title: string
  attempts: number
  agentKey: 'atlas'
  targetBrain: 'user' | 'campaign' | 'agent' | 'customer'
  contentType: string
  campaignId?: string
  brainId?: string
  lane: string
  systemPrompt: string
  chunksTotal: number
  chunks: BrainImportRuntimeExecutionChunk[]
}

type BrainImportClaimResponse =
  | { success: true; claimed: false; reason?: string }
  | {
      success: true
      claimed: true
      job_id: string
      attempts: number
      execution: BrainImportRuntimeExecutionPayload
    }

type BrainImportTerminalStatus = 'done' | 'failed' | 'skipped'

export type BrainImportRuntimeTerminal = {
  type: 'terminal'
  status: BrainImportTerminalStatus
  job_id: string
  message?: string
  result?: Record<string, unknown>
}

@Injectable()
export class BrainImportRuntimeService {
  private readonly logger = new Logger(BrainImportRuntimeService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly artifacts: ArtifactsService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
  ) {}

  async execute(jobId: string): Promise<BrainImportRuntimeTerminal> {
    const claim = await this.postMainApi<BrainImportClaimResponse>(
      `/api/internal/brain/import-jobs/${encodeURIComponent(jobId)}/claim`,
      { jobId },
    )
    if (!claim.claimed) {
      return {
        type: 'terminal',
        status: 'skipped',
        job_id: jobId,
        message: claim.reason ?? 'Job was not claimable',
      }
    }

    const execution = claim.execution
    try {
      const result = await this.executeClaimedPlan(execution)
      await this.postMainApi(
        `/api/internal/brain/import-jobs/${encodeURIComponent(jobId)}/succeed`,
        {
          attempts: execution.attempts,
          result,
        },
      )
      return {
        type: 'terminal',
        status: 'done',
        job_id: jobId,
        result,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await this.postMainApi(`/api/internal/brain/import-jobs/${encodeURIComponent(jobId)}/fail`, {
        attempts: execution.attempts,
        message,
      }).catch((failErr) => {
        this.logger.warn(
          `Failed to notify API of brain import failure job=${jobId}: ${String(failErr)}`,
        )
      })
      return {
        type: 'terminal',
        status: 'failed',
        job_id: jobId,
        message,
      }
    }
  }

  private async executeClaimedPlan(
    execution: BrainImportRuntimeExecutionPayload,
  ): Promise<Record<string, unknown>> {
    let lastResponseText = ''
    const gatewayAgentId = this.agentRuntime.resolveGatewayAgentId(
      execution.agentKey,
      execution.orgId,
      execution.userId,
    )

    if (execution.chunks.length > 0) {
      await this.runtimeReadiness.ensureRuntimeReady({
        userId: execution.userId,
        orgId: execution.orgId,
        agentKey: execution.agentKey,
        gatewayAgentId,
      })
    }

    for (const chunk of execution.chunks) {
      const result = await this.callAtlas(execution, chunk, gatewayAgentId)
      lastResponseText = this.extractAtlasResponseText(result)
      const status = this.parseJobStatus(lastResponseText)
      if (status.status === 'failed') {
        throw new Error(`Atlas could not process: ${status.reason}`)
      }
      await this.postMainApi(
        `/api/internal/brain/import-jobs/${encodeURIComponent(execution.jobId)}/progress`,
        {
          attempts: execution.attempts,
          chunksCompleted: chunk.index + 1,
          chunksTotal: chunk.total,
        },
      )
    }

    const finalStatus = this.parseJobStatus(lastResponseText)
    if (finalStatus.status === 'failed') {
      throw new Error(`Atlas could not process: ${finalStatus.reason}`)
    }

    return {
      status: finalStatus.status,
      reason: finalStatus.reason,
      chunks_processed: execution.chunksTotal,
      atlasResponse: lastResponseText,
    }
  }

  private async callAtlas(
    execution: BrainImportRuntimeExecutionPayload,
    chunk: BrainImportRuntimeExecutionChunk,
    gatewayAgentId: string,
  ): Promise<Record<string, unknown>> {
    const body = {
      model: `openclaw:${gatewayAgentId}`,
      stream: false,
      lane: execution.lane,
      input: chunk.userPrompt,
      instructions: execution.systemPrompt,
      metadata: {
        user_id: execution.userId,
        agent_key: execution.agentKey,
        ...(execution.orgId ? { org_id: execution.orgId } : {}),
      },
    }

    const result = await this.artifacts.proxyOpenClawResponses(
      body,
      this.buildSessionKey(execution, gatewayAgentId),
      gatewayAgentId,
      {
        correlationId: `brain-import-${execution.jobId}`,
        orgId: execution.orgId ?? undefined,
      },
    )
    return result && typeof result === 'object'
      ? (result as Record<string, unknown>)
      : { content: String(result ?? '') }
  }

  private async postMainApi<T = Record<string, unknown>>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const token = this.internalToken()
    if (!token) throw new Error('INTERNAL_API_TOKEN is required for brain import runtime execution')

    const response = await fetch(`${this.mainApiUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      throw new Error(
        `Main API brain import lifecycle request failed path=${path} status=${response.status}: ${
          raw || response.statusText
        }`,
      )
    }
    const raw = await response.text().catch(() => '')
    return (raw ? JSON.parse(raw) : { success: true }) as T
  }

  private buildSessionKey(
    execution: BrainImportRuntimeExecutionPayload,
    gatewayAgentId: string,
  ): string {
    const campaignSuffix = execution.campaignId ? `::campaign:${execution.campaignId}` : ''
    const brainSuffix = execution.targetBrain
      ? `::brain:${execution.targetBrain}${execution.brainId ? `:${execution.brainId}` : ''}`
      : ''
    const orgSuffix = execution.orgId ? `::org:${execution.orgId}` : ''
    return `agent:${gatewayAgentId}:${execution.agentKey}-brain-job-${execution.userId}:${Date.now()}${campaignSuffix}${brainSuffix}${orgSuffix}`
  }

  private extractAtlasResponseText(result: Record<string, unknown>): string {
    if (typeof result.content === 'string') return result.content
    if (typeof result.text === 'string') return result.text
    if (typeof result.message === 'string') return result.message
    if (typeof result.output_text === 'string') return result.output_text
    const output = Array.isArray(result.output) ? result.output : []
    const outputText = output
      .flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const record = item as Record<string, unknown>
        if (typeof record.text === 'string') return [record.text]
        if (!Array.isArray(record.content)) return []
        return record.content.flatMap((part) => {
          if (!part || typeof part !== 'object') return []
          const text = (part as Record<string, unknown>).text
          return typeof text === 'string' ? [text] : []
        })
      })
      .join('\n')
      .trim()
    if (outputText) return outputText
    const choices = result.choices as Array<{ message?: { content?: string } }> | undefined
    if (choices?.[0]?.message?.content) return choices[0].message.content
    return JSON.stringify(result)
  }

  private parseJobStatus(text: string): {
    status: 'completed' | 'failed' | 'skipped'
    reason: string
  } {
    const match = text.match(/^\s*JOB_STATUS:(completed|failed|skipped)\b([^\r\n]*)/m)
    if (match) {
      const status = match[1] as 'completed' | 'failed' | 'skipped'
      const reason = match[2].replace(/^[\s—–-]+/, '').trim()
      const fallbackReason =
        status === 'completed'
          ? 'Processed successfully'
          : status === 'failed'
            ? 'Unknown failure'
            : 'Skipped'
      return { status, reason: reason || fallbackReason }
    }
    return { status: 'failed', reason: 'Missing required JOB_STATUS terminal marker' }
  }

  private mainApiUrl(): string {
    const configured =
      this.config.get<string>('MAIN_API_URL') ||
      process.env.MAIN_API_URL ||
      process.env.API_URL ||
      process.env.BACKEND_URL ||
      'http://localhost:3001'
    return configured.replace(/\/+$/, '')
  }

  private internalToken(): string {
    return (
      this.config.get<string>('INTERNAL_API_TOKEN') ||
      process.env.INTERNAL_API_TOKEN ||
      ''
    ).trim()
  }
}
