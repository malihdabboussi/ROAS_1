import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'
import {
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
  type CanonicalMachineProfileRow,
} from '@vibey/api-shared'
import { AdminRepository } from '../repositories/admin.repository'

export interface ImpersonationTarget {
  id: string
  email: string | null
  name: string | null
  role: string
}

interface ImpersonationRequestContext {
  ip: string | null
  userAgent: string | null
}

const PAGE_SIZE = 1000

/**
 * Only these client accounts can be impersonated. Enforced server-side on
 * both the targets list and session start — accounts outside this list are
 * never shown and cannot be started even with a crafted request.
 */
const ALLOWED_CLIENT_EMAILS = ['adley@viralish.com', 'brianmark@teamaenation.com']

function isAllowedClientEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ALLOWED_CLIENT_EMAILS.includes(email.toLowerCase())
}

@Injectable()
export class ImpersonationService {
  private readonly logger = new Logger(ImpersonationService.name)

  constructor(private readonly repository: AdminRepository) {}

  /** Impersonable client accounts (allowlist only, superadmins excluded). */
  async getTargets(): Promise<{ targets: ImpersonationTarget[] }> {
    const authUsers = (await this.listAllAuthUsers()).filter((u) => isAllowedClientEmail(u.email))
    if (authUsers.length === 0) return { targets: [] }

    const ids = authUsers.map((u) => u.id)
    const [{ data: userProfiles }, { data: displayProfiles }] = await Promise.all([
      this.repository.serviceTable('user_profiles').select('id, role, display_name').in('id', ids),
      this.repository.serviceTable('profiles').select('id, full_name').in('id', ids),
    ])

    const profileById = new Map(
      ((userProfiles ?? []) as { id: string; role: string; display_name: string | null }[]).map(
        (p) => [p.id, p],
      ),
    )
    const fullNameById = new Map(
      ((displayProfiles ?? []) as { id: string; full_name: string | null }[]).map((p) => [
        p.id,
        p.full_name,
      ]),
    )

    const targets = authUsers
      .filter((u) => profileById.get(u.id)?.role !== 'superadmin')
      .map((u) => ({
        id: u.id,
        email: u.email,
        name: profileById.get(u.id)?.display_name ?? fullNameById.get(u.id) ?? null,
        role: profileById.get(u.id)?.role ?? 'user',
      }))

    return { targets }
  }

  async start(
    superadminId: string,
    targetUserId: string,
    context: ImpersonationRequestContext,
  ): Promise<{ target: ImpersonationTarget }> {
    if (!targetUserId) throw new BadRequestException('targetUserId is required')
    if (targetUserId === superadminId) {
      throw new BadRequestException('Cannot impersonate your own account')
    }

    const [{ data: profile }, { data: authUser, error: authError }] = await Promise.all([
      this.repository
        .serviceTable('user_profiles')
        .select('id, role, display_name')
        .eq('id', targetUserId)
        .single(),
      this.repository.getAuthUserById(targetUserId),
    ])

    if (authError || !authUser?.user) throw new BadRequestException('Target user not found')
    if (profile?.role === 'superadmin') {
      throw new ForbiddenException('Superadmin accounts cannot be impersonated')
    }
    if (!isAllowedClientEmail(authUser.user.email)) {
      throw new ForbiddenException('This account is not in the impersonation allowlist')
    }

    const target: ImpersonationTarget = {
      id: targetUserId,
      email: authUser.user.email ?? null,
      name: profile?.display_name ?? null,
      role: profile?.role ?? 'user',
    }

    await this.logAudit(superadminId, 'impersonation_start', targetUserId, target.email, context)
    this.logger.log(`Impersonation started: ${superadminId} → ${targetUserId}`)
    return { target }
  }

  async stop(
    superadminId: string,
    targetUserId: string,
    context: ImpersonationRequestContext,
  ): Promise<{ success: boolean }> {
    if (!targetUserId) throw new BadRequestException('targetUserId is required')
    await this.logAudit(superadminId, 'impersonation_stop', targetUserId, null, context)
    this.logger.log(`Impersonation stopped: ${superadminId} → ${targetUserId}`)
    return { success: true }
  }

  /**
   * Machine routing info for an impersonation target — used by the web proxy
   * to route agent traffic (chat, brain live-session, apps, project-files)
   * to the client's machine instead of the superadmin's. Allowlist enforced.
   */
  async getMachineTarget(targetUserId: string): Promise<CanonicalMachineProfileRow> {
    if (!targetUserId) throw new BadRequestException('targetUserId is required')

    const { data: authUser, error } = await this.repository.getAuthUserById(targetUserId)
    if (error || !authUser?.user) throw new BadRequestException('Target user not found')
    if (!isAllowedClientEmail(authUser.user.email)) {
      throw new ForbiddenException('This account is not in the impersonation allowlist')
    }

    const columns = resolveMachineProfileColumns(process.env)
    const { data: profile, error: profileError } = await this.repository
      .serviceTable('profiles')
      .select(
        [
          columns.machineId,
          columns.machineUrl,
          columns.runtimeApp,
          columns.runtimeType,
          columns.runtimeUrl,
        ].join(', '),
      )
      .eq('id', targetUserId)
      .maybeSingle()
    if (profileError) throw profileError

    return resolveMachineProfileRow((profile ?? null) as Record<string, unknown> | null, columns)
  }

  async getAudit(limit = 100) {
    const { data, error } = await this.repository
      .serviceTable('superadmin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { entries: data ?? [] }
  }

  private async logAudit(
    superadminId: string,
    action: 'impersonation_start' | 'impersonation_stop',
    targetUserId: string,
    targetEmail: string | null,
    context: ImpersonationRequestContext,
  ): Promise<void> {
    const { error } = await this.repository.serviceTable('superadmin_audit_log').insert({
      superadmin_id: superadminId,
      action,
      target_user_id: targetUserId,
      details: targetEmail ? { target_email: targetEmail } : null,
      ip_address: context.ip,
      user_agent: context.userAgent,
    })
    if (error) {
      // Audit failure must not silently pass — impersonation without a trail is not allowed.
      this.logger.error(`Audit log write failed for ${superadminId}: ${error.message}`)
      throw error
    }
  }

  private async listAllAuthUsers(): Promise<{ id: string; email: string | null }[]> {
    const acc: { id: string; email: string | null }[] = []
    for (let page = 1; ; page += 1) {
      const { data, error } = await this.repository.listAuthUsers({ page, perPage: PAGE_SIZE })
      if (error) throw error
      const users = data.users ?? []
      for (const u of users) acc.push({ id: u.id, email: u.email ?? null })
      if (users.length < PAGE_SIZE) break
    }
    return acc
  }
}
