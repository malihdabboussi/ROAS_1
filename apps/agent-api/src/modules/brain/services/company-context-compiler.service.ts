import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'

type CompanyObjectRow = {
  id: string
  object_type: string
  title: string
  truth: string
  status: string
  confidence: number
  retrieval_rule: Record<string, unknown> | null
}

const MAX_COMPANY_CONTEXT_ITEMS = 6

@Injectable()
export class CompanyContextCompilerService {
  private readonly logger = new Logger(CompanyContextCompilerService.name)
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: BrainRuntimeRepository = new BrainRuntimeRepository(),
  ) {
    this.supabase = svc.client
  }

  async buildCompanyContext(input: {
    orgId: string | null
    userId: string
    query?: string
    agentKey?: string
    taskType?: string
  }): Promise<string> {
    if (!input.orgId) return ''

    const { data: brain } = await this.repository.findCompanyBrainId(this.supabase, input.orgId)
    if (!brain?.id) return ''

    const { data, error } = await this.repository.listActiveCompanyCortexObjects(
      this.supabase,
      brain.id,
    )
    if (error) {
      this.logger.warn(`Company Cortex object lookup failed: ${error.message}`)
      return ''
    }

    const queryText = [input.query, input.taskType, input.agentKey].filter(Boolean).join(' ')
    const ranked = ((data ?? []) as CompanyObjectRow[])
      .map((row) => ({ row, score: this.score(row, queryText) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.row.confidence) - Number(a.row.confidence))
      .slice(0, MAX_COMPANY_CONTEXT_ITEMS)

    if (ranked.length === 0) return ''

    const lines = ['COMPANY OPERATING CONTEXT']
    for (const item of ranked) {
      const contextForm =
        typeof item.row.retrieval_rule?.context_form === 'string'
          ? item.row.retrieval_rule.context_form
          : item.row.truth
      lines.push(`- [${item.row.object_type}] ${contextForm}`)
    }
    return lines.join('\n')
  }

  private score(row: CompanyObjectRow, query: string): number {
    const haystack = [
      row.title,
      row.truth,
      row.object_type,
      row.retrieval_rule?.trigger,
      row.retrieval_rule?.context_form,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase()
    const queryWords = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4)

    let score = 0
    for (const word of queryWords) {
      if (haystack.includes(word)) score += 1
    }
    if (score === 0 && Number(row.confidence) >= 0.85) score = 0.25
    return score
  }
}
