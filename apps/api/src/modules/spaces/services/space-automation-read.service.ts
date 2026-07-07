import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { SpaceAutomationReadRepository } from '../repositories/space-automation-read.repository'
import { SpacePermissionsService } from './space-permissions.service'

@Injectable()
export class SpaceAutomationReadService {
  private readonly readRepo: SpaceAutomationReadRepository

  constructor(
    private readonly permissionsService: SpacePermissionsService,
    @Optional()
    readRepo?: SpaceAutomationReadRepository,
  ) {
    this.readRepo = readRepo ?? new SpaceAutomationReadRepository()
  }

  async listFathomSources(
    user: { id: string },
    supabase: SupabaseClient,
    spaceId: string,
    scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      spaceId,
      'edit',
      scope.orgId,
    )

    const isAdmin = scope.orgRole === 'admin' || scope.orgRole === 'owner'

    const self = await this.readRepo.findLatestFathomIntegration(supabase, user.id)
    const selfSource =
      self && self.status === 'connected'
        ? { user_integration_id: String(self.id), scope_mode: String(self.scope_mode) }
        : null

    let users: Array<{ user_integration_id: string; user_id: string; display_name: string }> = []
    if (isAdmin && scope.orgId) {
      const rows = await this.readRepo.listOrgSharedFathomIntegrations(supabase, scope.orgId)
      const ids = (rows ?? []).map((r) => r.id as string)
      const userIds = (rows ?? []).map((r) => r.user_id as string)
      const profiles = await this.readRepo.listProfiles(supabase, userIds)
      const profileById = new Map(
        ((profiles ?? []) as Array<{ id: string; full_name?: string; email?: string }>).map((p) => [
          p.id,
          p,
        ]),
      )
      users = (rows ?? [])
        .map((r) => {
          const p = profileById.get(r.user_id as string)
          return {
            user_integration_id: String(r.id),
            user_id: String(r.user_id),
            display_name: p?.full_name?.trim() || p?.email?.trim() || String(r.user_id).slice(0, 8),
          }
        })
        .filter((row) => ids.includes(row.user_integration_id))
    }

    let teams: Array<{ team_id: string; name: string; icon: string | null; color: string | null }> =
      []
    if (scope.orgId) {
      const teamRows = await this.readRepo.listAgentTeams(supabase, scope.orgId)
      const allTeams = (
        (teamRows ?? []) as Array<{
          id: string
          name: string
          color: string | null
          icon: string | null
        }>
      ).map((t) => ({
        team_id: String(t.id),
        name: String(t.name),
        icon: t.icon ?? null,
        color: t.color ?? null,
      }))

      if (allTeams.length > 0) {
        const teamIds = allTeams.map((t) => t.team_id)
        const memberRows = await this.readRepo.listAgentTeamMembers(supabase, teamIds)
        const memberUserIds = Array.from(
          new Set(
            ((memberRows ?? []) as Array<{ team_id: string; user_id: string }>).map((r) =>
              String(r.user_id),
            ),
          ),
        )

        const fathomConnectedUserIds = await this.readRepo.listConnectedFathomUserIds(
          supabase,
          memberUserIds,
        )

        const teamsWithFathom = new Set<string>()
        for (const row of (memberRows ?? []) as Array<{ team_id: string; user_id: string }>) {
          if (fathomConnectedUserIds.has(String(row.user_id))) {
            teamsWithFathom.add(String(row.team_id))
          }
        }
        teams = allTeams.filter((t) => teamsWithFathom.has(t.team_id))
      }
    }

    return { self: selfSource, users, teams }
  }

  async listRuns(supabase: SupabaseClient, spaceId: string) {
    return this.readRepo.listRuns(supabase, spaceId)
  }
}
