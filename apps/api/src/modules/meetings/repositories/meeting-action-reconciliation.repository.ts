import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ReconciliationCandidate = {
  id: string
  status: string
  due_date: string | null
  custom_data: Record<string, unknown> | null
  created_at: string
  updated_at: string | null
}

@Injectable()
export class MeetingActionReconciliationRepository {
  private client: SupabaseClient | null = null

  constructor(private readonly config: ConfigService) {}

  async listOpenMeetingActions(limit = 500): Promise<ReconciliationCandidate[]> {
    const { data, error } = await this.getClient()
      .from('space_items')
      .select('id, status, due_date, custom_data, created_at, updated_at')
      .eq('custom_data->>entry_type', 'follow_up')
      .not('status', 'in', '(done,complete,completed,resolved,archived)')
      .order('updated_at', { ascending: true, nullsFirst: true })
      .limit(limit)
    if (error)
      throw new Error(`Failed to list meeting actions for reconciliation: ${error.message}`)
    return (data ?? []) as ReconciliationCandidate[]
  }

  async markNeedsReview(
    candidate: ReconciliationCandidate,
    lifecycle: Record<string, unknown>,
  ): Promise<boolean> {
    const customData = candidate.custom_data ?? {}
    let query = this.getClient()
      .from('space_items')
      .update({
        custom_data: { ...customData, action_lifecycle: lifecycle },
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
    query = candidate.updated_at
      ? query.eq('updated_at', candidate.updated_at)
      : query.is('updated_at', null)
    const { data, error } = await query.select('id')
    if (error) throw new Error(`Failed to mark meeting action for review: ${error.message}`)
    return Boolean(data?.length)
  }

  private getClient(): SupabaseClient {
    if (this.client) return this.client
    const url = this.config.get<string>('SUPABASE_URL') ?? process.env.SUPABASE_URL
    const key =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    return this.client
  }
}
