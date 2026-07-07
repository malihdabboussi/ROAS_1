import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { UsersRepository } from '../repositories/users.repository'
import { SettingsService } from '../services/settings.service'
import { SettingsController } from './settings.controller'

function createQuery({
  maybeSingle = { data: null, error: null },
  single = { data: null, error: null },
}: {
  maybeSingle?: Record<string, unknown>
  single?: Record<string, unknown>
} = {}) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(maybeSingle),
    single: vi.fn().mockResolvedValue(single),
  }
  return query
}

function createSupabase(queries: Array<Record<string, any>>) {
  return {
    from: vi.fn((table: string) => {
      if (table !== 'email_settings') throw new Error(`unexpected table: ${table}`)
      const query = queries.shift()
      if (!query) throw new Error('unexpected email_settings query')
      return query
    }),
  }
}

const user = { id: 'user-1' }

function createController() {
  return new SettingsController(new SettingsService(new UsersRepository({} as never)))
}

describe('SettingsController email settings routes', () => {
  it('loads email settings scoped to the active organization', async () => {
    const row = {
      id: 'settings-1',
      user_id: 'user-1',
      org_id: 'org-1',
      email_provider: 'sendgrid',
    }
    const loadQuery = createQuery({ maybeSingle: { data: row, error: null } })
    const controller = createController()
    const supabase = createSupabase([loadQuery])

    await expect(
      controller.getEmailSettings(user, supabase as never, {
        userId: 'user-1',
        orgId: 'org-1',
        orgRole: 'admin',
      }),
    ).resolves.toEqual(row)
    expect(loadQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(loadQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(loadQuery.is).not.toHaveBeenCalled()
  })

  it('loads personal email settings with null org scope', async () => {
    const loadQuery = createQuery({ maybeSingle: { data: null, error: null } })
    const controller = createController()
    const supabase = createSupabase([loadQuery])

    await expect(
      controller.getEmailSettings(user, supabase as never, {
        userId: 'user-1',
        orgId: null,
        orgRole: null,
      }),
    ).resolves.toBeNull()
    expect(loadQuery.is).toHaveBeenCalledWith('org_id', null)
  })

  it('inserts email settings with current defaults when no row exists', async () => {
    const existingQuery = createQuery({ maybeSingle: { data: null, error: null } })
    const insertedRow = {
      id: 'settings-1',
      user_id: 'user-1',
      org_id: null,
      hide_branding: true,
      email_provider: 'sendgrid',
    }
    const insertQuery = createQuery({ single: { data: insertedRow, error: null } })
    const controller = createController()
    const supabase = createSupabase([existingQuery, insertQuery])

    await expect(
      controller.putEmailSettings(
        user,
        supabase as never,
        { userId: 'user-1', orgId: null, orgRole: null },
        { hide_branding: true },
      ),
    ).resolves.toEqual(insertedRow)
    expect(existingQuery.is).toHaveBeenCalledWith('org_id', null)
    expect(insertQuery.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      org_id: null,
      sending_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      sending_time_from: '09:00',
      sending_time_until: '17:00',
      sending_timezone: 'America/New_York',
      hide_branding: true,
      pause_on_reply: false,
      stop_keywords_enabled: false,
      stop_keywords: [],
      email_provider: 'sendgrid',
    })
    expect(insertQuery.single).toHaveBeenCalled()
  })

  it('updates an existing org-scoped email settings row', async () => {
    const existingQuery = createQuery({ maybeSingle: { data: { id: 'settings-1' }, error: null } })
    const updatedRow = {
      id: 'settings-1',
      user_id: 'user-1',
      org_id: 'org-1',
      pause_on_reply: true,
      stop_keywords: ['unsubscribe'],
    }
    const updateQuery = createQuery({ single: { data: updatedRow, error: null } })
    const controller = createController()
    const supabase = createSupabase([existingQuery, updateQuery])

    await expect(
      controller.putEmailSettings(
        user,
        supabase as never,
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
        { pause_on_reply: true, stop_keywords: ['unsubscribe'] },
      ),
    ).resolves.toEqual(updatedRow)
    expect(existingQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        pause_on_reply: true,
        stop_keywords: ['unsubscribe'],
        email_provider: 'sendgrid',
      }),
    )
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'settings-1')
    expect(updateQuery.single).toHaveBeenCalled()
  })

  it('throws the existing bad request response for DB errors', async () => {
    const loadQuery = createQuery({
      maybeSingle: { data: null, error: { message: 'settings failed' } },
    })
    const controller = createController()
    const supabase = createSupabase([loadQuery])

    await expect(
      controller.getEmailSettings(user, supabase as never, {
        userId: 'user-1',
        orgId: null,
        orgRole: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
