import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '../../../lib/services/database.service'

/**
 * Handles `mission.subtask.awaiting_human.requested` outbox events: drops a
 * user_notifications row for the assigned human and, when the user has an external
 * channel preferred (telegram/slack), fans out through /api/internal/missions/notification-push.
 * SLA escalation is separate (watchdog).
 */
@Injectable()
export class HumanSubtaskNotifierService {
  private readonly logger = new Logger(HumanSubtaskNotifierService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async notifyAwaitingHuman(payload: {
    missionId: string
    subtaskId: string
    assignedUserId: string | null
    orgId: string | null
  }): Promise<void> {
    const supabase = this.databaseService.getClient()
    if (!payload.assignedUserId) {
      this.logger.warn(
        `awaiting_human event for mission=${payload.missionId} subtask=${payload.subtaskId} missing assigned_user_id`,
      )
      return
    }

    const { data: subtask } = await supabase
      .from('mission_subtasks')
      .select('id, title, assignee_type, assigned_user_id')
      .eq('id', payload.subtaskId)
      .maybeSingle()
    const { data: mission } = await supabase
      .from('missions')
      .select('id, title')
      .eq('id', payload.missionId)
      .maybeSingle()

    if (!subtask || subtask.assignee_type !== 'human') {
      this.logger.log(
        `Skipping awaiting_human notification: subtask ${payload.subtaskId} is no longer a human row`,
      )
      return
    }
    if (subtask.assigned_user_id !== payload.assignedUserId) {
      this.logger.log(
        `Skipping awaiting_human notification: assigned_user_id drifted (was ${payload.assignedUserId}, now ${subtask.assigned_user_id})`,
      )
      return
    }

    const title = `Your turn on "${mission?.title || 'a mission'}"`
    const body = `Vibey handed you "${subtask.title}" to take from here.`

    try {
      const { error } = await supabase.from('user_notifications').insert({
        user_id: payload.assignedUserId,
        org_id: payload.orgId,
        type: 'human_subtask_awaiting',
        title,
        body,
        mission_id: payload.missionId,
        action_url: `/spaces?tab=your-turn&item=${payload.subtaskId}`,
      })
      if (error) {
        this.logger.warn(`Failed to insert human_subtask_awaiting notification: ${error.message}`)
      }
    } catch (err) {
      this.logger.warn(`Failed to insert human_subtask_awaiting notification: ${String(err)}`)
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_channel')
        .eq('id', payload.assignedUserId)
        .maybeSingle()

      if (profile?.preferred_channel && profile.preferred_channel !== 'studio') {
        const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
        const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
        const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
        await fetch(`${baseUrl}/api/internal/missions/notification-push`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${internalToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: payload.assignedUserId,
            agent_key: 'vibey',
            content: body,
            notification_type: 'human_subtask_awaiting',
            mission_title: mission?.title ?? null,
          }),
        }).catch(() => {})
      }
    } catch (e) {
      this.logger.warn(`Failed external push for human_subtask_awaiting: ${String(e)}`)
    }
  }
}
