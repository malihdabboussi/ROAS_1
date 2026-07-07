import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '../../../lib/services/database.service'

@Injectable()
export class UserNotificationEmitterService {
  private readonly logger = new Logger(UserNotificationEmitterService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async emitBlocked(mission: Record<string, any>, reason: string, agentKey: string) {
    const supabase = this.databaseService.getClient()

    try {
      const { error } = await supabase.from('user_notifications').insert({
        user_id: mission.user_id,
        org_id: mission.org_id ?? null,
        type: 'mission_blocked',
        title: `Mission blocked: ${mission.title}`,
        body: reason,
        mission_id: mission.id,
        action_url: '/mission-control',
      })
      if (error) {
        this.logger.warn(`Failed to insert user notification: ${error.message}`)
      }
    } catch (e) {
      this.logger.warn(`Failed to insert user notification: ${e}`)
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_channel')
        .eq('id', mission.user_id)
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
            user_id: mission.user_id,
            agent_key: agentKey,
            content: reason,
            notification_type: 'mission_blocked',
            mission_title: mission.title,
          }),
        }).catch(() => {})
      }
    } catch (e) {
      this.logger.warn(`Failed to push blocked notification to external channel: ${e}`)
    }
  }
}
