import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import type { InboxView } from '../dto/notifications-inbox.dto'

type ScopedFilter<T> = {
  eq(column: string, value: unknown): T
  is(column: string, value: unknown): T
}

type InboxFilter<T> = ScopedFilter<T> & {
  gt(column: string, value: unknown): T
  not(column: string, operator: 'is', value: unknown): T
  or(filters: string): T
}

function scopeQuery<T>(query: T, scope: RequestScope): T {
  const filter = query as T & ScopedFilter<T>
  return scope.orgId ? filter.eq('org_id', scope.orgId) : filter.is('org_id', null)
}

function viewQuery<T>(query: T, view: InboxView, now: string): T {
  const filter = query as T & InboxFilter<T>
  if (view === 'all') return query
  if (view === 'cleared') return filter.not('cleared_at', 'is', null)

  let next = filter.is('cleared_at', null)
  if (view === 'later') return (next as T & InboxFilter<T>).gt('snoozed_until', now)
  next = (next as T & InboxFilter<T>).or(`snoozed_until.is.null,snoozed_until.lte.${now}`)
  return (next as T & InboxFilter<T>).eq('inbox_bucket', view)
}

@Injectable()
export class NotificationsInboxRepository {
  async list(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    opts: { limit: number; unreadOnly: boolean; view: InboxView; types: string[] },
  ) {
    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(opts.limit)
    query = scopeQuery(query, scope)
    query = viewQuery(query, opts.view, new Date().toISOString())
    if (opts.unreadOnly) query = query.is('read_at', null)
    if (opts.types.length > 0) query = query.in('type', opts.types)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data ?? []
  }

  async counts(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    const { data, error } = await supabase.rpc('user_notification_inbox_counts', {
      p_user_id: userId,
      p_org_id: scope.orgId ?? null,
    })
    if (error) throw new Error(error.message)
    return data ?? []
  }

  async markAllRead(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    let query = supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
    query = scopeQuery(query, scope)
    const { error } = await query
    if (error) throw new Error(error.message)
  }

  async deleteRead(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    let query = supabase
      .from('user_notifications')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .not('read_at', 'is', null)
    query = scopeQuery(query, scope)
    const { count, error } = await query
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  async patchOne(
    supabase: SupabaseClient,
    userId: string,
    notificationId: string,
    scope: RequestScope,
    patch: Record<string, unknown>,
  ) {
    let query = supabase
      .from('user_notifications')
      .update(patch)
      .eq('id', notificationId)
      .eq('user_id', userId)
    query = scopeQuery(query, scope)
    const { error } = await query
    if (error) throw new Error(error.message)
  }

  async deleteOne(
    supabase: SupabaseClient,
    userId: string,
    notificationId: string,
    scope: RequestScope,
  ) {
    let query = supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)
    query = scopeQuery(query, scope)
    const { error } = await query
    if (error) throw new Error(error.message)
  }

  async clearView(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    view: Exclude<InboxView, 'all'>,
  ) {
    const now = new Date().toISOString()
    let query = supabase
      .from('user_notifications')
      .update({ cleared_at: now })
      .eq('user_id', userId)
    query = scopeQuery(query, scope)
    query = viewQuery(query, view, now)
    const { error } = await query
    if (error) throw new Error(error.message)
  }
}
