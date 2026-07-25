import type { ProgramVisibility } from '../dto/programs.dto'

/** A space share granting a user access to a space that lives under a campaign. */
export interface SpaceShareForCompat {
  space_id: string
  space_title: string | null
  user_id: string
  campaign_id: string | null
}

/** Minimal program shape needed to decide whether a share is overridden. */
export interface ProgramForCompat {
  id: string
  name: string
  visibility: ProgramVisibility
  /** Program owner — always retains access. */
  created_by: string | null
}

export interface ProgramShareConflict {
  space_id: string
  space_title: string | null
  user_id: string
  program_id: string
  program_name: string
  program_visibility: ProgramVisibility
}

/**
 * Detect space shares that grant a user access to a space WITHOUT the required
 * Program access. When a campaign's Program is private/selected, the Program
 * gate wins, so these users silently lose access to the shared space.
 *
 * Pure so it can be unit-tested and reused by both the report endpoint and the
 * per-space Share UI notice.
 */
export function detectProgramShareConflicts(input: {
  shares: SpaceShareForCompat[]
  /** campaign_id -> program_id (null when campaign has no program). */
  programByCampaign: Map<string, string | null>
  /** program_id -> program row. */
  programsById: Map<string, ProgramForCompat>
  /** program_id -> set of user_ids with an explicit Program ACL entry. */
  programAclUserIds: Map<string, Set<string>>
  /** Users who bypass Program gates entirely (org owners/admins). */
  adminUserIds: Set<string>
}): ProgramShareConflict[] {
  const { shares, programByCampaign, programsById, programAclUserIds, adminUserIds } = input
  const conflicts: ProgramShareConflict[] = []

  for (const share of shares) {
    if (!share.campaign_id) continue
    const programId = programByCampaign.get(share.campaign_id) ?? null
    if (!programId) continue
    const program = programsById.get(programId)
    if (!program) continue
    if (program.visibility === 'workspace') continue
    if (adminUserIds.has(share.user_id)) continue
    if (program.created_by && program.created_by === share.user_id) continue
    if (programAclUserIds.get(programId)?.has(share.user_id)) continue

    conflicts.push({
      space_id: share.space_id,
      space_title: share.space_title,
      user_id: share.user_id,
      program_id: programId,
      program_name: program.name,
      program_visibility: program.visibility,
    })
  }

  return conflicts
}
