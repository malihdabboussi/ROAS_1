import { Injectable, NotFoundException } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import { BrainCrossSuggestionsRepository } from '../repositories/brain-cross-suggestions.repository'
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
    let result: { jobId: string; status: string }

    if (
      suggestion.source_job_type === 'fathom_meeting_import' ||
      originalJob.job_type === 'fathom_meeting_import'
    ) {
      const meeting = (payload.meeting ?? payload) as Record<string, unknown>
      result = await this.importJobs.enqueueCampaignFathomImport(
        userId,
        {
          campaignId: suggestion.target_campaign_id as string,
          meeting,
        },
        org.orgId,
      )
    } else {
      const transcriptId = payload.transcriptId as string
      result = await this.importJobs.enqueueCampaignFirefliesImport(
        userId,
        {
          campaignId: suggestion.target_campaign_id as string,
          transcriptId,
        },
        org.orgId,
      )
    }

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
