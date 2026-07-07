import { HttpException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { ErrorReporter } from '@vibey/api-shared'
import { EmailLogsService } from '../services/email-logs.service'
import { EmailLogsController } from './email-logs.controller'

const mockErrorReporter = { report: vi.fn() } as unknown as ErrorReporter

function createEmailLogsService() {
  return new EmailLogsService(mockErrorReporter)
}

const user = { id: 'user-1' }
const orgScope = { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' as const }
const personalScope = { userId: 'user-1', orgId: null, orgRole: null }

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    update: vi.fn(() => query),
  }
  query.then = resolved.then.bind(resolved)
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

describe('EmailLogsController routes', () => {
  it('lists email logs with org scoping, filters, pagination, and mapped rows', async () => {
    const logsQuery = createQuery({
      data: [
        {
          id: 'send-1',
          sequence_id: 'sequence-1',
          from_email: 'sender@example.com',
          subject: 'Hello',
          status: 'opened',
          sent_at: '2026-06-08T08:00:00Z',
          delivered_at: '2026-06-08T08:01:00Z',
          opened_at: '2026-06-08T08:02:00Z',
          clicked_at: null,
          created_at: '2026-06-08T07:59:00Z',
          is_archived: false,
          html_body: '<p>Hello</p>',
        },
      ],
      error: null,
      count: 1,
    })
    const supabase = createSupabase({ email_sends: [logsQuery] })
    const controller = new EmailLogsController(createEmailLogsService())

    await expect(
      controller.getLogs(
        supabase as never,
        user,
        orgScope,
        'opened',
        undefined,
        '2026-06-01',
        '2026-06-08',
        undefined,
        '25',
        '50',
      ),
    ).resolves.toEqual({
      success: true,
      total: 1,
      logs: [
        {
          id: 'send-1',
          email_type: 'sequence',
          recipient_email: null,
          recipient_name: null,
          from_email: 'sender@example.com',
          subject: 'Hello',
          status: 'opened',
          sent_at: '2026-06-08T08:00:00Z',
          delivered_at: '2026-06-08T08:01:00Z',
          opened_at: '2026-06-08T08:02:00Z',
          clicked_at: null,
          created_at: '2026-06-08T07:59:00Z',
          is_archived: false,
          html_body: '<p>Hello</p>',
        },
      ],
    })
    expect(logsQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(logsQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(logsQuery.eq).toHaveBeenCalledWith('status', 'opened')
    expect(logsQuery.eq).toHaveBeenCalledWith('is_archived', false)
    expect(logsQuery.gte).toHaveBeenCalledWith('sent_at', '2026-06-01')
    expect(logsQuery.lte).toHaveBeenCalledWith('sent_at', '2026-06-08')
    expect(logsQuery.range).toHaveBeenCalledWith(50, 74)
  })

  it('includes archived logs when requested and uses null org scope', async () => {
    const logsQuery = createQuery({ data: [], error: null, count: 0 })
    const supabase = createSupabase({ email_sends: [logsQuery] })
    const controller = new EmailLogsController(createEmailLogsService())

    await expect(
      controller.getLogs(
        supabase as never,
        user,
        personalScope,
        undefined,
        undefined,
        undefined,
        undefined,
        'true',
      ),
    ).resolves.toEqual({ success: true, logs: [], total: 0 })
    expect(logsQuery.is).toHaveBeenCalledWith('org_id', null)
    expect(logsQuery.eq).not.toHaveBeenCalledWith('is_archived', false)
  })

  it('counts scheduled single-email schedules with sequence and status filters', async () => {
    const countQuery = createQuery({ count: 7, error: null })
    const supabase = createSupabase({ email_single_schedules: [countQuery] })
    const controller = new EmailLogsController(createEmailLogsService())

    await expect(
      controller.getScheduleCount(supabase as never, user, orgScope, 'sequence-1', 'scheduled'),
    ).resolves.toEqual({ count: 7 })
    expect(countQuery.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(countQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(countQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(countQuery.eq).toHaveBeenCalledWith('sequence_id', 'sequence-1')
    expect(countQuery.eq).toHaveBeenCalledWith('status', 'scheduled')
  })

  it('archives email logs with personal scope', async () => {
    const archiveQuery = createQuery({ error: null })
    const supabase = createSupabase({ email_sends: [archiveQuery] })
    const controller = new EmailLogsController(createEmailLogsService())

    await expect(
      controller.archiveLog(supabase as never, user, 'send-1', { archive: true }, personalScope),
    ).resolves.toEqual({ success: true })
    expect(archiveQuery.update).toHaveBeenCalledWith({
      is_archived: true,
      updated_at: expect.any(String),
    })
    expect(archiveQuery.eq).toHaveBeenCalledWith('id', 'send-1')
    expect(archiveQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(archiveQuery.is).toHaveBeenCalledWith('org_id', null)
  })

  it('throws the existing internal-error response for DB failures', async () => {
    const logsQuery = createQuery({ data: null, error: { message: 'logs failed' }, count: 0 })
    const supabase = createSupabase({ email_sends: [logsQuery] })
    const controller = new EmailLogsController(createEmailLogsService())

    await expect(controller.getLogs(supabase as never, user, personalScope)).rejects.toBeInstanceOf(
      HttpException,
    )
  })
})
