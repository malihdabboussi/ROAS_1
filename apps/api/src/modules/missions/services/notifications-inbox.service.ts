import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import type {
  ClearNotificationsBody,
  ListNotificationsQuery,
  NotificationBucketBody,
  NotificationSnoozeBody,
} from '../dto/notifications-inbox.dto'
import { NotificationsInboxRepository } from '../repositories/notifications-inbox.repository'

type CurrentUser = { id: string }

@Injectable()
export class NotificationsInboxService {
  constructor(private readonly repository: NotificationsInboxRepository) {}

  list(
    user: CurrentUser,
    supabase: SupabaseClient,
    query: ListNotificationsQuery,
    scope: RequestScope,
  ) {
    return this.repository.list(supabase, user.id, scope, {
      limit: query.limit,
      unreadOnly: query.unread_only,
      view: query.view,
      types: query.types,
    })
  }

  async counts(user: CurrentUser, supabase: SupabaseClient, scope: RequestScope) {
    const rows = await this.repository.counts(supabase, user.id, scope)
    const counts = { primary: 0, other: 0, later: 0, cleared: 0 }
    for (const row of rows as Array<{ view: keyof typeof counts; count: number | string }>) {
      if (row.view in counts) counts[row.view] = Number(row.count)
    }
    return counts
  }

  async markAllRead(user: CurrentUser, supabase: SupabaseClient, scope: RequestScope) {
    await this.repository.markAllRead(supabase, user.id, scope)
    return { ok: true }
  }

  async deleteRead(user: CurrentUser, supabase: SupabaseClient, scope: RequestScope) {
    const deleted = await this.repository.deleteRead(supabase, user.id, scope)
    return { deleted }
  }

  async markRead(
    user: CurrentUser,
    supabase: SupabaseClient,
    notificationId: string,
    scope: RequestScope,
  ) {
    await this.repository.patchOne(supabase, user.id, notificationId, scope, {
      read_at: new Date().toISOString(),
    })
    return { ok: true }
  }

  async remove(
    user: CurrentUser,
    supabase: SupabaseClient,
    notificationId: string,
    scope: RequestScope,
  ) {
    await this.repository.deleteOne(supabase, user.id, notificationId, scope)
    return { ok: true }
  }

  async moveBucket(
    user: CurrentUser,
    supabase: SupabaseClient,
    notificationId: string,
    body: NotificationBucketBody,
    scope: RequestScope,
  ) {
    await this.repository.patchOne(supabase, user.id, notificationId, scope, {
      inbox_bucket: body.bucket,
      cleared_at: null,
      snoozed_until: null,
    })
    return { ok: true }
  }

  async snooze(
    user: CurrentUser,
    supabase: SupabaseClient,
    notificationId: string,
    body: NotificationSnoozeBody,
    scope: RequestScope,
  ) {
    await this.repository.patchOne(supabase, user.id, notificationId, scope, {
      snoozed_until: body.until,
      cleared_at: null,
    })
    return { ok: true }
  }

  async patchState(
    user: CurrentUser,
    supabase: SupabaseClient,
    notificationId: string,
    scope: RequestScope,
    patch: Record<string, unknown>,
  ) {
    await this.repository.patchOne(supabase, user.id, notificationId, scope, patch)
    return { ok: true }
  }

  async clearAll(
    user: CurrentUser,
    supabase: SupabaseClient,
    body: ClearNotificationsBody,
    scope: RequestScope,
  ) {
    await this.repository.clearView(supabase, user.id, scope, body.view)
    return { ok: true }
  }
}
