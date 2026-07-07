import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'

export type CompanyCortexDreamRunCreate = {
  org_id: string
  brain_id: string
  dedupe_key: string
  window_start: string
  window_end: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped'
}

export type CompanyCortexDreamRunRow = CompanyCortexDreamRunCreate & {
  id: string
}

@Injectable()
export class CompanyCortexDreamRunRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByDedupeKey(dedupeKey: string): Promise<CompanyCortexDreamRunRow | null> {
    const { data, error } = await this.database
      .getClient()
      .from('company_cortex_dream_runs')
      .select('id, org_id, brain_id, dedupe_key, window_start, window_end, status')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle()

    if (error) throw new Error(`Failed to resolve Company Cortex dream run: ${error.message}`)
    return (data as CompanyCortexDreamRunRow | null) ?? null
  }

  async createRun(input: CompanyCortexDreamRunCreate): Promise<{ id: string }> {
    const { data, error } = await this.database
      .getClient()
      .from('company_cortex_dream_runs')
      .insert({ ...input, started_at: new Date().toISOString() })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create Company Cortex dream run: ${error.message}`)
    return data as { id: string }
  }

  async completeRun(id: string, output: Record<string, unknown>): Promise<void> {
    const { error } = await this.database
      .getClient()
      .from('company_cortex_dream_runs')
      .update({ ...output, completed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error(`Failed to complete Company Cortex dream run: ${error.message}`)
  }
}
