import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'

@Injectable()
export class SpaceAutomationLivenessService {
  private readonly logger = new Logger(SpaceAutomationLivenessService.name)

  constructor(
    private readonly automations: SpaceAutomationsRepository,
    private readonly slack: SlackAgentToolsService,
  ) {}

  async reportRevived(
    supabase: SupabaseClient,
    input: {
      automationId: string
      automationName: string
      userId: string
      orgId: string | null
      missedFires: number
      now: Date
    },
  ): Promise<void> {
    const alertDate = input.now.toISOString().slice(0, 10)
    const claimed = await this.automations.claimDailyLivenessAlert(
      supabase,
      input.automationId,
      alertDate,
    )
    if (!claimed) return

    const scheduleLabel = input.automationName || input.automationId
    const body = `I stalled and revived myself — schedule ${scheduleLabel} missed ${input.missedFires} fires.`
    const { error: notificationError } = await supabase.from('user_notifications').insert({
      user_id: input.userId,
      org_id: input.orgId,
      type: 'space_automation_liveness',
      title: 'Pixel schedule recovered',
      body,
      action_url: '/team?section=people&peopleView=signals',
      channel_sent: { in_app: true },
      metadata: {
        automation_id: input.automationId,
        missed_fires: input.missedFires,
        alerted_on: alertDate,
      },
    })
    if (notificationError) throw new Error(notificationError.message)

    const { data: owner, error: ownerError } = await supabase
      .from('channel_members')
      .select('platform_id')
      .eq('org_id', input.orgId)
      .eq('platform', 'slack')
      .eq('vibey_user_id', input.userId)
      .eq('relationship_kind', 'internal')
      .limit(1)
      .maybeSingle()
    if (ownerError) throw new Error(ownerError.message)
    if (!owner?.platform_id) {
      this.logger.warn(`No mapped Slack identity for liveness alert ${input.automationId}`)
      return
    }
    const dm = await this.slack.openDm(supabase, input.userId, input.orgId, {
      slack_user_id: String(owner.platform_id),
    })
    await this.slack.sendMessage(supabase, input.userId, input.orgId, {
      channel_id: String(dm.channel_id),
      text: body,
    })
  }
}
