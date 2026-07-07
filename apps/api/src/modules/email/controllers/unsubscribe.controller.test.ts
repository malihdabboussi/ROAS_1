import * as crypto from 'crypto'
import { HttpException } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailUnsubscribeService } from '../services/email-unsubscribe.service'
import { UnsubscribeController } from './unsubscribe.controller'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

const SECRET = 'unsubscribe-secret'

function createConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'UNSUBSCRIBE_TOKEN_SECRET') return SECRET
      if (key === 'SUPABASE_URL') return 'https://supabase.example.com'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
      return undefined
    }),
  }
}

function createToken(
  payload: {
    sendId: string
    email: string
    userId: string
    orgId?: string | null
    exp?: number
  },
  secret = SECRET,
) {
  const payloadBase64 = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 60,
      ...payload,
    }),
  ).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url')
  return `${payloadBase64}.${signature}`
}

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    insert: vi.fn(() => query),
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

function createController(supabase: Record<string, any>) {
  vi.mocked(createClient).mockReturnValue(supabase as never)
  return new UnsubscribeController(new EmailUnsubscribeService(createConfig() as never))
}

describe('UnsubscribeController routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns invalid status without creating a Supabase client for malformed tokens', async () => {
    const supabase = createSupabase({})
    const controller = createController(supabase)

    await expect(controller.checkStatus('not-a-token')).resolves.toEqual({ valid: false })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('checks unsubscribe status with masked email and org-scoped suppression lookup', async () => {
    const suppressionQuery = createQuery({ data: { id: 'suppression-1' }, error: null })
    const supabase = createSupabase({ email_suppressions: [suppressionQuery] })
    const controller = createController(supabase)
    const token = createToken({
      sendId: 'send-1',
      email: 'person@example.com',
      userId: 'user-1',
      orgId: 'org-1',
    })

    await expect(controller.checkStatus(token)).resolves.toEqual({
      valid: true,
      email: 'pe***@example.com',
      isUnsubscribed: true,
    })
    expect(suppressionQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(suppressionQuery.eq).toHaveBeenCalledWith('email', 'person@example.com')
    expect(suppressionQuery.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(suppressionQuery.limit).toHaveBeenCalledWith(1)
  })

  it('creates a suppression and marks the send unsubscribed for a valid token', async () => {
    const existingQuery = createQuery({ data: null, error: null })
    const insertQuery = createQuery({ error: null })
    const sendUpdateQuery = createQuery({ error: null })
    const supabase = createSupabase({
      email_suppressions: [existingQuery, insertQuery],
      email_sends: [sendUpdateQuery],
    })
    const controller = createController(supabase)
    const token = createToken({
      sendId: 'send-1',
      email: 'person@example.com',
      userId: 'user-1',
      orgId: null,
    })

    await expect(controller.processUnsubscribe(token)).resolves.toEqual({
      success: true,
      email: 'pe***@example.com',
      alreadyUnsubscribed: false,
    })
    expect(existingQuery.is).toHaveBeenCalledWith('org_id', null)
    expect(insertQuery.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      email: 'person@example.com',
      reason: 'unsubscribe',
      org_id: null,
    })
    expect(sendUpdateQuery.update).toHaveBeenCalledWith({
      status: 'unsubscribed',
      updated_at: expect.any(String),
    })
    expect(sendUpdateQuery.eq).toHaveBeenCalledWith('id', 'send-1')
  })

  it('returns alreadyUnsubscribed when suppression already exists', async () => {
    const existingQuery = createQuery({ data: { id: 'suppression-1' }, error: null })
    const supabase = createSupabase({ email_suppressions: [existingQuery] })
    const controller = createController(supabase)
    const token = createToken({
      sendId: 'send-1',
      email: 'person@example.com',
      userId: 'user-1',
    })

    await expect(controller.processUnsubscribe(token)).resolves.toEqual({
      success: true,
      email: 'pe***@example.com',
      alreadyUnsubscribed: true,
    })
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('throws the existing bad-request response for invalid preference tokens', async () => {
    const supabase = createSupabase({})
    const controller = createController(supabase)

    await expect(controller.getPreferences('bad-token')).rejects.toBeInstanceOf(HttpException)
    expect(createClient).not.toHaveBeenCalled()
  })
})
