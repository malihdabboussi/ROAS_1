import { Injectable, NotFoundException } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import { normalizeFathomMeetingSource } from '../../meetings/providers/fathom-meeting-source'
import { BrainCrossSuggestionsRepository } from '../repositories/brain-cross-suggestions.repository'
import { compactMeetingSource, type MeetingJobSource } from './brain-import-jobs-meeting-input'
import { BrainImportJobsService } from './brain-import-jobs.service'

@Injectable()
export class BrainCrossSuggestionsService {
  constructor(
    private readonly repo: BrainCrossSuggestionsRepository,
    private readonly importJobs: BrainImportJobsService,
  ) {}

  async list(userId: string, status?: string) {
    return this.repo.listForUser(userId, status)
  }

  async accept(userId: string, org: RequestScope, id: string) {
    const suggestion = await this.repo.findPendingForUser(id, userId)
    if (!suggestion) throw new NotFoundException('Suggestion not found or already decided')

    const originalJob = await this.repo.findOriginalImportJob(String(suggestion.source_job_id))
    if (!originalJob?.payload) throw new NotFoundException('Original import job not found')

    const payload = originalJob.payload as Record<string, unknown>
    const source = resolveSuggestionSource(
      String(suggestion.source_job_type ?? originalJob.job_type),
      payload,
    )
    if (!source) {
      throw new NotFoundException(
        'This suggestion predates the shared meeting import; import the meeting again to get a fresh suggestion',
      )
    }
    const result = await this.importJobs.enqueueCampaignMeetingImport(
      userId,
      { campaignId: suggestion.target_campaign_id as string, source },
      org.orgId,
    )

    await this.repo.markAccepted(id, result.jobId)
    await this.repo.markSuggestionNotificationsRead(userId, id)

    return { accepted: true, jobId: result.jobId }
  }

  async reject(userId: string, id: string) {
    const rejected = await this.repo.rejectPendingForUser(id, userId)
    if (!rejected) throw new NotFoundException('Suggestion not found or already decided')

    await this.repo.markSuggestionNotificationsRead(userId, id)
    return { rejected: true }
  }
}

function resolveSuggestionSource(
  jobType: string,
  payload: Record<string, unknown>,
): MeetingJobSource | null {
  if (payload.source && typeof payload.source === 'object')
    return payload.source as MeetingJobSource
  if (
    jobType === 'fathom_meeting_import' &&
    payload.meeting &&
    typeof payload.meeting === 'object'
  ) {
    return compactMeetingSource(
      normalizeFathomMeetingSource(payload.meeting as Record<string, unknown>),
    )
  }
  return null
}
