import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class PendingCapturesRepository {
  async listPending(client: SupabaseClient, userId: string) {
    return client
      .from('ns_pending_captures')
      .select(
        'id, brain_id, snapshots, agent_id, context, source_type, status, auto_accept_at, created_at',
      )
      .eq('profile_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
  }

  async findPendingCapture(client: SupabaseClient, userId: string, captureId: string) {
    const { data, error } = await client
      .from('ns_pending_captures')
      .select('*')
      .eq('id', captureId)
      .eq('profile_id', userId)
      .eq('status', 'pending')
      .single()
    if (error || !data) return null
    return data as Record<string, unknown>
  }

  async insertAcceptedSnapshot(client: SupabaseClient, record: Record<string, unknown>) {
    const { error } = await client.from('ns_snapshots').insert(record)
    if (error) throw new Error(`Failed to insert accepted snapshot: ${error.message}`)
  }

  async markAccepted(client: SupabaseClient, captureId: string, reviewedAt: string) {
    const { error } = await client
      .from('ns_pending_captures')
      .update({ status: 'accepted', reviewed_at: reviewedAt })
      .eq('id', captureId)
    if (error) throw new Error(`Failed to mark capture accepted: ${error.message}`)
  }

  async markRejected(
    client: SupabaseClient,
    userId: string,
    captureId: string,
    reviewedAt: string,
  ) {
    const { error } = await client
      .from('ns_pending_captures')
      .update({ status: 'rejected', reviewed_at: reviewedAt })
      .eq('id', captureId)
      .eq('profile_id', userId)
      .eq('status', 'pending')
    if (error) throw new Error(`Failed to reject capture: ${error.message}`)
  }
}
