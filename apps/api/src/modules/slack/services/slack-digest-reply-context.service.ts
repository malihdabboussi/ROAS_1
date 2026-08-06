import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackDigestEvidenceRepository } from '../repositories/slack-digest-evidence.repository'
import { SlackRepository } from '../repositories/slack.repository'
import {
  digestEvidenceItemsFromActions,
  formatTeamIntelligenceDigestEvidence,
} from './slack-digest-reply-context'

@Injectable()
export class SlackDigestReplyContextService {
  constructor(
    private readonly slackRepo: SlackRepository,
    private readonly digestEvidence: SlackDigestEvidenceRepository,
  ) {}

  async resolvePrefix(input: {
    supabase: SupabaseClient
    teamId: string
    channelId: string
    threadTs: string
  }): Promise<string> {
    const channel = await this.slackRepo.findFallbackChannelByTeam(input.supabase, input.teamId)
    const orgId = channel?.org_id ?? null
    if (!orgId) return ''
    const actions = await this.digestEvidence.listByDigestThread(input.supabase, {
      orgId,
      threadTs: input.threadTs,
      channelId: input.channelId,
    })
    return formatTeamIntelligenceDigestEvidence(digestEvidenceItemsFromActions(actions))
  }
}
