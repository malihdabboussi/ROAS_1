import { BadRequestException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AwarenessAmendDto,
  AwarenessAppendSubtasksDto,
  AwarenessCancelSubtaskDto,
  AwarenessEditSubtaskDto,
  AwarenessPauseMissionDto,
  AwarenessReplanDto,
  AwarenessRetrySubtaskDto,
} from '../dto'
import { MissionInternalManagerSubtasksBase } from './mission-internal-manager-subtasks.base'

export abstract class MissionInternalAwarenessBase extends MissionInternalManagerSubtasksBase {
  protected awarenessLog(
    supabase: SupabaseClient,
    missionId: string,
    userId: string,
    orgId: string | null | undefined,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    return this.missionsRepository.insertMissionLog(supabase, {
      mission_id: missionId,
      user_id: userId,
      event_type: eventType,
      payload,
    })
  }

  async awarenessAppendSubtasks(dto: AwarenessAppendSubtasksDto) {
    const supabase = this.getServiceRoleClient()
    const { awareness_session_id, ...rest } = dto
    const result = await this.managerAppendSubtasks(rest)
    await this.awarenessLog(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
      'awareness.append_subtasks',
      {
        ...(awareness_session_id ? { awareness_session_id } : {}),
        subtask_count: dto.subtasks.length,
      },
    )
    return result
  }

  async awarenessCancelSubtask(dto: AwarenessCancelSubtaskDto) {
    const supabase = this.getServiceRoleClient()
    const { awareness_session_id, ...rest } = dto
    const result = await this.managerCancelSubtask(rest)
    await this.awarenessLog(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
      'awareness.cancel_subtask',
      {
        ...(awareness_session_id ? { awareness_session_id } : {}),
        subtask_id: dto.subtask_id,
      },
    )
    return result
  }

  async awarenessEditSubtask(dto: AwarenessEditSubtaskDto) {
    const supabase = this.getServiceRoleClient()
    const { awareness_session_id, ...rest } = dto
    const result = await this.managerEditSubtask(rest)
    await this.awarenessLog(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
      'awareness.edit_subtask',
      {
        ...(awareness_session_id ? { awareness_session_id } : {}),
        subtask_id: dto.subtask_id,
      },
    )
    return result
  }

  async awarenessRetrySubtask(dto: AwarenessRetrySubtaskDto) {
    const supabase = this.getServiceRoleClient()
    const { awareness_session_id, ...rest } = dto
    const result = await this.managerRetrySubtask(rest)
    await this.awarenessLog(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
      'awareness.retry_subtask',
      {
        ...(awareness_session_id ? { awareness_session_id } : {}),
        subtask_id: dto.subtask_id,
      },
    )
    return result
  }

  async awarenessReplan(dto: AwarenessReplanDto) {
    const supabase = this.getServiceRoleClient()
    const { awareness_session_id, ...rest } = dto
    const result = await this.managerPrepareReplan(rest)
    await this.awarenessLog(supabase, dto.mission_id, dto.user_id, dto.org_id, 'awareness.replan', {
      ...(awareness_session_id ? { awareness_session_id } : {}),
    })
    return result
  }

  async awarenessPauseMission(dto: AwarenessPauseMissionDto) {
    const supabase = this.getServiceRoleClient()
    return this.postgresDirect.withMissionAdvisoryLock(dto.mission_id, async () => {
      const mission = await this.missionsRepository.findMissionById(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
      )
      if (mission.status === 'done') {
        throw new BadRequestException('Cannot pause a completed mission')
      }
      await this.missionsRepository.updateMissionStatus(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
        {
          status: 'backlog',
          current_agent_key: null,
        },
      )
      await this.awarenessLog(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
        'awareness.pause_mission',
        {
          user_id: dto.user_id,
          mission_id: dto.mission_id,
          ...(dto.awareness_session_id ? { awareness_session_id: dto.awareness_session_id } : {}),
          from_status: mission.status,
          to_status: 'backlog',
          pause_semantics:
            'mission_shelf_only: missions.status→backlog; campaign has_active_work refreshed via updateMissionStatus; outbox non-runnable statuses skipped by dispatcher',
        },
      )
      return { ok: true }
    })
  }

  async awarenessAmend(dto: AwarenessAmendDto) {
    const supabase = this.getServiceRoleClient()
    const { awareness_session_id, ...rest } = dto
    const result = await this.managerAmendFields(rest)
    await this.awarenessLog(
      supabase,
      dto.mission_id,
      dto.user_id,
      dto.org_id,
      'awareness.amend_mission',
      {
        ...(awareness_session_id ? { awareness_session_id } : {}),
      },
    )
    return result
  }

  async pushTelegramAwarenessPoint(userId: string, agentKey: string, content: string) {
    const serviceSupabase = this.getServiceRoleClient()
    const channel = await this.missionInternalRepository.findActiveAgentChannel(serviceSupabase, {
      userId,
      agentKey,
      channelType: 'telegram',
    })
    if (!channel?.provider_config) return { ok: false, reason: 'channel_not_found' }

    const botToken = String((channel.provider_config as Record<string, unknown>).bot_token || '')
    if (!botToken) return { ok: false, reason: 'missing_bot_token' }

    const conversationMetadata =
      await this.missionInternalRepository.findLatestConversationMetadata(serviceSupabase, {
        userId,
        agentKey,
      })
    const telegramChatId = String(
      (conversationMetadata as Record<string, unknown> | undefined)?.telegram_chat_id || '',
    )
    if (!telegramChatId) return { ok: false, reason: 'missing_telegram_chat_id' }

    await this.telegramApi.sendMessage(botToken, telegramChatId, content)
    return { ok: true }
  }

  async pushSlackAwarenessPoint(userId: string, agentKey: string, content: string) {
    const serviceSupabase = this.getServiceRoleClient()
    const channel = await this.missionInternalRepository.findActiveAgentChannel(serviceSupabase, {
      userId,
      agentKey,
      channelType: 'slack',
    })
    if (!channel?.provider_config) return { ok: false, reason: 'channel_not_found' }

    const cfg = channel.provider_config as Record<string, unknown>
    const botToken = String(cfg.bot_token || '')
    const channelId = String(cfg.channel_id || '')
    if (!botToken || !channelId) return { ok: false, reason: 'missing_channel_config' }

    await this.slackApi.postMessage(botToken, channelId, content)
    return { ok: true }
  }
}
