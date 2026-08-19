import {
  interpretAtlasImportJobStatus,
  isSlackPeriodImportContent,
  SLACK_EMPTY_PERIOD_SKIP_REASON,
} from '@vibey/api-shared'
import { BrainImportJobsEnqueueBase } from './brain-import-jobs-enqueue.base'
import { BrainImportJobsBase } from './brain-import-jobs.base'
import type {
  BrainImportJobRecord,
  BrainImportRuntimeExecutionChunk,
  BrainImportRuntimeExecutionPayload,
} from './brain-import-jobs.types'

export abstract class BrainImportJobsExecutionBase extends BrainImportJobsEnqueueBase {
  protected abstract buildMissionInput(
    job: BrainImportJobRecord,
    payload: Record<string, unknown>,
  ): Promise<{
    targetBrain: 'user' | 'campaign' | 'agent' | 'customer'
    contentType: string
    title: string
    campaignId?: string
    input: Record<string, unknown>
  }>

  // ── Atlas Execution (no missions table) ──────────────────────────────────

  private stripBinaryFields(input: Record<string, unknown>): Record<string, unknown> {
    const stripped: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (BrainImportJobsBase.BINARY_PAYLOAD_KEYS.has(key)) continue
      stripped[key] = value
    }
    return stripped
  }

  protected async buildAtlasExecutionPlan(
    job: BrainImportJobRecord,
  ): Promise<BrainImportRuntimeExecutionPayload> {
    const payload = job.payload as Record<string, unknown>

    if (job.job_type === 'fathom_meeting_import' || job.job_type === 'campaign_fathom_import') {
      await this.ensureFathomTranscript(job, payload)
    }

    const { targetBrain, contentType, campaignId, input } = await this.buildMissionInput(
      job,
      payload,
    )

    const safeInput = this.stripBinaryFields(input)

    const sourceTitle = String(
      safeInput.meetingTitle || safeInput.sourceTitle || safeInput.title || job.title || 'Untitled',
    )
    const sourceId = String(safeInput.sessionKey || safeInput.sourceId || job.id)

    const contentText = this.extractContentText(safeInput)
    const chunks =
      isSlackPeriodImportContent(contentType) && !contentText.trim()
        ? []
        : this.chunkContent(contentText)

    const systemPrompt = this.buildAtlasSystemPrompt(
      targetBrain,
      contentType,
      sourceTitle,
      sourceId,
      chunks.length,
      this.extractTemporalInstruction(safeInput),
      campaignId,
    )

    const startChunk = job.chunks_completed ?? 0

    if (startChunk === 0 && chunks.length > 1) {
      const admin = this.getAdminClient()
      await this.runtimeRepository.updateChunkTotal(admin, job.id, chunks.length)
    }

    const executionChunks: BrainImportRuntimeExecutionChunk[] = []
    for (let i = startChunk; i < chunks.length; i++) {
      const chunkLabel = chunks.length > 1 ? ` (chunk ${i + 1}/${chunks.length})` : ''
      const { text: chunkText, metadata: chunkMeta } = chunks[i]

      let userPrompt: string
      if (chunks.length === 1) {
        const serialized = JSON.stringify(safeInput, null, 2)
        if (serialized.length > BrainImportJobsBase.MAX_PROMPT_INPUT_BYTES) {
          userPrompt = `Process this ${contentType} content:\n\n${contentText}`
        } else {
          userPrompt = `Process this ${contentType} content:\n\n${serialized}`
        }
      } else {
        userPrompt = `Process chunk ${i + 1} of ${chunks.length} from "${sourceTitle}"${chunkLabel}:\n\n${chunkText}\n\n${chunkMeta}`
      }

      executionChunks.push({
        index: i,
        total: chunks.length,
        userPrompt,
      })
    }

    const brainId = String(safeInput.brainId || safeInput.brain_id || '')
    return {
      jobId: job.id,
      userId: job.user_id,
      orgId: job.org_id ?? null,
      jobType: job.job_type,
      title: job.title,
      attempts: job.attempts,
      agentKey: 'atlas',
      targetBrain,
      contentType,
      ...(campaignId ? { campaignId } : {}),
      ...(brainId ? { brainId } : {}),
      lane: `brain-import:${job.id}`,
      systemPrompt,
      chunksTotal: chunks.length,
      chunks: executionChunks,
    }
  }

  protected async executeViaAtlas(job: BrainImportJobRecord): Promise<Record<string, unknown>> {
    const gateway = this.getGateway()
    const execution = await this.buildAtlasExecutionPlan(job)

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

    for (const chunk of execution.chunks) {
      const result = await gateway.callOpenClawForBrainJob(
        execution.userId,
        execution.agentKey,
        execution.systemPrompt,
        chunk.userPrompt,
        execution.campaignId,
        execution.targetBrain,
        execution.brainId,
        execution.orgId,
        { lane: execution.lane },
      )

      lastResponseText = this.extractAtlasResponseText(result)
      const jobStatus = this.parseJobStatus(lastResponseText, execution.contentType)

      if (jobStatus.status === 'failed') {
        throw new Error(`Atlas could not process: ${jobStatus.reason}`)
      }

      if (chunk.total > 1) {
        const admin = this.getAdminClient()
        await this.runtimeRepository.updateChunksCompleted(admin, job.id, chunk.index + 1)
      }
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

  private buildAtlasSystemPrompt(
    targetBrain: string,
    contentType: string,
    sourceTitle: string,
    sourceId: string,
    totalChunks: number,
    temporalInstruction: string,
    campaignId?: string,
  ): string {
    const chunkNote =
      totalChunks > 1
        ? `\nThis content is split into ${totalChunks} chunks. Process each chunk independently — extract and save knowledge from each one. Do NOT wait for all chunks.`
        : ''

    let actionBlock: string
    if (targetBrain === 'campaign') {
      actionBlock = [
        `ACTION: Use the backend action tool exposed by this runtime: campaign_capability in platform mode, or vibey_backend otherwise.`,
        `Call it with action: "atlas_save_brain_context" to save campaign knowledge. REQUIRED fields in data:`,
        `  - target_brain: "campaign"`,
        `  - campaign_id: "${campaignId ?? ''}"`,
        `  - content: the campaign/client knowledge text (string, minimum 10 characters)`,
        `  - title: "${sourceTitle}"`,
        `  - source_type: "${contentType}"`,
        `  - source_id: "${sourceId}"`,
        `  - source_title: "${sourceTitle}"`,
        temporalInstruction,
        `Do not call read_skill, describe_action, or save_user_memory. This prompt contains the complete save contract.`,
        `Only report JOB_STATUS:completed after the save action returns success: true with memory_id or duplicate: true. If the campaign cannot accept Campaign Brain writes, or there is nothing durable to save, report JOB_STATUS:skipped. If a save is rejected for any other reason, report JOB_STATUS:failed.`,
      ].join('\n')
    } else if (targetBrain === 'agent') {
      actionBlock = [
        `ACTION: Use ingest_agent_brain_text to save knowledge. REQUIRED fields in data:`,
        `  - brain_id: (from the input payload — the agent brain UUID)`,
        `  - text: the knowledge text to ingest (aliased as "content" in payload)`,
        `  - sourceType: "${contentType}"`,
        `  - title: "${sourceTitle}"`,
        temporalInstruction,
        `Do NOT use save_user_memory or crystallize_user_brain — those are for the user brain only and will fail on agent brain.`,
      ].join('\n')
    } else if (targetBrain === 'customer') {
      actionBlock = [
        `ACTION: Use save_customer_memory to save customer knowledge. REQUIRED fields in data:`,
        `  - content: the customer-side knowledge text (string, minimum 10 characters)`,
        `  - memory_type: one of "decision", "insight", "preference", "fact", "story", "framework", "event"`,
        `  - source_type: "${contentType}"`,
        `  - source_id: "${sourceId}"`,
        `  - source_title: "${sourceTitle}"`,
        temporalInstruction,
        `  - contact_id: the exact contact_id shown in the speaker annotation`,
        `Rules for customer brain:`,
        `  - Write only when the primary speaker/subject is annotated role=customer, role=lead, or role=team_of_customer.`,
        `  - Never write friend/family/unknown speakers to the customer brain.`,
        `  - Memories without contact_id must be skipped.`,
        `  - If inferring or updating a customer role from text alone, require confidence >= 0.75.`,
      ].join('\n')
    } else {
      actionBlock = [
        `ACTION: Use save_user_memory to save knowledge. REQUIRED fields in data:`,
        `  - content: the knowledge text (string, minimum 10 characters)`,
        `  - memory_type: one of "decision", "insight", "preference", "fact", "story", "framework"`,
        `  - source_type: "${contentType}"`,
        `  - source_id: "${sourceId}"`,
        `  - source_title: "${sourceTitle}"`,
        temporalInstruction,
        `You may also use crystallize_user_brain for raw thought crystallization.`,
      ].join('\n')
    }

    const slackNote = contentType.startsWith('slack_period')
      ? [
          ``,
          `Slack digest instructions:`,
          `Each line is annotated with sender identity in brackets, e.g. [contact_id=..., role=customer] or [vibey_user=..., role=host]. Use those annotations to decide who is speaking.`,
          `Most Slack threads are operational chatter. Save only meaningful decisions, strategic direction, customer insight, learning, or commitments. Skip logistics, banter, scheduling, and thank-you threads.`,
          `If this Slack period has no messages or no significant knowledge, report JOB_STATUS:skipped. Do not report JOB_STATUS:failed for empty or chatter-only Slack windows, and do not report JOB_STATUS:failed when campaign knowledge could not be saved at this time because there was nothing durable to write.`,
        ].join('\n')
      : ''

    return [
      `You are Atlas, the Brain Scholar. You have a brain ingestion job to process.`,
      `Target brain: ${targetBrain}`,
      `Content type: ${contentType}`,
      `Source title: ${sourceTitle}`,
      `Source ID: ${sourceId}`,
      temporalInstruction ? temporalInstruction.replace(/^  - /, 'Source temporal metadata: ') : '',
      chunkNote,
      ``,
      actionBlock,
      slackNote,
      ``,
      `Analyze the content and extract meaningful knowledge entries. Save each entry using the action above.`,
      isSlackPeriodImportContent(contentType)
        ? `If this Slack period is empty or has no significant knowledge, report JOB_STATUS:skipped.`
        : `If the content is missing, empty, or cannot be processed, report it as failed.`,
      ``,
      `After processing, your FINAL message must start with one of these exact lines:`,
      `JOB_STATUS:completed — followed by a summary`,
      `JOB_STATUS:failed — followed by the reason`,
      `JOB_STATUS:skipped — followed by the reason (e.g. no significant knowledge found)`,
    ].join('\n')
  }

  private extractTemporalInstruction(input: Record<string, unknown>): string {
    const occurredAt = typeof input.occurred_at === 'string' ? input.occurred_at : ''
    const occurredUntil = typeof input.occurred_until === 'string' ? input.occurred_until : ''
    const assertedAt = typeof input.asserted_at === 'string' ? input.asserted_at : ''
    const temporalSource =
      typeof input.temporal_source === 'string' ? input.temporal_source : 'source_payload'
    const parts: string[] = []
    if (occurredAt) parts.push(`occurred_at: "${occurredAt}"`)
    if (occurredUntil) parts.push(`occurred_until: "${occurredUntil}"`)
    if (assertedAt) parts.push(`asserted_at: "${assertedAt}"`)
    if (occurredAt || occurredUntil) {
      parts.push(`temporal_source: "${temporalSource}"`)
      parts.push('temporal_confidence: 1')
    }
    return parts.length > 0
      ? `  - Include temporal metadata on every saved item: ${parts.join(', ')}`
      : ''
  }

  private extractContentText(input: Record<string, unknown>): string {
    if (typeof input.transcript === 'string') return input.transcript
    if (Array.isArray(input.transcript)) {
      return input.transcript
        .map((e: Record<string, unknown>) => {
          const speaker =
            (e.speaker as { display_name?: string; name?: string })?.display_name ||
            (e.speaker as { display_name?: string; name?: string })?.name ||
            (e.speaker as string) ||
            'Unknown'
          return `[${speaker}]: ${e.text || ''}`
        })
        .join('\n')
    }
    if (typeof input.content === 'string') return input.content
    if (typeof input.text === 'string') return input.text
    if (typeof input.url === 'string') return input.url
    return JSON.stringify(input)
  }

  private chunkContent(text: string): Array<{ text: string; metadata: string }> {
    const maxChars = BrainImportJobsBase.MAX_CHUNK_CHARS
    if (text.length <= maxChars) {
      return [{ text, metadata: '' }]
    }

    const chunks: Array<{ text: string; metadata: string }> = []
    let offset = 0
    const overlap = BrainImportJobsBase.CHUNK_OVERLAP_CHARS

    while (offset < text.length) {
      let end = offset + maxChars
      if (end < text.length) {
        const lastNewline = text.lastIndexOf('\n', end)
        if (lastNewline > offset + maxChars * 0.5) {
          end = lastNewline
        }
      } else {
        end = text.length
      }

      const chunk = text.slice(offset, end)
      const chunkIndex = chunks.length + 1
      chunks.push({
        text: chunk,
        metadata: `[Chunk position: chars ${offset}–${end} of ${text.length} total]`,
      })

      offset = end - overlap
      if (offset >= text.length) break
    }

    return chunks
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

  private async ensureFathomTranscript(
    job: BrainImportJobRecord,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const meeting = payload.meeting as Record<string, unknown> | undefined
    if (!meeting) return

    const transcript = meeting.transcript
    if (Array.isArray(transcript) && transcript.length > 0) return

    const recordingId = meeting.recording_id ?? meeting.id ?? meeting.call_id
    if (!recordingId) return

    try {
      const { FathomApiService } = require('../../integrations/fathom/services/fathom-api.service')
      const fathomApi = this.moduleRef.get(FathomApiService, { strict: false })
      const adminClient = this.getAdminClient()
      const fetched = await fathomApi.getRecordingTranscript(
        adminClient,
        job.user_id,
        recordingId as string | number,
      )
      if (Array.isArray(fetched.transcript) && fetched.transcript.length > 0) {
        meeting.transcript = fetched.transcript
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch Fathom transcript for recording ${recordingId}: ${(err as Error).message}`,
      )
    }
  }
}
