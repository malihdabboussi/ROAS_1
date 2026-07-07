/**
 * Settings email integration tests — GET/PUT email_settings (personal org scope)
 */
import { type CanActivate, type ExecutionContext, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppModule } from '../../app.module'
import { CreditsGuard } from '../../modules/billing/guards/credits.guard'
import { BrainAuthGuard } from '../../modules/brain/guards/brain-auth.guard'
import { createMockSupabase, createTestApp, TEST_USER } from './test-helpers'

class PassthroughGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext) {
    return true
  }
}

const emailSettingsRow = {
  id: 'email-settings-row-1',
  user_id: TEST_USER.id,
  org_id: null,
  sending_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  sending_time_from: '09:00',
  sending_time_until: '17:00',
  sending_timezone: 'America/New_York',
  hide_branding: false,
  pause_on_reply: false,
  stop_keywords_enabled: false,
  stop_keywords: [] as string[],
  email_provider: 'sendgrid',
}

type SettingsCtx =
  | { mode: 'get' }
  | { mode: 'put-insert'; returned: Record<string, unknown> }
  | { mode: 'put-update'; returned: Record<string, unknown> }

let settingsCtx: SettingsCtx
let emailFromCall: number

function buildQueryChain(spec: { maybeSingle: unknown; single?: unknown }) {
  const chain: any = {}
  const methods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'not',
    'is',
    'like',
    'ilike',
    'order',
    'limit',
    'range',
    'filter',
    'match',
    'or',
    'and',
    'contains',
    'containedBy',
    'textSearch',
    'overlaps',
    'throwOnError',
    'returns',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: spec.maybeSingle, error: null })
  chain.single = vi.fn().mockResolvedValue({
    data: spec.single !== undefined ? spec.single : null,
    error: null,
  })
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve({ data: null, error: null }).then(resolve, reject)
  chain.catch = (reject: any) => Promise.resolve({ data: null, error: null }).catch(reject)
  return chain
}

function createSettingsSupabaseMock() {
  const base = createMockSupabase({})
  const origFrom = base.from
  base.from = vi.fn((table: string) => {
    if (table !== 'email_settings') {
      return origFrom(table)
    }
    emailFromCall += 1
    const n = emailFromCall
    if (settingsCtx.mode === 'get') {
      return buildQueryChain({ maybeSingle: emailSettingsRow })
    }
    if (settingsCtx.mode === 'put-insert') {
      if (n === 1) return buildQueryChain({ maybeSingle: null })
      return buildQueryChain({ maybeSingle: null, single: settingsCtx.returned })
    }
    if (settingsCtx.mode === 'put-update') {
      if (n === 1) return buildQueryChain({ maybeSingle: { id: emailSettingsRow.id } })
      return buildQueryChain({ maybeSingle: null, single: settingsCtx.returned })
    }
    return origFrom(table)
  })
  return base
}

describe('Settings Email Contract', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp(createSettingsSupabaseMock())
  }, 30_000)

  beforeEach(() => {
    emailFromCall = 0
  })

  afterAll(async () => {
    await app?.close()
  })

  it('GET /api/settings/email returns current user email_settings row', async () => {
    settingsCtx = { mode: 'get' }
    const res = await request(app.getHttpServer()).get('/api/settings/email').expect(200)
    expect(res.body).toMatchObject({
      id: emailSettingsRow.id,
      user_id: TEST_USER.id,
      org_id: null,
      email_provider: 'sendgrid',
    })
    expect(Array.isArray(res.body.sending_days)).toBe(true)
  })

  it('PUT /api/settings/email creates row when missing', async () => {
    const returned = {
      ...emailSettingsRow,
      id: 'new-email-settings-id',
      sending_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      hide_branding: true,
    }
    settingsCtx = { mode: 'put-insert', returned }
    const res = await request(app.getHttpServer())
      .put('/api/settings/email')
      .send({ hide_branding: true })
      .expect(200)
    expect(res.body.id).toBe('new-email-settings-id')
    expect(res.body.hide_branding).toBe(true)
    expect(res.body.user_id).toBe(TEST_USER.id)
  })

  it('PUT /api/settings/email updates existing row', async () => {
    const returned = {
      ...emailSettingsRow,
      pause_on_reply: true,
      stop_keywords: ['unsubscribe'],
    }
    settingsCtx = { mode: 'put-update', returned }
    const res = await request(app.getHttpServer())
      .put('/api/settings/email')
      .send({ pause_on_reply: true, stop_keywords: ['unsubscribe'] })
      .expect(200)
    expect(res.body.pause_on_reply).toBe(true)
    expect(res.body.stop_keywords).toEqual(['unsubscribe'])
  })

  it('PUT /api/settings/email remains user-scoped (no org_id column)', async () => {
    const returned = { ...emailSettingsRow, org_id: null }
    settingsCtx = { mode: 'put-update', returned }
    const res = await request(app.getHttpServer())
      .put('/api/settings/email')
      .send({ email_provider: 'sendgrid' })
      .expect(200)
    expect(res.body.org_id).toBeNull()
    expect(res.body.user_id).toBe(TEST_USER.id)
  })
})

describe('Settings Email Contract — unauthenticated', () => {
  let unauthApp: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(BrainAuthGuard)
      .useClass(PassthroughGuard)
      .overrideGuard(CreditsGuard)
      .useClass(PassthroughGuard)
      .compile()

    unauthApp = moduleRef.createNestApplication({ rawBody: true })
    unauthApp.setGlobalPrefix('api')
    await unauthApp.init()
  }, 30_000)

  afterAll(async () => {
    await unauthApp?.close()
  })

  it('GET /api/settings/email rejects unauthenticated requests with 401', async () => {
    await request(unauthApp.getHttpServer()).get('/api/settings/email').expect(401)
  })
})
