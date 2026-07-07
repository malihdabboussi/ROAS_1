import { Injectable } from '@nestjs/common'
import { CompanyCortexRepository } from '../repositories/company-cortex.repository'

export interface CompanyCortexResult {
  id: string
  owner_id: string
  org_id: string
  scope: 'company'
  cortex_max: boolean
}

export type CompanyCortexSchedule = 'daily' | 'weekdays' | 'manual_only'

export interface CompanyCortexSettingsResult {
  org_id: string
  brain_id: string
  enabled: boolean
  schedule: CompanyCortexSchedule
  local_time: string
  timezone: string
  lookback_hours: number
  include_sources: string[]
  min_activity_threshold: number
  last_successful_dream_at: string | null
}

export interface CompanyCortexObjectResult {
  id: string
  org_id: string
  brain_id: string
  object_type: string
  title: string
  truth: string
  status: string
  confidence: number
  confidence_basis: Record<string, unknown>
  source_signal_ids: string[]
  evidence_refs: Array<Record<string, unknown>>
  retrieval_rule: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CompanyCortexSignalResult {
  id: string
  org_id: string
  brain_id: string
  signal_type: string
  truth: string
  scope: Record<string, unknown>
  evidence_refs: Array<Record<string, unknown>>
  confidence: number
  confidence_basis: Record<string, unknown>
  reason: string | null
  context_form: string | null
  status: string
  source: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_decision: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

const COMPANY_CORTEX_SIGNAL_STATUSES = new Set([
  'proposed',
  'active',
  'rejected',
  'expired',
  'merged',
])

export interface UpdateCompanyCortexSettingsInput {
  ownerId: string
  orgId: string | null
  enabled?: boolean
  schedule?: string
  localTime?: string
  timezone?: string
  lookbackHours?: number
  minActivityThreshold?: number
}

const COMPANY_CORTEX_SCHEDULES = new Set(['daily', 'weekdays', 'manual_only'])

@Injectable()
export class CompanyCortexService {
  constructor(private readonly companyCortexRepository: CompanyCortexRepository) {}

  async getOrCreateCompanyCortex(input: {
    ownerId: string
    orgId: string | null
  }): Promise<CompanyCortexResult> {
    const orgId = input.orgId?.trim()
    if (!orgId) {
      throw new Error('orgId is required for Company Cortex')
    }

    const existing = await this.companyCortexRepository.findCompanyCortex(orgId)
    if (existing) return existing as CompanyCortexResult
    return (await this.companyCortexRepository.createCompanyCortex({
      ownerId: input.ownerId,
      orgId,
    })) as CompanyCortexResult
  }

  async getOrCreateCompanyCortexSettings(input: {
    ownerId: string
    orgId: string | null
  }): Promise<CompanyCortexSettingsResult> {
    const brain = await this.getOrCreateCompanyCortex(input)
    const existing = await this.companyCortexRepository.findSettings(brain.org_id)
    if (existing) return existing as CompanyCortexSettingsResult

    return (await this.companyCortexRepository.createSettings({
      orgId: brain.org_id,
      brainId: brain.id,
      ownerId: input.ownerId,
    })) as CompanyCortexSettingsResult
  }

  async updateCompanyCortexSettings(
    input: UpdateCompanyCortexSettingsInput,
  ): Promise<CompanyCortexSettingsResult> {
    const existing = await this.getOrCreateCompanyCortexSettings({
      ownerId: input.ownerId,
      orgId: input.orgId,
    })
    const updates: Record<string, unknown> = {}

    if (input.enabled !== undefined) updates.enabled = input.enabled
    if (input.schedule !== undefined) updates.schedule = this.normalizeSchedule(input.schedule)
    if (input.localTime !== undefined) updates.local_time = this.normalizeLocalTime(input.localTime)
    if (input.timezone !== undefined) updates.timezone = this.normalizeTimezone(input.timezone)
    if (input.lookbackHours !== undefined)
      updates.lookback_hours = this.normalizeLookbackHours(input.lookbackHours)
    if (input.minActivityThreshold !== undefined)
      updates.min_activity_threshold = this.normalizeMinActivityThreshold(
        input.minActivityThreshold,
      )

    if (Object.keys(updates).length === 0) return existing

    return (await this.companyCortexRepository.updateSettings(
      existing.org_id,
      updates,
      input.ownerId,
    )) as CompanyCortexSettingsResult
  }

  async listCompanyCortexObjects(input: {
    ownerId: string
    orgId: string | null
    brainId?: string | null
  }): Promise<CompanyCortexObjectResult[]> {
    const brain = await this.getOrCreateCompanyCortex({
      ownerId: input.ownerId,
      orgId: input.orgId,
    })
    const requestedBrainId = input.brainId?.trim()
    if (requestedBrainId && requestedBrainId !== brain.id) {
      throw new Error('brainId does not match Company Cortex')
    }

    return (await this.companyCortexRepository.listObjects({
      brainId: brain.id,
      orgId: brain.org_id,
    })) as CompanyCortexObjectResult[]
  }

  async listCompanyCortexSignals(input: {
    ownerId: string
    orgId: string | null
    status?: string
  }): Promise<CompanyCortexSignalResult[]> {
    const brain = await this.getOrCreateCompanyCortex({
      ownerId: input.ownerId,
      orgId: input.orgId,
    })
    return (await this.companyCortexRepository.listSignals({
      brainId: brain.id,
      orgId: brain.org_id,
      status: input.status ? this.normalizeSignalStatus(input.status) : undefined,
    })) as CompanyCortexSignalResult[]
  }

  async reviewCompanyCortexSignal(input: {
    ownerId: string
    orgId: string | null
    signalId: string
    decision?: string
    status?: string
    note?: string
  }): Promise<Record<string, unknown>> {
    const brain = await this.getOrCreateCompanyCortex({
      ownerId: input.ownerId,
      orgId: input.orgId,
    })
    const decision = this.normalizeReviewDecision(input)
    const existing = await this.companyCortexRepository.findProposedSignalForReview({
      brainId: brain.id,
      orgId: brain.org_id,
      signalId: input.signalId,
    })
    if (!existing) throw new Error('Company Cortex signal not found or already reviewed')

    const reviewedAt = new Date().toISOString()
    const confidenceBasis = this.reviewConfidenceBasis(existing as Record<string, unknown>, {
      decision,
      reviewedBy: input.ownerId,
      reviewedAt,
    })
    const data = await this.companyCortexRepository.reviewSignal({
      brainId: brain.id,
      orgId: brain.org_id,
      signalId: input.signalId,
      status: decision === 'approve' ? 'active' : 'rejected',
      reviewedBy: input.ownerId,
      reviewedAt,
      reviewDecision: decision === 'approve' ? 'human_approved' : 'human_rejected',
      reviewNote: input.note,
      confidenceBasis,
    })
    if (!data) throw new Error('Company Cortex signal not found or already reviewed')
    if (decision === 'approve') {
      await this.companyCortexRepository.insertFormationOutbox({
        brainId: brain.id,
        orgId: brain.org_id,
        userId: input.ownerId,
        signalId: input.signalId,
      })
    }
    return data as Record<string, unknown>
  }

  async updateCompanyCortexSignalStatus(input: {
    ownerId: string
    orgId: string | null
    signalId: string
    status: string
  }): Promise<Record<string, unknown>> {
    return this.reviewCompanyCortexSignal({
      ...input,
      decision: input.status === 'active' ? 'approve' : input.status === 'rejected' ? 'reject' : '',
    })
  }

  private normalizeSchedule(value: string): CompanyCortexSchedule {
    if (!COMPANY_CORTEX_SCHEDULES.has(value)) {
      throw new Error('schedule must be daily, weekdays, or manual_only')
    }
    return value as CompanyCortexSchedule
  }

  private normalizeLocalTime(value: string): string {
    const trimmed = value.trim()
    const match = trimmed.match(/^(\d{2}):(\d{2})(?::\d{2})?$/)
    if (!match) {
      throw new Error('localTime must use HH:mm format')
    }
    return `${match[1]}:${match[2]}`
  }

  private normalizeTimezone(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) throw new Error('timezone is required')
    return trimmed
  }

  private normalizeLookbackHours(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 168) {
      throw new Error('lookbackHours must be an integer between 1 and 168')
    }
    return value
  }

  private normalizeMinActivityThreshold(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('minActivityThreshold must be a non-negative integer')
    }
    return value
  }

  private normalizeSignalStatus(value: string): string {
    if (!COMPANY_CORTEX_SIGNAL_STATUSES.has(value)) {
      throw new Error('status must be proposed, active, rejected, expired, or merged')
    }
    return value
  }

  private normalizeReviewDecision(input: { decision?: string; status?: string }): 'approve' | 'reject' {
    const decision = String(input.decision ?? '')
      .trim()
      .toLowerCase()
    if (decision === 'approve' || decision === 'reject') return decision

    const status = input.status ? this.normalizeSignalStatus(input.status) : ''
    if (status === 'active') return 'approve'
    if (status === 'rejected') return 'reject'
    throw new Error('decision must be approve or reject')
  }

  private reviewConfidenceBasis(
    signal: Record<string, unknown>,
    review: { decision: 'approve' | 'reject'; reviewedBy: string; reviewedAt: string },
  ): Record<string, unknown> {
    const evidenceRefs = Array.isArray(signal.evidence_refs) ? signal.evidence_refs : []
    const existingBasis =
      signal.confidence_basis && typeof signal.confidence_basis === 'object'
        ? (signal.confidence_basis as Record<string, unknown>)
        : {}
    return {
      ...existingBasis,
      review_gate: {
        decision: review.decision === 'approve' ? 'human_approved' : 'human_rejected',
        reviewed_by: review.reviewedBy,
        reviewed_at: review.reviewedAt,
      },
      signal: {
        confidence: typeof signal.confidence === 'number' ? signal.confidence : null,
        evidence_ref_count: evidenceRefs.length,
        source: typeof signal.source === 'string' ? signal.source : null,
        created_at: typeof signal.created_at === 'string' ? signal.created_at : null,
      },
    }
  }
}
