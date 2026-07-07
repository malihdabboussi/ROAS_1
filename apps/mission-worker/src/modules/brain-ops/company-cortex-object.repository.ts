import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'

export type CompanyCortexObjectDraft = {
  org_id: string
  brain_id: string
  object_type:
    | 'belief'
    | 'perspective'
    | 'tension'
    | 'standard'
    | 'move'
    | 'anti_pattern'
    | 'protocol'
    | 'decision'
    | 'retrieval_rule'
  title: string
  truth: string
  status: 'emerging' | 'active' | 'challenged' | 'transforming' | 'retired'
  confidence: number
  confidence_basis?: Record<string, unknown>
  source_signal_ids: string[]
  evidence_refs?: Array<Record<string, unknown>>
  retrieval_rule?: Record<string, unknown>
  metadata?: Record<string, unknown>
  embedding?: string | null
  effective_from?: string | null
  effective_until?: string | null
  evidence_started_at?: string | null
  evidence_ended_at?: string | null
  valid_from?: string | null
  valid_until?: string | null
  temporal_status?: string | null
  temporal_confidence?: number | null
  temporal_source?: string | null
}

export type CompanyCortexObjectEdgeDraft = {
  org_id: string
  brain_id: string
  source_object_id: string
  target_object_id: string
  relation_type: 'supports' | 'contradicts' | 'contains' | 'enforces' | 'derived_from' | 'refines'
  confidence: number
  metadata?: Record<string, unknown>
}

export type InsertedCompanyCortexObject = {
  id: string
  title: string
}

@Injectable()
export class CompanyCortexObjectRepository {
  constructor(private readonly database: DatabaseService) {}

  async listFormationSignals(input: {
    brainId: string
    limit: number
    signalIds?: string[]
  }): Promise<Array<Record<string, unknown>>> {
    let query = this.database
      .getClient()
      .from('company_cortex_signals')
      .select('*')
      .eq('brain_id', input.brainId)
      .eq('status', 'active')
    if (input.signalIds && input.signalIds.length > 0) {
      query = query.in('id', input.signalIds)
    }
    const { data, error } = await query.order('created_at', { ascending: true }).limit(input.limit)

    if (error) throw new Error(`Failed to list Company Cortex signals: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async insertObjects(objects: CompanyCortexObjectDraft[]): Promise<InsertedCompanyCortexObject[]> {
    if (objects.length === 0) return []
    const sourceSignals = await this.loadSourceSignals(
      Array.from(new Set(objects.flatMap((object) => object.source_signal_ids))),
    )
    const rows = objects.map((object) => ({
      ...object,
      ...this.rollupTemporalFields(object, sourceSignals),
      evidence_refs: object.evidence_refs,
      retrieval_rule: object.retrieval_rule,
      confidence_basis: object.confidence_basis ?? this.rollupConfidenceBasis(object, sourceSignals),
      metadata: object.metadata ?? {},
    }))
    const { data, error } = await this.database
      .getClient()
      .from('company_cortex_objects')
      .insert(rows)
      .select('id, title')
    if (error) throw new Error(`Failed to insert Company Cortex objects: ${error.message}`)
    return (data ?? []) as InsertedCompanyCortexObject[]
  }

  private async loadSourceSignals(
    signalIds: string[],
  ): Promise<Map<string, Record<string, unknown>>> {
    if (signalIds.length === 0) return new Map()
    const { data, error } = await this.database
      .getClient()
      .from('company_cortex_signals')
      .select(
        'id, confidence, confidence_basis, review_decision, reviewed_by, reviewed_at, evidence_refs, evidence_started_at, evidence_ended_at, valid_from, valid_until, created_at',
      )
      .in('id', signalIds)
    if (error) throw new Error(`Failed to load Company Cortex signal windows: ${error.message}`)
    return new Map((data ?? []).map((row: Record<string, unknown>) => [String(row.id), row]))
  }

  private rollupTemporalFields(
    object: CompanyCortexObjectDraft,
    sourceSignals: Map<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const timestamps = object.source_signal_ids
      .map((id) => sourceSignals.get(id))
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .flatMap((row) => [
        row.evidence_started_at,
        row.evidence_ended_at,
        row.valid_from,
        row.created_at,
      ])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => Date.parse(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)
    if (timestamps.length === 0) {
      return {
        temporal_status: object.temporal_status ?? 'current',
        temporal_source: object.temporal_source ?? 'company_cortex_formation',
      }
    }
    const start = new Date(timestamps[0]).toISOString()
    const end = new Date(timestamps[timestamps.length - 1]).toISOString()
    return {
      evidence_started_at: object.evidence_started_at ?? start,
      evidence_ended_at: object.evidence_ended_at ?? end,
      valid_from: object.valid_from ?? end,
      effective_from: object.effective_from ?? end,
      temporal_status: object.temporal_status ?? 'current',
      temporal_source: object.temporal_source ?? 'source_signals',
      temporal_confidence: object.temporal_confidence ?? object.confidence,
    }
  }

  private rollupConfidenceBasis(
    object: CompanyCortexObjectDraft,
    sourceSignals: Map<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const signals = object.source_signal_ids
      .map((id) => sourceSignals.get(id))
      .filter((row): row is Record<string, unknown> => Boolean(row))
    const confidences = signals
      .map((row) => Number(row.confidence))
      .filter((value) => Number.isFinite(value))
    const reviewDecisions = Array.from(
      new Set(
        signals
          .map((row) => row.review_decision)
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
      ),
    )
    const averageSignalConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : null
    return {
      formation: {
        source: 'company_cortex_formation',
        source_signal_count: signals.length,
        source_signal_ids: object.source_signal_ids,
        average_signal_confidence: averageSignalConfidence,
        review_decisions: reviewDecisions,
      },
      source_signals: signals.map((row) => ({
        id: row.id,
        confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
        review_decision: row.review_decision ?? null,
        reviewed_by: row.reviewed_by ?? null,
        reviewed_at: row.reviewed_at ?? null,
        evidence_ref_count: Array.isArray(row.evidence_refs) ? row.evidence_refs.length : 0,
        confidence_basis:
          row.confidence_basis && typeof row.confidence_basis === 'object'
            ? row.confidence_basis
            : {},
      })),
    }
  }

  async insertEdges(edges: CompanyCortexObjectEdgeDraft[]): Promise<number> {
    if (edges.length === 0) return 0
    const rows = edges.map((edge) => ({
      ...edge,
      metadata: edge.metadata ?? {},
    }))
    const { error } = await this.database
      .getClient()
      .from('company_cortex_object_edges')
      .insert(rows)
    if (error) throw new Error(`Failed to insert Company Cortex object edges: ${error.message}`)
    return rows.length
  }

  async markSignalsMerged(signalIds: string[]): Promise<void> {
    if (signalIds.length === 0) return
    const { error } = await this.database
      .getClient()
      .from('company_cortex_signals')
      .update({ status: 'merged' })
      .in('id', signalIds)
    if (error) throw new Error(`Failed to mark Company Cortex signals merged: ${error.message}`)
  }
}
