import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  SLACK_EMPTY_PERIOD_SKIP_REASON,
  interpretAtlasImportJobStatus,
  isSlackPeriodImportContent,
} from '@vibey/api-shared'
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
    if (execution.chunks.length === 0) {
      if (isSlackPeriodImportContent(execution.contentType)) {
        return {
          status: 'skipped',
          reason: SLACK_EMPTY_PERIOD_SKIP_REASON,
          chunks_processed: 0,
          atlasResponse: `JOB_STATUS:skipped — ${SLACK_EMPTY_PERIOD_SKIP_REASON}`,
        }
      }
      throw new Error('Atlas could not process: Missing import content')
    }

    let lastResponseText = ''
    const gatewayAgentId = this.agentRuntime.resolveGatewayAgentId(
      execution.agentKey,
      execution.orgId,
      execution.userId,
    )

    await this.runtimeReadiness.ensureRuntimeReady({
      userId: execution.userId,
      orgId: execution.orgId,
      agentKey: execution.agentKey,
      gatewayAgentId,
    })

    for (const chunk of execution.chunks) {
      const result = await this.callAtlas(execution, chunk, gatewayAgentId)
      lastResponseText = this.extractAtlasResponseText(result)
      const status = this.parseJobStatus(lastResponseText, execution.contentType)
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

    const finalStatus = this.parseJobStatus(lastResponseText, execution.contentType)
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
    return this.extractAtlasResponseValue(result, 0) || JSON.stringify(result)
  }

  private extractAtlasResponseValue(value: unknown, depth: number): string {
    if (depth > 10 || value === null || value === undefined) return ''
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 1) {
        try {
          const nested = this.extractAtlasResponseValue(JSON.parse(trimmed), depth + 1)
          if (nested) return nested
        } catch {
          // Plain agent text can begin with JSON-like punctuation.
        }
      }
      return value
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => this.extractAtlasResponseValue(item, depth + 1))
        .filter(Boolean)
        .join('\n')
        .trim()
    }
    if (typeof value !== 'object') return ''

    const record = value as Record<string, unknown>
    for (const key of ['content', 'text', 'message', 'output_text', 'atlasResponse']) {
      if (!(key in record)) continue
      const extracted = this.extractAtlasResponseValue(record[key], depth + 1)
      if (extracted) return extracted
    }
    for (const key of ['output', 'choices']) {
      if (!(key in record)) continue
      const extracted = this.extractAtlasResponseValue(record[key], depth + 1)
      if (extracted) return extracted
    }
    return ''
  }

  private parseJobStatus(
    text: string,
    contentType: string,
  ): {
    status: 'completed' | 'failed' | 'skipped'
    reason: string
  } {
    return interpretAtlasImportJobStatus(text, contentType)
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
