import { Injectable, Logger } from '@nestjs/common'
import {
  SpaceNotificationsRepository,
  type NotificationInsert,
} from '../repositories/space-notifications.repository'
import type { ActivityInsert } from '../space-item-activity.helpers'

interface ItemContext {
  id: string
  title: string | null
  user_id: string
  space_id: string
  assignees: Array<{ type: string; id: string }>
}

interface CommentMention {
  type?: string
  user_id?: string
}

const RELEVANT_EVENTS = new Set(['assignee_change', 'status_change', 'comment'])

const PREVIEW_LIMIT = 240

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, max = PREVIEW_LIMIT): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function actionUrl(spaceId: string, itemId: string): string {
  return `/spaces?space=${encodeURIComponent(spaceId)}&item=${encodeURIComponent(itemId)}`
}

@Injectable()
export class SpaceNotificationsService {
  private readonly logger = new Logger(SpaceNotificationsService.name)

  constructor(private readonly notificationsRepo: SpaceNotificationsRepository) {}

  /**
   * Fire-and-forget: build + insert `user_notifications` for human-noticeable
   * activity events. Always swallows errors — never blocks the calling write.
   */
  dispatch(activities: ActivityInsert[]): void {
    if (activities.length === 0) return
    const relevant = activities.filter((a) => RELEVANT_EVENTS.has(a.event_type))
    if (relevant.length === 0) return
    void this.dispatchInternal(relevant).catch((err) =>
      this.logger.warn(`Notification dispatch failed: ${err}`),
    )
  }

  private async dispatchInternal(activities: ActivityInsert[]): Promise<void> {
    const itemIds = [...new Set(activities.map((a) => a.item_id))]
    const rows = await this.notificationsRepo.listNotificationItemRows(itemIds)

    const itemMap = new Map<string, ItemContext>()
    for (const row of rows) {
      const id = String(row.id)
      itemMap.set(id, {
        id,
        title: typeof row.title === 'string' ? row.title : null,
        user_id: String(row.user_id ?? ''),
        space_id: String(row.space_id ?? ''),
        assignees: this.normalizeAssignees(row.assignees, row.assignee_type, row.assignee_id),
      })
    }

    const notifications: NotificationInsert[] = []
    for (const activity of activities) {
      const item = itemMap.get(activity.item_id)
      if (!item) continue
      notifications.push(...this.buildForActivity(activity, item))
    }
    if (notifications.length === 0) return

    await this.notificationsRepo.insertNotifications(notifications)
  }

  private normalizeAssignees(
    raw: unknown,
    primaryType: unknown,
    primaryId: unknown,
  ): Array<{ type: string; id: string }> {
    if (Array.isArray(raw)) {
      return raw
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .map((entry) => ({
          type: String(entry.type ?? ''),
          id: String(entry.id ?? ''),
        }))
        .filter((entry) => entry.type && entry.id)
    }
    if (typeof primaryType === 'string' && typeof primaryId === 'string' && primaryId) {
      return [{ type: primaryType, id: primaryId }]
    }
    return []
  }

  private buildForActivity(activity: ActivityInsert, item: ItemContext): NotificationInsert[] {
    switch (activity.event_type) {
      case 'assignee_change':
        return this.buildAssigneeNotifications(activity, item)
      case 'status_change':
        return this.buildStatusNotifications(activity, item)
      case 'comment':
        return this.buildCommentNotifications(activity, item)
      default:
        return []
    }
  }

  private buildAssigneeNotifications(
    activity: ActivityInsert,
    item: ItemContext,
  ): NotificationInsert[] {
    const payload = activity.payload as Record<string, unknown>
    const fromList = this.extractAssigneeList(payload.from)
    const toRaw = payload.to as Record<string, unknown> | undefined
    const toList = this.extractAssigneeList(toRaw?.assignees ?? toRaw?.primary ?? toRaw ?? null)

    const fromKeys = new Set(fromList.map((a) => `${a.type}:${a.id}`))
    const toKeys = new Set(toList.map((a) => `${a.type}:${a.id}`))
    const added = toList.filter((a) => a.type === 'human' && !fromKeys.has(`${a.type}:${a.id}`))
    const removed = fromList.filter((a) => a.type === 'human' && !toKeys.has(`${a.type}:${a.id}`))

    const titleText = item.title?.trim() || 'Untitled task'
    const url = actionUrl(item.space_id, item.id)
    const out: NotificationInsert[] = []

    for (const assignee of added) {
      if (assignee.id === activity.user_id) continue
      out.push({
        user_id: assignee.id,
        org_id: activity.org_id,
        type: 'space_task_assigned',
        title: `Assigned: ${truncate(titleText, 120)}`,
        body: 'You were assigned this task.',
        action_url: url,
        channel_sent: { in_app: true },
      })
    }
    for (const assignee of removed) {
      if (assignee.id === activity.user_id) continue
      out.push({
        user_id: assignee.id,
        org_id: activity.org_id,
        type: 'space_task_unassigned',
        title: `Unassigned: ${truncate(titleText, 120)}`,
        body: 'You were removed from this task.',
        action_url: url,
        channel_sent: { in_app: true },
      })
    }
    return out
  }

  private buildStatusNotifications(
    activity: ActivityInsert,
    item: ItemContext,
  ): NotificationInsert[] {
    const payload = activity.payload as Record<string, unknown>
    const from = String(payload.from ?? '')
    const to = String(payload.to ?? '')
    if (!to || from === to) return []
    const titleText = item.title?.trim() || 'Untitled task'
    const url = actionUrl(item.space_id, item.id)

    const recipients = this.collectRecipients({
      creator: item.user_id,
      assignees: item.assignees,
      mentions: [],
      excludeUserId: activity.user_id,
    })

    return recipients.map((userId) => ({
      user_id: userId,
      org_id: activity.org_id,
      type: 'space_task_status_changed',
      title: `${truncate(titleText, 100)} → ${to}`,
      body: from ? `Status changed from "${from}" to "${to}".` : `Status set to "${to}".`,
      action_url: url,
      channel_sent: { in_app: true },
    }))
  }

  private buildCommentNotifications(
    activity: ActivityInsert,
    item: ItemContext,
  ): NotificationInsert[] {
    const payload = activity.payload as Record<string, unknown>
    const messageHtml = typeof payload.message === 'string' ? payload.message : ''
    const messageText = stripHtml(messageHtml)
    if (!messageText) return []
    const titleText = item.title?.trim() || 'Untitled task'
    const url = actionUrl(item.space_id, item.id)

    const mentions = Array.isArray(payload.mentions) ? (payload.mentions as CommentMention[]) : []
    const mentionedUserIds = mentions
      .filter((m) => m.type === 'user' && typeof m.user_id === 'string' && m.user_id)
      .map((m) => m.user_id!)

    const recipients = this.collectRecipients({
      creator: item.user_id,
      assignees: item.assignees,
      mentions: mentionedUserIds,
      excludeUserId: activity.user_id,
    })

    return recipients.map((userId) => {
      const isMentioned = mentionedUserIds.includes(userId)
      return {
        user_id: userId,
        org_id: activity.org_id,
        type: isMentioned ? 'space_task_mention' : 'space_task_comment',
        title: isMentioned
          ? `You were mentioned on "${truncate(titleText, 100)}"`
          : `New comment on "${truncate(titleText, 100)}"`,
        body: truncate(messageText),
        action_url: url,
        channel_sent: { in_app: true },
      }
    })
  }

  private collectRecipients(opts: {
    creator: string
    assignees: Array<{ type: string; id: string }>
    mentions: string[]
    excludeUserId: string
  }): string[] {
    const set = new Set<string>()
    if (opts.creator) set.add(opts.creator)
    for (const a of opts.assignees) {
      if (a.type === 'human' && a.id) set.add(a.id)
    }
    for (const id of opts.mentions) set.add(id)
    set.delete(opts.excludeUserId)
    return [...set].filter((id) => id.length > 0)
  }

  private extractAssigneeList(raw: unknown): Array<{ type: string; id: string }> {
    if (!raw) return []
    if (Array.isArray(raw)) {
      return raw
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => ({ type: String(e.type ?? ''), id: String(e.id ?? '') }))
        .filter((e) => e.type && e.id)
    }
    if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      if (Array.isArray(obj.assignees)) return this.extractAssigneeList(obj.assignees)
      if (obj.type && obj.id) {
        return [{ type: String(obj.type), id: String(obj.id) }]
      }
    }
    return []
  }
}
