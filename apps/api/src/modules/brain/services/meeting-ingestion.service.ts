import { Injectable, Logger } from '@nestjs/common'
import { MeetingIngestionRepository } from '../repositories/meeting-ingestion.repository'
import { MemoriesRepository } from '../repositories/memories.repository'
import type { MeetingTranscript } from '../types/brain.types'
import { ContentDedupeService } from './content-dedupe.service'
import { CrystallizationService } from './crystallization.service'

const MIN_TRANSCRIPT_LENGTH = 500

@Injectable()
export class MeetingIngestionService {
  private readonly logger = new Logger(MeetingIngestionService.name)

  constructor(
    private readonly crystallization: CrystallizationService,
    private readonly contentDedupe: ContentDedupeService,
    private readonly memoriesRepo: MemoriesRepository,
    private readonly meetingIngestionRepository: MeetingIngestionRepository,
  ) {}

  async ingest(meeting: MeetingTranscript): Promise<{
    status: string
    snapshots_created: number
    memories_created: number
    reason?: string
  }> {
    const sessionKey = `${meeting.provider}:${meeting.meetingId}`
    const supabase = this.getAdminClient()

    this.logger.debug(
      `ingest() called: sessionKey=${sessionKey}, userId=${meeting.userId}, title="${meeting.title}", transcript entries=${meeting.transcript.length}`,
    )

    const existing = await this.memoriesRepo.findSessionByKey(supabase, sessionKey)
    if (existing) {
      this.logger.debug(`Session already exists, skipping: ${sessionKey}`)
      return {
        status: 'skipped',
        snapshots_created: 0,
        memories_created: 0,
        reason: 'Already processed',
      }
    }

    const formattedText = this.formatTranscript(meeting)
    if (formattedText.length < MIN_TRANSCRIPT_LENGTH) {
      this.logger.debug(`Transcript too short (${formattedText.length} chars): ${meeting.title}`)
      return {
        status: 'skipped',
        snapshots_created: 0,
        memories_created: 0,
        reason: `Transcript too short (${formattedText.length} chars, min ${MIN_TRANSCRIPT_LENGTH})`,
      }
    }

    const dedupe = await this.contentDedupe.registerForOwner(
      supabase,
      meeting.userId,
      formattedText,
      `meeting:${meeting.provider}`,
    )
    if (dedupe.duplicate) {
      await this.memoriesRepo
        .createSession(supabase, {
          session_key: sessionKey,
          owner_id: meeting.userId,
          memories_created: 0,
          last_processed_at: new Date().toISOString(),
        })
        .catch((e) => this.logger.error(`Session tracking failed: ${e}`))
      return {
        status: 'skipped',
        snapshots_created: 0,
        memories_created: 0,
        reason: 'Duplicate transcript content',
      }
    }

    let snapshotsCreated = 0
    let crystallizationError: string | undefined

    const crystallizeInput = this.buildCrystallizeInput(meeting, formattedText)

    try {
      const result = await this.crystallization.crystallize(
        supabase,
        crystallizeInput,
        meeting.userId,
        meeting.provider,
        meeting.meetingId,
        undefined,
        undefined,
        {
          occurred_at: meeting.date ?? null,
          asserted_at: new Date().toISOString(),
          temporal_confidence: meeting.date ? 1 : 0.5,
          temporal_source: `${meeting.provider}_meeting`,
        },
      )
      if (!('skipped' in result)) {
        snapshotsCreated = 1
      }
    } catch (e) {
      crystallizationError = e instanceof Error ? e.message : String(e)
      this.logger.error(`Crystallization failed for ${sessionKey}: ${crystallizationError}`)
    }

    const ingestionStatus = crystallizationError ? 'partial' : 'ok'

    await this.memoriesRepo
      .createSession(supabase, {
        session_key: sessionKey,
        owner_id: meeting.userId,
        memories_created: 0,
        skipped_reason: crystallizationError ?? null,
        last_processed_at: new Date().toISOString(),
      })
      .catch((e) => this.logger.error(`Session tracking failed: ${e}`))

    this.logger.log(
      `Ingestion complete for "${meeting.title}": status=${ingestionStatus}, ${snapshotsCreated} snapshots`,
    )

    return {
      status: ingestionStatus,
      snapshots_created: snapshotsCreated,
      memories_created: 0,
      ...(crystallizationError ? { reason: crystallizationError } : {}),
    }
  }

  private formatTranscript(meeting: MeetingTranscript): string {
    const lines = meeting.transcript.map((e) => `[${e.speaker}]: ${e.text}`)
    let text = lines.join('\n')
    if (meeting.summary) {
      text = `SUMMARY: ${meeting.summary}\n\n${text}`
    }
    if (meeting.actionItems?.length) {
      text += `\n\nACTION ITEMS:\n${meeting.actionItems.map((a) => `- ${a}`).join('\n')}`
    }
    return text
  }

  private buildCrystallizeInput(meeting: MeetingTranscript, formattedText: string): string {
    return `During the meeting "${meeting.title}", the following conversation took place:\n\n${formattedText}`
  }

  private getAdminClient() {
    return this.meetingIngestionRepository.getAdminClient()
  }
}
