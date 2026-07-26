import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  evaluateDeliverableContractRow,
  type DeliverableContractRow,
} from './mission-deliverable-contract-evaluator'
import { verifyMissionDocumentContent } from './mission-document-content-verifier'
import type {
  MissionContractVerificationResult,
  MissionOutputContract,
} from './mission-output-contract.types'
import { verifyMissionVisualEvidence } from './mission-visual-evidence-verifier'

@Injectable()
export class MissionDeliverablesRepository {
  private readonly logger = new Logger(MissionDeliverablesRepository.name)

  async hasToolAuthoredDeliverables(supabase: SupabaseClient, missionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('id')
      .eq('mission_id', missionId)
      .contains('metadata', { source: 'agent_tool' })
      .limit(1)
    if (error) throw error
    return Array.isArray(data) && data.length > 0
  }

  async getLatestToolAuthoredDeliverableId(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('id')
      .eq('mission_id', missionId)
      .contains('metadata', { source: 'agent_tool' })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data?.id ? String(data.id) : null
  }

  async getExistingDeliverable(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<string | null> {
    const { data } = await supabase
      .from('mission_deliverables')
      .select('title, type, content, content_json, file_url')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return null
    const content = typeof data.content === 'string' ? data.content.trim() : ''
    if (content.length > 0) return content
    if (data.content_json && typeof data.content_json === 'object') {
      return JSON.stringify(data.content_json, null, 2)
    }
    const fileUrl = typeof data.file_url === 'string' ? data.file_url : ''
    if (fileUrl) {
      return `${String(data.title || 'Deliverable')} (${String(data.type || 'file')}): ${fileUrl}`
    }
    return null
  }

  async verifyOutputContract(
    supabase: SupabaseClient,
    missionId: string,
    contract: MissionOutputContract,
    preferredDeliverableIds: string[] = [],
  ): Promise<MissionContractVerificationResult> {
    if (contract.artifact_kind === 'agent_skill') {
      return this.verifyAgentSkillContract(supabase, contract)
    }

    const evidenceResult = await verifyMissionVisualEvidence(supabase, missionId, contract, {
      ok: true,
      expected_action: contract.required_action,
      expected_artifact_type: contract.required_artifact_type,
      recovery: 'corrective_run',
    })
    if (!evidenceResult.ok) return evidenceResult

    const preferredIds = [...new Set(preferredDeliverableIds.filter(Boolean))]
    const minimumCount = this.resolveMinimumCount(contract)
    const exactCount = this.resolveExactCount(contract)
    if (preferredIds.length > 0) {
      const { data, error } = await supabase
        .from('mission_deliverables')
        .select('id, type, title, metadata, mime_type, source_action, entity_id, entity_table')
        .eq('mission_id', missionId)
        .contains('metadata', { source: 'agent_tool' })
        .order('created_at', { ascending: false })
      if (error) throw error

      const preferredIdSet = new Set(preferredIds)
      const rows = ((data || []) as DeliverableContractRow[]).filter((row) => {
        const metadataEntityId =
          row.metadata && typeof row.metadata.entity_id === 'string' ? row.metadata.entity_id : ''
        return (
          preferredIdSet.has(String(row.id || '')) ||
          preferredIdSet.has(String(row.entity_id || '')) ||
          preferredIdSet.has(metadataEntityId)
        )
      })
      if (rows.length > 0) {
        const failures: MissionContractVerificationResult[] = []
        const successes: MissionContractVerificationResult[] = []
        for (const row of rows) {
          const result = await this.evaluateAndVerifyDeliverable(supabase, row, contract)
          if (result.ok) successes.push(result)
          else failures.push(result)
        }
        if (exactCount !== null && successes.length > 0 && successes.length !== exactCount) {
          return this.exactCountFailure(contract, successes.length, exactCount)
        }
        if (successes.length >= minimumCount) return successes[0]
        if (successes.length > 0) {
          return this.minimumCountFailure(contract, successes.length, minimumCount)
        }
        return (
          failures[0] || {
            ok: false,
            reason: `Preferred artifact manifest did not contain a matching ${contract.required_artifact_type} deliverable`,
            expected_action: contract.required_action,
            expected_artifact_type: contract.required_artifact_type,
            recovery: 'corrective_run',
          }
        )
      }
    }

    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('id, type, title, metadata, mime_type, source_action, entity_id, entity_table')
      .eq('mission_id', missionId)
      .contains('metadata', { source: 'agent_tool' })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error

    const latestRow = data as DeliverableContractRow | null
    const latestResult = await this.evaluateAndVerifyDeliverable(supabase, latestRow, contract)
    if ((latestResult.ok && minimumCount === 1 && exactCount === null) || !latestRow?.id) {
      return latestResult
    }

    const { data: matchingData, error: matchingError } = await supabase
      .from('mission_deliverables')
      .select('id, type, title, metadata, mime_type, source_action, entity_id, entity_table')
      .eq('mission_id', missionId)
      .contains('metadata', { source: 'agent_tool' })
      .eq('type', contract.required_artifact_type)
      .order('created_at', { ascending: false })
      .limit(Math.max(20, minimumCount, exactCount === null ? 0 : exactCount + 1))
    if (matchingError) throw matchingError

    const matchingRows = (matchingData || []) as DeliverableContractRow[]
    const successes: MissionContractVerificationResult[] = []
    for (const row of matchingRows) {
      const result = await this.evaluateAndVerifyDeliverable(supabase, row, contract)
      if (result.ok) successes.push(result)
    }
    if (exactCount !== null && successes.length > 0 && successes.length !== exactCount) {
      return this.exactCountFailure(contract, successes.length, exactCount)
    }
    if (successes.length >= minimumCount) return successes[0]
    if (successes.length > 0) {
      return this.minimumCountFailure(contract, successes.length, minimumCount)
    }
    return matchingRows.length > 0
      ? await this.evaluateAndVerifyDeliverable(supabase, matchingRows[0] || null, contract)
      : latestResult
  }
  private resolveMinimumCount(contract: MissionOutputContract): number {
    const value = contract.expected?.minimum_count
    return typeof value === 'number' && Number.isInteger(value) && value > 1 ? value : 1
  }
  private resolveExactCount(contract: MissionOutputContract): number | null {
    const value = contract.expected?.exact_count
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
  }
  private exactCountFailure(
    contract: MissionOutputContract,
    foundCount: number,
    exactCount: number,
  ): MissionContractVerificationResult {
    return {
      ok: false,
      reason: `Found ${foundCount} matching ${contract.required_artifact_type} deliverables, expected exactly ${exactCount}`,
      expected_action: contract.required_action,
      expected_artifact_type: contract.required_artifact_type,
      recovery: 'corrective_run',
    }
  }
  private minimumCountFailure(
    contract: MissionOutputContract,
    foundCount: number,
    minimumCount: number,
  ): MissionContractVerificationResult {
    return {
      ok: false,
      reason: `Found ${foundCount} matching ${contract.required_artifact_type} deliverables, expected at least ${minimumCount}`,
      expected_action: contract.required_action,
      expected_artifact_type: contract.required_artifact_type,
      recovery: 'corrective_run',
    }
  }

  private async evaluateAndVerifyDeliverable(
    supabase: SupabaseClient,
    data: DeliverableContractRow | null,
    contract: MissionOutputContract,
  ): Promise<MissionContractVerificationResult> {
    const result = evaluateDeliverableContractRow(data, contract)
    if (!result.ok) return result
    if (contract.artifact_kind === 'document_artifact' && data?.id) {
      const metadata =
        data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
          ? data.metadata
          : {}
      return verifyMissionDocumentContent(supabase, String(data.id), contract, result, {
        entityId:
          typeof data.entity_id === 'string'
            ? data.entity_id
            : typeof metadata.entity_id === 'string'
              ? metadata.entity_id
              : null,
        entityTable:
          typeof data.entity_table === 'string'
            ? data.entity_table
            : typeof metadata.entity_table === 'string'
              ? metadata.entity_table
              : null,
      })
    }
    if (contract.artifact_kind !== 'funnel_artifact') return result

    const expected = contract.expected ?? {}
    const metadata =
      data?.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
        ? data.metadata
        : {}
    const funnelId = typeof metadata.entity_id === 'string' ? metadata.entity_id.trim() : ''
    if (!funnelId) {
      return this.funnelVerificationFailure(
        contract,
        'Funnel deliverable has no linked funnel entity',
      )
    }

    if (expected.require_attached_assets === true) {
      const { data: assets, error } = await supabase
        .from('funnel_assets')
        .select('id')
        .eq('funnel_id', funnelId)
        .limit(1)
      if (error) throw error
      if (!Array.isArray(assets) || assets.length === 0) {
        return this.funnelVerificationFailure(contract, 'Funnel has no attached media assets')
      }
    }

    if (expected.forbid_asset_placeholders === true) {
      const { data: files, error } = await supabase
        .from('funnel_files')
        .select('path, content')
        .eq('funnel_id', funnelId)
      if (error) throw error
      const placeholderPattern =
        /confirm from drive|drop image here|use [^\n<]{0,80} files|\[[^\]]{0,100}(?:headshot|logo|photo|image|video thumbnail)[^\]]{0,100}\]/i
      const containsPlaceholder = (files || []).some((file: Record<string, unknown>) =>
        placeholderPattern.test(String(file.content ?? '')),
      )
      if (containsPlaceholder) {
        return this.funnelVerificationFailure(
          contract,
          'Funnel contains a visual asset placeholder instead of attached campaign media',
        )
      }
    }

    return result
  }

  private funnelVerificationFailure(
    contract: MissionOutputContract,
    reason: string,
  ): MissionContractVerificationResult {
    return {
      ok: false,
      reason,
      expected_action: contract.required_action,
      expected_artifact_type: contract.required_artifact_type,
      recovery: 'corrective_run',
    }
  }

  private async verifyAgentSkillContract(
    supabase: SupabaseClient,
    contract: MissionOutputContract,
  ): Promise<MissionContractVerificationResult> {
    const expected = contract.expected ?? {}
    const agentKey = typeof expected.agent_key === 'string' ? expected.agent_key : ''
    const skillKey = typeof expected.skill_key === 'string' ? expected.skill_key : ''
    if (!agentKey || !skillKey) {
      return {
        ok: false,
        reason: 'agent_skill contract requires expected.agent_key and expected.skill_key',
        expected_action: contract.required_action,
        expected_artifact_type: contract.required_artifact_type,
        recovery: 'vibey_replan',
      }
    }

    let query = supabase
      .from('agent_skills')
      .select('id, skill_key')
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
    if (typeof expected.org_id === 'string' && expected.org_id.trim()) {
      query = query.eq('org_id', expected.org_id).is('user_id', null)
    } else if (typeof expected.user_id === 'string' && expected.user_id.trim()) {
      query = query.eq('user_id', expected.user_id).is('org_id', null)
    }
    const { data, error } = await query.maybeSingle()
    if (error) throw error

    if (data?.id) {
      return {
        ok: true,
        expected_action: contract.required_action,
        expected_artifact_type: contract.required_artifact_type,
        found_artifact_id: String(data.id),
        recovery: 'vibey_replan',
      }
    }

    return {
      ok: false,
      reason: `Missing required agent skill ${agentKey}/${skillKey}`,
      expected_action: contract.required_action,
      expected_artifact_type: contract.required_artifact_type,
      recovery: 'vibey_replan',
    }
  }

  async getApprovedDeliverable(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<{ title: string; content: string } | null> {
    const { data } = await supabase
      .from('mission_deliverables')
      .select('title, type, content, content_json, file_url')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return null
    const title = String(data.title || 'Deliverable')
    const content = typeof data.content === 'string' ? data.content.trim() : ''
    if (content) return { title, content }
    if (data.content_json && typeof data.content_json === 'object') {
      return { title, content: JSON.stringify(data.content_json, null, 2) }
    }
    const fileUrl = typeof data.file_url === 'string' ? data.file_url : ''
    if (fileUrl) return { title, content: `${title} (${String(data.type || 'file')}): ${fileUrl}` }
    return null
  }
}
