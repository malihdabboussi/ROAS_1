import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MissionContractVerificationResult,
  MissionOutputContract,
} from './mission-output-contract.types'

export async function verifyMissionDocumentContent(
  supabase: SupabaseClient,
  deliverableId: string,
  contract: MissionOutputContract,
  result: MissionContractVerificationResult,
  source?: { entityId?: string | null; entityTable?: string | null },
): Promise<MissionContractVerificationResult> {
  if (contract.expected?.forbid_em_dash !== true) return result

  let content = ''
  if (source?.entityTable === 'space_items' && source.entityId) {
    const { data, error } = await supabase
      .from('space_items')
      .select('doc_body')
      .eq('id', source.entityId)
      .maybeSingle()
    if (error) throw error
    if (typeof data?.doc_body === 'string') content = data.doc_body
  }
  if (!content) {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('content, content_json')
      .eq('id', deliverableId)
      .maybeSingle()
    if (error) throw error
    content =
      typeof data?.content === 'string'
        ? data.content
        : data?.content_json && typeof data.content_json === 'object'
          ? JSON.stringify(data.content_json)
          : ''
  }
  const emDashCount = content.match(/—|&mdash;|&#8212;/g)?.length ?? 0
  if (emDashCount === 0) return result

  return {
    ok: false,
    reason: `Document contains ${emDashCount} em dash characters; expected zero`,
    expected_action: contract.required_action,
    expected_artifact_type: contract.required_artifact_type,
    recovery: 'corrective_run',
  }
}
