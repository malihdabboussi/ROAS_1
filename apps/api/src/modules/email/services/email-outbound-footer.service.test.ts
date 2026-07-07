import { describe, expect, it, vi } from 'vitest'
import { EmailOutboundFooterService } from './email-outbound-footer.service'

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createSupabase(queriesByTable: Record<string, Array<Record<string, any>>>) {
  return {
    from: vi.fn((table: string) => {
      const query = queriesByTable[table]?.shift()
      if (query) return query
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe('EmailOutboundFooterService', () => {
  it('hides branding only when email settings allow it and the user has a paid plan', async () => {
    const settingsQuery = createQuery({ data: { hide_branding: true }, error: null })
    const subscriptionQuery = createQuery({
      data: { status: 'active', subscription_plans: { price_amount: 4900 } },
      error: null,
    })
    const supabase = createSupabase({
      email_settings: [settingsQuery],
      user_subscriptions: [subscriptionQuery],
    })
    const service = new EmailOutboundFooterService({ get: vi.fn() } as never)

    await expect(service.shouldHideBranding(supabase as never, 'user-1', 'org-1')).resolves.toBe(
      true,
    )
    expect(settingsQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(settingsQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(subscriptionQuery.in).toHaveBeenCalledWith('status', ['active', 'trialing'])
  })

  it('keeps branding when the scoped setting is absent', async () => {
    const settingsQuery = createQuery({ data: null, error: null })
    const supabase = createSupabase({ email_settings: [settingsQuery] })
    const service = new EmailOutboundFooterService({ get: vi.fn() } as never)

    await expect(service.shouldHideBranding(supabase as never, 'user-1', null)).resolves.toBe(false)
    expect(settingsQuery.is).toHaveBeenCalledWith('org_id', null)
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })
})
