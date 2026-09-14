import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { SpaceTemplatesService } from '../../../space-templates/services/space-templates.service'
import { MeetingsPrecallPrepService } from '../../../spaces/services/meetings-precall-prep.service'
import {
  ensureMeetingsSpaceForScope,
  type MeetingsSpaceBootstrapResult,
} from './meetings-space-bootstrap'

@Injectable()
export class MeetingsSpaceBootstrapService {
  private readonly logger = new Logger(MeetingsSpaceBootstrapService.name)

  constructor(
    private readonly meetingsPrecallPrep: MeetingsPrecallPrepService,
    private readonly spaceTemplates: SpaceTemplatesService,
  ) {}

  ensureMeetingsSpace(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<MeetingsSpaceBootstrapResult> {
    return ensureMeetingsSpaceForScope({
      supabase,
      scope,
      resolveMeetingsSpaceId: (client, userId, orgId) =>
        this.meetingsPrecallPrep.resolveMeetingsSpaceId(client, userId, orgId),
      instantiate: (client, createScope, templateKey, options) =>
        this.spaceTemplates.instantiate(client, createScope, templateKey, options as never),
    })
  }

  /** Best-effort variant for connect flows: a bootstrap failure must not fail the connect. */
  async ensureMeetingsSpaceQuietly(supabase: SupabaseClient, scope: RequestScope): Promise<void> {
    try {
      await this.ensureMeetingsSpace(supabase, scope)
    } catch (err) {
      this.logger.warn(
        `Meetings space bootstrap skipped for user ${scope.userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }
}
