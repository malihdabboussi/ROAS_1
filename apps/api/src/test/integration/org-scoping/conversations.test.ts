/**
 * Org-scoping integration tests — conversations
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMockSupabase, createOrgTestApp, createTestApp, TEST_USER } from '../test-helpers'

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CONV_ORG_A = '11111111-1111-4111-8111-111111111111'
const CONV_ORG_A_OTHER_USER = '11111111-2222-4111-8111-111111111111'
const CONV_PERSONAL = '22222222-2222-4222-8222-222222222222'
const CONV_ORG_B = '33333333-3333-4333-8333-333333333333'
const MSG_LATEST = '44444444-4444-4444-8444-444444444444'
const CAMP_GENERAL_A = '55555555-5555-4555-8555-555555555555'

function convRow(overrides: Record<string, unknown>) {
  return {
    user_id: TEST_USER.id,
    title: 'Chat',
    campaign_id: CAMP_GENERAL_A,
    agent_id: null,
    metadata: {},
    updated_at: '2026-04-14T12:00:00Z',
    created_at: '2026-04-14T12:00:00Z',
    ...overrides,
  }
}

describe('Org Scoping: Conversations', () => {
  let appA: INestApplication

  beforeAll(async () => {
    const { app } = await createOrgTestApp({
      orgId: ORG_A,
      tableData: {
        campaigns: [
          {
            id: CAMP_GENERAL_A,
            user_id: TEST_USER.id,
            org_id: ORG_A,
            name: 'General',
            campaign_type: 'get-more-leads',
            deleted_at: null,
            status: 'active',
            config: { system_kind: 'general', isPinned: true },
            created_at: '2020-01-01T00:00:00Z',
            updated_at: '2026-04-14T12:00:00Z',
          },
        ],
        conversations: [
          convRow({
            id: CONV_ORG_A,
            org_id: ORG_A,
            title: 'Org A thread',
          }),
          convRow({
            id: CONV_ORG_A_OTHER_USER,
            user_id: 'other-user-id',
            org_id: ORG_A,
            title: 'Other user org A thread',
          }),
          convRow({
            id: CONV_ORG_B,
            org_id: ORG_B,
            title: 'Org B thread',
          }),
        ],
      },
    })
    appA = app
  }, 30_000)

  afterAll(async () => {
    await appA?.close()
  })

  it('GET /api/conversations returns only current user conversations in the current org', async () => {
    const res = await request(appA.getHttpServer())
      .get('/api/conversations')
      .set('x-org-id', ORG_A)
      .expect(200)
    const ids = (res.body as Array<{ id: string }>).map((c) => c.id)
    expect(ids).toContain(CONV_ORG_A)
    expect(ids).not.toContain(CONV_ORG_A_OTHER_USER)
    expect(ids).not.toContain(CONV_ORG_B)
  })

  it('GET /api/conversations without x-org-id returns personal conversations only', async () => {
    const mockSupa = createMockSupabase({
      conversations: [
        convRow({
          id: CONV_PERSONAL,
          org_id: null,
          title: 'Personal',
        }),
        convRow({
          id: CONV_ORG_A,
          org_id: ORG_A,
          title: 'Org scoped',
        }),
      ],
    })
    const app = await createTestApp(mockSupa)
    try {
      const res = await request(app.getHttpServer()).get('/api/conversations').expect(200)
      const ids = (res.body as Array<{ id: string }>).map((c) => c.id)
      expect(ids).toEqual([CONV_PERSONAL])
    } finally {
      await app.close()
    }
  })

  it('GET /api/conversations/:id/messages returns 403 for inaccessible conversation', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        conversations: [
          convRow({
            id: CONV_ORG_A,
            org_id: ORG_A,
            title: 'Org A only',
          }),
        ],
        messages: [],
      },
    })
    try {
      await request(app.getHttpServer())
        .get(`/api/conversations/${CONV_ORG_A}/messages`)
        .set('x-org-id', orgId)
        .expect(403)
    } finally {
      await app.close()
    }
  })

  it('PATCH /api/conversations/:id returns 403 for inaccessible conversation', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        conversations: [
          convRow({
            id: CONV_ORG_A,
            org_id: ORG_A,
            title: 'Org A only',
          }),
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .patch(`/api/conversations/${CONV_ORG_A}`)
        .set('x-org-id', orgId)
        .send({ title: 'X' })
        .expect(403)
    } finally {
      await app.close()
    }
  })

  it('DELETE /api/conversations/:id returns 403 for inaccessible conversation', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        conversations: [
          convRow({
            id: CONV_ORG_A,
            org_id: ORG_A,
            title: 'Org A only',
          }),
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .delete(`/api/conversations/${CONV_ORG_A}`)
        .set('x-org-id', orgId)
        .expect(403)
    } finally {
      await app.close()
    }
  })

  it('DELETE /api/conversations/:id/messages-from/:messageId rejects inaccessible conversation', async () => {
    const { app, orgId } = await createOrgTestApp({
      orgId: ORG_B,
      tableData: {
        conversations: [
          convRow({
            id: CONV_ORG_A,
            org_id: ORG_A,
            title: 'Org A only',
          }),
        ],
        messages: [
          {
            id: MSG_LATEST,
            conversation_id: CONV_ORG_A,
            role: 'user',
            content: 'hi',
            created_at: '2026-04-14T12:00:00Z',
          },
        ],
      },
    })
    try {
      await request(app.getHttpServer())
        .delete(`/api/conversations/${CONV_ORG_A}/messages-from/${MSG_LATEST}`)
        .set('x-org-id', orgId)
        .expect(403)
    } finally {
      await app.close()
    }
  })
})
