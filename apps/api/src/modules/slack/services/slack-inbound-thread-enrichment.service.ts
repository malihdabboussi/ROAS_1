import { Injectable, Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackDigestReplyContextService } from './slack-digest-reply-context.service'

@Injectable()
export class SlackInboundThreadEnrichmentService {
  private readonly logger = new Logger(SlackInboundThreadEnrichmentService.name)

  constructor(private readonly moduleRef: ModuleRef) {}

  async enrich(input: {
    supabase: SupabaseClient
    teamId: string
    channelId: string
    threadTs: string
    text: string
    slackUserId: string
  }): Promise<{ handled: boolean; text: string }> {
    const { MeetingFollowUpSlackConfirmService } =
      await import('../../spaces/services/meeting-follow-up-slack-confirm.service')
    const confirm = this.moduleRef.get(MeetingFollowUpSlackConfirmService, { strict: false })
    if (
      confirm &&
      (await confirm.handleThreadReply({
        channelId: input.channelId,
        threadTs: input.threadTs,
        text: input.text,
        slackUserId: input.slackUserId,
      }))
    ) {
      return { handled: true, text: input.text }
    }

    let text = input.text
    if (confirm) {
      const prefix = await confirm.resolveAssigneeReminderThreadPrefix({
        channelId: input.channelId,
        threadTs: input.threadTs,
      })
      if (prefix) text = `${prefix}\n\n${text}`
    }

    const digest = this.moduleRef.get(SlackDigestReplyContextService, { strict: false })
    if (digest) {
      const digestPrefix = await digest
        .resolvePrefix({
          supabase: input.supabase,
          teamId: input.teamId,
          channelId: input.channelId,
          threadTs: input.threadTs,
        })
        .catch((error) => {
          this.logger.warn(
            `Digest evidence prefix skipped: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
          return ''
        })
      if (digestPrefix) text = `${digestPrefix}\n\n${text}`
    }

    return { handled: false, text }
  }
}
