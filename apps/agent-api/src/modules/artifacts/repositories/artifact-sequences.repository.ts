import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactSequencesRepository {
  async listSequences(
    supabase: SupabaseClient,
    input: { campaignId: string; orgId?: string | null; userId: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    const baseQ = input.orgId
      ? supabase
          .from('sequences')
          .select('*, sequence_emails(id, subject, order_index, delay_hours, body)')
          .eq('org_id', input.orgId)
      : supabase
          .from('sequences')
          .select('*, sequence_emails(id, subject, order_index, delay_hours, body)')
          .eq('user_id', input.userId)
          .is('org_id', null)
    return (await baseQ.eq('campaign_id', input.campaignId).order('created_at', {
      ascending: false,
    })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async createSequence(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('sequences').insert(payload).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async addSequenceEmail(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('sequence_emails').insert(payload).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async findSequence(
    supabase: SupabaseClient,
    input: { sequenceId: string; select: string; userId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    const query = supabase.from('sequences').select(input.select).eq('id', input.sequenceId)
    if (input.userId) query.eq('user_id', input.userId)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findSequenceEmail(
    supabase: SupabaseClient,
    input: { sequenceEmailId: string; select: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('sequence_emails')
      .select(input.select)
      .eq('id', input.sequenceEmailId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listSequenceEmails(
    supabase: SupabaseClient,
    sequenceId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('sequence_emails')
      .select('id, subject, order_index, delay_hours, body')
      .eq('sequence_id', sequenceId)
      .order('order_index', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async updateSequence(
    supabase: SupabaseClient,
    input: { sequenceId: string; userId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('sequences')
      .update(input.updates)
      .eq('id', input.sequenceId)
      .eq('user_id', input.userId)
      .select('*, sequence_emails(id, subject, order_index, delay_hours, body)')
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateSequenceEmail(
    supabase: SupabaseClient,
    input: { sequenceEmailId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('sequence_emails')
      .update(input.updates)
      .eq('id', input.sequenceEmailId)
      .select()
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
