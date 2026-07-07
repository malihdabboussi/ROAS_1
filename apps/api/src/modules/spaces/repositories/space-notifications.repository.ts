import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

export interface NotificationInsert {
  user_id: string
  org_id: string | null
  type: string
  title: string
  body: string | null
  action_url: string
  channel_sent: Record<string, unknown>
}

@Injectable()
export class SpaceNotificationsRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async listNotificationItemRows(itemIds: string[]): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await this.svc.client
      .from('space_items')
      .select('id, title, user_id, space_id, assignees, assignee_type, assignee_id')
      .in('id', itemIds)
    if (error) throw new Error(`Load space_items failed: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async insertNotifications(notifications: NotificationInsert[]): Promise<void> {
    const { error } = await this.svc.client.from('user_notifications').insert(notifications)
    if (error) throw new Error(`Insert notifications failed: ${error.message}`)
  }
}
