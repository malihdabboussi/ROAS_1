export type BrainTemporalStatus =
  | 'current'
  | 'historical'
  | 'superseded'
  | 'contradicted'
  | 'expired'
export type BrainRetrievalTimeMode = 'default' | 'as_of' | 'timeline' | 'evolution'
export interface BrainTemporalPayload {
  episode_id?: string | null
  occurred_at?: string | null
  occurred_until?: string | null
  asserted_at?: string | null
  valid_from?: string | null
  valid_until?: string | null
  temporal_status?: BrainTemporalStatus | string | null
  temporal_confidence?: number | null
  temporal_source?: string | null
  effective_from?: string | null
  effective_until?: string | null
  evidence_started_at?: string | null
  evidence_ended_at?: string | null
}
export interface BrainTemporalMetadata {
  episode_id: string | null
  occurred_at: string | null
  occurred_until: string | null
  asserted_at: string | null
  valid_from: string | null
  valid_until: string | null
  temporal_status: BrainTemporalStatus | string | null
  temporal_confidence: number | null
  temporal_source: string | null
  temporal_label: string
}
export declare const BRAIN_TEMPORAL_STATUSES: BrainTemporalStatus[]
export declare const BRAIN_RETRIEVAL_TIME_MODES: BrainRetrievalTimeMode[]
export declare function normalizeIsoDate(value: unknown): string | null
export declare function normalizeTemporalPayload(input: unknown): BrainTemporalPayload
export declare function temporalInsertFields(input: unknown): Record<string, unknown>
export declare function temporalCandidateMetadata(
  row: Record<string, unknown>,
): BrainTemporalMetadata
export declare function temporalLabel(input: BrainTemporalPayload): string
