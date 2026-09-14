import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { compactMeetingSource } from '../../../brain/services/brain-import-jobs-meeting-input'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import { BrainPermissionsService } from '../../../brain/services/brain-permissions.service'
import { MeetingProviderRegistry } from '../../providers/meeting-provider.registry'
import type { MeetingProviderId } from '../../providers/transcript-source.types'
import type { ImportMeetingDto } from '../dto/meeting-import.dto'
import { MeetingIntakeRepository } from '../repositories/meeting-intake.repository'

export type ImportMeetingInput = ImportMeetingDto & {
  provider: MeetingProviderId
  userId: string
  scope: RequestScope
  supabase: SupabaseClient
}

/**
 * Manual "import this meeting" for any provider: fetch through the adapter,
 * then queue the provider-agnostic brain job with the transcript inside.
 * Brain-only on purpose; the webhook intake owns the Meetings space route.
 */
@Injectable()
export class MeetingImportService {
  constructor(
    private readonly registry: MeetingProviderRegistry,
    private readonly repository: MeetingIntakeRepository,
    private readonly importJobs: BrainImportJobsService,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  async importToBrain(input: ImportMeetingInput) {
    const provider = this.registry.get(input.provider)
    if (!provider?.pull) {
      throw new BadRequestException(`${input.provider} cannot fetch meetings on demand`)
    }
    const connection = await this.repository.findConnectionForUser(input.provider, input.userId)
    if (!connection) throw new BadRequestException(`${input.provider} is not connected`)

    if (input.brainId) {
      await this.brainPermissions.assertCanTrainBrain(
        input.supabase,
        input.userId,
        input.scope,
        input.brainId,
      )
    }

    const source = await provider.pull.fetch(
      {
        supabase: this.repository.getServiceClient(),
        userId: input.userId,
        orgId: input.scope.orgId ?? null,
        connection,
      },
      input.externalId,
      null,
    )
    if (source.transcript.length === 0) {
      throw new BadRequestException('This meeting has no transcript yet')
    }

    const compact = compactMeetingSource(source)
    const queued = input.campaignId
      ? await this.importJobs.enqueueCampaignMeetingImport(
          input.userId,
          { campaignId: input.campaignId, source: compact, domain: input.domain },
          input.scope.orgId ?? null,
        )
      : await this.importJobs.enqueueMeetingTranscriptImport(
          input.userId,
          {
            source: compact,
            brainId: input.brainId,
            targetBrain: input.targetBrain,
            contactId: input.contactId,
          },
          input.scope.orgId ?? null,
        )
    return { success: true, ...queued }
  }
}
