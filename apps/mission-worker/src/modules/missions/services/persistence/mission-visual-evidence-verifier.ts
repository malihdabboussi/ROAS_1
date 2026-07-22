import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MissionContractVerificationResult,
  MissionOutputContract,
} from './mission-output-contract.types'

function readPositiveInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function failure(
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

export async function verifyMissionVisualEvidence(
  supabase: SupabaseClient,
  missionId: string,
  contract: MissionOutputContract,
  result: MissionContractVerificationResult,
): Promise<MissionContractVerificationResult> {
  const minimumSearches = readPositiveInteger(contract.expected?.minimum_saved_search_count)
  const minimumVisuals = readPositiveInteger(contract.expected?.minimum_visual_reference_count)
  if (minimumSearches === 0 && minimumVisuals === 0) return result

  const { data, error } = await supabase
    .from('space_ad_searches')
    .select('id, results')
    .contains('mission_ids', [missionId])
  if (error) throw error

  const searches = Array.isArray(data) ? data : []
  if (searches.length < minimumSearches) {
    return failure(
      contract,
      `Found ${searches.length} mission-linked saved searches, expected at least ${minimumSearches}`,
    )
  }

  const uniqueVisuals = new Set<string>()
  for (const search of searches as Array<Record<string, unknown>>) {
    const results = Array.isArray(search.results) ? search.results : []
    for (const item of results) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const record = item as Record<string, unknown>
      const visual = firstString(record, [
        'image_url',
        'thumbnail_url',
        'video_preview_image_url',
        'preview_image_url',
        'original_image_url',
        'resized_image_url',
        'video_url',
        'media_url',
      ])
      if (!visual) continue
      const identity = firstString(record, [
        'ad_id',
        'id',
        'external_id',
        'details_link',
        'source_url',
      ])
      uniqueVisuals.add(identity || visual)
    }
  }
  if (uniqueVisuals.size < minimumVisuals) {
    return failure(
      contract,
      `Found ${uniqueVisuals.size} unique mission-linked visual references, expected at least ${minimumVisuals}`,
    )
  }
  return result
}
