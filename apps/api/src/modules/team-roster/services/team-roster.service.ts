import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoggerService, type TeamRosterEntry } from '@vibey/api-shared'
import type { TeamRosterQuery, UpdateTeamProfileDto } from '../dto'
import { TeamRosterRepository } from '../repositories/team-roster.repository'

const OWNER_ROLES = new Set(['owner', 'admin'])

@Injectable()
export class TeamRosterService {
  constructor(
    private readonly repo: TeamRosterRepository,
    private readonly logger: LoggerService,
  ) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    query: TeamRosterQuery,
  ): Promise<TeamRosterEntry[]> {
    // Personal workspace (no orgId): roster = the user's personal agents + the user themselves
    // as a human entry so they can self-assign ("Me") in pickers like AssigneeCell. The
    // `team_roster` view is org-scoped (`WHERE ar.org_id IS NOT NULL` and humans come from
    // `org_members`), so we query `agents_registry` and `profiles` directly.
    if (!orgId) {
      try {
        const [agents, self] = await Promise.all([
          query.kind === 'human'
            ? Promise.resolve<TeamRosterEntry[]>([])
            : this.repo.listPersonalAgents(supabase, userId),
          query.kind === 'agent'
            ? Promise.resolve<TeamRosterEntry | null>(null)
            : this.repo.getSelfHumanEntry(supabase, userId),
        ])
        const humans = self && (!query.ready_only || self.is_ready) ? [self] : []
        return [...humans, ...agents]
      } catch (error) {
        await this.logger.logError({
          severity: 'error',
          feature: 'team-roster/list',
          error_code: 'DB_ERROR',
          message: 'Failed to list personal roster',
          context: { userId, error: error instanceof Error ? error.message : 'unknown' },
        })
        throw error
      }
    }
    try {
      const rows = await this.repo.listRoster(supabase, orgId, {
        kind: query.kind,
        readyOnly: query.ready_only,
      })
      return rows
    } catch (error) {
      await this.logger.logError({
        severity: 'error',
        feature: 'team-roster/list',
        error_code: 'DB_ERROR',
        message: 'Failed to list team roster',
        context: { userId, orgId, error: error instanceof Error ? error.message : 'unknown' },
      })
      throw error
    }
  }

  async updateMe(
    supabase: SupabaseClient,
    userId: string,
    patch: UpdateTeamProfileDto,
  ): Promise<TeamRosterEntry | null> {
    await this.repo.updateProfile(supabase, userId, patch)
    return this.repo.getHumanProfile(supabase, userId)
  }

  async updateMember(
    supabase: SupabaseClient,
    actorUserId: string,
    orgId: string | null | undefined,
    targetUserId: string,
    patch: UpdateTeamProfileDto,
  ): Promise<TeamRosterEntry | null> {
    if (!orgId) {
      throw new BadRequestException('org_id is required to override a teammate profile')
    }
    if (actorUserId === targetUserId) {
      return this.updateMe(supabase, actorUserId, patch)
    }

    const [actorMembership, targetMembership] = await Promise.all([
      this.repo.getMembership(supabase, orgId, actorUserId),
      this.repo.getMembership(supabase, orgId, targetUserId),
    ])
    if (!actorMembership || !OWNER_ROLES.has(actorMembership.role)) {
      throw new ForbiddenException('Only org owner or admin can override another teammate profile')
    }
    if (!targetMembership) {
      throw new NotFoundException('Target user is not a member of this org')
    }

    await this.repo.updateProfile(supabase, targetUserId, patch)
    return this.repo.getHumanProfile(supabase, targetUserId)
  }
}
