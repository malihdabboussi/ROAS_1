import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { BrainEvalEvidenceType } from '../brain-eval.types'

type EnvReader = (name: string) => string

const EVAL_AUTH_OPTIONS = { auth: { autoRefreshToken: false, persistSession: false } }

export type BrainRetrievalBackfillTarget = {
  table: string
  idColumn: string
  select: string
}

export function createEvalServiceClient(readEnv: EnvReader): SupabaseClient {
  return createClient(readEnv('SUPABASE_URL'), readEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    ...EVAL_AUTH_OPTIONS,
  })
}

export function createEvalAnonClient(readEnv: EnvReader): SupabaseClient {
  return createClient(readEnv('SUPABASE_URL'), readEnv('SUPABASE_ANON_KEY'), {
    ...EVAL_AUTH_OPTIONS,
  })
}

export function createEvalRlsClient(readEnv: EnvReader, accessToken: string): SupabaseClient {
  return createClient(readEnv('SUPABASE_URL'), readEnv('SUPABASE_ANON_KEY'), {
    ...EVAL_AUTH_OPTIONS,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

export class BrainEvalDataRepository {
  async loadModelPricing(
    supabase: SupabaseClient,
    model: string,
  ): Promise<{ inputPer1k: number | null; outputPer1k: number | null }> {
    const { data } = await supabase
      .from('token_providers_pricing')
      .select('unit_type, cost_per_unit')
      .eq('model_name', model)
      .eq('is_active', true)
      .in('unit_type', ['input_tokens_1k', 'output_tokens_1k'])

    const rows = (data ?? []) as Array<{ unit_type: string; cost_per_unit: number | string }>
    const inputRow = rows.find((row) => row.unit_type === 'input_tokens_1k')
    const outputRow = rows.find((row) => row.unit_type === 'output_tokens_1k')
    const inputPer1k = inputRow ? Number(inputRow.cost_per_unit) : NaN
    const outputPer1k = outputRow ? Number(outputRow.cost_per_unit) : NaN
    return {
      inputPer1k: Number.isFinite(inputPer1k) ? inputPer1k : null,
      outputPer1k: Number.isFinite(outputPer1k) ? outputPer1k : null,
    }
  }

  async loadInputPricePer1k(supabase: SupabaseClient, model: string): Promise<number | null> {
    const { data } = await supabase
      .from('token_providers_pricing')
      .select('cost_per_unit')
      .eq('model_name', model)
      .eq('unit_type', 'input_tokens_1k')
      .eq('is_active', true)
      .maybeSingle()
    const price = Number((data as { cost_per_unit?: number | string } | null)?.cost_per_unit ?? NaN)
    return Number.isFinite(price) ? price : null
  }

  async resolveEvidenceTypes(
    supabase: SupabaseClient,
    evidenceIds: string[],
  ): Promise<Record<string, BrainEvalEvidenceType>> {
    const ids = [...new Set(evidenceIds)].filter(Boolean)
    if (ids.length === 0) return {}
    const { data, error } = await supabase.rpc('resolve_brain_evidence_types', {
      p_ids: ids,
    })
    if (error) throw new Error(`Failed to resolve evidence types: ${error.message}`)
    return Object.fromEntries(
      ((data ?? []) as Array<{ id: string; evidence_type: BrainEvalEvidenceType }>).map((row) => [
        row.id,
        row.evidence_type,
      ]),
    )
  }

  async fetchSpaceSemanticChunkIds(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from('space_semantic_chunks')
      .select('id')
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('chunk_index', { ascending: true })
    if (error) {
      throw new Error(`Failed to resolve chunks for ${sourceType}:${sourceId}: ${error.message}`)
    }
    return ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
  }

  async createUserWorkConversation(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string
      agentKey: string
      evalCaseId: string
    },
  ): Promise<string> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: input.userId,
        title: `Brain user-work eval: ${input.evalCaseId}`,
        campaign_id: null,
        agent_id: input.agentKey,
        org_id: input.orgId ?? null,
        metadata: {
          eval_type: 'user-work',
          eval_case_id: input.evalCaseId,
        },
      })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create eval conversation: ${error.message}`)
    const conversationId = String((data as { id?: string } | null)?.id ?? '')
    if (!conversationId) throw new Error('Created eval conversation has no id')
    return conversationId
  }

  async signInWithPassword(
    supabase: SupabaseClient,
    input: { email: string; password: string },
  ): Promise<Awaited<ReturnType<SupabaseClient['auth']['signInWithPassword']>>> {
    return supabase.auth.signInWithPassword(input)
  }

  async listRowsMissingEmbedding(
    supabase: SupabaseClient,
    target: BrainRetrievalBackfillTarget,
    limit: number,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> {
    return (await supabase
      .from(target.table)
      .select(target.select)
      .is('embedding', null)
      .limit(limit)) as {
      data: Array<Record<string, unknown>> | null
      error: { message: string } | null
    }
  }

  async updateTargetEmbedding(
    supabase: SupabaseClient,
    input: {
      target: BrainRetrievalBackfillTarget
      id: string
      embedding: string
    },
  ): Promise<{ error: { message: string } | null }> {
    return (await supabase
      .from(input.target.table)
      .update({ embedding: input.embedding })
      .eq(input.target.idColumn, input.id)) as { error: { message: string } | null }
  }
}

export const brainEvalDataRepository = new BrainEvalDataRepository()
