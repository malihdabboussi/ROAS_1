export type CanonicalSourceDescriptor = {
  system: 'brain' | 'campaign_reporting'
  owner: string
  mutable: boolean
  campaign_id?: string
}

export type SourceTruthContract = {
  canonical_source: CanonicalSourceDescriptor
  as_of: string
  evidence: unknown[]
  brain_context: Record<string, unknown> | null
}

export function withSourceTruth<T extends Record<string, unknown>>(
  payload: T,
  contract: SourceTruthContract,
): T & SourceTruthContract {
  return { ...payload, ...contract }
}

export function sourceTruthAsOf(value: unknown, fallback = new Date()): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value
  return fallback.toISOString()
}
