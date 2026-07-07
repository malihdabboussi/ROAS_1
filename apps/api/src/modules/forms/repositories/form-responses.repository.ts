import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class FormResponsesRepository {
  async findByFormId(supabase: SupabaseClient, formId: string) {
    const { data, error } = await supabase
      .from('form_responses')
      .select('*')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findAggregatesByCampaignId(
    supabase: SupabaseClient,
    campaignId: string,
    opts?: { formIds?: string[] },
  ) {
    let query = supabase
      .from('form_responses')
      .select('form_id, submitted_at')
      .eq('campaign_id', campaignId)
      .order('submitted_at', { ascending: false })
    if (opts?.formIds !== undefined) {
      if (opts.formIds.length === 0) return []
      query = query.in('form_id', opts.formIds)
    }
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    const byForm = new Map<
      string,
      { form_id: string; responses_count: number; last_response_at: string | null }
    >()
    for (const row of (data ?? []) as Array<{ form_id: string; submitted_at: string | null }>) {
      const formId = row.form_id
      if (!formId) continue
      const existing = byForm.get(formId)
      if (existing) {
        existing.responses_count += 1
      } else {
        byForm.set(formId, {
          form_id: formId,
          responses_count: 1,
          last_response_at: row.submitted_at ?? null,
        })
      }
    }
    return Array.from(byForm.values())
  }

  async create(
    supabase: SupabaseClient,
    record: {
      form_id: string
      org_id: string | null
      campaign_id: string | null
      space_item_id: string | null
      answers: Record<string, unknown>
      submitter_email?: string | null
      submitter_user_id?: string | null
      ip?: string | null
      user_agent?: string | null
    },
  ) {
    const { data, error } = await supabase.from('form_responses').insert(record).select().single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }
}
