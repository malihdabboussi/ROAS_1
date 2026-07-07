import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

@Injectable()
export class BrainCrossSuggestionsRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async listForUser(userId: string, status?: string): Promise<Record<string, unknown>[]> {
    let query = this.serviceClient.client
      .from('brain_cross_suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (status && ['pending', 'accepted', 'rejected', 'expired'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }

  async findPendingForUser(id: string, userId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.serviceClient.client
      .from('brain_cross_suggestions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle()

    if (error) throw new Error(`DB error: ${error.message}`)
    return (data ?? null) as Record<string, unknown> | null
  }

  async findOriginalImportJob(
    sourceJobId: string,
  ): Promise<{ payload?: unknown; job_type?: string } | null> {
    const { data } = await this.serviceClient.client
      .from('brain_import_jobs')
      .select('payload, job_type')
      .eq('id', sourceJobId)
      .maybeSingle()
    return (data ?? null) as { payload?: unknown; job_type?: string } | null
  }

  async markAccepted(id: string, jobId: string): Promise<void> {
    await this.serviceClient.client
      .from('brain_cross_suggestions')
      .update({
        status: 'accepted',
        result_job_id: jobId,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  async rejectPendingForUser(id: string, userId: string): Promise<boolean> {
    const { data, error } = await this.serviceClient.client
      .from('brain_cross_suggestions')
      .update({
        status: 'rejected',
        decided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select('id')

    if (error) throw new Error(`DB error: ${error.message}`)
    return Boolean(data?.length)
  }

  async markSuggestionNotificationsRead(userId: string, suggestionId: string): Promise<void> {
    await this.serviceClient.client
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('type', 'brain_cross_suggestion')
      .filter('metadata->>suggestion_id', 'eq', suggestionId)
      .is('read_at', null)
  }
}
