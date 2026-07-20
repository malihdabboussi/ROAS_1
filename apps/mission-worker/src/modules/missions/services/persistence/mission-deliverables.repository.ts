import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MissionOutputContract = {
  artifact_kind:
    | 'agent_skill'
    | 'document_artifact'
    | 'presentation_artifact'
    | 'brain_ingestion'
    | 'ad_artifact'
    | 'funnel_artifact'
    | 'media_artifact'
  required_action: string
  required_artifact_type: string
  expected?: Record<string, unknown>
}

export type MissionContractVerificationResult = {
  ok: boolean
  reason?: string
  expected_action: string
  expected_artifact_type: string
  found_artifact_id?: string
  recovery: 'corrective_run' | 'vibey_replan' | 'block_user'
}

type DeliverableContractRow = {
  id?: string | null
  type?: string | null
  title?: string | null
  metadata?: Record<string, unknown> | null
  mime_type?: string | null
  source_action?: string | null
}

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

    const preferredIds = [...new Set(preferredDeliverableIds.filter(Boolean))]
    if (preferredIds.length > 0) {
      const { data, error } = await supabase
        .from('mission_deliverables')
        .select('id, type, title, metadata, mime_type, source_action')
        .eq('mission_id', missionId)
        .contains('metadata', { source: 'agent_tool' })
        .in('id', preferredIds)
        .order('created_at', { ascending: false })
      if (error) throw error

      const rows = (data || []) as DeliverableContractRow[]
      if (rows.length > 0) {
        const failures: MissionContractVerificationResult[] = []
        for (const row of rows) {
          const result = await this.evaluateAndVerifyDeliverable(supabase, row, contract)
          if (result.ok) return result
          failures.push(result)
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
      .select('id, type, title, metadata, mime_type, source_action')
      .eq('mission_id', missionId)
      .contains('metadata', { source: 'agent_tool' })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error

    const latestRow = data as DeliverableContractRow | null
    const latestResult = await this.evaluateAndVerifyDeliverable(supabase, latestRow, contract)
    if (latestResult.ok || !latestRow?.id) return latestResult

    const { data: matchingData, error: matchingError } = await supabase
      .from('mission_deliverables')
      .select('id, type, title, metadata, mime_type, source_action')
      .eq('mission_id', missionId)
      .contains('metadata', { source: 'agent_tool' })
      .eq('type', contract.required_artifact_type)
      .order('created_at', { ascending: false })
      .limit(20)
    if (matchingError) throw matchingError

    const matchingRows = (matchingData || []) as DeliverableContractRow[]
    for (const row of matchingRows) {
      const result = await this.evaluateAndVerifyDeliverable(supabase, row, contract)
      if (result.ok) return result
    }
    return matchingRows.length > 0
      ? await this.evaluateAndVerifyDeliverable(supabase, matchingRows[0] || null, contract)
      : latestResult
  }

  private async evaluateAndVerifyDeliverable(
    supabase: SupabaseClient,
    data: DeliverableContractRow | null,
    contract: MissionOutputContract,
  ): Promise<MissionContractVerificationResult> {
    const result = this.evaluateDeliverableContractRow(data, contract)
    if (!result.ok || contract.artifact_kind !== 'funnel_artifact') return result

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

  private evaluateDeliverableContractRow(
    data: DeliverableContractRow | null,
    contract: MissionOutputContract,
  ): MissionContractVerificationResult {
    const foundType = data?.type ? String(data.type) : ''
    if (data?.id && foundType === contract.required_artifact_type) {
      const expectedMime =
        typeof contract.expected?.mime_type === 'string' ? contract.expected.mime_type.trim() : ''
      const actualMime = typeof data.mime_type === 'string' ? data.mime_type.trim() : ''
      if (expectedMime && actualMime !== expectedMime) {
        return {
          ok: false,
          reason: `Found ${foundType} deliverable with mime_type ${actualMime || 'none'}, expected ${expectedMime}`,
          expected_action: contract.required_action,
          expected_artifact_type: contract.required_artifact_type,
          recovery: 'corrective_run',
        }
      }
      const metadata =
        data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
          ? data.metadata
          : {}
      const expectedSourceAction =
        typeof contract.expected?.source_action === 'string' &&
        contract.expected.source_action.trim()
          ? contract.expected.source_action.trim()
          : contract.required_action
      const actualSourceAction =
        typeof metadata.source_action === 'string'
          ? metadata.source_action.trim()
          : typeof data.source_action === 'string'
            ? data.source_action.trim()
            : ''
      if (
        expectedSourceAction &&
        actualSourceAction &&
        actualSourceAction !== expectedSourceAction
      ) {
        return {
          ok: false,
          reason: `Found ${foundType} deliverable from ${actualSourceAction || 'unknown action'}, expected ${expectedSourceAction}`,
          expected_action: contract.required_action,
          expected_artifact_type: contract.required_artifact_type,
          recovery: 'corrective_run',
        }
      }
      return {
        ok: true,
        expected_action: contract.required_action,
        expected_artifact_type: contract.required_artifact_type,
        found_artifact_id: String(data.id),
        recovery: 'corrective_run',
      }
    }
    const typeReason =
      data?.id && foundType
        ? `Found ${foundType} deliverable, expected ${contract.required_artifact_type}`
        : `Missing required ${contract.required_artifact_type} deliverable`
    return {
      ok: false,
      reason: typeReason,
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
