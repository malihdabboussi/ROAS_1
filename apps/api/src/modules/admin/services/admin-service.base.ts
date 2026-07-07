import { ConfigService } from '@nestjs/config'
import { PostgresDirectService, resolveMachineProfileColumns } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { StripeService } from '../../billing/services/stripe.service'
import { SendGridIntegration } from '../../email/integrations/sendgrid.integration'
import { AdminRepository } from '../repositories/admin.repository'

export abstract class AdminServiceBase {
  protected readonly machineColumns = resolveMachineProfileColumns(process.env)

  constructor(
    protected readonly configService: ConfigService,
    protected readonly sendgrid: SendGridIntegration,
    protected readonly repository: AdminRepository,
    protected readonly postgresDirect: PostgresDirectService,
    protected readonly creditsService: CreditsService,
    protected readonly stripeService: StripeService,
  ) {}

  protected static readonly ADMIN_PAGE_SIZE = 1000

  protected async adminFetchAllByRange<T>(
    query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  ): Promise<T[]> {
    const size = AdminServiceBase.ADMIN_PAGE_SIZE
    const acc: T[] = []
    let from = 0
    for (;;) {
      const to = from + size - 1
      const { data, error } = await query(from, to)
      if (error) throw error
      const rows = data ?? []
      acc.push(...rows)
      if (rows.length < size) break
      from += size
    }
    return acc
  }

  protected async adminListAllAuthUsers(): Promise<{ id: string; email: string | null }[]> {
    const perPage = AdminServiceBase.ADMIN_PAGE_SIZE
    const acc: { id: string; email: string | null }[] = []
    let page = 1
    for (;;) {
      const { data, error } = await this.repository.listAuthUsers({ page, perPage })
      if (error) throw error
      const users = data.users ?? []
      for (const u of users) {
        acc.push({ id: u.id, email: u.email ?? null })
      }
      if (users.length < perPage) break
      page += 1
    }
    return acc
  }

  protected async adminFetchAllUsageForUserIds(
    userIds: string[],
    selectColumns: string,
  ): Promise<any[]> {
    if (userIds.length === 0) return []
    const chunkSize = 80
    const all: any[] = []
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize)
      const part = await this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('ai_usage_events')
          .select(selectColumns)
          .in('user_id', chunk)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      )
      all.push(...part)
    }
    return all
  }

  protected async adminFetchPersonalCreditsRemainingByUser(
    userIds: string[],
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>()
    if (userIds.length === 0) return out
    const concurrency = 20
    for (let i = 0; i < userIds.length; i += concurrency) {
      const batch = userIds.slice(i, i + concurrency)
      const rows = await Promise.all(
        batch.map(async (uid) => {
          try {
            const balance = await this.creditsService.getBalance(uid)
            return { uid, remaining: balance.totalAvailable ?? 0 }
          } catch {
            return { uid, remaining: 0 }
          }
        }),
      )
      for (const row of rows) out.set(row.uid, row.remaining)
    }
    return out
  }

  protected async adminFetchAllUsageForOrgIds(
    orgIds: string[],
    selectColumns: string,
  ): Promise<any[]> {
    if (orgIds.length === 0) return []
    const chunkSize = 80
    const all: any[] = []
    for (let i = 0; i < orgIds.length; i += chunkSize) {
      const chunk = orgIds.slice(i, i + chunkSize)
      const part = await this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('ai_usage_events')
          .select(selectColumns)
          .in('org_id', chunk)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      )
      all.push(...part)
    }
    return all
  }

  protected async adminFetchOrgCreditsRemainingByOrg(orgIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>()
    if (orgIds.length === 0) return out
    const concurrency = 20
    for (let i = 0; i < orgIds.length; i += concurrency) {
      const batch = orgIds.slice(i, i + concurrency)
      const rows = await Promise.all(
        batch.map(async (oid) => {
          try {
            const balance = await this.creditsService.getOrgBalance(oid)
            return { oid, remaining: balance.totalAvailable ?? 0 }
          } catch {
            return { oid, remaining: 0 }
          }
        }),
      )
      for (const row of rows) out.set(row.oid, row.remaining)
    }
    return out
  }

  protected async adminFetchUserProfileDisplayNamesByIds(
    ids: string[],
  ): Promise<Map<string, string | null>> {
    const out = new Map<string, string | null>()
    if (ids.length === 0) return out
    const chunkSize = 80
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize)
      const { data, error } = await this.repository
        .serviceTable('user_profiles')
        .select('id, display_name')
        .in('id', chunk)
      if (error) throw error
      for (const p of data ?? []) {
        const id = (p as any).id
        const dn = (p as any).display_name
        out.set(id, dn && String(dn).trim() ? String(dn).trim() : null)
      }
    }
    return out
  }

  protected parseBillingScope(raw?: string): 'personal' | 'organization' | 'all' {
    const s = String(raw ?? 'all').toLowerCase()
    if (s === 'personal' || s === 'organization' || s === 'all') return s
    return 'all'
  }

  protected subscriptionMrrDollars(sub: {
    subscription_plans?: { price_amount?: unknown; interval?: unknown }
  }): number {
    const amountCents = Number(sub?.subscription_plans?.price_amount ?? 0)
    const interval = String(sub?.subscription_plans?.interval ?? 'month')
    const monthlyCents = interval === 'year' ? amountCents / 12 : amountCents
    return monthlyCents / 100
  }

  protected filterUsageByBillingScope(
    rows: any[],
    scope: 'personal' | 'organization' | 'all',
  ): any[] {
    if (scope === 'all') return rows
    if (scope === 'personal') return rows.filter((r) => r.org_id == null)
    return rows.filter((r) => r.org_id != null)
  }


}
